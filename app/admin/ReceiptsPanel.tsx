"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { auth } from "../firebaseConfig";
import { RefreshCw, Download, FileText } from "lucide-react";
import { receiptHtml, receiptMoney, type ReceiptRow } from "../lib/receipts";
import { formatMoney } from "../lib/admin-metrics";

type Row = ReceiptRow & { id: string; emailed: string | null; internal: boolean };

const dateText = (ms: number) =>
  ms ? new Date(ms).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "";

/** Every payment, its receipt to download, and whether the customer was emailed it. */
export default function ReceiptsPanel() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hideMine, setHideMine] = useState(true);
  const [open, setOpen] = useState<Row | null>(null);
  const frameRef = React.useRef<HTMLIFrameElement>(null);

  const load = useCallback(async () => {
    setBusy(true); setError(null);
    try {
      const token = (await auth.currentUser?.getIdToken()) ?? "";
      const res = await fetch("/api/admin?view=receipts", { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setRows(body.receipts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load receipts");
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => (rows ?? []).filter((r) => !hideMine || !r.internal), [rows, hideMine]);
  const total = useMemo(() => shown.reduce((m, r) => {
    const v = r.amount / 100; m[r.currency] = (m[r.currency] ?? 0) + v; return m;
  }, {} as Record<string, number>), [shown]);

  /** Shows the receipt on the page; from there it prints (or saves as PDF) or downloads. No pop-up window to be blocked. */
  function openReceipt(r: Row) { setOpen(r); }

  function downloadFile(name: string, content: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadCsv() {
    const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["Receipt", "Date", "Email", "Item", "Amount", "Currency", "Emailed"].map(q).join(",")];
    for (const r of shown)
      lines.push([r.number, new Date(r.paidAt).toISOString().slice(0, 10), r.email, r.item,
        (r.amount / 100).toFixed(2), r.currency.toUpperCase(), r.emailed ?? "before receipts"].map(q).join(","));
    downloadFile(`Replysis-receipts-${new Date().toISOString().slice(0, 10)}.csv`, lines.join("\n"), "text/csv");
  }

  return (
    <section className="rounded-2xl border border-[#E3DED3] bg-[#FBFAF6] p-5 shadow-[0_1px_2px_rgba(60,50,30,0.05)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-[#1F1E1B]">All receipts</h2>
          <p className="mt-0.5 text-[13px] text-[#7A756A]">
            Every payment. Customers get their receipt by email when they pay. Open one to print or save it as a PDF.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[13px] text-[#5E5A51]">
            <input type="checkbox" checked={hideMine} onChange={(e) => setHideMine(e.target.checked)} /> Hide mine and friends
          </label>
          <button onClick={downloadCsv} disabled={!shown.length}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3DED3] bg-[#FBFAF6] px-3 py-1.5 text-[13px] text-[#3D3B35] hover:bg-[#F1EEE7] disabled:opacity-50">
            <Download size={13} /> Download all (CSV)
          </button>
          <button onClick={load} aria-label="Refresh receipts" className="rounded-lg p-1.5 text-[#7A756A] hover:bg-[#F1EEE7]">
            <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {open && (
        <div role="dialog" aria-modal="true" aria-label={`Receipt ${open.number}`}
             className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F1E1B]/40 p-4" onClick={() => setOpen(null)}>
          <div className="flex max-h-[92vh] w-full max-w-[620px] flex-col overflow-hidden rounded-2xl bg-[#F4F1EA] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <iframe ref={frameRef} title={`Receipt ${open.number}`} srcDoc={receiptHtml(open)} className="h-[560px] w-full border-0" />
            <div className="flex items-center justify-end gap-2 border-t border-[#E3DED3] bg-[#FBFAF6] px-4 py-3">
              <button onClick={() => downloadFile(`Replysis-receipt-${open.number}.html`, receiptHtml(open), "text/html")}
                className="rounded-lg border border-[#E3DED3] px-3 py-1.5 text-[13px] text-[#3D3B35] hover:bg-[#F1EEE7]">Download</button>
              <button onClick={() => frameRef.current?.contentWindow?.print()}
                className="rounded-lg bg-[#2F6B4F] px-3 py-1.5 text-[13px] font-medium text-[#FBFAF6] hover:bg-[#285C44]">Print or save as PDF</button>
              <button onClick={() => setOpen(null)} className="rounded-lg px-3 py-1.5 text-[13px] text-[#5E5A51] hover:bg-[#F1EEE7]">Close</button>
            </div>
          </div>
        </div>
      )}

      {error && <div className="mt-4 rounded-lg border border-[#E7C4BC] bg-[#F7E6E2] px-3 py-2 text-[13px] text-[#8E2F22]">{error}</div>}

      <div className="mt-4 text-[14px] text-[#3D3B35]">
        {shown.length} {shown.length === 1 ? "payment" : "payments"}{formatMoney(total) ? `, ${formatMoney(total)} in total` : ""}
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-[#E3DED3] text-[12.5px] text-[#7A756A]">
              <th className="py-2 pr-3 font-medium">Date</th>
              <th className="py-2 pr-3 font-medium">Customer</th>
              <th className="py-2 pr-3 font-medium">Bought</th>
              <th className="py-2 pr-3 text-right font-medium">Amount</th>
              <th className="py-2 pr-3 font-medium">Receipt email</th>
              <th className="py-2 text-right font-medium">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-b border-[#ECE8DF] last:border-0">
                <td className="py-2.5 pr-3 tabular-nums text-[#5E5A51]">{dateText(r.paidAt)}</td>
                <td className="py-2.5 pr-3 text-[#1F1E1B]">{r.email ?? <span className="font-mono text-[#9A9487]">{r.uid.slice(0, 12)}</span>}</td>
                <td className="py-2.5 pr-3 text-[#3D3B35]">{r.item}</td>
                <td className="py-2.5 pr-3 text-right font-semibold tabular-nums text-[#1F1E1B]">{receiptMoney(r.amount, r.currency)}</td>
                <td className="py-2.5 pr-3 text-[#7A756A]">
                  {r.emailed === "sent" ? <span className="text-[#2F6B4F]">Sent</span>
                    : r.emailed === "failed" ? <span className="text-[#A33A2B]">Not sent</span>
                    : "Paid before receipts"}
                </td>
                <td className="py-2.5 text-right">
                  <button onClick={() => openReceipt(r)}
                    className="inline-flex items-center gap-1 rounded-md border border-[#E3DED3] px-2.5 py-1 text-[12.5px] text-[#3D3B35] hover:bg-[#F1EEE7]">
                    <FileText size={12} /> Open
                  </button>
                </td>
              </tr>
            ))}
            {rows && !shown.length && (
              <tr><td colSpan={6} className="py-6 text-center text-[#9A9487]">No payments yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
