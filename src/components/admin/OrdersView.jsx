"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";

import { getAdminOrders, updateOrderStatus } from "@/api/order.api";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Badge from "@/components/ui/Badge";
import { extractList } from "@/utils/extractList";
import { formatCurrency, formatDate } from "@/utils/format";
import { alertDialog } from "@/store/useDialogStore";

const TABS = ["All", "Paid", "Unpaid", "Cancelled", "Store", "Quotation", "Manual"];
const PAGE_SIZE = 8;

// Query params sent to the server for each tab
const TAB_FILTERS = {
    All: {},
    Paid: { paymentStatus: "PAID" },
    Unpaid: { status: "PENDING_PAYMENT" },
    Cancelled: { status: "CANCELLED" },
    Store: { source: "STORE" },
    Quotation: { source: "QUOTATION" },
    Manual: { source: "MANUAL" }
};

const STATUS_OPTIONS = [
    "PENDING_PAYMENT",
    "PAID",
    "CONFIRMED",
    "PROCESSING",
    "IN_PRODUCTION",
    "COMPLETED",
    "CANCELLED"
];

const STATUS_TONE = {
    PAID: "success",
    COMPLETED: "success",
    CANCELLED: "danger",
    PENDING_PAYMENT: "warning",
    CONFIRMED: "primary",
    PROCESSING: "primary",
    IN_PRODUCTION: "primary"
};

const PAYMENT_TONE = {
    PAID: "success",
    PENDING: "warning",
    FAILED: "danger",
    REFUNDED: "neutral"
};

// payment.status from the order; older orders may not carry one
const PaymentBadge = ({ order }) => {
    const status = order?.payment?.status || "PENDING";
    return <Badge tone={PAYMENT_TONE[status] || "neutral"}>{status}</Badge>;
};

const SOURCE_TONE = {
    QUOTATION: "quotation",
    STORE: "store",
    MANUAL: "dark"
};

// The quotation an order was raised from — populated or a bare id
const quotationIdOf = (order) =>
    order?.quotation && typeof order.quotation === "object"
        ? order.quotation._id
        : order?.quotation || null;

// Jumps to the quotations page, which opens the quotation from ?id=
function SeeQuotationLink({ order }) {
    const id = quotationIdOf(order);
    if (!id) return null;

    return (
        <Link
            href={`/dashboard/quotations?id=${id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
        >
            <FileText size={12} /> See quotation
        </Link>
    );
}

export default function OrdersView({
    userId = "",
    customerName = "",
    customer = null,
    onBack
}) {
    const displayName = customer?.name || customerName || "Customer";
    const router = useRouter();
    const searchParams = useSearchParams();
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [tab, setTab] = useState("All");
    const [page, setPage] = useState(1);
    const [viewing, setViewing] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);
    // Status change waiting for the admin to confirm: { order, status }
    const [pendingStatus, setPendingStatus] = useState(null);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            setError("");

            try {
                const res = await getAdminOrders({
                    ...TAB_FILTERS[tab],
                    ...(userId ? { userId } : {}),
                    page,
                    limit: PAGE_SIZE
                });
                if (!cancelled) {
                    setOrders(extractList(res?.data, ["orders", "order"]));
                    setTotalPages(Math.max(1, res?.data?.pagination?.totalPages || 1));
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Failed to load orders");
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [tab, page, userId]);

    useEffect(() => {
        const openIfMatch = () => {
            const id = searchParams.get("id");
            if (userId || !id || orders.length === 0) {
                return;
            }

            const match = orders.find((o) => o._id === id);
            if (match) {
                setViewing(match);
                router.replace("/dashboard/orders");
            }
        };

        openIfMatch();
    }, [orders, searchParams, router, userId]);

    // Filtering and pagination are done by the server
    const filtered = orders;

    // The select stays on the old status until the admin confirms
    const requestStatusChange = (order, status) => {
        if (
            status === order.status ||
            order.status === "COMPLETED" ||
            order.status === "CANCELLED"
        ) {
            return;
        }

        setPendingStatus({ order, status });
    };

    const confirmStatusChange = () => {
        const { order, status } = pendingStatus;
        setPendingStatus(null);
        handleStatusChange(order, status);
    };

    const handleStatusChange = async (order, status) => {
        setUpdatingId(order._id);

        try {
            await updateOrderStatus(order._id, status);
            setOrders((prev) =>
                prev.map((o) => (o._id === order._id ? { ...o, status } : o))
            );
        } catch (err) {
            alertDialog(err.message || "Failed to update order status");
        } finally {
            setUpdatingId(null);
        }
    };

    const orderItems = (order) => order.items || order.orderItems || [];

    const itemCount = (order) => orderItems(order).length;

    const itemName = (item) => item.nameSnapshot || item.product?.name || "Product";

    const itemNames = (order) => orderItems(order).map(itemName).join(", ");

    const pageRows = filtered;

    const handleTabChange = (item) => {
        setTab(item);
        setPage(1);
    };

    return (
        <div>
            {userId && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                        {customer?.profileImage ? (
                            <img
                                src={customer.profileImage}
                                alt={displayName}
                                className="h-14 w-14 shrink-0 rounded-full border border-border object-cover"
                            />
                        ) : (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0 leading-snug">
                            <p className="truncate text-base font-bold text-text">
                                {displayName}
                            </p>
                            {customer?.phone && (
                                <p className="text-sm text-text-muted">
                                    <span className="font-semibold text-text">
                                        Phone:
                                    </span>{" "}
                                    {customer.phone}
                                </p>
                            )}
                            {customer?.email && (
                                <p className="truncate text-sm text-text-muted">
                                    <span className="font-semibold text-text">
                                        Email:
                                    </span>{" "}
                                    {customer.email}
                                </p>
                            )}
                            {(customer?.accountType || customer?.createdAt) && (
                                <p className="text-xs capitalize text-text-muted">
                                    {[
                                        customer.accountType,
                                        customer.createdAt &&
                                            `Joined ${formatDate(customer.createdAt)}`
                                    ]
                                        .filter(Boolean)
                                        .join(" · ")}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1 text-xs font-bold text-accent hover:text-accent-dark"
                    >
                        <ChevronLeft size={14} />
                        Back to customers
                    </button>
                </div>
            )}

            <div className="mb-5 flex flex-wrap gap-2">
                {TABS.map((item) => (
                    <button
                        key={item}
                        onClick={() => handleTabChange(item)}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                            tab === item
                                ? "bg-primary text-white"
                                : "bg-card text-text-muted hover:text-text"
                        }`}
                    >
                        {item}
                    </button>
                ))}
            </div>

            {isLoading && (
                <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center text-text-muted">
                    Loading...
                </div>
            )}

            {!isLoading && error && (
                <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center text-red-500">
                    {error}
                </div>
            )}

            {!isLoading && !error && filtered.length === 0 && (
                <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center text-text-muted">
                    No orders in this tab
                </div>
            )}

            {!isLoading && !error && filtered.length > 0 && (
                <>
                    {/* Mobile: one card per order, all details stacked — no horizontal scrolling */}
                    <div className="space-y-3 md:hidden">
                        {pageRows.map((order) => (
                            <div
                                key={order._id}
                                className="rounded-2xl border border-border bg-card p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-semibold text-text">
                                            #{order._id}
                                        </p>
                                        <p className="text-xs text-text-muted">
                                            {formatDate(order.createdAt)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setViewing(order)}
                                        className="shrink-0 text-xs font-bold text-accent hover:text-accent-dark"
                                    >
                                        View
                                    </button>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                    <Badge tone={SOURCE_TONE[order.source] || "neutral"}>
                                        {order.source}
                                    </Badge>
                                    {typeof order.quotation === "object" &&
                                        order.quotation?.type && (
                                            <Badge tone="solid">
                                                {order.quotation.type}
                                            </Badge>
                                        )}
                                    {typeof order.quotation === "object" &&
                                        order.quotation?.refNumber && (
                                            <Badge tone="outline">
                                                {order.quotation.refNumber}
                                            </Badge>
                                        )}
                                    <SeeQuotationLink order={order} />
                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-sm">
                                    <div>
                                        <p className="text-xs font-bold uppercase text-text-muted">
                                            Customer
                                        </p>
                                        <p className="font-medium text-text">
                                            {order.user?.name || "—"}
                                        </p>
                                        <p className="text-xs text-text-muted">
                                            {order.user?.phone || ""}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase text-text-muted">
                                            Items · Total
                                        </p>
                                        <p className="font-semibold text-text">
                                            {itemCount(order)} items ·{" "}
                                            {formatCurrency(order.pricing?.total)}
                                        </p>
                                    </div>
                                    {itemCount(order) > 0 && (
                                        <div className="col-span-2">
                                            <p className="text-xs font-bold uppercase text-text-muted">
                                                Products
                                            </p>
                                            <p className="text-text">
                                                {itemNames(order)}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                                    <p className="text-xs font-bold uppercase text-text-muted">
                                        Payment
                                    </p>
                                    <PaymentBadge order={order} />
                                </div>

                                <div className="mt-3 border-t border-border pt-3">
                                    <p className="mb-1.5 text-xs font-bold uppercase text-text-muted">
                                        Order status
                                    </p>
                                    {order.status === "CANCELLED" ? (
                                        <Badge tone="danger">CANCELLED</Badge>
                                    ) : (
                                        <select
                                            value={order.status}
                                            disabled={
                                                updatingId === order._id ||
                                                order.status === "COMPLETED"
                                            }
                                            onChange={(e) =>
                                                requestStatusChange(order, e.target.value)
                                            }
                                            className="w-full rounded-lg border border-border bg-white px-2 py-2 text-xs font-semibold text-text outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {STATUS_OPTIONS.map((status) => (
                                                <option key={status} value={status}>
                                                    {status}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop / tablet: table */}
                    <div className="hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-border text-xs font-bold uppercase tracking-wide text-text-muted">
                                        <th className="px-5 py-3">Order</th>
                                        <th className="px-5 py-3">Source</th>
                                        <th className="px-5 py-3">Customer</th>
                                        <th className="px-5 py-3">Items</th>
                                        <th className="px-5 py-3">Total</th>
                                        <th className="px-5 py-3">Payment</th>
                                        <th className="px-5 py-3">Order status</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.map((order) => (
                                        <tr
                                            key={order._id}
                                            className="border-b border-border last:border-0"
                                        >
                                            <td className="px-5 py-3">
                                                <p className="text-xs font-semibold text-text">
                                                    #{order._id}
                                                </p>
                                                <p className="text-xs text-text-muted">
                                                    {formatDate(order.createdAt)}
                                                </p>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex flex-col items-start gap-1.5">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <Badge
                                                            tone={
                                                                SOURCE_TONE[
                                                                    order.source
                                                                ] || "neutral"
                                                            }
                                                        >
                                                            {order.source}
                                                        </Badge>
                                                        {typeof order.quotation ===
                                                            "object" &&
                                                            order.quotation?.type && (
                                                                <Badge tone="solid">
                                                                    {order.quotation.type}
                                                                </Badge>
                                                            )}
                                                    </div>
                                                    {typeof order.quotation ===
                                                        "object" &&
                                                        order.quotation?.refNumber && (
                                                            <Badge tone="outline">
                                                                {
                                                                    order.quotation
                                                                        .refNumber
                                                                }
                                                            </Badge>
                                                        )}
                                                    <div className="mt-1">
                                                        <SeeQuotationLink order={order} />
                                                    </div>

                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <p className="font-medium text-text">
                                                    {order.user?.name || "—"}
                                                </p>
                                                <p className="text-xs text-text-muted">
                                                    {order.user?.phone || ""}
                                                </p>
                                            </td>
                                            <td className="max-w-56 px-5 py-3 text-text">
                                                <p>{itemCount(order)}</p>
                                                {itemCount(order) > 0 && (
                                                    <p
                                                        className="truncate text-xs text-text-muted"
                                                        title={itemNames(order)}
                                                    >
                                                        {itemNames(order)}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 font-semibold text-text">
                                                {formatCurrency(order.pricing?.total)}
                                            </td>
                                            <td className="px-5 py-3">
                                                <PaymentBadge order={order} />
                                            </td>
                                            <td className="px-5 py-3">
                                                {order.status === "CANCELLED" ? (
                                                    <Badge tone="danger">CANCELLED</Badge>
                                                ) : (
                                                    <select
                                                        value={order.status}
                                                        disabled={
                                                            updatingId === order._id ||
                                                            order.status === "COMPLETED"
                                                        }
                                                        onChange={(e) =>
                                                            requestStatusChange(
                                                                order,
                                                                e.target.value
                                                            )
                                                        }
                                                        className="rounded-lg border border-border bg-white px-2 py-1.5 text-xs font-semibold text-text outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        {STATUS_OPTIONS.map((status) => (
                                                            <option
                                                                key={status}
                                                                value={status}
                                                            >
                                                                {status}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <button
                                                    onClick={() => setViewing(order)}
                                                    className="text-xs font-bold text-accent hover:text-accent-dark"
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {!isLoading && !error && filtered.length > 0 && (
                <div className="mt-3 flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-3">
                    <p className="text-xs text-text-muted">
                        Page {page} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="flex items-center gap-1 rounded-lg border border-border px-3 py-2.5 text-xs font-semibold text-text disabled:opacity-40"
                        >
                            <ChevronLeft size={14} />
                            Prev
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="flex items-center gap-1 rounded-lg border border-border px-3 py-2.5 text-xs font-semibold text-text disabled:opacity-40"
                        >
                            Next
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}

            {pendingStatus && pendingStatus.status === "COMPLETED" && (
                <ConfirmDialog
                    title="Mark order as completed?"
                    description={
                        <>
                            You are changing this order from{" "}
                            <span className="font-semibold text-text">
                                {pendingStatus.order.status}
                            </span>{" "}
                            to <span className="font-semibold text-text">COMPLETED</span>.
                            <span className="mt-3 block rounded-lg bg-red-50 px-3 py-2 font-semibold text-red-600">
                                Once an order is completed, its status cannot be changed
                                again.
                            </span>
                        </>
                    }
                    confirmLabel="Yes, complete order"
                    onConfirm={confirmStatusChange}
                    onCancel={() => setPendingStatus(null)}
                />
            )}

            {pendingStatus && pendingStatus.status !== "COMPLETED" && (
                <ConfirmDialog
                    title="Change order status?"
                    description={
                        <>
                            Do you want to change this order from{" "}
                            <span className="font-semibold text-text">
                                {pendingStatus.order.status}
                            </span>{" "}
                            to{" "}
                            <span className="font-semibold text-text">
                                {pendingStatus.status}
                            </span>
                            ?
                        </>
                    }
                    confirmLabel="Yes, change"
                    tone="primary"
                    onConfirm={confirmStatusChange}
                    onCancel={() => setPendingStatus(null)}
                />
            )}

            {viewing && (
                <Modal title={`Order #${viewing._id}`} onClose={() => setViewing(null)}>
                    <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-xs font-bold uppercase text-text-muted">
                                    Status
                                </p>
                                <Badge tone={STATUS_TONE[viewing.status] || "neutral"}>
                                    {viewing.status}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase text-text-muted">
                                    Source
                                </p>
                                <p className="font-semibold text-text">
                                    {viewing.source}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-border p-3">
                            <div className="mb-2 flex items-center justify-between">
                                <p className="text-xs font-bold uppercase text-text-muted">
                                    Payment
                                </p>
                                <PaymentBadge order={viewing} />
                            </div>
                            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                                {[
                                    ["Method", viewing.payment?.method],
                                    ["Provider", viewing.payment?.provider],
                                    ["Payment order ID", viewing.payment?.paymentOrderId],
                                    ["Transaction ID", viewing.payment?.transactionId],
                                    [
                                        "Paid at",
                                        viewing.payment?.paidAt &&
                                            formatDate(viewing.payment.paidAt)
                                    ]
                                ].map(([label, value]) => (
                                    <div key={label} className="min-w-0">
                                        <dt className="text-text-muted">{label}</dt>
                                        <dd className="truncate font-semibold text-text" title={value || ""}>
                                            {value || "—"}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </div>

                        {quotationIdOf(viewing) && (
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
                                <p className="text-text-muted">
                                    Raised from quotation{" "}
                                    <span className="font-semibold text-text">
                                        {viewing.quotation?.refNumber || ""}
                                    </span>
                                </p>
                                <SeeQuotationLink order={viewing} />
                            </div>
                        )}

                        <div>
                            <p className="mb-1 text-xs font-bold uppercase text-text-muted">
                                Customer
                            </p>
                            <p className="font-semibold text-text">
                                {viewing.user?.name || "—"}
                            </p>
                            <p className="text-text-muted">{viewing.user?.phone}</p>
                        </div>

                        {viewing.shippingAddress && (
                            <div>
                                <p className="mb-1 text-xs font-bold uppercase text-text-muted">
                                    Shipping address
                                </p>
                                <p className="text-text">
                                    {viewing.shippingAddress.name},{" "}
                                    {viewing.shippingAddress.addressLine1}{" "}
                                    {viewing.shippingAddress.addressLine2}
                                </p>
                                <p className="text-text-muted">
                                    {viewing.shippingAddress.city},{" "}
                                    {viewing.shippingAddress.state} –{" "}
                                    {viewing.shippingAddress.pincode}
                                </p>
                            </div>
                        )}

                        {itemCount(viewing) > 0 && (
                            <div>
                                <p className="mb-1 text-xs font-bold uppercase text-text-muted">
                                    Items
                                </p>
                                <div className="divide-y divide-border rounded-xl border border-border">
                                    {orderItems(viewing).map((item, index) => (
                                        <div
                                            key={item._id || index}
                                            className="flex items-start justify-between gap-3 px-3 py-2"
                                        >
                                            <div className="min-w-0">
                                                <p className="font-semibold text-text">
                                                    {itemName(item)}
                                                </p>
                                                <p className="text-xs text-text-muted">
                                                    {[
                                                        (item.skuSnapshot ||
                                                            item.product?.sku) &&
                                                            `SKU ${item.skuSnapshot || item.product?.sku}`,
                                                        `Qty ${item.qty}`,
                                                        ...(
                                                            item.selectedOptions || []
                                                        ).map(
                                                            (option) =>
                                                                `${option.name}: ${option.value}`
                                                        )
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" · ")}
                                                </p>
                                            </div>
                                            <p className="shrink-0 font-semibold text-text">
                                                {formatCurrency(item.lineTotal)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 rounded-xl bg-bg p-4">
                            <div>
                                <p className="text-xs font-bold uppercase text-text-muted">
                                    Subtotal
                                </p>
                                <p className="font-semibold text-text">
                                    {formatCurrency(viewing.pricing?.subtotal)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase text-text-muted">
                                    Shipping
                                </p>
                                <p className="font-semibold text-text">
                                    {formatCurrency(viewing.pricing?.shipping)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase text-text-muted">
                                    Tax
                                </p>
                                <p className="font-semibold text-text">
                                    {formatCurrency(viewing.pricing?.tax)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase text-text-muted">
                                    Total
                                </p>
                                <p className="font-bold text-text">
                                    {formatCurrency(viewing.pricing?.total)}
                                </p>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
