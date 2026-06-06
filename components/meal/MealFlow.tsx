import React, { useState } from 'react';
import { MoodScreen } from './MoodScreen';
import { CompanionScreen } from './CompanionScreen';
import { PredictionScreen } from './PredictionScreen';
import { TasteScreen } from './TasteScreen';
import { MouthfeelScreen } from './MouthfeelScreen';
import { ActualScreen } from './ActualScreen';
import { ReflectionScreen } from './ReflectionScreen';
import { BodyNoteScreen } from './BodyNoteScreen';

interface MealFlowProps {
  /** Returns to the home feed when the lifecycle finishes or is exited early. */
  onExit: () => void;
}

type Step =
  | 'mood'
  | 'companion'
  | 'prediction'
  | 'taste'
  | 'mouthfeel'
  | 'actual'
  | 'reflection'
  | 'body';

const ORDER: Step[] = [
  'mood',
  'companion',
  'prediction',
  'taste',
  'mouthfeel',
  'actual',
  'reflection',
  'body',
];

/**
 * Runs the full meal lifecycle (Screens 5–12) as one continuous flow. The
 * meal_id is minted at the companion step and threaded through every later
 * phase's Firestore write.
 */
export const MealFlow: React.FC<MealFlowProps> = ({ onExit }) => {
  const [step, setStep] = useState<Step>('mood');
  const [mealId, setMealId] = useState<string | null>(null);
  const [mealText, setMealText] = useState('');

  const go = (s: Step) => setStep(s);
  const prev = () => {
    const i = ORDER.indexOf(step);
    if (i <= 0) onExit();
    else go(ORDER[i - 1]);
  };

  switch (step) {
    case 'mood':
      return <MoodScreen onNext={() => go('companion')} onBack={onExit} />;

    case 'companion':
      return (
        <CompanionScreen
          onBack={prev}
          onNext={(id, text) => {
            setMealId(id);
            setMealText(text);
            go('prediction');
          }}
        />
      );

    case 'prediction':
      return mealId ? (
        <PredictionScreen
          mealId={mealId}
          mealText={mealText}
          onNext={() => go('taste')}
          onBack={prev}
        />
      ) : null;

    case 'taste':
      return mealId ? (
        <TasteScreen
          mealId={mealId}
          mealText={mealText}
          onNext={() => go('mouthfeel')}
          onBack={prev}
        />
      ) : null;

    case 'mouthfeel':
      return mealId ? (
        <MouthfeelScreen
          mealId={mealId}
          mealText={mealText}
          onNext={() => go('actual')}
          onBack={prev}
        />
      ) : null;

    case 'actual':
      return mealId ? (
        <ActualScreen
          mealId={mealId}
          mealText={mealText}
          onNext={() => go('reflection')}
          onBack={prev}
        />
      ) : null;

    case 'reflection':
      return mealId ? (
        <ReflectionScreen mealId={mealId} onNext={() => go('body')} onBack={prev} />
      ) : null;

    case 'body':
      return mealId ? <BodyNoteScreen mealId={mealId} onComplete={onExit} onBack={prev} /> : null;
  }
};
