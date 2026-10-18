import { Document, Page, Text, View } from '@react-pdf/renderer';
import type { SettlementDocument } from '@himan/shared/rentals';
import { registerPdfFonts } from './fonts';
import { styles } from './styles';

registerPdfFonts();

/** The deposit settlement on A4: deposit, each deduction, the refund or deposit kept, and signature lines. Never shows proof images. */
export function SettlementPdf({ doc }: { doc: SettlementDocument }) {
  const { result } = doc;
  return <Document title="Deposit Settlement" author={doc.from.name}>
    <Page size="A4" style={styles.page}>
      <Text style={styles.bold}>{doc.from.name}</Text>
      {!!doc.from.address && <Text style={styles.muted}>{doc.from.address}</Text>}
      <Text style={[styles.title, { marginVertical: 12 }]}>Deposit Settlement</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 2 }}>
        {doc.fields.map(([k, v]) => <Text key={k} style={{ width: '50%', paddingRight: 8 }}>
          <Text style={styles.muted}>{k}: </Text><Text style={styles.bold}>{v}</Text></Text>)}
      </View>

      <View style={[styles.row, { marginTop: 16 }]} wrap={false}>
        <Text style={[styles.label, styles.bold]}>Deposit held</Text><Text style={[styles.amount, styles.bold]}>{doc.deposit}</Text></View>
      {doc.deductions.length > 0 && <>
        <Text style={styles.heading} minPresenceAhead={24}>Less deductions</Text>
        {doc.deductions.map((d, i) => <View key={i} style={styles.row} wrap={false}>
          <Text style={styles.label}>{d.label}</Text><Text style={styles.amount}>{d.amount}</Text></View>)}
        <View style={[styles.row, { marginTop: 2 }]} wrap={false}>
          <Text style={[styles.label, styles.muted]}>Total deductions</Text><Text style={[styles.amount, styles.bold]}>{doc.totalDeductions}</Text></View>
      </>}

      <View style={styles.rule} wrap={false}>
        <View style={[styles.row, { alignItems: 'baseline', marginBottom: 4 }]}>
          <Text style={[styles.bold, { textTransform: 'uppercase' }]}>{result.title}</Text>
          <Text style={[styles.bold, { fontSize: 14 }]}>{result.amount}</Text>
        </View>
        {result.words && <Text style={{ marginBottom: 4 }}>{result.words}</Text>}
        {result.details.map(([k, v]) => <View key={k} style={styles.row}>
          <Text style={styles.muted}>{k}</Text><Text style={[styles.label, { textAlign: 'right' }, styles.bold]}>{v}</Text></View>)}
        {doc.owed && <Text style={[styles.bold, { marginTop: 6 }]}>{doc.owed}</Text>}
      </View>

      {!!doc.notes && <View wrap={false}><Text style={styles.heading}>Notes</Text><Text>{doc.notes}</Text></View>}

      <View wrap={false} style={{ marginTop: 40, flexDirection: 'row', justifyContent: 'space-between', gap: 24 }}>
        {[['Lessor', doc.lessor], ['Received by', doc.tenant]].map(([k, v]) => <View key={k} style={{ flex: 1 }}>
          <View style={[styles.line, { width: '100%' }]} />
          <Text style={styles.muted}>{k}</Text>
          <Text style={styles.bold}>{v}</Text>
        </View>)}
      </View>
    </Page>
  </Document>;
}
