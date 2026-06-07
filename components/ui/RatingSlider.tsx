import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { colors } from './theme';

interface RatingSliderProps {
  label: string;
  /** Captions under the two ends of the track, e.g. "LIGHT" / "HEAVY". */
  minLabel: string;
  maxLabel: string;
  value: number; // 1-10
  onChange: (v: number) => void;
  /** Show the big "N/10" value on the right of the label row. Defaults to on. */
  showValue?: boolean;
}

const MIN = 1;
const MAX = 10;
const THUMB = 24;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * 1–10 slider with a label row and end captions. Pure-JS (PanResponder) so it
 * needs no native module — thin track, blue fill, white ring thumb per mockup.
 *
 * Width comes from onLayout (synchronous + reliable). The touch position uses
 * locationX only at gesture start (reliable there) and gestureState.dx for the
 * drag — both always finite, avoiding the NaN that mid-drag locationX produced.
 */
export const RatingSlider: React.FC<RatingSliderProps> = ({
  label,
  minLabel,
  maxLabel,
  value,
  onChange,
  showValue = true,
}) => {
  const [width, setWidth] = useState(0);
  // Refs hold the latest props/geometry so the single PanResponder reads fresh.
  const widthRef = useRef(0);
  const startXRef = useRef(0);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  const emit = (x: number) => {
    const w = widthRef.current;
    if (w <= 0) return;
    const next = Math.round(MIN + (clamp(x, 0, w) / w) * (MAX - MIN));
    if (Number.isFinite(next) && next !== valueRef.current) onChangeRef.current(next);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        const w = widthRef.current;
        if (w <= 0) return;
        const lx = e.nativeEvent.locationX;
        // locationX is reliable at touch-down; fall back to the current value.
        startXRef.current = Number.isFinite(lx)
          ? clamp(lx, 0, w)
          : ((valueRef.current - MIN) / (MAX - MIN)) * w;
        emit(startXRef.current);
      },
      onPanResponderMove: (_e: GestureResponderEvent, gesture: PanResponderGestureState) => {
        emit(startXRef.current + gesture.dx);
      },
    })
  ).current;

  const ratio = (value - MIN) / (MAX - MIN);
  const fillW = width * ratio;
  const thumbLeft = Math.max(0, Math.min(width - THUMB, fillW - THUMB / 2));

  return (
    <View>
      <View className="flex-row items-end justify-between">
        <Text style={{ color: colors.kicker, fontSize: 11, fontWeight: '600', letterSpacing: 1.5 }}>
          {label}
        </Text>
        {showValue ? (
          <Text style={{ color: colors.ink, fontWeight: '800' }}>
            <Text style={{ fontSize: 22 }}>{value}</Text>
            <Text style={{ fontSize: 12, color: colors.kicker }}>/10</Text>
          </Text>
        ) : null}
      </View>

      {/* Touch area */}
      <View
        {...pan.panHandlers}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          widthRef.current = w;
          setWidth(w);
        }}
        style={{ height: 36, justifyContent: 'center', marginTop: 4 }}>
        {/* Inactive track */}
        <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.trackInactive }} />
        {/* Active fill */}
        <View
          style={{
            position: 'absolute',
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.primary,
            width: fillW,
          }}
        />
        {/* Ring thumb */}
        <View
          style={{
            position: 'absolute',
            left: thumbLeft,
            width: THUMB,
            height: THUMB,
            borderRadius: THUMB / 2,
            backgroundColor: colors.white,
            borderWidth: 3,
            borderColor: colors.primary,
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2,
          }}
        />
      </View>

      <View className="flex-row justify-between">
        <Text style={{ color: colors.kicker, fontSize: 10, letterSpacing: 1 }}>{minLabel}</Text>
        <Text style={{ color: colors.kicker, fontSize: 10, letterSpacing: 1 }}>{maxLabel}</Text>
      </View>
    </View>
  );
};
