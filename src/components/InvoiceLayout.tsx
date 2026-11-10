import { aud, gstOf } from "@/lib/money";
import { fmtDate } from "@/lib/time";
import { Logo } from "./Logo";
import { PrintButton } from "./PrintButton";

export function InvoiceLayout({ settings: s, number, date, billTo, lines, total, note }: {
  settings: { businessName: string; abn: string; address: string; phone: string; email: string; gstRegistered: boolean; payId: string };
  number: string; date: Date; billTo: string[]; lines: { desc: string; amount: number }[]; total: number; note: string;
}) {
  return (
    <main className="flex-1 bg-surface px-3 py-6 sm:px-6 sm:py-10 print:bg-white print:p-0">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
          <p className="text-sm text-muted">Keep this for your records.</p>
          <PrintButton />
        </div>
        <article className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <header className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Logo className="[-webkit-print-color-adjust:exact] [print-color-adjust:exact]" />
              <h1 className="mt-5 text-2xl font-extrabold tracking-tight">{s.gstRegistered ? "Tax Invoice" : "Invoice"}</h1>
              <p className="text-sm text-muted">No. <span className="font-semibold text-ink">{number}</span> · Issued {fmtDate(date)}</p>
            </div>
            <address className="text-sm not-italic sm:text-right">
              <p className="font-bold">{s.businessName}</p>
              <p>ABN {s.abn}</p>
              <p>{s.address}</p>
              <p>{s.phone}</p>
              <p className="[overflow-wrap:anywhere]">{s.email}</p>
            </address>
          </header>
          <div className="mt-6 text-sm">
            <p className="text-xs font-bold tracking-wider text-muted uppercase">Bill to</p>
            {billTo.map((l) => <p key={l} className="mt-0.5 font-semibold [overflow-wrap:anywhere]">{l}</p>)}
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="table-x">
              <thead className="bg-surface print:bg-transparent">
                <tr><th scope="col">Description</th><th scope="col" className="text-right whitespace-nowrap">Amount (incl. GST)</th></tr>
              </thead>
              <tbody>
                {lines.map((l, i) => <tr key={i}><td>{l.desc}</td><td className="text-right whitespace-nowrap">{aud(l.amount)}</td></tr>)}
              </tbody>
              <tfoot>
                {s.gstRegistered && <tr><td className="text-right text-muted">GST included</td><td className="text-right whitespace-nowrap">{aud(gstOf(total))}</td></tr>}
                <tr><td className="border-b-0 text-right font-bold">Total</td><td className="border-b-0 text-right text-lg font-extrabold whitespace-nowrap">{aud(total)}</td></tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-6 rounded-xl bg-surface p-3 text-sm print:border print:border-line print:bg-transparent">{note}</p>
          {s.payId && <p className="mt-2 text-sm">PayID: <strong>{s.payId}</strong> (reference {number})</p>}
        </article>
      </div>
    </main>
  );
}
