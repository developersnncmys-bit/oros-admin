"use client";

import { Check, X, AlertTriangle } from "lucide-react";
import { useToastStore } from "@/store/useToastStore";

const TONE_STYLES = {
    success: {
        container: "border-emerald-200 bg-emerald-50 text-emerald-800",
        icon: Check,
        iconClass: "text-emerald-600"
    },
    error: {
        container: "border-red-200 bg-red-50 text-red-800",
        icon: AlertTriangle,
        iconClass: "text-red-600"
    },
    info: {
        container: "border-sky-200 bg-sky-50 text-sky-800",
        icon: Check,
        iconClass: "text-sky-600"
    }
};

export default function ToastHost() {
    const toasts = useToastStore((state) => state.toasts);
    const dismiss = useToastStore((state) => state.dismiss);

    if (toasts.length === 0) return null;

    return (
        <div className="pointer-events-none fixed right-4 top-4 z-[1000] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
            {toasts.map((toast) => {
                const style = TONE_STYLES[toast.tone] || TONE_STYLES.success;
                const Icon = style.icon;
                return (
                    <div
                        key={toast.id}
                        role="status"
                        className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 shadow-md ${style.container}`}
                    >
                        <Icon
                            size={16}
                            className={`mt-0.5 shrink-0 ${style.iconClass}`}
                        />
                        <p className="flex-1 text-sm font-semibold leading-snug">
                            {toast.message}
                        </p>
                        <button
                            onClick={() => dismiss(toast.id)}
                            className="shrink-0 text-current opacity-50 hover:opacity-100"
                            aria-label="Dismiss"
                        >
                            <X size={14} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
