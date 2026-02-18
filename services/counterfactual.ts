import { doc, setDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { CounterfactualWorkflow, CounterfactualStep, AICounterfactual, StageCounterfactualWorkflows } from '../types/session';
import Constants from 'expo-constants';

const API_KEY = Constants.expoConfig?.extra?.anthropicApiKey || '';
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

interface APICounterfactual {
  title: string;
  text: string;
  tags: string[];
}

/**
 * Service for managing the counterfactual workflow
 */
export class CounterfactualService {
  /**
   * Generate 3 AI counterfactuals using Anthropic Claude API.
   * Returns structured objects with title, text, and tags.
   */
  static async generateAICounterfactuals(
    humanCounterfactual: string,
    journalContext: string,
    goalName: string,
    stageName?: string
  ): Promise<AICounterfactual[]> {
    if (!API_KEY) {
      throw new Error('Anthropic API key not configured. Add ANTHROPIC_API_KEY to your .env file.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const stageContext = stageName ? `\nThis reflection is about the '${stageName}' stage.\n` : '';
      const prompt = `You are a supportive and encouraging coach helping someone reflect on a personal situation related to their goal: "${goalName}".
${stageContext}
Here is their journal entry describing what happened:
"""
${journalContext}
"""

They wrote this counterfactual (what they could have done differently):
"""
${humanCounterfactual}
"""

Generate exactly 3 alternative counterfactuals that augment, expand, refine, and diversify the user's human counterfactual. Each must:
- Stay strictly grounded in the journal entry. Do NOT invent or assume any facts, people, events, or details not explicitly stated.
- Be specific and concrete, not vague advice.
- Use actionable "next time" framing (e.g., "Next time, I could…").
- Use a supportive, encouraging tone that acknowledges the difficulty and frames this as growth.

For each counterfactual, also provide:
- A short title (3-6 words) summarizing the approach.
- 1-3 relevant tags (e.g., "communication", "boundaries", "timing").

Return ONLY valid JSON in this exact format, no other text:
{
  "counterfactuals": [
    {"title": "Short Title Here", "text": "Next time, I could...", "tags": ["tag1", "tag2"]},
    {"title": "Short Title Here", "text": "Next time, I could...", "tags": ["tag1"]},
    {"title": "Short Title Here", "text": "Next time, I could...", "tags": ["tag1", "tag2"]}
  ]
}`;

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API error ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text;

      if (!content) {
        throw new Error('Empty response from API');
      }

      // Parse the structured JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse counterfactuals from API response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const items: APICounterfactual[] = parsed.counterfactuals;

      if (!Array.isArray(items) || items.length !== 3) {
        throw new Error('Expected exactly 3 counterfactuals from API');
      }

      return items.map((item) => ({
        title: item.title || '',
        text: item.text || '',
        tags: Array.isArray(item.tags) ? item.tags : [],
        rating: null,
      }));
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Get the reflection status based on workflow step
   */
  static getReflectionStatus(step: CounterfactualStep): number {
    if (step === 0) return 0;  // Red: not started
    if (step === 5) return 2;  // Green: complete
    return 1;                  // Yellow: in progress
  }

  /**
   * Compute overall reflection status across all stage workflows.
   * Red(0) if no stages started, Yellow(1) if any started, Green(2) if ALL complete.
   */
  static getOverallReflectionStatus(
    stageWorkflows: StageCounterfactualWorkflows,
    totalStages: number
  ): number {
    const stageStatuses: number[] = [];
    for (let i = 0; i < totalStages; i++) {
      const wf = stageWorkflows[i];
      stageStatuses.push(wf ? this.getReflectionStatus(wf.currentStep) : 0);
    }

    if (stageStatuses.every((s) => s === 2)) return 2; // All complete
    if (stageStatuses.some((s) => s > 0)) return 1;    // Any started
    return 0;                                            // None started
  }

  /**
   * Save workflow data to Firestore.
   * When stageIndex is provided, saves to stageWorkflows.{stageIndex} and computes overall status.
   * Otherwise saves to legacy counterfactualWorkflow field.
   */
  static async saveWorkflow(
    sessionNumber: number,
    workflow: CounterfactualWorkflow,
    stageIndex?: number,
    totalStages?: number
  ): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const sessionRef = doc(db, 'users', user.uid, 'sessions', `session${sessionNumber}`);

    if (stageIndex !== undefined) {
      // Per-stage save using dot notation
      const workflowData = {
        humanCounterfactual: workflow.humanCounterfactual,
        aiCounterfactuals: workflow.aiCounterfactuals,
        previousGenerations: workflow.previousGenerations,
        favoriteIndex: workflow.favoriteIndex,
        editedFavorite: workflow.editedFavorite,
        overallPreference: workflow.overallPreference,
        currentStep: workflow.currentStep,
        generatedAt: workflow.generatedAt,
        completedAt: workflow.completedAt,
      };

      // Read current session to compute overall status
      const sessionSnap = await getDoc(sessionRef);
      const sessionData = sessionSnap.exists() ? sessionSnap.data() : {};
      const currentStageWorkflows: StageCounterfactualWorkflows = sessionData.stageWorkflows || {};
      const updatedStageWorkflows = { ...currentStageWorkflows, [stageIndex]: workflowData };
      const reflectionStatus = this.getOverallReflectionStatus(updatedStageWorkflows, totalStages || Object.keys(updatedStageWorkflows).length);

      await updateDoc(sessionRef, {
        [`stageWorkflows.${stageIndex}`]: workflowData,
        reflectionStatus,
      });

      console.log(`✅ Stage ${stageIndex} workflow saved for session ${sessionNumber} (step ${workflow.currentStep}, overall status ${reflectionStatus})`);
    } else {
      // Legacy single workflow save
      const reflectionStatus = this.getReflectionStatus(workflow.currentStep);

      await setDoc(
        sessionRef,
        {
          counterfactualWorkflow: {
            humanCounterfactual: workflow.humanCounterfactual,
            aiCounterfactuals: workflow.aiCounterfactuals,
            previousGenerations: workflow.previousGenerations,
            favoriteIndex: workflow.favoriteIndex,
            editedFavorite: workflow.editedFavorite,
            overallPreference: workflow.overallPreference,
            currentStep: workflow.currentStep,
            generatedAt: workflow.generatedAt,
            completedAt: workflow.completedAt,
          },
          reflectionStatus,
        },
        { merge: true }
      );

      console.log(`✅ Workflow saved for session ${sessionNumber} (step ${workflow.currentStep}, status ${reflectionStatus})`);
    }
  }

  /**
   * Load workflow data from Firestore.
   * When stageIndex is provided, loads from stageWorkflows[stageIndex].
   * Falls back to legacy counterfactualWorkflow if stageWorkflows is not present.
   */
  static async loadWorkflow(
    sessionNumber: number,
    stageIndex?: number
  ): Promise<CounterfactualWorkflow | null> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const sessionRef = doc(db, 'users', user.uid, 'sessions', `session${sessionNumber}`);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      return null;
    }

    const data = sessionSnap.data();

    if (stageIndex !== undefined) {
      // Try per-stage workflow first
      const stageWf = data.stageWorkflows?.[stageIndex];
      if (stageWf) {
        if (!stageWf.previousGenerations) stageWf.previousGenerations = [];
        return stageWf;
      }
      // No per-stage data for this index
      return null;
    }

    // Legacy: load single workflow
    if (!data.counterfactualWorkflow) return null;
    const workflow = data.counterfactualWorkflow;
    if (!workflow.previousGenerations) {
      workflow.previousGenerations = [];
    }
    return workflow;
  }
}
