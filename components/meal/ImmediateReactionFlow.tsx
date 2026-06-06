import React, { useState } from 'react';
import { TasteScreen } from './TasteScreen';
import { MouthfeelScreen } from './MouthfeelScreen';
import { markReactionComplete } from '../../services/meals';
import { scheduleBodyCheckIn, BODY_DELAY_SECONDS } from '../../services/notifications';

interface ImmediateReactionFlowProps {
  mealId: string;
  mealText: string;
  /** Returns to the feed once the reaction is logged + the body timer is set. */
  onExit: () => void;
}

type Step = 'taste' | 'feel';

/**
 * PHASE 2 — Immediate reaction (Screens 8 & 9): rate taste, then mouthfeel.
 * Submitting "How did it feel?" starts the 30-min timer: we schedule the body
 * check-in notification and flip the meal to `awaiting_body`.
 */
export const ImmediateReactionFlow: React.FC<ImmediateReactionFlowProps> = ({
  mealId,
  mealText,
  onExit,
}) => {
  const [step, setStep] = useState<Step>('taste');

  const finishReaction = async () => {
    const dueAt = new Date(Date.now() + BODY_DELAY_SECONDS * 1000);
    // Schedule the +30 min notification (best-effort), then record the due time
    // so the feed countdown + deep-link work even if permission was denied.
    let notificationId: string | null = null;
    try {
      notificationId = await scheduleBodyCheckIn(mealId, mealText);
    } catch (e) {
      console.error('Failed to schedule body check-in:', e);
    }
    try {
      await markReactionComplete(mealId, dueAt, notificationId);
    } catch (e) {
      console.error('Failed to mark reaction complete:', e);
    }
    onExit();
  };

  if (step === 'taste') {
    return (
      <TasteScreen
        mealId={mealId}
        mealText={mealText}
        onNext={() => setStep('feel')}
        onBack={onExit}
      />
    );
  }

  return (
    <MouthfeelScreen
      mealId={mealId}
      mealText={mealText}
      onNext={finishReaction}
      onBack={() => setStep('taste')}
    />
  );
};
