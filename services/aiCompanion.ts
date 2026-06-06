import { UserFoodProfile, FoodEntry } from '../types/food';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

function apiKey(): string {
  return (process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '').trim();
}

function buildSystemPrompt(profile: UserFoodProfile): string {
  const cuisines = profile.favoriteCuisines.join(', ') || 'various cuisines';
  const restrictions = profile.restrictions.length
    ? `Dietary restrictions: ${profile.restrictions.join(', ')}.`
    : '';
  const goals = profile.goals.length ? `Goals: ${profile.goals.join(', ')}.` : '';

  return `You are a warm, knowledgeable meal companion helping the user make mindful food choices and reflect on their eating habits.

User's food profile:
- Favourite cuisines: ${cuisines}
- ${restrictions}
- ${goals}
- What they love about food: ${profile.foodLoveDescription}
- What they want to change: ${profile.changeDescription}

Keep responses concise (2–4 sentences), conversational, and encouraging. Suggest specific dishes when helpful. Ask one follow-up question at most.`;
}

async function callClaude(system: string, userMessage: string, maxTokens = 300): Promise<string> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey(),
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${err}`);
  }

  const data = await res.json();
  const block = data.content?.[0];
  return block?.type === 'text' ? block.text : '';
}

// Simulate streaming by revealing the response word-by-word after a single fetch call.
// React Native's Hermes runtime does not support ReadableStream from fetch body,
// so true SSE streaming is not available in-app without a proxy server.
export async function streamMealSuggestion(
  profile: UserFoodProfile,
  moodText: string,
  onChunk: (text: string) => void,
  onDone: () => void
): Promise<void> {
  const text = await callClaude(buildSystemPrompt(profile), moodText, 300);

  // Reveal word-by-word for a streaming feel
  const words = text.split(' ');
  for (let i = 0; i < words.length; i++) {
    const chunk = (i === 0 ? '' : ' ') + words[i];
    onChunk(chunk);
    await delay(30);
  }
  onDone();
}

export async function generateReflectionInsight(entry: Partial<FoodEntry>): Promise<string> {
  return callClaude(
    'You are a mindful eating coach. Give one short encouraging insight (1–2 sentences).',
    `I just ate ${entry.foodName}. Mood: ${entry.moodRating}/6. Body: ${entry.bodyFeeling}/100. Reflection: "${entry.reflectionText}".`,
    150
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
