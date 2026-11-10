import { aud, gstOf } from "@/lib/money";
import { fmtDate } from "@/lib/time";
import { PrintButton } from "./PrintButton";

export function InvoiceLayout({ settings: s, number, date, billTo, lines, total, note }: {
  settings: { businessName: string; abn: string; address: string; phone: string; email: string; gstRegistered: boolean; payId: string };
  number: string; date: Date; billTo: string[]; lines: { desc: string; amount: number }[]; total: number; note: string;
}) {
  return (
    <main className="mx-auto max-w-2xl p-6 print:p-0">
      <div className="mb-4 flex justify-end print:hidden"><PrintButton /></div>
      <div className="rounded-2xl border border-line p-8 print:border-0">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">{s.gstRegistered ? "Tax Invoice" : "Invoice"}</h1>
            <p className="text-sm text-muted">No. {number} · Issued {fmtDate(date)}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-bold">{s.businessName}</p>
            <p>ABN {s.abn}</p>
            <p>{s.address}</p>
            <p>{s.phone} · {s.email}</p>
          </div>
        </div>
        <div className="mt-6 text-sm">
          <p className="text-muted">Bill to</p>
          {billTo.map((l) => <p key={l} className="font-semibold">{l}</p>)}
        </div>
        <table className="table-x mt-6">
          <thead><tr><th>Description</th><th className="text-right">Amount (incl. GST)</th></tr></thead>
          <tbody>
            {lines.map((l, i) => <tr key={i}><td>{l.desc}</td><td className="text-right">{aud(l.amount)}</td></tr>)}
          </tbody>
          <tfoot>
            {s.gstRegistered && <tr><td className="text-right text-muted">GST included</td><td className="text-right">{aud(gstOf(total))}</td></tr>}
            <tr><td className="text-right font-bold">Total</td><td className="text-right text-lg font-extrabold">{aud(total)}</td></tr>
          </tfoot>
        </table>
        <p className="mt-6 rounded-xl bg-surface p-3 text-sm">{note}</p>
        {s.payId && <p className="mt-2 text-sm">PayID: <strong>{s.payId}</strong> (reference {number})</p>}
      </div>
    </main>
  );
}
