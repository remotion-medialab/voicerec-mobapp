import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { serverTimestamp } from 'firebase/firestore';
import {
  CounterfactualWorkflow as WorkflowData,
  AICounterfactual,
  CounterfactualRating,
  CounterfactualStep,
} from '../../types/session';
import { CounterfactualService } from '../../services/counterfactual';
import { StepHumanCounterfactual } from './StepHumanCounterfactual';
import { StepGenerateAI } from './StepGenerateAI';
import { StepRateAI } from './StepRateAI';
import { StepSelectFavorite } from './StepSelectFavorite';
import { StepCompare } from './StepCompare';

const STEP_LABELS = ['Write', 'Generate', 'Rate', 'Select', 'Compare'];

interface CounterfactualWorkflowProps {
  sessionNumber: number;
  journalContext: string;
  goalName: string;
  initialData: WorkflowData | null;
  onComplete: () => void;
  onWorkflowChange?: (workflow: WorkflowData) => void;
  stageIndex?: number;
  stageName?: string;
  totalStages?: number;
}

const createDefaultWorkflow = (): WorkflowData => ({
  humanCounterfactual: '',
  aiCounterfactuals: [],
  previousGenerations: [],
  favoriteIndex: null,
  editedFavorite: null,
  overallPreference: null,
  currentStep: 0 as CounterfactualStep,
  generatedAt: null,
  completedAt: null,
});

export const CounterfactualWorkflow: React.FC<CounterfactualWorkflowProps> = ({
  sessionNumber,
  journalContext,
  goalName,
  initialData,
  onComplete,
  onWorkflowChange,
  stageIndex,
  stageName,
  totalStages,
}) => {
  const [workflow, setWorkflow] = useState<WorkflowData>(
    initialData || createDefaultWorkflow()
  );

  const updateAndSave = useCallback(
    async (updates: Partial<WorkflowData>) => {
      const updated = { ...workflow, ...updates };
      setWorkflow(updated);
      try {
        await CounterfactualService.saveWorkflow(sessionNumber, updated, stageIndex, totalStages);
        onWorkflowChange?.(updated);
      } catch (error) {
        console.error('Failed to save workflow:', error);
      }
    },
    [workflow, sessionNumber, stageIndex, totalStages, onWorkflowChange]
  );

  // Step 1: Submit human counterfactual
  const handleHumanSubmit = async (text: string) => {
    await updateAndSave({
      humanCounterfactual: text,
      currentStep: 1 as CounterfactualStep,
    });
  };

  // Step 2: Generate AI counterfactuals (archives previous generation if any)
  const handleGenerate = async () => {
    const newResults = await CounterfactualService.generateAICounterfactuals(
      workflow.humanCounterfactual,
      journalContext,
      goalName,
      stageName
    );

    // Archive previous generation if it exists
    const prevGenerations = [...(workflow.previousGenerations || [])];
    if (workflow.aiCounterfactuals.length > 0) {
      prevGenerations.push(workflow.aiCounterfactuals);
    }

    await updateAndSave({
      aiCounterfactuals: newResults,
      previousGenerations: prevGenerations,
      // Reset downstream state on regeneration
      favoriteIndex: null,
      editedFavorite: null,
      overallPreference: null,
      generatedAt: serverTimestamp(),
    });
  };

  const handleGenerateContinue = async () => {
    await updateAndSave({ currentStep: 2 as CounterfactualStep });
  };

  // Step 3: Rate AI counterfactuals
  const handleRate = (
    index: number,
    quality: keyof CounterfactualRating,
    value: number
  ) => {
    const updated = [...workflow.aiCounterfactuals];
    const existing = updated[index].rating || {
      relevance: 0,
      specificity: 0,
      actionability: 0,
      faithfulness: 0,
    };
    updated[index] = {
      ...updated[index],
      rating: { ...existing, [quality]: value },
    };
    setWorkflow((prev) => ({ ...prev, aiCounterfactuals: updated }));
  };

  const handleRateSubmit = async () => {
    await updateAndSave({
      aiCounterfactuals: workflow.aiCounterfactuals,
      currentStep: 3 as CounterfactualStep,
    });
  };

  // Step 4: Select favorite
  const handleSelectFavorite = (index: number) => {
    setWorkflow((prev) => ({ ...prev, favoriteIndex: index }));
  };

  const handleConfirmFavorite = async () => {
    if (workflow.favoriteIndex === null) return;
    await updateAndSave({
      favoriteIndex: workflow.favoriteIndex,
      editedFavorite: workflow.aiCounterfactuals[workflow.favoriteIndex].text,
      currentStep: 4 as CounterfactualStep,
    });
  };

  // Step 5: Compare & Done
  const handleEditFavorite = (text: string) => {
    setWorkflow((prev) => ({ ...prev, editedFavorite: text }));
  };

  const handleSetPreference = (pref: 'human' | 'ai') => {
    setWorkflow((prev) => ({ ...prev, overallPreference: pref }));
  };

  const handleDone = async () => {
    await updateAndSave({
      editedFavorite: workflow.editedFavorite,
      overallPreference: workflow.overallPreference,
      currentStep: 5 as CounterfactualStep,
      completedAt: serverTimestamp(),
    });
    Alert.alert('Success', 'Your counterfactual reflection has been saved!', [
      { text: 'OK', onPress: onComplete },
    ]);
  };

  const currentStep = workflow.currentStep;

  return (
    <View style={styles.container}>
      {/* Step Progress Indicator */}
      <View style={styles.progressContainer}>
        {STEP_LABELS.map((label, index) => {
          const stepNum = index + 1;
          const isCompleted = currentStep >= stepNum;
          const isCurrent = currentStep === index;
          return (
            <View key={label} style={styles.progressStep}>
              <View
                style={[
                  styles.progressCircle,
                  isCompleted && styles.progressCircleCompleted,
                  isCurrent && styles.progressCircleCurrent,
                ]}
              >
                <Text
                  style={[
                    styles.progressNumber,
                    (isCompleted || isCurrent) && styles.progressNumberActive,
                  ]}
                >
                  {stepNum}
                </Text>
              </View>
              <Text
                style={[
                  styles.progressLabel,
                  (isCompleted || isCurrent) && styles.progressLabelActive,
                ]}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Step 1: Human Counterfactual */}
      {currentStep >= 0 && (
        <StepHumanCounterfactual
          value={workflow.humanCounterfactual}
          isCompleted={currentStep >= 1}
          onSubmit={handleHumanSubmit}
        />
      )}

      {/* Step 2: Generate AI */}
      {currentStep >= 1 && (
        <StepGenerateAI
          aiCounterfactuals={workflow.aiCounterfactuals}
          previousGenerations={workflow.previousGenerations || []}
          isCompleted={currentStep >= 2}
          onGenerate={handleGenerate}
          onContinue={handleGenerateContinue}
        />
      )}

      {/* Step 3: Rate AI */}
      {currentStep >= 2 && (
        <StepRateAI
          aiCounterfactuals={workflow.aiCounterfactuals}
          isCompleted={currentStep >= 3}
          onRate={handleRate}
          onSubmit={handleRateSubmit}
        />
      )}

      {/* Step 4: Select Favorite */}
      {currentStep >= 3 && (
        <StepSelectFavorite
          aiCounterfactuals={workflow.aiCounterfactuals}
          favoriteIndex={workflow.favoriteIndex}
          isCompleted={currentStep >= 4}
          onSelect={handleSelectFavorite}
          onConfirm={handleConfirmFavorite}
        />
      )}

      {/* Step 5: Compare */}
      {currentStep >= 4 && workflow.favoriteIndex !== null && (
        <StepCompare
          humanCounterfactual={workflow.humanCounterfactual}
          aiFavoriteTitle={workflow.aiCounterfactuals[workflow.favoriteIndex].title}
          aiFavoriteText={workflow.aiCounterfactuals[workflow.favoriteIndex].text}
          aiFavoriteTags={workflow.aiCounterfactuals[workflow.favoriteIndex].tags}
          editedFavorite={workflow.editedFavorite}
          overallPreference={workflow.overallPreference}
          onEditFavorite={handleEditFavorite}
          onSetPreference={handleSetPreference}
          onDone={handleDone}
        />
      )}

      {/* Completed message */}
      {currentStep === 5 && (
        <View style={styles.completedBanner}>
          <Text style={styles.completedBannerText}>Reflection Complete</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  progressCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressCircleCurrent: {
    backgroundColor: '#3b82f6',
  },
  progressCircleCompleted: {
    backgroundColor: '#22c55e',
  },
  progressNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9ca3af',
  },
  progressNumberActive: {
    color: '#ffffff',
  },
  progressLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
  progressLabelActive: {
    color: '#1f2937',
  },
  completedBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  completedBannerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22c55e',
  },
});
