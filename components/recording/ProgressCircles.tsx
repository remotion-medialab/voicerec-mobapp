import React from 'react';
import { View, StyleSheet } from 'react-native';

interface ProgressCirclesProps {
  currentStep: number;
  isRecording: boolean;
}

export function ProgressCircles(props: ProgressCirclesProps) {
  const { currentStep, isRecording } = props;

  const renderCircle = (stepIndex: number, position: string) => {
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

    const getPositionStyle = () => {
      const centerX = 80;
      const centerY = 80;

      switch (position) {
        case 'top':
          return { top: 0, left: centerX };
        case 'left':
          return { top: centerY, left: 0 };
        case 'center':
          return { top: centerY, left: centerX };
        case 'right':
          return { top: centerY, right: 0 };
        case 'bottom':
          return { bottom: 0, left: centerX };
        default:
          return { top: 0, left: 0 };
      }
    };

    return (
      <View key={stepIndex} style={[circleStyle, getPositionStyle()] as any}>
        {isCompleted && <View style={styles.checkmark} />}
      </View>
    );
  };

  const renderConnectingLines = () => {
    return (
    <>
      {/* Center to Top */}
      <View
        style={[
          styles.verticalLine,
          { backgroundColor: currentStep > 0 ? '#3b82f6' : '#e5e7eb' },
          {
            top: 32,
            left: 95,
            height: 48,
          },
        ]}
      />

      {/* Top to Right */}
      <View
        style={[
          styles.line,
          { backgroundColor: currentStep > 1 ? '#3b82f6' : '#e5e7eb' },
          {
            top: 16,
            right: 32,
            transform: [{ rotate: '45deg' }],
          },
        ]}
      />

      {/* Right to Bottom */}
      <View
        style={[
          styles.line,
          { backgroundColor: currentStep > 2 ? '#3b82f6' : '#e5e7eb' },
          {
            top: 96,
            right: 0,
            transform: [{ rotate: '90deg' }],
          },
        ]}
      />

      {/* Bottom to Left */}
      <View
        style={[
          styles.line,
          { backgroundColor: currentStep > 3 ? '#3b82f6' : '#e5e7eb' },
          {
            bottom: 16,
            left: 32,
            transform: [{ rotate: '45deg' }],
          },
        ]}
      />

      {/* Left to Center */}
      <View
        style={[
          styles.line,
          { backgroundColor: currentStep > 4 ? '#3b82f6' : '#e5e7eb' },
          {
            top: 96,
            left: 0,
            transform: [{ rotate: '90deg' }],
          },
        ]}
      />
    </>
  );
  };

  return (
    <View style={styles.container}>
      <View style={styles.diamondContainer}>
        {renderConnectingLines()}
        {renderCircle(0, 'center')}
        {renderCircle(1, 'top')}
        {renderCircle(2, 'right')}
        {renderCircle(3, 'bottom')}
        {renderCircle(4, 'left')}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 32,
    paddingVertical: 32,
  },
  diamondContainer: {
    position: 'relative',
    width: 192,
    height: 192,
    alignSelf: 'center',
  },
  circleBase: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    position: 'absolute',
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
    position: 'absolute',
    height: 2,
    width: 80,
  },
  verticalLine: {
    position: 'absolute',
    width: 2,
    // height is set dynamically in the component
  },
});
