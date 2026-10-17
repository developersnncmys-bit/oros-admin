"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pager({ page, totalPages, hasNext, onPrev, onNext, disabled = false }) {
    return (
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <p className="text-xs text-text-muted">
                Page {page}
                {totalPages ? ` of ${totalPages}` : ""}
            </p>
            <div className="flex gap-2">
                <button
                    onClick={onPrev}
                    disabled={page === 1 || disabled}
                    className="flex items-center gap-1 rounded-lg border border-border px-3 py-2.5 text-xs font-semibold text-text disabled:opacity-40"
                >
                    <ChevronLeft size={14} />
                    Prev
                </button>
                <button
                    onClick={onNext}
                    disabled={!hasNext || disabled}
                    className="flex items-center gap-1 rounded-lg border border-border px-3 py-2.5 text-xs font-semibold text-text disabled:opacity-40"
                >
                    Next
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}
