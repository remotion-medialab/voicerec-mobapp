import React from 'react';
import { View, StyleSheet } from 'react-native';

interface ProgressCirclesProps {
  currentStep: number;
  isRecording: boolean;
}

export function ProgressCircles(props: ProgressCirclesProps) {
  const { currentStep, isRecording } = props;
  const totalSteps = 3;

  const renderCircle = (stepIndex: number) => {
    const isCompleted = stepIndex < currentStep;
    const isCurrent = stepIndex === currentStep;

    let circleStyle;
    if (isCompleted) {
      circleStyle = [styles.circleBase, styles.completed];
    } else if (isCurrent) {
      if (isRecording) {
        circleStyle = [styles.circleBase, styles.currentRecording];
      } else {
        circleStyle = [styles.circleBase, styles.current];
      }
    } else {
      circleStyle = [styles.circleBase, styles.upcoming];
    }

    return (
      <View key={stepIndex} style={circleStyle}>
        {isCompleted && <View style={styles.checkmark} />}
      </View>
    );
  };

  const renderLine = (afterStepIndex: number) => {
    const isCompleted = afterStepIndex < currentStep;
    return (
      <View
        key={`line-${afterStepIndex}`}
        style={[
          styles.line,
          { backgroundColor: isCompleted ? '#3b82f6' : '#e5e7eb' },
        ]}
      />
    );
  };

  const items: React.ReactNode[] = [];
  for (let i = 0; i < totalSteps; i++) {
    items.push(renderCircle(i));
    if (i < totalSteps - 1) {
      items.push(renderLine(i));
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>{items}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 32,
    paddingVertical: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBase: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completed: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  currentRecording: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  current: {
    backgroundColor: '#bfdbfe',
    borderColor: '#3b82f6',
    borderWidth: 4,
  },
  upcoming: {
    backgroundColor: '#bfdbfe',
    borderColor: '#e5e7eb',
  },
  checkmark: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'white',
  },
  line: {
    height: 2,
    width: 48,
  },
});
