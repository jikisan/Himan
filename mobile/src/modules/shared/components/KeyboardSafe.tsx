import type { ComponentProps } from 'react';
import { KeyboardAvoidingView } from 'react-native';

/**
 * Lifts its content above the on-screen keyboard. Android runs edge-to-edge here, so the window no longer resizes
 * for the keyboard (adjustResize does nothing) and 'height' is unreliable; 'padding' works on both platforms.
 * Put it around a screen's body, or directly inside a <Modal> around the overlay.
 */
export function KeyboardSafe(props: ComponentProps<typeof KeyboardAvoidingView>) {
  return <KeyboardAvoidingView behavior="padding" className="flex-1" {...props} />;
}
