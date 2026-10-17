"use client";

import { X } from "lucide-react";

export default function Modal({ title, onClose, children, maxWidth = "max-w-lg" }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
            <div
                className="absolute inset-0"
                onClick={onClose}
            />

            <div
                className={`relative z-10 flex max-h-[90vh] w-full ${maxWidth} flex-col overflow-hidden rounded-2xl bg-card shadow-2xl`}
            >
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <h2 className="text-lg font-bold text-text">{title}</h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-text-muted hover:bg-bg hover:text-text"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto px-6 py-5">{children}</div>
            </div>
        </div>
    );
}
