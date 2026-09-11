"use client";

import { ArrowUp } from "lucide-react";


export default function ReturnToTop() {
  function handleReturnToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }


  return (
    <button
      type="button"
      onClick={handleReturnToTop}
      className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-lg transition hover:bg-slate-50"
      aria-label="Return to top"
    >
      <ArrowUp className="h-4 w-4" />
      <span className="hidden sm:inline">
        Return to Top
      </span>
    </button>
  );
}