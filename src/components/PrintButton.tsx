"use client";
export function PrintButton() {
  return <button className="btn-brand btn-sm" onClick={() => window.print()}>Print / save as PDF</button>;
}
