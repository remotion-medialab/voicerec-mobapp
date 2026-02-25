import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';
const TIMEOUT_MS = 60000; // audio payloads are larger

function getApiKey(): string {
  const key = Constants.expoConfig?.extra?.anthropicApiKey;
  if (!key) throw new Error('ANTHROPIC_API_KEY not configured');
  return key;
}

/**
 * Transcribes a local audio recording using Claude's multimodal API.
 * @param audioUri - local file URI (e.g. from expo-av stopRecording)
 * @returns transcript string
 */
export const transcribeAudio = async (audioUri: string): Promise<string> => {
  // Read audio file as base64
  const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
    encoding: 'base64',
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': getApiKey(),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'audio/mp4',
                  data: base64Audio,
                },
              },
              {
                type: 'text',
                text: 'Transcribe this audio recording exactly as spoken. Return only the transcription text, nothing else.',
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Transcription failed (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return (data.content?.[0]?.text as string) ?? '';
  } finally {
    clearTimeout(timeoutId);
  }
};
