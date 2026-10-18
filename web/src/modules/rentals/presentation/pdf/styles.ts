import { StyleSheet } from '@react-pdf/renderer';
import { FONT } from './fonts';

export const MUTED = '#555';

export const styles = StyleSheet.create({
  page: { fontFamily: FONT, fontSize: 10, lineHeight: 1.4, padding: 44, color: '#111' },
  bold: { fontWeight: 700 },
  muted: { color: MUTED },
  title: { fontSize: 14, fontWeight: 700, letterSpacing: 1, lineHeight: 1.6, textAlign: 'center', textTransform: 'uppercase' },
  heading: { fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: MUTED, marginTop: 12, marginBottom: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { flex: 1 },
  amount: { textAlign: 'right', width: 90 },
  rule: { borderTopWidth: 1, borderTopColor: '#ccc', marginTop: 12, paddingTop: 8 },
  stamp: { alignSelf: 'flex-end', borderWidth: 2, borderColor: '#b91c1c', color: '#b91c1c', fontWeight: 700, fontSize: 12,
    letterSpacing: 1, paddingHorizontal: 8, paddingVertical: 2, textTransform: 'uppercase' },
  signature: { marginTop: 28, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  line: { width: 180, borderBottomWidth: 1, borderBottomColor: '#999' },
});
