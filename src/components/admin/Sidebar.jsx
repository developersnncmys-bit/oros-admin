"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "@/config/nav";
import { useAuthStore } from "@/store/useAuthStore";

export default function Sidebar({ open, onClose }) {
    const pathname = usePathname();
    const user = useAuthStore((state) => state.user);

    return (
        <>
            {open && (
                <div
                    className="fixed inset-0 z-30 bg-black/30 lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-40 flex w-56 shrink-0 flex-col border-r border-border bg-card transition-transform lg:static lg:translate-x-0 ${
                    open ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="flex h-[64px] items-center gap-2.5 border-b border-border px-5">
                    <img
                        src="/logo/Orosent-20.svg"
                        alt="OROS"
                        className="h-9 w-9 shrink-0 rounded-lg object-contain"
                    />
                    <span className="text-lg font-extrabold tracking-tight text-primary">
                        Admin
                    </span>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-3">
                    {NAV_ITEMS.map(({ label, href, icon: Icon, match }) => {
                        const isActive = match
                            ? match.some((prefix) => pathname.startsWith(prefix))
                            : href === "/dashboard"
                                ? pathname === "/dashboard"
                                : pathname.startsWith(href);

                        return (
                            <Link
                                key={href}
                                href={href}
                                onClick={onClose}
                                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition ${
                                    isActive
                                        ? "bg-primary text-white"
                                        : "text-text/70 hover:bg-bg hover:text-text"
                                }`}
                            >
                                <Icon size={17} />
                                {label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-border px-5 py-3">
                    <p className="truncate text-xs font-medium text-text-muted">
                        {user?.email || "—"}
                    </p>
                </div>
            </aside>
        </>
    );
}
