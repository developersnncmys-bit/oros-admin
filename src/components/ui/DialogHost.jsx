"use client";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useDialogStore } from "@/store/useDialogStore";

export default function DialogHost() {
    const dialog = useDialogStore((state) => state.dialog);
    const close = useDialogStore((state) => state.close);

    if (!dialog) {
        return null;
    }

    if (dialog.type === "alert") {
        return (
            <ConfirmDialog
                title={dialog.title}
                description={dialog.description}
                confirmLabel="OK"
                tone="primary"
                hideCancel
                onConfirm={() => close(true)}
                onCancel={() => close(true)}
            />
        );
    }

    return (
        <ConfirmDialog
            title={dialog.title}
            description={dialog.description}
            confirmLabel={dialog.confirmLabel}
            tone={dialog.tone}
            onConfirm={() => close(true)}
            onCancel={() => close(false)}
        />
    );
}
