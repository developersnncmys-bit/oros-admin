"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Bell, Menu, LogOut } from "lucide-react";

import { NAV_ITEMS } from "@/config/nav";
import { getProfile } from "@/api/user.api";
import { useAuthStore } from "@/store/useAuthStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { confirmDialog } from "@/store/useDialogStore";

export default function Topbar({ onMenuClick }) {
    const router = useRouter();
    const pathname = usePathname();

    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);

    const notifications = useNotificationStore((state) => state.notifications);
    const openPanel = useNotificationStore((state) => state.openPanel);
    const unreadCount = notifications.filter((item) => !item.isRead).length;

    const title =
        NAV_ITEMS.find((item) =>
            item.match
                ? item.match.some((prefix) => pathname.startsWith(prefix))
                : item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href)
        )?.label || "Dashboard";

    // The login response may not carry photo/phone, so refresh from the profile
    useEffect(() => {
        let cancelled = false;

        const loadProfile = async () => {
            try {
                const res = await getProfile();
                const profile = res?.data?.user || res?.data;
                const { user: current, token, setAuth } = useAuthStore.getState();

                if (!cancelled && profile && token) {
                    setAuth({ user: { ...current, ...profile }, token });
                }
            } catch {
                // keep whatever the store already has
            }
        };

        loadProfile();

        return () => {
            cancelled = true;
        };
    }, []);

    const handleLogout = async () => {
        const confirmed = await confirmDialog({
            title: "Log out?",
            description: "You will need to log in again to access the admin panel.",
            confirmLabel: "Log out",
            tone: "primary"
        });
        if (!confirmed) return;

        logout();
        router.replace("/");
    };

    return (
        <header className="sticky top-0 z-20 flex h-[64px] items-center justify-between border-b border-border bg-card px-4 sm:px-8">
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className="rounded-lg p-2 text-text hover:bg-bg lg:hidden"
                >
                    <Menu size={20} />
                </button>
                <h1 className="text-xl font-bold text-text">{title}</h1>
            </div>

            <div className="flex items-center gap-3 sm:gap-5">
                <button
                    onClick={openPanel}
                    className="relative rounded-full p-2 text-text hover:bg-bg"
                    aria-label="Notifications"
                >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </button>

                <Link
                    href="/dashboard/settings"
                    title="View profile"
                    className="flex items-center gap-2 rounded-lg border-l border-border py-1 pl-3 pr-2 transition hover:bg-bg sm:pl-4"
                >
                    {user?.profileImage ? (
                        <img
                            src={user.profileImage}
                            alt={user?.name || "Profile"}
                            className="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
                        />
                    ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                            {(user?.name || "A").charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="hidden leading-tight sm:block">
                        <p className="text-sm font-semibold text-text">
                            {user?.name || "Admin"}
                        </p>
                        <p className="text-xs text-text-muted">
                            {user?.phone || user?.role || ""}
                        </p>
                    </div>
                </Link>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-text-muted hover:bg-bg hover:text-red-500"
                    aria-label="Log out"
                    title="Log out"
                >
                    <LogOut size={18} />
                    <span className="hidden sm:inline">Logout</span>
                </button>
            </div>
        </header>
    );
}
