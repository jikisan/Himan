import { StyleSheet } from '@react-pdf/renderer';
import { FONT } from './fonts';

export const styles = StyleSheet.create({
  page: { fontFamily: FONT, fontSize: 10, lineHeight: 1.4, padding: 40, color: '#111' },
  bold: { fontWeight: 700 },
});
