import React, { useState } from 'react';
import { ActualScreen } from './ActualScreen';
import { GapScreen } from './GapScreen';
import { ReflectionScreen } from './ReflectionScreen';
import { BodyNoteScreen } from './BodyNoteScreen';
import { markMealComplete } from '../../services/meals';

interface DelayedCheckInFlowProps {
  mealId: string;
  mealText: string;
  /** Returns to the feed once the meal is fully logged. */
  onExit: () => void;
}

type Step = 'actual' | 'gap' | 'reflection' | 'body';
const ORDER: Step[] = ['actual', 'gap', 'reflection', 'body'];

/**
 * PHASE 3 — Delayed check-in (Screens 10–12 + the gap view). Opened from the
 * +30 min notification: How are you actually? → How close were you? → Why? →
 * How does your body feel? Marks the meal complete at the end.
 */
export const DelayedCheckInFlow: React.FC<DelayedCheckInFlowProps> = ({
  mealId,
  mealText,
  onExit,
}) => {
  const [step, setStep] = useState<Step>('actual');
  const i = ORDER.indexOf(step);
  const back = () => (i > 0 ? setStep(ORDER[i - 1]) : onExit());

  const complete = async () => {
    try {
      await markMealComplete(mealId);
    } catch (e) {
      console.error('Failed to mark meal complete:', e);
    }
    onExit();
  };

  switch (step) {
    case 'actual':
      return (
        <ActualScreen
          mealId={mealId}
          mealText={mealText}
          onNext={() => setStep('gap')}
          onBack={onExit}
        />
      );
    case 'gap':
      return <GapScreen mealId={mealId} onNext={() => setStep('reflection')} onBack={back} />;
    case 'reflection':
      return <ReflectionScreen mealId={mealId} onNext={() => setStep('body')} onBack={back} />;
    case 'body':
      return <BodyNoteScreen mealId={mealId} onComplete={complete} onBack={back} />;
  }
};
