import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  CounterfactualWorkflow as WorkflowData,
  StageCounterfactualWorkflows,
  STAGE_NAMES,
} from '../../types/session';
import { CounterfactualService } from '../../services/counterfactual';
import { CounterfactualWorkflow } from './CounterfactualWorkflow';

interface RecordingData {
  id: string;
  stepNumber: number;
  transcriptionText: string;
  type?: string;
  content?: string;
  title?: string;
}

interface StageAccordionProps {
  sessionNumber: number;
  recordings: RecordingData[];
  goalName: string;
  stageWorkflows: StageCounterfactualWorkflows | null;
  legacyWorkflow: WorkflowData | null;
  totalStages: number;
  onComplete: () => void;
  humanOnly?: boolean;
}

const STATUS_COLORS: Record<number, string> = {
  0: '#ef4444', // Red - not started
  1: '#eab308', // Yellow - in progress
  2: '#22c55e', // Green - complete
};

export const StageAccordion: React.FC<StageAccordionProps> = ({
  sessionNumber,
  recordings,
  goalName,
  stageWorkflows: initialStageWorkflows,
  legacyWorkflow,
  totalStages,
  onComplete,
  humanOnly = false,
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  // Local cache of stage workflows so collapse/re-expand preserves data
  const [localStageWorkflows, setLocalStageWorkflows] = useState<StageCounterfactualWorkflows>(
    initialStageWorkflows || {}
  );

  const handleWorkflowChange = useCallback((index: number, workflow: WorkflowData) => {
    setLocalStageWorkflows((prev) => ({ ...prev, [index]: workflow }));
  }, []);

  const getStageWorkflow = (index: number): WorkflowData | null => {
    if (localStageWorkflows[index]) return localStageWorkflows[index];
    // Backward compat: if only legacy workflow and single stage, use it for stage 0
    if (Object.keys(localStageWorkflows).length === 0 && legacyWorkflow && totalStages === 1 && index === 0) {
      return legacyWorkflow;
    }
    return null;
  };

  const getStageStatus = (index: number): number => {
    const wf = getStageWorkflow(index);
    if (!wf) return 0;
    return CounterfactualService.getReflectionStatus(wf.currentStep);
  };

  const getStageName = (index: number): string => {
    const rec = recordings[index];
    if (rec?.title) return rec.title;
    return STAGE_NAMES[index] || `Stage ${index + 1}`;
  };

  const getStageContext = (index: number): string => {
    const rec = recordings[index];
    if (!rec) return '';
    if (rec.type === 'text') return rec.content || '';
    return rec.transcriptionText || '';
  };

  const toggleSection = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  // Backward compat: legacy workflow with no stageWorkflows
  if (!initialStageWorkflows && legacyWorkflow && totalStages <= 1) {
    const allContext = recordings
      .map((rec) => rec.type === 'text' ? rec.content || '' : rec.transcriptionText || '')
      .filter((t) => t.length > 0)
      .join('\n\n');

    return (
      <CounterfactualWorkflow
        sessionNumber={sessionNumber}
        journalContext={allContext}
        goalName={goalName}
        initialData={legacyWorkflow}
        onComplete={onComplete}
        humanOnly={humanOnly}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Counterfactual Reflections</Text>
      {Array.from({ length: totalStages }, (_, index) => {
        const isExpanded = expandedIndex === index;
        const status = getStageStatus(index);
        const name = getStageName(index);

        return (
          <View key={index} style={styles.accordionItem}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggleSection(index)}
              activeOpacity={0.7}
            >
              <View style={styles.headerLeft}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]} />
                <Text style={styles.stageName}>{name}</Text>
              </View>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#6b7280"
              />
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.accordionBody}>
                <CounterfactualWorkflow
                  sessionNumber={sessionNumber}
                  journalContext={getStageContext(index)}
                  goalName={goalName}
                  initialData={getStageWorkflow(index)}
                  onComplete={onComplete}
                  onWorkflowChange={(wf) => handleWorkflowChange(index, wf)}
                  stageIndex={index}
                  stageName={name}
                  totalStages={totalStages}
                  humanOnly={humanOnly}
                />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 12,
  },
  accordionItem: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#f9fafb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stageName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  accordionBody: {
    padding: 16,
    backgroundColor: '#ffffff',
  },
});
