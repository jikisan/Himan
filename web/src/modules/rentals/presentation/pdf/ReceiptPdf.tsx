import { Document, Page, Text, View } from '@react-pdf/renderer';
import type { ReceiptDocument } from '@himan/shared/rentals';
import { registerPdfFonts } from './fonts';
import { styles } from './styles';

registerPdfFonts();

/** The acknowledgment receipt for one payment, on A5. Never shows proof images. */
export function ReceiptPdf({ doc }: { doc: ReceiptDocument }) {
  const rows: [string, string][] = [['Method', doc.method], ...(doc.reference ? [['Reference no.', doc.reference] as [string, string]] : [])];
  return <Document title={`Receipt ${doc.number}`} author={doc.from.name}>
    <Page size="A5" style={[styles.page, { padding: 32 }]}>
      {doc.voided && <Text style={[styles.stamp, { alignSelf: 'stretch', textAlign: 'center', textTransform: 'none', letterSpacing: 0, marginBottom: 10 }]}>{doc.voided}</Text>}
      <Text style={styles.bold}>{doc.from.name}</Text>
      {!!doc.from.address && <Text style={styles.muted}>{doc.from.address}</Text>}
      <Text style={[styles.title, { marginVertical: 12 }]}>Acknowledgment Receipt</Text>
      <View style={styles.row}><Text><Text style={styles.muted}>No. </Text><Text style={styles.bold}>{doc.number}</Text></Text>
        <Text><Text style={styles.muted}>Date </Text><Text style={styles.bold}>{doc.date}</Text></Text></View>

      <Text style={{ marginTop: 12 }}>Received from <Text style={styles.bold}>{doc.receivedFrom}</Text> ({doc.room}) the amount of</Text>
      <Text style={[styles.bold, { fontSize: 16, lineHeight: 1.2, marginTop: 6, marginBottom: 6 }]}>{doc.amount}</Text>
      <Text>{doc.amountInWords}</Text>
      <View style={{ marginTop: 8 }}>{rows.map(([k, v]) => <View key={k} style={styles.row}>
        <Text style={styles.muted}>{k}</Text><Text style={[styles.label, styles.amount]}>{v}</Text></View>)}</View>

      {doc.appliedTo.length > 0 && <Text style={styles.heading}>Applied to</Text>}
      {doc.appliedTo.map((a, i) => <View key={i} style={styles.row} wrap={false}>
        <Text style={styles.label}>{a.bill}</Text><Text style={styles.amount}>{a.amount}</Text></View>)}
      {(doc.balance || doc.credit) && <View style={styles.rule} wrap={false}>
        {doc.balance && <View style={styles.row}><Text style={styles.muted}>Left on these bills</Text><Text style={styles.bold}>{doc.balance}</Text></View>}
        {doc.credit && <View style={styles.row}><Text style={styles.muted}>Kept as credit for the next SOA</Text><Text style={styles.bold}>{doc.credit}</Text></View>}
      </View>}

      <View wrap={false} style={{ marginTop: 32 }}>
        <View style={styles.line} />
        <Text style={styles.muted}>Received by</Text>
        <Text style={styles.bold}>{doc.receivedBy}</Text>
      </View>
    </Page>
  </Document>;
}
