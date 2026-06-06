import React, { useState } from 'react';
import { TastesScreen } from './TastesScreen';
import { DietaryScreen } from './DietaryScreen';
import { VoiceOnboardingScreen } from './VoiceOnboardingScreen';

interface OnboardingFlowProps {
  /** Called once the user finishes the one-time profile setup. */
  onComplete: () => void;
}

type Step = 'tastes' | 'dietary' | 'voice';
const ORDER: Step[] = ['tastes', 'dietary', 'voice'];

/** Sequences the one-time profile screens (Phase A, post-auth). */
export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('tastes');
  const i = ORDER.indexOf(step);

  const next = () => (i < ORDER.length - 1 ? setStep(ORDER[i + 1]) : onComplete());
  const back = () => i > 0 && setStep(ORDER[i - 1]);

  switch (step) {
    case 'tastes':
      return <TastesScreen onNext={next} onBack={back} />;
    case 'dietary':
      return <DietaryScreen onNext={next} onBack={back} />;
    case 'voice':
      return <VoiceOnboardingScreen onNext={next} onBack={back} />;
  }
};
