import { Document, Image, Page, Text, View } from '@react-pdf/renderer';
import { NOTARY_ACKNOWLEDGMENT, renderClauses } from '@himan/shared/rentals';
import type { ContractPdfData } from '../utils/contract';
import { manilaDate } from '../utils/contract';
import { registerPdfFonts } from './fonts';
import { MUTED, styles } from './styles';

registerPdfFonts();

/** The contract of lease on A4: clauses, both signatures, and the witness lines and notary page only for "notarize". */
export function ContractPdf({ doc }: { doc: ContractPdfData }) {
  const closing = /^IN WITNESS WHEREOF/i.test(doc.lines.at(-1) ?? '') ? doc.lines.at(-1) : undefined;
  const lines = closing ? doc.lines.slice(0, -1) : doc.lines;
  return <Document title="Contract of Lease" author={doc.lessorName}>
    <Page size="A4" style={[styles.page, { textAlign: 'justify' }]}>
      <Text style={styles.bold}>{doc.lessorName}</Text>
      {!!doc.lessorAddress && <Text style={styles.muted}>{doc.lessorAddress}</Text>}
      <Text style={[styles.title, { marginVertical: 12 }]}>Contract of Lease</Text>
      {lines.map((line, i) => <Clause key={i} text={line} />)}

      {/* The closing line stays on the page with the signatures. */}
      <View wrap={false}>
        {closing && <Clause text={closing} />}
        <View style={{ flexDirection: 'row', gap: 32, marginTop: 18 }}>
          <Signer role="Lessor" name={doc.lessorName} image={doc.lessorSignature} signedAt={doc.lessorSignedAt} />
          <Signer role="Lessee" name={doc.tenantName} image={doc.tenantSignature} signedAt={doc.tenantSignedAt} inPerson={doc.signedInPerson} />
        </View>
      </View>

      {/* Witnesses only sign the printed copy taken to the notary; nobody could sign these lines online. */}
      {doc.signMode === 'notarize' && <View wrap={false} style={{ marginTop: 24 }}>
        <Text style={styles.bold}>SIGNED IN THE PRESENCE OF:</Text>
        <View style={{ flexDirection: 'row', gap: 32, marginTop: 28 }}>
          <View style={[styles.line, { flex: 1 }]} /><View style={[styles.line, { flex: 1 }]} />
        </View>
      </View>}

      {doc.contentHash && <Text style={{ marginTop: 20, fontSize: 8, color: MUTED }}>
        Document fingerprint: {doc.contentHash.slice(0, 12)} (changes if the signed text changes)</Text>}
    </Page>
    {doc.signMode === 'notarize' && <Page size="A4" style={[styles.page, { textAlign: 'justify' }]}>
      {renderClauses(NOTARY_ACKNOWLEDGMENT, { signing_city: doc.signingCity }).map((line, i) =>
        <Text key={i} hyphenationPenalty={10000} style={line === 'ACKNOWLEDGEMENT' ? [styles.title, { marginVertical: 12 }] : { marginBottom: 10 }}>{line}</Text>)}
    </Page>}
  </Document>;
}

// No break where the font changes (e.g. "(₱"): react-pdf would add a hyphen there.
function Clause({ text }: { text: string }) {
  return <Text hyphenationPenalty={10000} style={{ marginBottom: 6 }}>{text}</Text>;
}

function Signer({ role, name, image, signedAt, inPerson }: { role: string; name: string; image: string | null; signedAt: string | null; inPerson?: boolean }) {
  return <View style={{ flex: 1 }}>
    <View style={{ height: 48, justifyContent: 'flex-end' }}>{image && <Image src={image} style={{ height: 44, objectFit: 'contain', objectPosition: 'left' }} />}</View>
    <View style={styles.line} />
    <Text style={styles.bold}>{name || ' '}</Text>
    <Text style={styles.muted}>{role.toUpperCase()}</Text>
    {signedAt && <Text style={[styles.muted, { fontSize: 8 }]}>{`${inPerson ? 'Signed in person on' : 'Signed online'} ${manilaDate(signedAt)}`}</Text>}
  </View>;
}
