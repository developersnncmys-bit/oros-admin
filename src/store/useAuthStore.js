import { create } from "zustand";
import { persist } from "zustand/middleware";

export const ADMIN_ROLES = ["admin", "staff", "superAdmin"];

export const useAuthStore = create(
    persist(
        (set) => ({
            user: null,
            token: null,
            hasHydrated: false,

            setAuth: ({ user, token }) =>
                set({ user, token }),

            logout: () =>
                set({ user: null, token: null }),

            setHasHydrated: (value) =>
                set({ hasHydrated: value })
        }),
        {
            name: "oros-admin-auth",
            partialize: (state) => ({
                user: state.user,
                token: state.token
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            }
        }
    )
);
