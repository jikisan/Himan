import { useRef, useState } from 'react';
import { PanResponder, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { MAX_SIGNATURE_LENGTH } from '@himan/shared/rentals';
import { Btn, muted } from './ui';

/**
 * A drawn signature: a white box with a Clear button. Calls `onChange` with a PNG data URL (≤ the database limit) after every stroke,
 * or null when cleared. Same contract as the web SignaturePad.
 */
export function SignaturePad({ label, onChange, disabled, invalid }: { label: string; onChange(dataUrl: string | null): void; disabled?: boolean; invalid?: boolean }) {
  const box = useRef<View>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const current = useRef('');
  const [, redraw] = useState(0);
  const [error, setError] = useState('');
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const ratio = useRef(3);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  const capture = async () => {
    // Smaller each try until it fits the limit.
    for (const width of [600, 450, 340, 250]) {
      try {
        const url = await captureRef(box, { format: 'png', result: 'data-uri', width, height: Math.round(width / ratio.current) });
        if (url.length <= MAX_SIGNATURE_LENGTH) { setError(''); changeRef.current(url); return; }
      } catch { break; }
    }
    setError('Draw your signature again, a little smaller');
    changeRef.current(null);
  };

  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !disabledRef.current,
    onMoveShouldSetPanResponder: () => !disabledRef.current,
    // Keeps the sheet from scrolling while signing.
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => { const { locationX: x, locationY: y } = e.nativeEvent; current.current = `M${x.toFixed(1)},${y.toFixed(1)}`; redraw((n) => n + 1); },
    onPanResponderMove: (e) => { const { locationX: x, locationY: y } = e.nativeEvent; current.current += ` L${x.toFixed(1)},${y.toFixed(1)}`; redraw((n) => n + 1); },
    onPanResponderRelease: () => {
      const stroke = current.current.includes('L') ? current.current : `${current.current} l0.1,0.1`;
      current.current = '';
      setPaths((p) => [...p, stroke]);
      requestAnimationFrame(() => void capture());
    },
  })).current;

  return <View className="gap-2">
    <View ref={box} collapsable={false} onLayout={(e) => { const { width, height } = e.nativeEvent.layout; if (height) ratio.current = width / height; }} accessible accessibilityLabel={label} accessibilityHint="Sign with your finger inside the box"
      className={`h-40 overflow-hidden rounded-xl border-2 bg-white ${invalid || error ? 'border-red-500' : 'border-gray-300'}`} {...responder.panHandlers}>
      <Svg width="100%" height="100%">
        {[...paths, current.current].filter(Boolean).map((d, i) => <Path key={i} d={d} stroke="#111" strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />)}
      </Svg>
    </View>
    <View className="flex-row items-center justify-between gap-2">
      <Text className={`flex-1 text-xs ${muted}`}>Sign with your finger inside the box.</Text>
      <Btn small label="Clear" a11y="Clear signature" disabled={disabled} onPress={() => { setPaths([]); setError(''); onChange(null); }} />
    </View>
    {error ? <Text accessibilityRole="alert" className="text-sm text-red-600 dark:text-red-400">{error}</Text> : null}
  </View>;
}
