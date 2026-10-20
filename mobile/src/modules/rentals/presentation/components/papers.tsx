import { useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { NOTARY_ACKNOWLEDGMENT, billDocument, manilaDate, receiptDocument, renderClauses, settlementDocument } from '@himan/shared/rentals';
import type { ContractPdfData, ReceiptContext, RentalPayment, RentalSettlement, SettlementContext, StatementInfo } from '@himan/shared/rentals';
import type { StatementBill } from './types';

// The paper copies (SOA, receipt, settlement, contract) as HTML, laid out like the web PDFs and made from the same shared document
// models. The same HTML is shown on screen (always white, like paper) and printed to the PDF that is shared.

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const page = (body: string, size: 'A4' | 'A5' = 'A4') => `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
@page { size: ${size}; margin: 16mm; }
* { box-sizing: border-box; }
body { margin: 0; padding: 20px; font: 14px/1.45 -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif; color: #111; background: #fff; overflow-wrap: anywhere; }
@media print { body { padding: 0; font-size: 10pt; } }
.b { font-weight: 700; } .m { color: #555; } .s { font-size: 11px; }
.title { font-size: 17px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; text-align: center; margin: 14px 0 2px; }
.h { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #555; margin: 14px 0 3px; letter-spacing: .4px; }
.row { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
.row > :first-child { flex: 1; } .amt { text-align: right; min-width: 90px; font-variant-numeric: tabular-nums; }
.fields { display: flex; flex-wrap: wrap; row-gap: 2px; } .fields > div { width: 50%; padding-right: 8px; }
.rule { border-top: 1px solid #ccc; margin-top: 14px; padding-top: 8px; }
.stamp { float: right; border: 2px solid #b91c1c; color: #b91c1c; font-weight: 700; padding: 2px 8px; text-transform: uppercase; letter-spacing: 1px; }
.line { border-bottom: 1px solid #999; } .sig { display: flex; gap: 28px; margin-top: 22px; } .sig > div { flex: 1; min-width: 0; }
.clause { margin: 0 0 8px; text-align: justify; white-space: pre-line; }
.qr { width: 84px; height: 84px; object-fit: contain; }
.break { page-break-before: always; }
</style></head><body>${body}</body></html>`;

const amount = (label: string, value: string) => `<div class="row"><span>${esc(label)}</span><span class="amt">${esc(value)}</span></div>`;
const fields = (rows: [string, string][]) => `<div class="fields">${rows.map(([k, v]) => `<div><span class="m">${esc(k)}: </span><span class="b">${esc(v)}</span></div>`).join('')}</div>`;
const from = (f: { name: string; address: string }) => `<div class="b">${esc(f.name)}</div>${f.address ? `<div class="m">${esc(f.address)}</div>` : ''}`;

export function billHtml(bill: StatementBill, info: StatementInfo, qrUrl?: (path: string) => string) {
  const doc = billDocument(bill, info);
  const summary = doc.cancelled ? doc.summary.filter(([k]) => k !== 'Amount due now' && k !== 'Paid in full') : doc.summary;
  return page(`${doc.cancelled ? '<span class="stamp">Cancelled</span>' : ''}${from(doc.from)}
<div class="title">Statement of Account</div><div class="m" style="text-align:center;margin-bottom:12px">Month: ${esc(doc.month)}</div>
${fields(doc.fields.map(([k, v]) => [k, k === 'Bill No.' && !bill.number ? 'Not generated yet' : v]))}
${doc.charges.length ? '<div class="h">Rent and charges</div>' : ''}${doc.charges.map((c) => amount(c.label, c.amount)).join('')}
${doc.utilities.map((u) => `<div class="h">${esc(u.title)}</div>${u.readings.map(([k, date, value]) =>
    `<div class="row m"><span style="flex:0 0 70px">${esc(k)}</span><span>${esc(date)}</span><span class="amt">${esc(value)}</span></div>`).join('')}
  ${amount(u.label, u.amount)}${u.note ? `<div class="m s">${esc(u.note)}</div>` : ''}`).join('')}
<div class="rule"><div class="row" style="margin-bottom:4px"><span class="b" style="text-transform:uppercase">Total amount payable</span><span class="b" style="font-size:17px">${esc(doc.total)}</span></div>
${summary.map(([k, v]) => `<div class="row"><span class="${v ? 'm' : 'b'}">${esc(k)}</span><span class="b">${esc(v)}</span></div>`).join('')}
<div class="row"><span class="m">Due date</span><span class="b">${esc(doc.due)}</span></div></div>
${doc.accounts.length ? '<div class="h">Pay to</div>' : ''}${doc.accounts.map((a) => `<div class="row" style="align-items:center;margin-bottom:6px">
  <span><span class="b">${esc(a.name)}</span> — ${esc(a.detail)}</span>${a.qrPath && qrUrl ? `<img class="qr" src="${esc(qrUrl(a.qrPath))}" alt="">` : ''}</div>`).join('')}
<div class="s" style="margin-top:16px">${doc.lateFee ? `<div class="m">${esc(doc.lateFee)}</div>` : ''}
<div style="display:flex;align-items:flex-end;gap:6px;margin-top:28px"><span class="m">Received by:</span><span class="line" style="width:180px"></span></div></div>`);
}

export function receiptHtml(payment: RentalPayment, ctx: ReceiptContext) {
  const doc = receiptDocument(payment, ctx);
  const rows: [string, string][] = [['Method', doc.method], ...(doc.reference ? [['Reference no.', doc.reference] as [string, string]] : [])];
  return page(`${doc.voided ? `<div class="stamp" style="float:none;text-align:center;text-transform:none;margin-bottom:10px">${esc(doc.voided)}</div>` : ''}
${from(doc.from)}<div class="title">Acknowledgment Receipt</div>
<div class="row" style="margin-top:8px"><span><span class="m">No. </span><span class="b">${esc(doc.number)}</span></span><span><span class="m">Date </span><span class="b">${esc(doc.date)}</span></span></div>
<p>Received from <span class="b">${esc(doc.receivedFrom)}</span> (${esc(doc.room)}) the amount of</p>
<div class="b" style="font-size:22px;margin:4px 0">${esc(doc.amount)}</div><div>${esc(doc.amountInWords)}</div>
<div style="margin-top:8px">${rows.map(([k, v]) => `<div class="row"><span class="m">${esc(k)}</span><span class="amt">${esc(v)}</span></div>`).join('')}</div>
${doc.appliedTo.length ? '<div class="h">Applied to</div>' : ''}${doc.appliedTo.map((a) => amount(a.bill, a.amount)).join('')}
${doc.balance || doc.credit ? `<div class="rule">${doc.balance ? `<div class="row"><span class="m">${esc(doc.balanceLabel)}</span><span class="b">${esc(doc.balance)}</span></div>` : ''}
  ${doc.credit ? `<div class="row"><span class="m">Kept as credit for the next SOA</span><span class="b">${esc(doc.credit)}</span></div>` : ''}</div>` : ''}
${doc.asOf ? `<div class="m s">${esc(doc.asOf)}</div>` : ''}
<div style="width:180px;margin-top:40px"><div class="line"></div><div class="m">Received by</div><div class="b">${esc(doc.receivedBy)}</div></div>`, 'A5');
}

export function settlementHtml(settlement: RentalSettlement, ctx: SettlementContext) {
  const doc = settlementDocument(settlement, ctx);
  const { result } = doc;
  return page(`${from(doc.from)}<div class="title" style="margin-bottom:12px">Deposit Settlement</div>${fields(doc.fields)}
<div class="row b" style="margin-top:16px"><span>Deposit held</span><span class="amt">${esc(doc.deposit)}</span></div>
${doc.credit ? amount('Tenant credit', doc.credit) : ''}
${doc.deductions.length ? `<div class="h">Less deductions</div>${doc.deductions.map((d) => amount(d.label, d.amount)).join('')}
  <div class="row"><span class="m">Total deductions</span><span class="amt b">${esc(doc.totalDeductions)}</span></div>` : ''}
<div class="rule"><div class="row" style="margin-bottom:4px"><span class="b" style="text-transform:uppercase">${esc(result.title)}</span><span class="b" style="font-size:17px">${esc(result.amount)}</span></div>
${result.words ? `<div style="margin-bottom:4px">${esc(result.words)}</div>` : ''}
${result.details.map(([k, v]) => `<div class="row"><span class="m">${esc(k)}</span><span class="b" style="text-align:right">${esc(v)}</span></div>`).join('')}
${doc.owed ? `<div class="b" style="margin-top:6px">${esc(doc.owed)}</div>` : ''}</div>
${doc.notes ? `<div class="h">Notes</div><div style="white-space:pre-line">${esc(doc.notes)}</div>` : ''}
<div class="sig" style="margin-top:44px">${[['Lessor', doc.lessor], ...(doc.tenant ? [['Received by', doc.tenant]] : [])].map(([k, v]) =>
    `<div><div class="line"></div><div class="m">${esc(k)}</div><div class="b">${esc(v)}</div></div>`).join('')}</div>`);
}

const signer = (role: string, name: string, image: string | null, signedAt: string | null, inPerson?: boolean) => `<div>
<div style="height:52px;display:flex;align-items:flex-end">${image ? `<img src="${esc(image)}" alt="" style="height:48px;max-width:100%;object-fit:contain">` : ''}</div>
<div class="line"></div><div class="b">${esc(name || ' ')}</div><div class="m">${role.toUpperCase()}</div>
${signedAt ? `<div class="m s">${inPerson ? 'Signed in person on' : 'Signed online'} ${esc(manilaDate(signedAt))}</div>` : ''}</div>`;

export function contractHtml(doc: ContractPdfData) {
  const closing = /^IN WITNESS WHEREOF/i.test(doc.lines.at(-1) ?? '') ? doc.lines.at(-1) : undefined;
  const lines = closing ? doc.lines.slice(0, -1) : doc.lines;
  return page(`<div class="b">${esc(doc.lessorName)}</div>${doc.lessorAddress ? `<div class="m">${esc(doc.lessorAddress)}</div>` : ''}
<div class="title" style="margin-bottom:12px">Contract of Lease</div>
${lines.map((l) => `<p class="clause">${esc(l)}</p>`).join('')}
<div style="page-break-inside:avoid">${closing ? `<p class="clause">${esc(closing)}</p>` : ''}
<div class="sig">${signer('Lessor', doc.lessorName, doc.lessorSignature, doc.lessorSignedAt)}${signer('Lessee', doc.tenantName, doc.tenantSignature, doc.tenantSignedAt, doc.signedInPerson)}</div></div>
${doc.signMode === 'notarize' ? '<div style="margin-top:24px;page-break-inside:avoid"><div class="b">SIGNED IN THE PRESENCE OF:</div><div class="sig" style="margin-top:32px"><div class="line"></div><div class="line"></div></div></div>' : ''}
${doc.contentHash ? `<div class="m s" style="margin-top:20px">Document fingerprint: ${esc(doc.contentHash.slice(0, 12))} (changes if the signed text changes)</div>` : ''}
${doc.signMode === 'notarize' ? `<div class="break">${renderClauses(NOTARY_ACKNOWLEDGMENT, { signing_city: doc.signingCity }).map((line) => line === 'ACKNOWLEDGEMENT'
    ? `<div class="title" style="margin-bottom:12px">${esc(line)}</div>` : `<p class="clause">${esc(line)}</p>`).join('')}</div>` : ''}`);
}

/** The paper on screen. Grows to its content when `height` is not given. */
export function Paper({ html, height }: { html: string; height?: number }) {
  const [measured, setMeasured] = useState(600);
  return <View className="overflow-hidden rounded-xl border border-gray-200 bg-white" style={{ height: height ?? measured }}>
    <WebView originWhitelist={['*']} source={{ html }} scrollEnabled={!!height} javaScriptEnabled
      injectedJavaScript="window.ReactNativeWebView.postMessage(String(document.body.scrollHeight));true;"
      onMessage={(e) => { const h = Number(e.nativeEvent.data); if (h > 0) setMeasured(h + 8); }}
      onShouldStartLoadWithRequest={(r) => r.url === 'about:blank' || r.url.startsWith('data:')} />
  </View>;
}

const slug = (name: string, fallback: string) => name.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || fallback;

/** Prints the HTML to a PDF named `<name>.pdf` and opens the share sheet (save to Files, Messenger, print…). */
export async function sharePdf(html: string, name: string) {
  const { uri } = await Print.printToFileAsync({ html });
  const target = new File(Paths.cache, `${slug(name, 'Document')}.pdf`);
  if (target.exists) target.delete();
  new File(uri).move(target);
  await Sharing.shareAsync(target.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: name });
}
