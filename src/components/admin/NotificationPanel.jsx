"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Package, FileText, Bell, Trash2 } from "lucide-react";

import { useNotificationStore } from "@/store/useNotificationStore";
import { formatTimeAgo } from "@/utils/format";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const FILTERS = ["All", "Unread", "Read"];

const iconFor = (type = "") => {
    if (type.startsWith("ORDER")) {
        return Package;
    }

    if (type.startsWith("QUOTATION")) {
        return FileText;
    }

    return Bell;
};

const referenceIdOf = (item) =>
    item.referenceId ||
    item.refId ||
    item.orderId ||
    item.quotationId ||
    item.entityId ||
    item?.meta?.id ||
    item?.data?.id ||
    null;

const targetPathFor = (item) => {
    const id = referenceIdOf(item);
    if (!id) {
        return null;
    }

    if (item.type?.startsWith("ORDER")) {
        return `/dashboard/orders?id=${id}`;
    }

    if (item.type?.startsWith("QUOTATION")) {
        return `/dashboard/quotations?id=${id}`;
    }

    return null;
};

export default function NotificationPanel() {
    const router = useRouter();
    const isPanelOpen = useNotificationStore((state) => state.isPanelOpen);
    const closePanel = useNotificationStore((state) => state.closePanel);
    const notifications = useNotificationStore((state) => state.notifications);
    const filter = useNotificationStore((state) => state.filter);
    const setFilter = useNotificationStore((state) => state.setFilter);
    const markAsRead = useNotificationStore((state) => state.markAsRead);
    const removeNotification = useNotificationStore((state) => state.removeNotification);
    const clearAll = useNotificationStore((state) => state.clearAll);
    const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);

    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

    useEffect(() => {
        if (isPanelOpen) {
            fetchNotifications();
        }
    }, [isPanelOpen, fetchNotifications]);

    const filtered = notifications.filter((item) => {
        if (filter === "Unread") return !item.isRead;
        if (filter === "Read") return item.isRead;
        return true;
    });

    const handleClear = () => {
        clearAll();
        setIsClearConfirmOpen(false);
    };

    const handleOpenNotification = (item) => {
        if (!item.isRead) {
            markAsRead(item._id);
        }

        const path = targetPathFor(item);
        if (path) {
            closePanel();
            router.push(path);
        }
    };

    return (
        <>
            {isPanelOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/30"
                    onClick={closePanel}
                />
            )}

            <aside
                className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-card shadow-2xl transition-transform ${
                    isPanelOpen ? "translate-x-0" : "translate-x-full"
                }`}
            >
                <div className="flex items-start justify-between border-b border-border px-6 py-5">
                    <div>
                        <h2 className="text-lg font-bold text-text">Notifications</h2>
                        <p className="text-xs text-text-muted">
                            Updates on your orders &amp; quotes
                        </p>
                    </div>
                    <button
                        onClick={closePanel}
                        className="rounded-full p-1 text-text-muted hover:bg-bg hover:text-text"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex items-center justify-between px-6 py-3">
                    <div className="flex gap-2">
                        {FILTERS.map((item) => (
                            <button
                                key={item}
                                onClick={() => setFilter(item)}
                                className={`rounded-lg px-3 py-2.5 text-xs font-semibold transition ${
                                    filter === item
                                        ? "bg-primary text-white"
                                        : "bg-bg text-text-muted hover:text-text"
                                }`}
                            >
                                {item}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setIsClearConfirmOpen(true)}
                        className="flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-dark"
                    >
                        <Trash2 size={13} />
                        Clear
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-6">
                    {filtered.length === 0 && (
                        <p className="mt-10 text-center text-sm text-text-muted">
                            No notifications
                        </p>
                    )}

                    <div className="space-y-1">
                        {filtered.map((item) => {
                            const Icon = iconFor(item.type);

                            return (
                                <div
                                    key={item._id}
                                    onClick={() => handleOpenNotification(item)}
                                    className="group flex cursor-pointer gap-3 rounded-xl px-2 py-3 hover:bg-bg"
                                >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg text-text">
                                        <Icon size={16} />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                                    item.isRead
                                                        ? "bg-bg text-text-muted"
                                                        : "bg-accent/10 text-accent"
                                                }`}
                                            >
                                                {item.isRead ? "Read" : "Unread"}
                                            </span>
                                            <span className="text-[11px] text-text-muted">
                                                {formatTimeAgo(item.createdAt)}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm text-text">
                                            {item.message}
                                        </p>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeNotification(item._id);
                                        }}
                                        className="shrink-0"
                                    >
                                        <Trash2
                                            size={15}
                                            className="text-text-muted hover:text-red-500"
                                        />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </aside>

            {isClearConfirmOpen && (
                <ConfirmDialog
                    title="Clear all notifications?"
                    description="This deletes every read and unread notification. This can't be undone."
                    confirmLabel="Clear all"
                    onConfirm={handleClear}
                    onCancel={() => setIsClearConfirmOpen(false)}
                />
            )}
        </>
    );
}
