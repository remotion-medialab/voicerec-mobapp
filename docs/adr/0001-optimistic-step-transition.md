# ADR-0001: Optimistic step transition in the recording flow

- **Status**: Accepted
- **Date**: 2026-05-21
- **Deciders**: Mohanad Kandil
- **Related code**: `components/recording/RecordingApp.tsx`, `services/recording.ts`

## Context

Each step in the five-step voice reflection flow asks the user a question, records their answer, and then advances to the next prompt. In the original implementation, tapping the *Done* button blocked the UI for two to three seconds while the following work ran sequentially on the main thread:

1. `expo-av` finalized the m4a file (`stopAndUnloadAsync`).
2. `expo-sensors` flushed about a hundred buffered readings to Firestore.
3. The local recording list was read from AsyncStorage and rewritten.
4. The upload metadata was queued.

On top of that, every tap on *Record* re-requested the microphone permission and re-probed sensor availability, and the waveform held a three-second warm-up before becoming visible. The user perceived the recording flow as sluggish even though the network was not the bottleneck.

## Decision

Make the step transition optimistic: the UI advances to the next prompt the instant the user taps *Done*. All four heavy operations run in a fire-and-forget background pipeline. The session id, step number, duration, and question text are snapshotted before the state change so the background pipeline writes against the correct step.

Concretely:

- `RecordingApp.stopRecording` returns to the idle state in one frame.
- `sensorService.stopRecording()` is not awaited.
- `recordingService.stopRecording()` (`expo-av` finalize) runs in the background; on success the URI is passed to `saveRecordingLocally` and `backgroundUploadService.queueForLater`.
- If the background pipeline fails, a non-blocking `Alert` surfaces a "Saved with warning" message and recommends re-recording the step from the summary; the UI does not roll back.
- Permissions, audio mode, and sensor availability are pre-warmed in a mount-time `useEffect`.
- The three-second `'recording'` warm-up state is removed; `'active-recording'` is set immediately.
- `saveRecordingLocally` is synchronous against an in-memory cache; the AsyncStorage write is fire-and-forget.

## Consequences

**Positive**

- Per-step transition latency drops from ~2.4 s to a single frame.
- Tapping *Record* no longer pays the cost of a permission round-trip or a sensor probe.
- The waveform is visible from the first second.
- Local saves are O(1) against the in-memory cache and scale with the cache, not with the number of stored recordings.

**Negative / trade-offs**

- A failure in `stopAndUnloadAsync` can no longer block the user on the same step. The user must re-record from the summary if it fails. We accept this because the failure is rare in practice and the perceived-instant flow is worth the trade.
- The in-memory cache must be kept in lockstep with any AsyncStorage write made from other modules. We enforce this by routing every write through `recordingService.updateLocalRecording`.
- A second tap on *Record* can race with the previous step's still-running unload. We handle this in `recordingService.startRecording` by awaiting any existing recording before creating a new one.

## Notes

The choice is reversible. Reverting requires re-introducing `await` around the heavy operations in `stopRecording` and re-enabling the warm-up state machine. No data is restructured by this decision.

The result was measured against a real device (iPhone 14, iOS 18) and ten consecutive runs of the full five-step flow; the per-step transition was reduced from 2.4 s (median) to under one frame.
