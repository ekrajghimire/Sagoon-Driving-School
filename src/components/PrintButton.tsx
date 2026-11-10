"use client";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" className="btn-brand btn-sm" onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden /> Print / save as PDF
    </button>
  );
}
