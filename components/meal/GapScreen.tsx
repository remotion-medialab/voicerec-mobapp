import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlowScreen, Kicker, Title, PrimaryButton, colors } from '../ui';
import { getMealRecord } from '../../services/meals';

interface GapScreenProps {
  mealId: string;
  onNext: () => void;
  onBack: () => void;
}

interface Row {
  label: string;
  predicted?: number;
  actual?: number;
}

/** Closeness verdict + color for a predicted/actual delta. */
function verdict(predicted?: number, actual?: number) {
  if (predicted == null || actual == null) return { text: '—', color: colors.kicker, delta: 0 };
  const delta = actual - predicted;
  const abs = Math.abs(delta);
  if (abs <= 1) return { text: 'spot on', color: '#3Fae7a', delta };
  if (abs <= 2) return { text: 'close', color: colors.primary, delta };
  return { text: 'off', color: '#E07A4F', delta };
}

/**
 * PHASE 3 · Screen "How close were you?" (2 of 4). Compares the Phase 1
 * prediction with the actual outcome just logged. Read-only — no new write.
 */
export const GapScreen: React.FC<GapScreenProps> = ({ mealId, onNext, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await getMealRecord(mealId);
        if (r) {
          setRows([
            {
              label: 'FULLNESS',
              predicted: r.prediction?.predicted_fullness,
              actual: r.actual?.actual_fullness,
            },
            {
              label: 'ENERGY',
              predicted: r.prediction?.predicted_energy,
              actual: r.actual?.actual_energy,
            },
            {
              label: 'SATISFACTION',
              predicted: r.prediction?.predicted_satisfaction,
              actual: r.actual?.actual_satisfaction,
            },
          ]);
        }
      } catch (e) {
        console.error('Failed to load gap data:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [mealId]);

  return (
    <FlowScreen
      onBack={onBack}
      step="+30 min · 2 of 4"
      footer={<PrimaryButton label="Continue" onPress={onNext} />}>
      <Kicker style={{ marginTop: 8 }}>PREDICTION VS REALITY</Kicker>
      <Title style={{ marginTop: 8 }}>How close{'\n'}were you?</Title>

      {loading ? (
        <View className="mt-24 items-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <View className="mt-6" style={{ gap: 14 }}>
          {rows.map((row) => {
            const v = verdict(row.predicted, row.actual);
            return (
              <View
                key={row.label}
                style={{
                  backgroundColor: colors.white,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 18,
                  padding: 16,
                }}>
                <View className="flex-row items-center justify-between">
                  <Text
                    style={{
                      color: colors.kicker,
                      fontSize: 11,
                      fontWeight: '600',
                      letterSpacing: 1.5,
                    }}>
                    {row.label}
                  </Text>
                  <View className="flex-row items-center" style={{ gap: 4 }}>
                    {v.delta !== 0 ? (
                      <Ionicons
                        name={v.delta > 0 ? 'arrow-up' : 'arrow-down'}
                        size={14}
                        color={v.color}
                      />
                    ) : null}
                    <Text style={{ color: v.color, fontSize: 12, fontWeight: '700' }}>
                      {v.text}
                    </Text>
                  </View>
                </View>

                <View className="mt-3 flex-row items-end justify-between">
                  <Metric caption="PREDICTED" value={row.predicted} muted />
                  <Ionicons name="arrow-forward" size={18} color={colors.kicker} />
                  <Metric caption="ACTUAL" value={row.actual} />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </FlowScreen>
  );
};

const Metric: React.FC<{ caption: string; value?: number; muted?: boolean }> = ({
  caption,
  value,
  muted,
}) => (
  <View className="items-center">
    <Text style={{ color: muted ? colors.kicker : colors.ink, fontWeight: '800' }}>
      <Text style={{ fontSize: 26 }}>{value ?? '–'}</Text>
      <Text style={{ fontSize: 12, color: colors.kicker }}>/10</Text>
    </Text>
    <Text style={{ color: colors.kicker, fontSize: 9, letterSpacing: 1, marginTop: 2 }}>
      {caption}
    </Text>
  </View>
);
