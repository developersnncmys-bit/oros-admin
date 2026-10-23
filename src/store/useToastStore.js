import { create } from "zustand";

// Lightweight transient toast store — fire-and-forget notifications shown
// in the top-right. Each toast is auto-dismissed after its duration and the
// store keeps a stack so rapid saves don't clobber each other.

let nextId = 1;

export const useToastStore = create((set, get) => ({
    toasts: [],

    show: ({ message, tone = "success", duration = 2200 }) => {
        const id = nextId++;
        set((state) => ({
            toasts: [...state.toasts, { id, message, tone }]
        }));
        if (duration > 0) {
            setTimeout(() => get().dismiss(id), duration);
        }
        return id;
    },

    dismiss: (id) =>
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id)
        }))
}));

export const showToast = (message, options = {}) =>
    useToastStore.getState().show({ message, ...options });
