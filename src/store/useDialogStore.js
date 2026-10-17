import { create } from "zustand";

// One app-wide popup instead of window.confirm / window.alert.
// confirmDialog() resolves true/false, alertDialog() resolves when closed.
export const useDialogStore = create((set, get) => ({
    dialog: null,

    open: (dialog) =>
        new Promise((resolve) => {
            // a dialog already open is treated as cancelled
            get().dialog?.resolve(false);
            set({ dialog: { ...dialog, resolve } });
        }),

    close: (result) => {
        get().dialog?.resolve(result);
        set({ dialog: null });
    }
}));

export const confirmDialog = ({
    title = "Are you sure?",
    description,
    confirmLabel = "Delete",
    tone = "danger"
} = {}) =>
    useDialogStore.getState().open({
        type: "confirm",
        title,
        description,
        confirmLabel,
        tone
    });

export const alertDialog = (description, title = "Something went wrong") =>
    useDialogStore.getState().open({
        type: "alert",
        title,
        description
    });
