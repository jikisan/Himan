import { useRef, useState } from 'react';
import { Image, Modal, PanResponder, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { Feather } from '@expo/vector-icons';
import { MAX_SIGNATURE_LENGTH } from '@himan/shared/rentals';
import { Btn, Row, muted, text } from './ui';

/**
 * A drawn signature. The box opens a full-screen page to sign on: inside a page sheet, the sheet's own swipe-to-close gesture
 * would take the stroke. Calls `onChange` with a PNG data URL (≤ the database limit), or null when cleared. Same contract as web.
 */
export function SignaturePad({ label, onChange, disabled, invalid }: { label: string; onChange(dataUrl: string | null): void; disabled?: boolean; invalid?: boolean }) {
  const [png, setPng] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const set = (url: string | null) => { setPng(url); onChange(url); };
  return <View className="gap-2">
    <Pressable accessibilityRole="button" accessibilityLabel={png ? `${label}: signed. Sign again` : `${label}: tap to sign`} disabled={disabled}
      onPress={() => setOpen(true)} className={`h-40 items-center justify-center overflow-hidden rounded-xl border-2 bg-white active:opacity-80 ${invalid ? 'border-red-500' : 'border-gray-300'}`}>
      {png ? <Image source={{ uri: png }} accessible={false} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
        : <View className="items-center gap-2"><Feather name="edit-3" size={28} color="#4f46e5" />
          <Text className="text-lg font-semibold text-indigo-700">Tap here to sign</Text></View>}
    </Pressable>
    {png && <Row><Btn small icon="edit-3" label="Sign again" disabled={disabled} onPress={() => setOpen(true)} />
      <Btn small label="Clear" a11y="Clear signature" disabled={disabled} onPress={() => set(null)} /></Row>}
    <Modal visible={open} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setOpen(false)}>
      {open && <SignPage label={label} onCancel={() => setOpen(false)} onDone={(url) => { set(url); setOpen(false); }} />}
    </Modal>
  </View>;
}

function SignPage({ label, onCancel, onDone }: { label: string; onCancel(): void; onDone(url: string): void }) {
  const box = useRef<View>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const current = useRef('');
  const [, redraw] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const ratio = useRef(1.6);
  const insets = useSafeAreaInsets();
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => { const { locationX: x, locationY: y } = e.nativeEvent; current.current = `M${x.toFixed(1)},${y.toFixed(1)}`; redraw((n) => n + 1); },
    onPanResponderMove: (e) => { const { locationX: x, locationY: y } = e.nativeEvent; current.current += ` L${x.toFixed(1)},${y.toFixed(1)}`; redraw((n) => n + 1); },
    onPanResponderRelease: () => end(),
    onPanResponderTerminate: () => end(),
  })).current;
  function end() {
    if (!current.current) return;
    const stroke = current.current.includes('L') ? current.current : `${current.current} l0.1,0.1`;
    current.current = '';
    setPaths((p) => [...p, stroke]);
  }
  const done = async () => {
    setSaving(true);
    // Smaller each try until it fits the limit.
    for (const width of [600, 450, 340, 250]) {
      try {
        const url = await captureRef(box, { format: 'png', result: 'data-uri', width, height: Math.round(width / ratio.current) });
        if (url.length <= MAX_SIGNATURE_LENGTH) { onDone(url); return; }
      } catch { break; }
    }
    setSaving(false);
    setError('Couldn’t save the signature. Clear it and sign again, a little smaller.');
  };
  // Inside a modal the safe-area view measures nothing, so the insets are applied by hand.
  return <View style={{ paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 16) }} className="flex-1 justify-center gap-3 bg-gray-50 px-4 dark:bg-gray-900">
    <Text accessibilityRole="header" className={`text-xl font-bold ${text}`}>{label}</Text>
    <Text className={muted}>Sign with your finger inside the white box.</Text>
    <View style={{ aspectRatio: 1.6 }} className="w-full overflow-hidden rounded-2xl border-2 border-gray-300">
      {/* Only this inner, borderless area is captured, so the saved signature has no box around it. */}
      <View ref={box} collapsable={false} accessible accessibilityLabel={`${label} box`}
        onLayout={(e) => { const { width, height } = e.nativeEvent.layout; if (height) ratio.current = width / height; }}
        className="flex-1 bg-white" {...responder.panHandlers}>
        <Svg width="100%" height="100%">
          {[...paths, current.current].filter(Boolean).map((d, i) => <Path key={i} d={d} stroke="#111" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />)}
        </Svg>
      </View>
    </View>
    {error ? <Text accessibilityRole="alert" className="text-sm text-red-600 dark:text-red-400">{error}</Text> : null}
    <Row wrap={false}>
      <Btn grow label="Cancel" onPress={onCancel} />
      <Btn grow label="Clear" a11y="Clear signature" disabled={!paths.length} onPress={() => { setPaths([]); setError(''); }} />
      <Btn grow variant="primary" icon="check" label="Done" busy={saving} disabled={!paths.length} onPress={() => void done()} />
    </Row>
  </View>;
}
