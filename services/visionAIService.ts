import Constants from 'expo-constants';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';
const TIMEOUT_MS = 30000;

function getApiKey(): string {
  const key = Constants.expoConfig?.extra?.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not configured');
  return key;
}

async function callClaude(body: object): Promise<string> {
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
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractJSON(text: string): object {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in response');
  return JSON.parse(match[0]);
}

export const estimateCalories = async (
  imageBase64: string,
  mediaType: string
): Promise<{ estimatedCalories: number; breakdown: string; confidence: string }> => {
  const text = await callClaude({
    model: MODEL,
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          {
            type: 'text',
            text: 'Analyze this meal photo and estimate calories. Respond with JSON only: {"estimatedCalories": <number>, "breakdown": "<brief description of food items and their calories>", "confidence": "low"|"medium"|"high"}',
          },
        ],
      },
    ],
  });

  const result = extractJSON(text) as { estimatedCalories: number; breakdown: string; confidence: string };
  return result;
};

export const recommendFromIngredients = async (
  ingredients: string,
  intention: string,
  dietGoal: string
): Promise<{ dish: string; rationale: string; steps: string[] }> => {
  const text = await callClaude({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a nutrition-aware cooking assistant. The user's diet goal is: "${dietGoal}".

Available ingredients: ${ingredients}
Meal intention: ${intention}

Suggest one dish to cook. Respond with JSON only: {"dish": "<dish name>", "rationale": "<why this fits their goal and intention>", "steps": ["<step 1>", "<step 2>", ...]}`,
      },
    ],
  });

  return extractJSON(text) as { dish: string; rationale: string; steps: string[] };
};

export const recommendFromMenu = async (
  menuImageBase64: string,
  mediaType: string,
  intention: string,
  dietGoal: string
): Promise<{ items: string[]; rationale: string; alternatives: string }> => {
  const text = await callClaude({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: menuImageBase64 },
          },
          {
            type: 'text',
            text: `You are a nutrition-aware dining assistant. The user's diet goal is: "${dietGoal}". Meal intention: "${intention}".

Analyze this menu photo and recommend the best options. Respond with JSON only: {"items": ["<item 1>", "<item 2>"], "rationale": "<why these items fit their goal>", "alternatives": "<alternative options if they want something different>"}`,
          },
        ],
      },
    ],
  });

  return extractJSON(text) as { items: string[]; rationale: string; alternatives: string };
};
