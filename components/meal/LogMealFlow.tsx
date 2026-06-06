import React, { useState } from 'react';
import { MoodScreen } from './MoodScreen';
import { CompanionScreen } from './CompanionScreen';
import { LogPredictScreen } from './LogPredictScreen';
import { PreMealMoodInput } from '../../types/meal';

interface LogMealFlowProps {
  /** Returns to the feed when the meal is logged + predicted, or backed out. */
  onExit: () => void;
}

type Step = 'mood' | 'companion' | 'log';

const DEFAULT_MOOD: PreMealMoodInput = {
  current_hunger: 6,
  target_fullness: 6,
  cravings: [],
};

/**
 * Front-end of the meal-log flow: decide first, then log.
 * Screen 5 (mood) → either the AI companion (Screen 6) or straight to logging
 * (Screen 7). Both paths converge on LogPredictScreen, which creates the meal.
 *
 * Mood selections live here (not in MoodScreen) so they survive navigating to
 * the companion and back. They're persisted once, when the meal is logged.
 */
export const LogMealFlow: React.FC<LogMealFlowProps> = ({ onExit }) => {
  const [step, setStep] = useState<Step>('mood');
  const [mood, setMood] = useState<PreMealMoodInput>(DEFAULT_MOOD);
  const [mealText, setMealText] = useState('');
  const [via, setVia] = useState<'companion' | 'in_mind'>('in_mind');

  const updateMood = (patch: Partial<PreMealMoodInput>) => setMood((m) => ({ ...m, ...patch }));

  switch (step) {
    case 'mood':
      return (
        <MoodScreen
          value={mood}
          onChange={updateMood}
          onDecideWithAI={() => setStep('companion')}
          onHaveInMind={() => {
            setVia('in_mind');
            setMealText('');
            setStep('log');
          }}
          onBack={onExit}
        />
      );

    case 'companion':
      return (
        <CompanionScreen
          onDecided={(text) => {
            setVia('companion');
            setMealText(text);
            setStep('log');
          }}
          onBack={() => setStep('mood')}
        />
      );

    case 'log':
      return (
        <LogPredictScreen
          initialMealText={mealText}
          via={via}
          mood={mood}
          onComplete={onExit}
          onBack={() => setStep(via === 'companion' ? 'companion' : 'mood')}
        />
      );
  }
};
