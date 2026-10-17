"use client";

export default function ConfirmDialog({
    title = "Are you sure?",
    description,
    confirmLabel = "Delete",
    cancelLabel = "Cancel",
    tone = "danger",
    hideCancel = false,
    onConfirm,
    onCancel
}) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
            <div className="absolute inset-0" onClick={onCancel} />

            <div className="relative z-10 w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-text">{title}</h3>

                {description && (
                    <p className="mt-2 text-sm text-text-muted">{description}</p>
                )}

                <div className="mt-6 flex gap-3">
                    {!hideCancel && (
                        <button
                            onClick={onCancel}
                            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-text hover:bg-bg"
                        >
                            {cancelLabel}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white ${
                            tone === "primary"
                                ? "bg-primary hover:opacity-90"
                                : "bg-red-500 hover:bg-red-600"
                        }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
