import { Document, Image, Page, Text, View } from '@react-pdf/renderer';
import type { BillDocument } from '@himan/shared/rentals';
import { registerPdfFonts } from './fonts';
import { styles } from './styles';

registerPdfFonts();

/** The Statement of Account on A4. `qr` maps an account id to its QR image (a data URL); accounts without one print as text only. */
export function BillPdf({ doc, qr }: { doc: BillDocument; qr: Record<string, string> }) {
  const number = doc.fields.find(([k]) => k === 'Bill No.')?.[1];
  return <Document title={`Statement of Account ${number ?? ''}`.trim()} author={doc.from.name}>
    <Page size="A4" style={styles.page}>
      {doc.cancelled && <Text style={styles.stamp}>Cancelled</Text>}
      <Text style={styles.bold}>{doc.from.name}</Text>
      {!!doc.from.address && <Text style={styles.muted}>{doc.from.address}</Text>}
      <View style={{ marginVertical: 12 }}>
        <Text style={styles.title}>Statement of Account</Text>
        <Text style={[styles.muted, { textAlign: 'center' }]}>Month: {doc.month}</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 2 }}>
        {doc.fields.map(([k, v]) => <Text key={k} style={{ width: '50%', paddingRight: 8 }}>
          <Text style={styles.muted}>{k}: </Text><Text style={styles.bold}>{v}</Text></Text>)}
      </View>

      {doc.charges.length > 0 && <Text style={styles.heading}>Rent and charges</Text>}
      {doc.charges.map((c, i) => <Amount key={i} label={c.label} amount={c.amount} />)}

      {doc.utilities.map((u, i) => <View key={i} wrap={false}>
        <Text style={styles.heading}>{u.title}</Text>
        {u.readings.map(([k, date, value]) => <View key={k} style={[styles.row, styles.muted]}>
          <Text style={{ width: 60 }}>{k}</Text><Text style={styles.label}>{date}</Text><Text style={styles.amount}>{value}</Text></View>)}
        <Amount label={u.label} amount={u.amount} />
        {u.note && <Text style={[styles.muted, { fontSize: 8 }]}>{u.note}</Text>}
      </View>)}

      <View style={styles.rule} wrap={false}>
        <View style={[styles.row, { alignItems: 'baseline', marginBottom: 4 }]}>
          <Text style={[styles.bold, { textTransform: 'uppercase' }]}>Total amount payable</Text>
          <Text style={[styles.bold, { fontSize: 14 }]}>{doc.total}</Text>
        </View>
        {doc.summary.map(([k, v]) => <View key={k} style={styles.row}>
          <Text style={v ? styles.muted : styles.bold}>{k}</Text><Text style={styles.bold}>{v}</Text></View>)}
        <View style={styles.row}><Text style={styles.muted}>Due date</Text><Text style={styles.bold}>{doc.due}</Text></View>
      </View>

      {doc.accounts.length > 0 && <Text style={styles.heading} minPresenceAhead={40}>Pay to</Text>}
      {doc.accounts.map((a) => <View key={a.id} wrap={false} style={[styles.row, { alignItems: 'center', marginBottom: 6 }]}>
        <Text style={styles.label}><Text style={styles.bold}>{a.name}</Text> — {a.detail}</Text>
        {qr[a.id] && <Image src={qr[a.id]} style={{ width: 84, height: 84 }} />}
      </View>)}

      <View wrap={false} style={{ marginTop: 16, fontSize: 9 }}>
        {doc.lateFee && <Text style={styles.muted}>{doc.lateFee}</Text>}
        <View style={styles.signature}><Text style={styles.muted}>Received by:</Text><View style={styles.line} /></View>
      </View>
    </Page>
  </Document>;
}

function Amount({ label, amount }: { label: string; amount: string }) {
  return <View style={styles.row} wrap={false}><Text style={styles.label}>{label}</Text><Text style={styles.amount}>{amount}</Text></View>;
}
