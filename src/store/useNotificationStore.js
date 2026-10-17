import { create } from "zustand";

import {
    getNotifications,
    markNotificationRead,
    deleteNotification,
    clearNotifications
} from "@/api/notification.api";

export const useNotificationStore = create((set, get) => ({
    notifications: [],
    isLoading: false,
    isPanelOpen: false,
    filter: "ALL",

    openPanel: () => {
        set({ isPanelOpen: true });
        get().fetchNotifications();
    },

    closePanel: () => set({ isPanelOpen: false }),

    setFilter: (filter) => set({ filter }),

    addNotification: (notification) => {
        set((state) => {
            if (state.notifications.some((item) => item._id === notification._id)) {
                return state;
            }

            return { notifications: [notification, ...state.notifications] };
        });
    },

    fetchNotifications: async () => {
        set({ isLoading: true });

        try {
            const res = await getNotifications();
            const list = res?.data?.notifications || res?.data || [];

            set({ notifications: Array.isArray(list) ? list : [], isLoading: false });
        } catch {
            set({ isLoading: false });
        }
    },

    markAsRead: async (id) => {
        set((state) => ({
            notifications: state.notifications.map((item) =>
                item._id === id ? { ...item, isRead: true } : item
            )
        }));

        try {
            await markNotificationRead(id);
        } catch {
            // ui already reflects the intent; a background refetch will settle
        }
    },

    removeNotification: async (id) => {
        set((state) => ({
            notifications: state.notifications.filter((item) => item._id !== id)
        }));

        try {
            await deleteNotification(id);
        } catch {
            get().fetchNotifications();
        }
    },

    clearAll: async () => {
        const previous = get().notifications;

        set({ notifications: [] });

        try {
            await clearNotifications();
        } catch {
            set({ notifications: previous });
        }
    }
}));
