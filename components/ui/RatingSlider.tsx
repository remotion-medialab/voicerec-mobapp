import React, { useRef, useState } from 'react';
import { View, Text, PanResponder, GestureResponderEvent } from 'react-native';
import { colors } from './theme';

interface RatingSliderProps {
  label: string;
  /** Captions under the two ends of the track, e.g. "LIGHT" / "HEAVY". */
  minLabel: string;
  maxLabel: string;
  value: number; // 1-10
  onChange: (v: number) => void;
  /** Show the big "N/10" value on the right of the label row (mood/taste). */
  showValue?: boolean;
}

const MIN = 1;
const MAX = 10;
const THUMB = 24;

/**
 * 1–10 slider with a label row and end captions. Pure-JS (PanResponder) so it
 * needs no native module — thin track, blue fill, white ring thumb per mockup.
 */
export const RatingSlider: React.FC<RatingSliderProps> = ({
  label,
  minLabel,
  maxLabel,
  value,
  onChange,
  showValue,
}) => {
  const [width, setWidth] = useState(0);
  const trackRef = useRef<View>(null);
  // Refs hold the latest props/geometry so the single PanResponder reads fresh
  // values. We track the track's absolute screen X and use the touch's pageX —
  // locationX is unreliable mid-drag (can be relative to a child) and yields NaN.
  const widthRef = useRef(0);
  const pageXRef = useRef(0);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  const measure = () => {
    trackRef.current?.measureInWindow((x, _y, w) => {
      pageXRef.current = x;
      widthRef.current = w;
      setWidth(w);
    });
  };

  const handle = (e: GestureResponderEvent) => {
    const w = widthRef.current;
    const px = e.nativeEvent.pageX;
    if (w <= 0 || !Number.isFinite(px)) return;
    const x = Math.max(0, Math.min(w, px - pageXRef.current));
    const next = Math.round(MIN + (x / w) * (MAX - MIN));
    if (Number.isFinite(next) && next !== valueRef.current) onChangeRef.current(next);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        measure(); // refresh absolute X in case the screen scrolled
        handle(e);
      },
      onPanResponderMove: (e: GestureResponderEvent) => handle(e),
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
        ref={trackRef}
        {...pan.panHandlers}
        onLayout={measure}
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
