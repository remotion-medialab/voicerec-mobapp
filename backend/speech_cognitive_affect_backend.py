import asyncio
import argparse
import base64
import csv
import json
import logging
import math
import time
import re
import os
from collections import deque
from pathlib import Path
from typing import Optional, Dict, Any, List

import numpy as np

try:
    from bleak import BleakScanner, BleakClient
    from bleak.backends.characteristic import BleakGATTCharacteristic
except ImportError:
    raise SystemExit("Install bleak first: python -m pip install bleak")

try:
    from websockets.server import serve
except ImportError:
    raise SystemExit("Install websockets first: python -m pip install websockets")

try:
    import torch
except Exception:
    torch = None

try:
    from faster_whisper import WhisperModel
except Exception:
    WhisperModel = None


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("openring_phase1_phase2")


# ---------------------------------------------------------------------------
# Ring BLE config
# ---------------------------------------------------------------------------

RING_NAME = "BCL603A959"
WRITE_UUID = "bae80010-4f05-4503-8e65-3af1f7329d1f"
NOTIFY_UUID = "bae80011-4f05-4503-8e65-3af1f7329d1f"

RING_SAMPLE_RATE_HZ = 25
MODEL_SAMPLE_RATE_HZ = 100
WINDOW_SECONDS = 30
RAW_WINDOW_SIZE = RING_SAMPLE_RATE_HZ * WINDOW_SECONDS       # 750
MODEL_WINDOW_SIZE = MODEL_SAMPLE_RATE_HZ * WINDOW_SECONDS    # 3000

PROJECT_DIR = Path(__file__).resolve().parent
MODEL_DIR = PROJECT_DIR / "models"
LOG_DIR = PROJECT_DIR / "logs"
AUDIO_DIR = PROJECT_DIR / "audio"
LOG_DIR.mkdir(exist_ok=True)
AUDIO_DIR.mkdir(exist_ok=True)

MODEL_PATHS = {
    "hr": MODEL_DIR / "inception-ring1-hr-all-irred_hr_Fold-1_best_ts.pt",
    "bp_sys": MODEL_DIR / "inception-ring1-bp-all-irred_BP_sys_Fold-1_best_ts.pt",
    "bp_dia": MODEL_DIR / "inception-ring1-bp-all-irred_BP_dia_Fold-1_best_ts.pt",
    "spo2": MODEL_DIR / "inception-ring1-spo2-all-irred_spo2_Fold-1_best_ts.pt",
    "resp_rate": MODEL_DIR / "inception-ring1-rr-all-ir_resp_rr_Fold-1_best_ts.pt",
}

MODEL_INPUTS = {
    "hr": {"channels": ["ir"], "target_len": RAW_WINDOW_SIZE},
    "spo2": {"channels": ["ir", "red"], "target_len": RAW_WINDOW_SIZE},
    "resp_rate": {"channels": ["ir"], "target_len": RAW_WINDOW_SIZE},
    "bp_sys": {"channels": ["ir", "red"], "target_len": MODEL_WINDOW_SIZE},
    "bp_dia": {"channels": ["ir", "red"], "target_len": MODEL_WINDOW_SIZE},
}

# ---------------------------------------------------------------------------
# Runtime state
# ---------------------------------------------------------------------------

ws_clients = set()
ring_client: Optional[BleakClient] = None
main_loop = None
raw_dump = False
pair_task = None

latest_metrics: Dict[str, Any] = {
    "hr": None,
    "bp_sys": None,
    "bp_dia": None,
    "spo2": None,
    "resp_rate": None,
    "source": "waiting",
    "models_loaded": {},
}

# Active phone voice sessions. The phone sends short audio chunks while recording.
# The backend transcribes each chunk and accumulates the transcript here.
voice_sessions: Dict[str, Dict[str, Any]] = {}


# ---------------------------------------------------------------------------
# Ring command + packet parser
# ---------------------------------------------------------------------------

def make_start_cmd(frame_id=1):
    return bytes([
        0x00, frame_id, 0x3C, 0x00,
        30,  # active measurement duration in seconds
        25,  # frequency requested from ring
        20,  # green LED current
        20,  # IR LED current
        20,  # red LED current
        1,   # progress response
        1,   # waveform response
    ])


def make_stop_cmd(frame_id=2):
    return bytes([0x00, frame_id, 0x3C, 0x04])


def le_u32(b, i):
    return b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)


def le_i16(b, i):
    v = b[i] | (b[i + 1] << 8)
    return v - 65536 if v >= 32768 else v


def parse_packet(data: bytes):
    if len(data) < 14:
        return None
    if data[2] != 0x3C or data[3] not in (0x01, 0x02):
        return None

    count = data[5]
    offset = 14
    samples = []

    for _ in range(count):
        if offset + 30 > len(data):
            break

        samples.append({
            "timestamp": time.time(),
            "green": le_u32(data, offset + 0),
            "red": le_u32(data, offset + 4),
            "ir": le_u32(data, offset + 8),
            "accX": le_i16(data, offset + 12),
            "accY": le_i16(data, offset + 14),
            "accZ": le_i16(data, offset + 16),
            "gyroX": le_i16(data, offset + 18),
            "gyroY": le_i16(data, offset + 20),
            "gyroZ": le_i16(data, offset + 22),
            "temp0": le_i16(data, offset + 24),
            "temp1": le_i16(data, offset + 26),
            "temp2": le_i16(data, offset + 28),
        })
        offset += 30

    return {
        "type": "realtime",
        "ts": time.time(),
        "seq": data[4],
        "count": count,
        "samples": samples,
    }


# ---------------------------------------------------------------------------
# Signal preprocessing + model inference
# ---------------------------------------------------------------------------

def zscore(x):
    return (x - x.mean(axis=0, keepdims=True)) / (x.std(axis=0, keepdims=True) + 1e-6)


def moving_average(x, win=5):
    if win <= 1:
        return x
    out = np.zeros_like(x, dtype=np.float32)
    for c in range(x.shape[1]):
        out[:, c] = np.convolve(x[:, c], np.ones(win) / win, mode="same")
    return out


def resample_to_len(x: np.ndarray, target_len: int) -> np.ndarray:
    if len(x) == target_len:
        return x.astype(np.float32)
    if len(x) < 2:
        return np.repeat(x, target_len, axis=0).astype(np.float32)

    old_t = np.linspace(0.0, 1.0, len(x))
    new_t = np.linspace(0.0, 1.0, target_len)
    cols = [np.interp(new_t, old_t, x[:, c]) for c in range(x.shape[1])]
    return np.stack(cols, axis=1).astype(np.float32)


class RingBuffer:
    def __init__(self, maxlen=RAW_WINDOW_SIZE):
        self.samples = deque(maxlen=maxlen)

    def extend(self, samples: List[Dict[str, Any]]):
        self.samples.extend(samples)

    def ready(self):
        return len(self.samples) >= self.samples.maxlen

    def as_array(self, channels: List[str], target_len: int):
        rows = list(self.samples)
        raw = np.array([[s[ch] for ch in channels] for s in rows], dtype=np.float32)
        filtered = moving_average(raw, win=5)
        if target_len != len(filtered):
            filtered = resample_to_len(filtered, target_len)
        return filtered


def fallback_hr(ir, fs):
    x = np.asarray(ir, dtype=float)
    x = x - np.mean(x)
    if len(x) < fs * 8:
        return None

    y = np.convolve(x, np.ones(5) / 5, mode="same")
    threshold = np.percentile(y, 75)
    peaks = []
    last = -999
    min_dist = int(0.35 * fs)

    for i in range(1, len(y) - 1):
        if y[i] > threshold and y[i] > y[i - 1] and y[i] >= y[i + 1] and i - last > min_dist:
            peaks.append(i)
            last = i

    if len(peaks) < 3:
        return None

    duration = (peaks[-1] - peaks[0]) / fs
    return round((len(peaks) - 1) * 60 / duration, 1) if duration > 0 else None


def fallback_resp_rate(ir, fs):
    x = np.asarray(ir, dtype=float)
    if len(x) < fs * 20:
        return None

    win = max(1, int(fs * 2))
    y = np.convolve(x - np.mean(x), np.ones(win) / win, mode="same")
    threshold = np.percentile(y, 70)
    peaks = []
    last = -999
    min_dist = int(2.0 * fs)

    for i in range(1, len(y) - 1):
        if y[i] > threshold and y[i] > y[i - 1] and y[i] >= y[i + 1] and i - last > min_dist:
            peaks.append(i)
            last = i

    if len(peaks) < 2:
        return None

    duration = (peaks[-1] - peaks[0]) / fs
    return round((len(peaks) - 1) * 60 / duration, 1) if duration > 0 else None


def fallback_spo2(ir, red):
    ir = np.asarray(ir, dtype=float)
    red = np.asarray(red, dtype=float)
    ac_ir, dc_ir = np.std(ir), np.mean(ir)
    ac_red, dc_red = np.std(red), np.mean(red)

    if dc_ir == 0 or dc_red == 0 or ac_ir == 0:
        return None

    r = (ac_red / dc_red) / (ac_ir / dc_ir)
    return round(float(np.clip(110 - 25 * r, 70, 100)), 1)


class ModelRunner:
    def __init__(self):
        self.models = {}
        self.loaded = {}
        self.last_infer = 0.0
        self.infer_every = 2.0
        self.working_shape = {}
        self.load_models()

    def load_models(self):
        if torch is None:
            log.warning("torch is not installed. Using fallback estimates.")
            self.loaded = {k: False for k in MODEL_PATHS}
            return

        for name, path in MODEL_PATHS.items():
            if not path.exists():
                log.warning("Missing model for %s: %s", name, path)
                self.loaded[name] = False
                continue

            try:
                model = torch.jit.load(str(path), map_location="cpu")
                model.eval()
                self.models[name] = model
                self.loaded[name] = True
                log.info("Loaded model %s from %s", name, path)
            except Exception as e:
                self.loaded[name] = False
                log.warning("Could not load %s as TorchScript: %s", path, e)

    def run_model_with_shape(self, model, arr, shape_mode):
        if shape_mode == "batch_time_channels":
            x = arr[None, :, :]           # [1, T, C]
        elif shape_mode == "batch_channels_time":
            x = arr.T[None, :, :]         # [1, C, T]
        elif shape_mode == "batch_time":
            x = arr[:, 0][None, :]        # [1, T]
        elif shape_mode == "batch_channel_time_1":
            x = arr[:, 0][None, None, :]  # [1, 1, T]
        else:
            raise ValueError(f"unknown shape_mode {shape_mode}")

        xt = torch.tensor(x, dtype=torch.float32)
        with torch.no_grad():
            y = model(xt)

        return float(np.array(y.detach().cpu()).reshape(-1)[0])

    def try_model(self, model_name, model, x):
        shape_modes = [
            "batch_time_channels",
            "batch_channels_time",
            "batch_time",
            "batch_channel_time_1",
        ]

        if model_name in self.working_shape:
            shape_modes = [self.working_shape[model_name]] + [
                s for s in shape_modes if s != self.working_shape[model_name]
            ]

        errors = []
        for mode in shape_modes:
            try:
                value = self.run_model_with_shape(model, x, mode)
                self.working_shape[model_name] = mode
                return value, mode
            except Exception as e:
                errors.append(f"{mode}: {str(e).splitlines()[0]}")

        raise RuntimeError("All input shapes failed. " + " | ".join(errors))

    def predict_one(self, model_name, model, ring_buffer: RingBuffer):
        spec = MODEL_INPUTS.get(model_name, {"channels": ["ir"], "target_len": RAW_WINDOW_SIZE})
        channels = spec["channels"]
        target_len = spec["target_len"]

        arr = ring_buffer.as_array(channels, target_len=target_len)
        arr = zscore(arr)

        value, shape_name = self.try_model(model_name, model, arr)

        log.info(
            "Model %s worked with shape=%s channels=%s len=%d",
            model_name,
            shape_name,
            channels,
            target_len,
        )
        return value

    def infer(self, ring_buffer: RingBuffer):
        now = time.time()
        if now - self.last_infer < self.infer_every:
            return None

        if not ring_buffer.ready():
            return {
                "hr": None,
                "bp_sys": None,
                "bp_dia": None,
                "spo2": None,
                "resp_rate": None,
                "source": f"buffering {len(ring_buffer.samples)}/{ring_buffer.samples.maxlen}",
                "models_loaded": self.loaded,
            }

        self.last_infer = now

        outputs = {
            "hr": None,
            "bp_sys": None,
            "bp_dia": None,
            "spo2": None,
            "resp_rate": None,
            "source": "models" if any(self.loaded.values()) else "fallback",
            "models_loaded": self.loaded,
        }

        if torch is not None and self.models:
            for key, model in self.models.items():
                try:
                    outputs[key] = round(self.predict_one(key, model, ring_buffer), 2)
                except Exception as e:
                    log.warning("Model inference failed for %s: %s", key, e)

        ir_arr = ring_buffer.as_array(["ir"], target_len=RAW_WINDOW_SIZE)[:, 0]
        red_arr = ring_buffer.as_array(["red"], target_len=RAW_WINDOW_SIZE)[:, 0]

        if outputs["hr"] is None:
            outputs["hr"] = fallback_hr(ir_arr, RING_SAMPLE_RATE_HZ)
        if outputs["resp_rate"] is None:
            outputs["resp_rate"] = fallback_resp_rate(ir_arr, RING_SAMPLE_RATE_HZ)
        if outputs["spo2"] is None:
            outputs["spo2"] = fallback_spo2(ir_arr, red_arr)

        return outputs


# ---------------------------------------------------------------------------
# Aggressive wave detector
# ---------------------------------------------------------------------------

class DoubleWaveDetector:
    """
    Detects an intentional double-wave gesture from the ring IMU.

    Gesture idea:
        swing one way -> swing opposite way within a short window

    This triggers a toggle event:
        first double-wave  -> frontend starts continuous voice transcription
        second double-wave -> frontend stops transcription and logs transcript

    It uses the dominant gyroscope axis at each moment, so the user can wave
    left-right or right-left without needing a fixed ring orientation.
    """

    def __init__(
        self,
        wave_threshold=120.0,
        max_between_swings_seconds=1.8,
        cooldown_seconds=1.5,
    ):
        self.wave_threshold = wave_threshold
        self.max_between_swings_seconds = max_between_swings_seconds
        self.cooldown_seconds = cooldown_seconds

        self.first_swing_sign = None
        self.first_swing_axis = None
        self.first_swing_time = 0.0
        self.last_trigger_time = 0.0

    def _dominant_gyro(self, sample):
        gx = float(sample["gyroX"])
        gy = float(sample["gyroY"])
        gz = float(sample["gyroZ"])
        vals = {"x": gx, "y": gy, "z": gz}
        axis = max(vals, key=lambda k: abs(vals[k]))
        value = vals[axis]
        return axis, value, abs(value)

    def process_sample(self, sample: Dict[str, Any]):
        now = time.time()

        if now - self.last_trigger_time < self.cooldown_seconds:
            return None

        axis, value, mag = self._dominant_gyro(sample)

        if mag < self.wave_threshold:
            # Timeout if the second swing does not arrive quickly enough.
            if self.first_swing_time and now - self.first_swing_time > self.max_between_swings_seconds:
                self.first_swing_sign = None
                self.first_swing_axis = None
                self.first_swing_time = 0.0
            return None

        sign = 1 if value > 0 else -1

        # First strong swing.
        if self.first_swing_sign is None:
            self.first_swing_sign = sign
            self.first_swing_axis = axis
            self.first_swing_time = now
            return None

        # Require the second swing to arrive soon.
        if now - self.first_swing_time > self.max_between_swings_seconds:
            self.first_swing_sign = sign
            self.first_swing_axis = axis
            self.first_swing_time = now
            return None

        # Second strong swing in opposite direction.
        if sign != self.first_swing_sign:
            event = {
                "type": "voice_trigger",
                "trigger": "double_wave_toggle",
                "ts": now,
                "axis_first": self.first_swing_axis,
                "axis_second": axis,
                "first_sign": self.first_swing_sign,
                "second_sign": sign,
                "gyro_mag": round(mag, 2),
                "message": "Double wave detected. Toggle voice recording.",
            }

            self.first_swing_sign = None
            self.first_swing_axis = None
            self.first_swing_time = 0.0
            self.last_trigger_time = now
            return event

        # Same direction again; treat as a new first swing.
        self.first_swing_sign = sign
        self.first_swing_axis = axis
        self.first_swing_time = now
        return None


# ---------------------------------------------------------------------------
# CSV logging: ring rows + voice rows in one multimodal CSV
# ---------------------------------------------------------------------------

NEGATIVE_WORDS = {
    "stress", "stressed", "anxious", "anxiety", "worried", "worry", "overwhelmed",
    "tired", "exhausted", "sad", "angry", "upset", "bad", "awful", "hard",
    "difficult", "scared", "panic", "frustrated", "lonely", "pressure"
}
POSITIVE_WORDS = {
    "happy", "good", "great", "calm", "relaxed", "excited", "proud", "okay",
    "better", "grateful", "confident", "peaceful", "nice", "love", "hopeful"
}
UNCERTAINTY_WORDS = {
    "maybe", "probably", "guess", "unsure", "confused", "uncertain", "kind of",
    "sort of", "i think", "i don't know", "not sure", "perhaps"
}
COGNITIVE_WORDS = {
    "think", "thought", "because", "realize", "understand", "decide", "decided",
    "plan", "remember", "figure", "reason", "why", "how", "but", "although"
}
FIRST_PERSON_WORDS = {"i", "me", "my", "mine", "myself"}

def clamp01(x):
    return max(0.0, min(1.0, float(x)))

def count_phrase(text, phrase):
    return len(re.findall(r"\b" + re.escape(phrase) + r"\b", text))

def normalize_transcript(text):
    text = (text or "").strip()
    text = re.sub(r"\s+", " ", text)
    return text


def merge_transcript(existing, new_text):
    existing = normalize_transcript(existing)
    new_text = normalize_transcript(new_text)

    if not existing:
        return new_text
    if not new_text:
        return existing

    # Avoid obvious repeated chunks.
    if new_text.lower() in existing.lower():
        return existing

    return normalize_transcript(existing + " " + new_text)


_whisper_model = None


def get_whisper_model():
    """Load local Whisper once and reuse it.

    This is free/local transcription using faster-whisper.
    First run may download the model to your local cache.
    """
    global _whisper_model

    if WhisperModel is None:
        log.warning("faster-whisper is not installed. Run: python -m pip install faster-whisper")
        return None

    if _whisper_model is None:
        model_size = os.environ.get("WHISPER_MODEL", "base")
        device = os.environ.get("WHISPER_DEVICE", "cpu")
        compute_type = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")

        log.info(
            "Loading local faster-whisper model=%s device=%s compute_type=%s",
            model_size,
            device,
            compute_type,
        )

        _whisper_model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
        )

    return _whisper_model


def transcribe_audio_file(audio_file):
    """Transcribe an audio file locally using faster-whisper.

    Install:
        python -m pip install faster-whisper

    Optional environment settings:
        $env:WHISPER_MODEL="tiny"   # fastest
        $env:WHISPER_MODEL="base"   # better, default
        $env:WHISPER_MODEL="small"  # slower, better
    """
    if not audio_file:
        return ""

    model = get_whisper_model()
    if model is None:
        return ""

    try:
        segments, info = model.transcribe(
            audio_file,
            language="en",
            vad_filter=True,
            beam_size=1,
        )

        text_parts = []
        for segment in segments:
            if segment.text:
                text_parts.append(segment.text.strip())

        return normalize_transcript(" ".join(text_parts))
    except Exception as e:
        log.warning("Local Whisper transcription failed for %s: %s", audio_file, e)
        return ""


def compute_linguistic_features(transcript: str, duration_sec=None):
    text = normalize_transcript(transcript)
    lower = text.lower()
    words = re.findall(r"[a-zA-Z']+", lower)
    word_count = len(words)
    duration_min = (duration_sec or 0) / 60.0 if duration_sec else 0

    neg = sum(1 for w in words if w in NEGATIVE_WORDS)
    pos = sum(1 for w in words if w in POSITIVE_WORDS)
    cog = sum(1 for w in words if w in COGNITIVE_WORDS)
    first = sum(1 for w in words if w in FIRST_PERSON_WORDS)
    uncertainty = sum(count_phrase(lower, phrase) for phrase in UNCERTAINTY_WORDS)

    speech_rate_wpm = (word_count / duration_min) if duration_min > 0 else None

    neg_rate = neg / max(1, word_count)
    pos_rate = pos / max(1, word_count)
    uncertainty_rate = uncertainty / max(1, word_count)
    cognitive_rate = cog / max(1, word_count)
    first_person_rate = first / max(1, word_count)

    sentiment_score = clamp01(0.5 + 2.0 * (pos_rate - neg_rate))

    # First-pass heuristic scores. These are interaction estimates, not diagnoses.
    linguistic_stress = clamp01(0.25 + 3.0 * neg_rate + 2.0 * uncertainty_rate + 0.5 * first_person_rate)
    linguistic_cognitive_load = clamp01(
        0.20 + 2.5 * uncertainty_rate + 1.5 * cognitive_rate + (0.20 if word_count > 80 else 0)
    )
    emotional_load = clamp01(0.15 + 2.8 * neg_rate + 1.2 * first_person_rate + 0.4 * uncertainty_rate)

    if neg_rate > 0.04 and linguistic_stress > 0.55:
        emotion_label = "stressed / negative"
    elif pos_rate > neg_rate and pos_rate > 0.025:
        emotion_label = "positive / regulated"
    elif uncertainty_rate > 0.025:
        emotion_label = "uncertain / cognitively loaded"
    elif word_count < 5:
        emotion_label = "too little speech"
    else:
        emotion_label = "neutral / reflective"

    return {
        "word_count": word_count,
        "speech_rate_wpm": round(speech_rate_wpm, 2) if speech_rate_wpm is not None else "",
        "negative_word_count": neg,
        "positive_word_count": pos,
        "uncertainty_word_count": uncertainty,
        "cognitive_word_count": cog,
        "first_person_count": first,
        "sentiment_score": round(sentiment_score, 3),
        "linguistic_stress_score": round(linguistic_stress, 3),
        "linguistic_cognitive_load_score": round(linguistic_cognitive_load, 3),
        "emotional_load_score": round(emotional_load, 3),
        "emotion_label": emotion_label,
    }

def fuse_voice_scores(linguistic, acoustic):
    def num(x, default=0.0):
        try:
            if x in ("", None):
                return default
            return float(x)
        except Exception:
            return default

    ling_stress = num(linguistic.get("linguistic_stress_score"), 0.0)
    ling_load = num(linguistic.get("linguistic_cognitive_load_score"), 0.0)
    emotional = num(linguistic.get("emotional_load_score"), 0.0)

    energy = num(acoustic.get("rms_mean"), 0.0)
    pitch_std = num(acoustic.get("pitch_std_hz"), 0.0)
    silence_ratio = num(acoustic.get("silence_ratio"), 0.0)
    speech_rate = num(linguistic.get("speech_rate_wpm"), 0.0)

    acoustic_arousal = clamp01((energy * 8.0) + min(pitch_std / 80.0, 0.4))
    pause_load = clamp01(silence_ratio * 1.2)
    rate_load = clamp01(abs(speech_rate - 135.0) / 160.0) if speech_rate else 0.0

    stress_score = clamp01(0.58 * ling_stress + 0.27 * acoustic_arousal + 0.15 * pause_load)
    cognitive_load_score = clamp01(0.55 * ling_load + 0.25 * pause_load + 0.20 * rate_load)
    emotion_score = clamp01(0.65 * emotional + 0.35 * acoustic_arousal)

    if stress_score >= 0.65:
        fused_label = "high stress"
    elif cognitive_load_score >= 0.65:
        fused_label = "high cognitive load"
    elif emotion_score >= 0.60:
        fused_label = "emotionally loaded"
    elif stress_score <= 0.30 and emotion_score <= 0.35:
        fused_label = "calm / low load"
    else:
        fused_label = "moderate / reflective"

    return {
        "stress_score": round(stress_score, 3),
        "cognitive_load_score": round(cognitive_load_score, 3),
        "voice_emotional_load_score": round(emotion_score, 3),
        "voice_state_label": fused_label,
    }

def save_audio_base64(audio_base64, mime_type="audio/webm"):
    if not audio_base64:
        return ""

    if "," in audio_base64 and audio_base64.strip().startswith("data:"):
        audio_base64 = audio_base64.split(",", 1)[1]

    ext = ".webm"
    if "wav" in mime_type:
        ext = ".wav"
    elif "mp4" in mime_type or "mpeg" in mime_type:
        ext = ".mp4"

    filename = f"voice_{time.strftime('%Y%m%d_%H%M%S')}_{int(time.time() * 1000) % 100000}{ext}"
    path = AUDIO_DIR / filename

    data = base64.b64decode(audio_base64)
    with open(path, "wb") as f:
        f.write(data)

    return str(path)


class CSVLogger:
    def __init__(self):
        stamp = time.strftime("%Y%m%d_%H%M%S")
        self.path = LOG_DIR / f"openring_multimodal_{stamp}.csv"
        self.file = open(self.path, "w", newline="", encoding="utf-8")
        self.writer = csv.DictWriter(self.file, fieldnames=[
            "row_type",
            "timestamp",

            "green", "red", "ir",
            "accX", "accY", "accZ",
            "gyroX", "gyroY", "gyroZ",
            "temp0", "temp1", "temp2",

            "hr", "bp_sys", "bp_dia", "spo2", "resp_rate",
            "metrics_source",

            "gesture_event",
            "gesture_gyro_mag",
            "gesture_accel_delta",

            "voice_session_id",
            "voice_trigger",
            "voice_transcript",
            "voice_confidence",
            "voice_started_at",
            "voice_ended_at",
            "voice_duration_sec",
            "audio_file",
            "audio_mime_type",

            "rms_mean",
            "rms_std",
            "rms_max",
            "zcr_mean",
            "silence_ratio",
            "pause_count",
            "total_pause_sec",
            "longest_pause_sec",
            "pitch_mean_hz",
            "pitch_std_hz",
            "pitch_min_hz",
            "pitch_max_hz",

            "word_count",
            "speech_rate_wpm",
            "negative_word_count",
            "positive_word_count",
            "uncertainty_word_count",
            "cognitive_word_count",
            "first_person_count",
            "sentiment_score",
            "linguistic_stress_score",
            "linguistic_cognitive_load_score",
            "emotional_load_score",
            "stress_score",
            "cognitive_load_score",
            "voice_emotional_load_score",
            "emotion_label",
            "voice_state_label",
        ])
        self.writer.writeheader()
        self.file.flush()

    def write_ring_sample(self, sample, metrics, gesture_event=None):
        row = {name: "" for name in self.writer.fieldnames}
        row.update({
            "row_type": "ring",
            "timestamp": sample.get("timestamp"),
            "green": sample.get("green"),
            "red": sample.get("red"),
            "ir": sample.get("ir"),
            "accX": sample.get("accX"),
            "accY": sample.get("accY"),
            "accZ": sample.get("accZ"),
            "gyroX": sample.get("gyroX"),
            "gyroY": sample.get("gyroY"),
            "gyroZ": sample.get("gyroZ"),
            "temp0": sample.get("temp0"),
            "temp1": sample.get("temp1"),
            "temp2": sample.get("temp2"),
            "hr": metrics.get("hr"),
            "bp_sys": metrics.get("bp_sys"),
            "bp_dia": metrics.get("bp_dia"),
            "spo2": metrics.get("spo2"),
            "resp_rate": metrics.get("resp_rate"),
            "metrics_source": metrics.get("source"),
            "gesture_event": gesture_event.get("trigger") if gesture_event else "",
            "gesture_gyro_mag": gesture_event.get("gyro_mag") if gesture_event else "",
            "gesture_accel_delta": "",
        })
        self.writer.writerow(row)

    def write_voice_session(
        self,
        session_id,
        transcript,
        trigger="",
        confidence=None,
        started_at=None,
        ended_at=None,
        audio_file="",
        audio_mime_type="",
        acoustic_features=None,
        linguistic_features=None,
        fused_features=None,
    ):
        acoustic_features = acoustic_features or {}
        linguistic_features = linguistic_features or {}
        fused_features = fused_features or {}

        row = {name: "" for name in self.writer.fieldnames}
        duration_sec = None
        try:
            if started_at is not None and ended_at is not None:
                duration_sec = float(ended_at) - float(started_at)
        except Exception:
            duration_sec = None

        row.update({
            "row_type": "voice",
            "timestamp": time.time(),

            "hr": latest_metrics.get("hr"),
            "bp_sys": latest_metrics.get("bp_sys"),
            "bp_dia": latest_metrics.get("bp_dia"),
            "spo2": latest_metrics.get("spo2"),
            "resp_rate": latest_metrics.get("resp_rate"),
            "metrics_source": latest_metrics.get("source"),

            "voice_session_id": session_id if 'session_id' in locals() else "",
            "voice_trigger": trigger,
            "voice_transcript": transcript,
            "voice_confidence": confidence,
            "voice_started_at": started_at,
            "voice_ended_at": ended_at,
            "voice_duration_sec": round(duration_sec, 3) if duration_sec is not None else "",
            "audio_file": audio_file,
            "audio_mime_type": audio_mime_type,
        })

        row.update({k: v for k, v in acoustic_features.items() if k in row})
        row.update({k: v for k, v in linguistic_features.items() if k in row})
        row.update({k: v for k, v in fused_features.items() if k in row})

        self.writer.writerow(row)
        self.flush()

    # Backward compatible alias.
    def write_voice_event(self, transcript, trigger="", confidence=None, started_at=None, ended_at=None):
        duration = None
        try:
            duration = float(ended_at) - float(started_at)
        except Exception:
            pass
        linguistic = compute_linguistic_features(transcript, duration)
        fused = fuse_voice_scores(linguistic, {})
        self.write_voice_session(
            session_id="legacy",
            transcript=transcript,
            trigger=trigger,
            confidence=confidence,
            started_at=started_at,
            ended_at=ended_at,
            linguistic_features=linguistic,
            fused_features=fused,
        )

    def flush(self):
        self.file.flush()


ring_buffer = RingBuffer()
csv_logger = CSVLogger()
model_runner = ModelRunner()
gesture_detector = DoubleWaveDetector(
    wave_threshold=300.0,
    max_between_swings_seconds=1.0,
    cooldown_seconds=4.0,
)

# ---------------------------------------------------------------------------
# WebSocket + BLE event handling
# ---------------------------------------------------------------------------

async def broadcast(obj):
    if not ws_clients:
        return

    msg = json.dumps(obj)
    dead = set()

    for ws in ws_clients.copy():
        try:
            await ws.send(msg)
        except Exception:
            dead.add(ws)

    ws_clients.difference_update(dead)


def notification_handler(characteristic: BleakGATTCharacteristic, data: bytearray):
    global latest_metrics

    data = bytes(data)

    if raw_dump:
        log.info("NOTIFY len=%d hex=%s", len(data), data.hex())

    packet = parse_packet(data)
    if not packet:
        return

    ring_buffer.extend(packet["samples"])

    metrics = model_runner.infer(ring_buffer)
    if metrics:
        latest_metrics = metrics

    gesture_events = []

    for sample in packet["samples"]:
        gesture_event = gesture_detector.process_sample(sample)
        if gesture_event:
            log.info(
                "VOICE TOGGLE TRIGGER: %s gyro=%s",
                gesture_event["trigger"],
                gesture_event["gyro_mag"],
            )
            gesture_events.append(gesture_event)

        csv_logger.write_ring_sample(sample, latest_metrics, gesture_event=gesture_event)

    csv_logger.flush()

    outgoing = dict(packet)
    outgoing["metrics"] = latest_metrics
    outgoing["gesture_events"] = gesture_events

    if main_loop:
        asyncio.run_coroutine_threadsafe(broadcast(outgoing), main_loop)
        for gesture_event in gesture_events:
            asyncio.run_coroutine_threadsafe(broadcast(gesture_event), main_loop)


async def find_ring(name_hint):
    log.info("Scanning for %s for 10 seconds...", name_hint)

    devices = await BleakScanner.discover(timeout=10.0)

    for d in devices:
        name = d.name or ""
        log.info("Found BLE device: %s %s", d.address, name)

        if name_hint.lower() in name.lower():
            log.info("Found ring: %s %s", d.address, name)
            return d.address

    return None


async def connect_and_stream(address, reset_first=False):
    global ring_client

    def on_disconnect(_):
        log.warning("Ring disconnected callback fired.")

        if main_loop:
            asyncio.run_coroutine_threadsafe(
                broadcast({
                    "type": "status",
                    "ring_connected": False,
                    "ring_status": "disconnected",
                    "ts": time.time(),
                }),
                main_loop,
            )

    log.info("Connecting to ring at %s...", address)

    await broadcast({
        "type": "status",
        "ring_status": "connecting",
        "ts": time.time(),
    })

    async with BleakClient(address, timeout=20.0, disconnected_callback=on_disconnect) as client:
        ring_client = client

        log.info("Connected. MTU=%s", getattr(client, "mtu_size", "?"))

        await client.start_notify(NOTIFY_UUID, notification_handler)
        await asyncio.sleep(0.8)

        if reset_first:
            stop = make_stop_cmd(1)
            log.info("Sending optional STOP/reset command: %s", stop.hex())
            await client.write_gatt_char(WRITE_UUID, stop, response=False)
            await asyncio.sleep(1.0)
            start = make_start_cmd(2)
        else:
            start = make_start_cmd(1)

        log.info("Sending START command: %s", start.hex())
        await client.write_gatt_char(WRITE_UUID, start, response=False)

        await broadcast({
            "type": "status",
            "ring_connected": True,
            "ring_status": "streaming",
            "address": address,
            "csv_path": str(csv_logger.path),
            "models_loaded": model_runner.loaded,
            "gesture": {
                "mode": "double_wave_toggle",
                "wave_threshold": gesture_detector.wave_threshold,
                "max_between_swings_seconds": gesture_detector.max_between_swings_seconds,
            },
            "ts": time.time(),
        })

        log.info("Streaming. CSV log: %s", csv_logger.path)

        while client.is_connected:
            await asyncio.sleep(1)

        ring_client = None

        await broadcast({
            "type": "status",
            "ring_connected": False,
            "ring_status": "disconnected",
            "ts": time.time(),
        })


async def pair_ring(name_or_address, reset_first=False):
    try:
        address = name_or_address if ":" in name_or_address else await find_ring(name_or_address)

        if not address:
            await broadcast({
                "type": "status",
                "ring_status": "not_found",
                "ring_connected": False,
                "ts": time.time(),
            })
            return

        await connect_and_stream(address, reset_first=reset_first)

    except asyncio.CancelledError:
        raise

    except Exception as e:
        log.error("Pair/stream error: %s", e)

        await broadcast({
            "type": "status",
            "ring_status": f"error: {e}",
            "ring_connected": False,
            "ts": time.time(),
        })


async def handle_voice_audio_chunk(data):
    """Handle a short phone audio segment while recording is still active.

    The phone sends one chunk every few seconds. The backend:
      1. saves the chunk audio,
      2. transcribes it,
      3. appends it to the session transcript,
      4. broadcasts the live transcript back to the app.
    """
    session_id = data.get("session_id") or "default"
    audio_base64 = data.get("audio_base64", "")
    audio_mime_type = data.get("audio_mime_type", "audio/webm")
    trigger = data.get("trigger", "double_wave_toggle")
    started_at = data.get("started_at", None)
    chunk_index = data.get("chunk_index", None)
    acoustic_features = data.get("acoustic_features", {}) or {}

    if session_id not in voice_sessions:
        voice_sessions[session_id] = {
            "transcript": "",
            "trigger": trigger,
            "started_at": started_at or time.time(),
            "audio_files": [],
            "last_acoustic_features": {},
        }

    state = voice_sessions[session_id]

    audio_file = ""
    text_piece = ""

    if audio_base64:
        audio_file = save_audio_base64(audio_base64, audio_mime_type)
        state["audio_files"].append(audio_file)
        text_piece = transcribe_audio_file(audio_file)

    if text_piece:
        state["transcript"] = merge_transcript(state.get("transcript", ""), text_piece)

    state["last_acoustic_features"] = acoustic_features

    duration = None
    try:
        duration = time.time() - float(state.get("started_at", time.time()))
    except Exception:
        pass

    linguistic_features = compute_linguistic_features(state.get("transcript", ""), duration)
    fused_features = fuse_voice_scores(linguistic_features, acoustic_features)

    await broadcast({
        "type": "voice_partial",
        "session_id": session_id,
        "chunk_index": chunk_index,
        "text_piece": text_piece,
        "text": state.get("transcript", ""),
        "audio_file": audio_file,
        "linguistic_features": linguistic_features,
        "fused_features": fused_features,
        "ts": time.time(),
    })

    log.info("Voice chunk processed session=%s chunk=%s text_piece=%r", session_id, chunk_index, text_piece)


async def handle_voice_session(data):
    """Finalize a phone voice session and write the final transcript/features to CSV."""
    session_id = data.get("session_id") or "default"
    explicit_text = data.get("text", "").strip()
    trigger = data.get("trigger", "")
    confidence = data.get("confidence", None)
    started_at = data.get("started_at", None)
    ended_at = data.get("ended_at", time.time())
    acoustic_features = data.get("acoustic_features", {}) or {}
    audio_base64 = data.get("audio_base64", "")
    audio_mime_type = data.get("audio_mime_type", "audio/webm")

    state = voice_sessions.get(session_id, {
        "transcript": "",
        "trigger": trigger,
        "started_at": started_at,
        "audio_files": [],
        "last_acoustic_features": {},
    })

    transcript = explicit_text or state.get("transcript", "")
    final_audio_file = ""

    if audio_base64:
        final_audio_file = save_audio_base64(audio_base64, audio_mime_type)
    elif state.get("audio_files"):
        final_audio_file = state["audio_files"][-1]

    if not transcript and final_audio_file:
        transcript = transcribe_audio_file(final_audio_file)

    if not acoustic_features:
        acoustic_features = state.get("last_acoustic_features", {}) or {}

    duration = None
    try:
        if started_at is not None and ended_at is not None:
            duration = float(ended_at) - float(started_at)
    except Exception:
        duration = None

    linguistic_features = compute_linguistic_features(transcript, duration)
    fused_features = fuse_voice_scores(linguistic_features, acoustic_features)

    if transcript or final_audio_file:
        csv_logger.write_voice_session(
            session_id=session_id,
            transcript=transcript,
            trigger=trigger or state.get("trigger", ""),
            confidence=confidence,
            started_at=started_at or state.get("started_at"),
            ended_at=ended_at,
            audio_file=final_audio_file,
            audio_mime_type=audio_mime_type,
            acoustic_features=acoustic_features,
            linguistic_features=linguistic_features,
            fused_features=fused_features,
        )

    await broadcast({
        "type": "voice_logged",
        "session_id": session_id,
        "text": transcript,
        "trigger": trigger,
        "confidence": confidence,
        "audio_file": final_audio_file,
        "acoustic_features": acoustic_features,
        "linguistic_features": linguistic_features,
        "fused_features": fused_features,
        "ts": time.time(),
    })

    if session_id in voice_sessions:
        del voice_sessions[session_id]

    log.info("Voice session logged session=%s text_len=%d audio=%s", session_id, len(transcript), final_audio_file)

async def ws_handler(websocket):
    global pair_task

    ws_clients.add(websocket)
    log.info("Browser connected")

    try:
        await websocket.send(json.dumps({
            "type": "status",
            "ring_connected": ring_client is not None and ring_client.is_connected,
            "ring_status": "idle" if ring_client is None else "streaming",
            "models_loaded": model_runner.loaded,
            "csv_path": str(csv_logger.path),
            "gesture": {
                "mode": "double_wave_toggle",
                "wave_threshold": gesture_detector.wave_threshold,
                "max_between_swings_seconds": gesture_detector.max_between_swings_seconds,
            },
            "ts": time.time(),
        }))

        async for msg in websocket:
            try:
                data = json.loads(msg)
            except Exception:
                continue

            cmd = data.get("cmd")

            if cmd == "pair_ring":
                ring_name = data.get("ring_name") or RING_NAME
                reset_first = bool(data.get("reset_first", False))

                if pair_task and not pair_task.done():
                    await websocket.send(json.dumps({
                        "type": "status",
                        "ring_status": "already_pairing",
                        "ts": time.time(),
                    }))
                else:
                    pair_task = asyncio.create_task(pair_ring(ring_name, reset_first=reset_first))
                    await websocket.send(json.dumps({
                        "type": "status",
                        "ring_status": "pair_requested",
                        "ts": time.time(),
                    }))

            elif cmd == "disconnect_ring":
                if pair_task and not pair_task.done():
                    pair_task.cancel()

                if ring_client and ring_client.is_connected:
                    await ring_client.disconnect()

                await broadcast({
                    "type": "status",
                    "ring_status": "disconnect_requested",
                    "ring_connected": False,
                    "ts": time.time(),
                })

            elif cmd == "voice_audio_chunk":
                await handle_voice_audio_chunk(data)

            elif cmd in ("voice_transcript", "voice_session"):
                await handle_voice_session(data)

            elif cmd == "set_gesture_thresholds":
                gyro_threshold = data.get("wave_threshold")
                accel_delta_threshold = data.get("max_between_swings_seconds")

                if gyro_threshold is not None:
                    gesture_detector.wave_threshold = float(gyro_threshold)

                if accel_delta_threshold is not None:
                    gesture_detector.max_between_swings_seconds = float(accel_delta_threshold)

                await broadcast({
                    "type": "status",
                    "ring_status": "gesture_thresholds_updated",
                    "gesture": {
                        "mode": "double_wave_toggle",
                        "wave_threshold": gesture_detector.wave_threshold,
                        "max_between_swings_seconds": gesture_detector.max_between_swings_seconds,
                    },
                    "ts": time.time(),
                })

    finally:
        ws_clients.discard(websocket)
        log.info("Browser disconnected")


async def main(port, host):
    global main_loop

    main_loop = asyncio.get_running_loop()

    log.info("Starting backend at ws://%s:%d", host, port)
    log.info("CSV logging to %s", csv_logger.path)
    log.info("Audio logging to %s", AUDIO_DIR)

    ws_server = await serve(ws_handler, host, port)

    try:
        await ws_server.serve_forever()
    finally:
        ws_server.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--raw-dump", action="store_true")

    args = parser.parse_args()
    raw_dump = args.raw_dump

    try:
        asyncio.run(main(args.port, args.host))
    except KeyboardInterrupt:
        log.info("Stopped.")