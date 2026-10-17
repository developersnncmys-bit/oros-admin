"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { getQuotations, updateQuotationByAdmin } from "@/api/quotation.api";
import { getSocket } from "@/lib/socket";
import Modal from "@/components/ui/Modal";
import FormField, { inputClass } from "@/components/ui/FormField";
import Badge from "@/components/ui/Badge";
import QuotationFiles from "@/components/admin/QuotationFiles";
import { extractList } from "@/utils/extractList";
import { formatCurrency, formatDate } from "@/utils/format";

const PAGE_SIZE = 8;

const STATUS_OPTIONS = [
    "PENDING",
    "IN_REVIEW",
    "QUOTED",
    "ACCEPTED",
    "REJECTED",
    "EXPIRED",
    "CONVERTED",
    "CANCELLED"
];

const toDateInput = (value) => (value ? String(value).slice(0, 10) : "");

// Product name for a line item, when the backend attached the product
const itemProductName = (item) =>
    item?.product && typeof item.product === "object" ? item.product.name : "";

// The variant the customer picked, e.g. "Color: Red · Size: L"
const itemVariant = (item) =>
    (item?.selectedOptions || [])
        .map((option) => `${option.name}: ${option.value}`)
        .join(" · ");

const productNames = (quotation) =>
    (quotation.items || [])
        .map((item) => {
            const name = itemProductName(item);
            const variant = itemVariant(item);
            return name && variant ? `${name} (${variant})` : name;
        })
        .filter(Boolean)
        .join(", ");

export default function QuotationsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [quotations, setQuotations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    // Snapshot of the open quotation; the live copy from the list wins so
    // new customer messages show up while the modal is open
    const [managing, setManaging] = useState(null);
    const [page, setPage] = useState(1);

    const [refreshKey, setRefreshKey] = useState(0);
    const reload = () => setRefreshKey((key) => key + 1);

    const openQuotation = (quotation) => {
        setManaging(quotation);
        reload();
    };

    const managingQuotation = managing
        ? quotations.find((q) => q._id === managing._id) || managing
        : null;

    // Refresh when a customer messages, uploads, accepts or cancels
    useEffect(() => {
        const socket = getSocket();

        const handleNotification = (notification) => {
            if (String(notification?.type || "").startsWith("QUOTATION")) {
                setRefreshKey((key) => key + 1);
            }
        };

        socket.on("new_notification", handleNotification);

        return () => {
            socket.off("new_notification", handleNotification);
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            setError("");

            try {
                const res = await getQuotations({ page, limit: PAGE_SIZE });
                if (!cancelled) {
                    setQuotations(
                        extractList(res?.data, ["quotation", "quotations"])
                    );
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Failed to load quotations");
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
    }, [page, refreshKey]);

    useEffect(() => {
        const id = searchParams.get("id");
        if (!id) {
            return;
        }

        let cancelled = false;

        // Always fetch fresh — the list on screen may predate the message
        // that triggered this notification
        const findAndOpen = async () => {
            try {
                const res = await getQuotations({ limit: 500 });
                const match = extractList(res?.data, ["quotation", "quotations"]).find(
                    (q) => q._id === id
                );

                if (!cancelled && match) {
                    setManaging(match);
                    reload();
                    router.replace("/dashboard/quotations");
                }
            } catch {
                // notification link couldn't resolve — leave the list as-is
            }
        };

        findAndOpen();

        return () => {
            cancelled = true;
        };
    }, [searchParams, router]);

    return (
        <div>
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

            {!isLoading && !error && quotations.length === 0 && (
                <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center text-text-muted">
                    No quotations yet
                </div>
            )}

            {!isLoading && !error && quotations.length > 0 && (
                <>
                    {/* Mobile: one card per quotation */}
                    <div className="space-y-3 md:hidden">
                        {quotations.map((q) => (
                            <div
                                key={q._id}
                                className="rounded-2xl border border-border bg-card p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-text">
                                            {q.refNumber}
                                        </p>
                                        <p className="text-xs text-text-muted">
                                            {formatDate(q.createdAt)}
                                        </p>
                                    </div>
                                    <Badge tone="neutral">{q.status}</Badge>
                                </div>

                                <div className="mt-3 border-t border-border pt-3 text-sm">
                                    <p className="text-text">{q.name}</p>
                                    <p className="text-xs text-text-muted">{q.phone}</p>
                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-sm">
                                    <div>
                                        <p className="text-xs font-bold uppercase text-text-muted">
                                            Type
                                        </p>
                                        <p className="text-text">{q.type}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase text-text-muted">
                                            Items · Files
                                        </p>
                                        <p className="text-text">
                                            {q.items?.length || 0} · {q.files?.length || "—"}
                                        </p>
                                    </div>
                                    {productNames(q) && (
                                        <div className="col-span-2">
                                            <p className="text-xs font-bold uppercase text-text-muted">
                                                Products
                                            </p>
                                            <p className="text-text">{productNames(q)}</p>
                                        </div>
                                    )}
                                    <div className="col-span-2">
                                        <p className="text-xs font-bold uppercase text-text-muted">
                                            Total
                                        </p>
                                        <p className="font-semibold text-text">
                                            {formatCurrency(q.total)}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-3 border-t border-border pt-3 text-right">
                                    <button
                                        onClick={() => openQuotation(q)}
                                        className="text-xs font-bold text-accent hover:text-accent-dark"
                                    >
                                        Manage
                                    </button>
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
                                        <th className="px-5 py-3">Ref</th>
                                        <th className="px-5 py-3">Customer</th>
                                        <th className="px-5 py-3">Type</th>
                                        <th className="px-5 py-3">Items</th>
                                        <th className="px-5 py-3">Files</th>
                                        <th className="px-5 py-3">Total</th>
                                        <th className="px-5 py-3">Status</th>
                                        <th className="px-5 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quotations.map((q) => (
                                        <tr
                                            key={q._id}
                                            className="border-b border-border last:border-0"
                                        >
                                            <td className="px-5 py-3">
                                                <p className="font-semibold text-text">
                                                    {q.refNumber}
                                                </p>
                                                <p className="text-xs text-text-muted">
                                                    {formatDate(q.createdAt)}
                                                </p>
                                            </td>
                                            <td className="px-5 py-3">
                                                <p className="text-text">{q.name}</p>
                                                <p className="text-xs text-text-muted">
                                                    {q.phone}
                                                </p>
                                            </td>
                                            <td className="px-5 py-3 text-text">{q.type}</td>
                                            <td className="max-w-56 px-5 py-3 text-text">
                                                <p>{q.items?.length || 0}</p>
                                                {productNames(q) && (
                                                    <p className="truncate text-xs text-text-muted" title={productNames(q)}>
                                                        {productNames(q)}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-text-muted">
                                                {q.files?.length || "—"}
                                            </td>
                                            <td className="px-5 py-3 font-semibold text-text">
                                                {formatCurrency(q.total)}
                                            </td>
                                            <td className="px-5 py-3">
                                                <Badge tone="neutral">{q.status}</Badge>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <button
                                                    onClick={() => openQuotation(q)}
                                                    className="text-xs font-bold text-accent hover:text-accent-dark"
                                                >
                                                    Manage
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

            {!isLoading && !error && quotations.length > 0 && (
                <div className="mt-3 flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-3">
                    <p className="text-xs text-text-muted">Page {page}</p>
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
                            onClick={() => setPage((p) => p + 1)}
                            disabled={quotations.length < PAGE_SIZE}
                            className="flex items-center gap-1 rounded-lg border border-border px-3 py-2.5 text-xs font-semibold text-text disabled:opacity-40"
                        >
                            Next
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}

            {managingQuotation && (
                <QuotationModal
                    quotation={managingQuotation}
                    onClose={() => setManaging(null)}
                    onSaved={() => {
                        setManaging(null);
                        reload();
                    }}
                />
            )}
        </div>
    );
}

function QuotationModal({ quotation, onClose, onSaved }) {
    const [status, setStatus] = useState(quotation.status);
    const [validTill, setValidTill] = useState(toDateInput(quotation.validTill));
    const [subTotal, setSubTotal] = useState(quotation.subTotal ?? 0);
    const [tax, setTax] = useState(quotation.tax ?? 0);
    const [shipping, setShipping] = useState(quotation.shipping ?? 0);
    const [message, setMessage] = useState("");
    const [items, setItems] = useState(
        (quotation.items || []).map((item) => ({
            id: item._id,
            productName: itemProductName(item),
            sku: item.product?.sku || "",
            // A custom quote is only priced per unit when it references a product
            needsUnitPrice: quotation.type !== "CUSTOM" || Boolean(item.product),
            selectedOptions: item.selectedOptions || [],
            qty: item.qty,
            unitPrice: item.unitPrice ?? 0,
            tax: item.tax ?? 0
        }))
    );
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState("");

    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [address, setAddress] = useState({
        name: quotation.shippingAddress?.name || "",
        phone: quotation.shippingAddress?.phone || "",
        addressLine1: quotation.shippingAddress?.addressLine1 || "",
        addressLine2: quotation.shippingAddress?.addressLine2 || "",
        city: quotation.shippingAddress?.city || "",
        state: quotation.shippingAddress?.state || "",
        country: quotation.shippingAddress?.country || "",
        pincode: quotation.shippingAddress?.pincode || ""
    });

    const updateItem = (id, field, value) => {
        setItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    };

    // Keep the overall sub total and tax in sync with the per-line prices
    // the admin enters above. Line `tax` is a percentage (GST-style) so
    // taxAmount = unitPrice * qty * tax / 100, matching pricing.service.js.
    useEffect(() => {
        const pricedItems = items.filter((item) => item.needsUnitPrice);
        if (pricedItems.length === 0) return;

        const computedSubTotal = pricedItems.reduce(
            (sum, item) => sum + (Number(item.unitPrice) || 0) * item.qty,
            0
        );
        const computedTax = pricedItems.reduce((sum, item) => {
            const lineTotal = (Number(item.unitPrice) || 0) * item.qty;
            return sum + lineTotal * ((Number(item.tax) || 0) / 100);
        }, 0);

        setSubTotal(computedSubTotal);
        setTax(Number(computedTax.toFixed(2)));
    }, [items]);

    const handleSave = async (event) => {
        event.preventDefault();
        setFormError("");
        setIsSaving(true);

        try {
            await updateQuotationByAdmin(quotation._id, {
                status,
                validTill: validTill || undefined,
                subTotal: Number(subTotal) || 0,
                tax: Number(tax) || 0,
                shipping: Number(shipping) || 0,
                message: message || undefined,
                shippingAddress: isEditingAddress ? address : undefined,
                items: items.map((item) => ({
                    id: item.id,
                    unitPrice: item.needsUnitPrice
                        ? Number(item.unitPrice) || 0
                        : undefined,
                    tax: item.needsUnitPrice
                        ? Number(item.tax) || 0
                        : undefined
                }))
            });

            onSaved();
        } catch (err) {
            setFormError(err.message || "Failed to update quotation");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal title={`Quotation ${quotation.refNumber}`} onClose={onClose} maxWidth="max-w-2xl">
            <div className="mb-5 rounded-xl bg-bg p-4 text-sm">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <p>
                        <span className="text-text-muted">Name</span>{" "}
                        <span className="font-semibold text-text">{quotation.name}</span>
                    </p>
                    <p>
                        <span className="text-text-muted">Phone</span>{" "}
                        <span className="font-semibold text-text">{quotation.phone}</span>
                    </p>
                    <p>
                        <span className="text-text-muted">Email</span>{" "}
                        <span className="font-semibold text-text">{quotation.email}</span>
                    </p>
                    <p>
                        <span className="text-text-muted">Needed by</span>{" "}
                        <span className="font-semibold text-text">
                            {formatDate(quotation.deadline)}
                        </span>
                    </p>
                </div>

                {quotation.shippingAddress && (
                    <div className="mt-3 border-t border-border pt-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase text-text-muted">
                                Ship to
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsEditingAddress((prev) => !prev)}
                                className="rounded-lg border border-accent px-3 py-2 text-xs font-bold text-accent hover:bg-accent hover:text-white"
                            >
                                {isEditingAddress ? "Cancel" : "Update address"}
                            </button>
                        </div>

                        {!isEditingAddress ? (
                            <p className="text-text">
                                {address.name} · {address.phone} — {address.city},{" "}
                                {address.state}, {address.pincode}, {address.country}
                            </p>
                        ) : (
                            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <input
                                    placeholder="Name"
                                    className={inputClass}
                                    value={address.name}
                                    onChange={(e) =>
                                        setAddress((p) => ({ ...p, name: e.target.value }))
                                    }
                                />
                                <input
                                    placeholder="Phone"
                                    className={inputClass}
                                    value={address.phone}
                                    onChange={(e) =>
                                        setAddress((p) => ({ ...p, phone: e.target.value }))
                                    }
                                />
                                <input
                                    placeholder="Address line 1"
                                    className={`${inputClass} sm:col-span-2`}
                                    value={address.addressLine1}
                                    onChange={(e) =>
                                        setAddress((p) => ({
                                            ...p,
                                            addressLine1: e.target.value
                                        }))
                                    }
                                />
                                <input
                                    placeholder="Address line 2"
                                    className={`${inputClass} sm:col-span-2`}
                                    value={address.addressLine2}
                                    onChange={(e) =>
                                        setAddress((p) => ({
                                            ...p,
                                            addressLine2: e.target.value
                                        }))
                                    }
                                />
                                <input
                                    placeholder="City"
                                    className={inputClass}
                                    value={address.city}
                                    onChange={(e) =>
                                        setAddress((p) => ({ ...p, city: e.target.value }))
                                    }
                                />
                                <input
                                    placeholder="State"
                                    className={inputClass}
                                    value={address.state}
                                    onChange={(e) =>
                                        setAddress((p) => ({ ...p, state: e.target.value }))
                                    }
                                />
                                <input
                                    placeholder="Pincode"
                                    className={inputClass}
                                    value={address.pincode}
                                    onChange={(e) =>
                                        setAddress((p) => ({
                                            ...p,
                                            pincode: e.target.value
                                        }))
                                    }
                                />
                                <input
                                    placeholder="Country"
                                    className={inputClass}
                                    value={address.country}
                                    onChange={(e) =>
                                        setAddress((p) => ({
                                            ...p,
                                            country: e.target.value
                                        }))
                                    }
                                />
                                <p className="text-xs text-text-muted sm:col-span-2">
                                    Changes are saved with the rest of this form.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <QuotationFiles files={quotation.files} />

            {quotation.messages?.length > 0 && (
                <div className="mb-5 rounded-xl border border-border p-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-muted">
                        Messages
                    </p>

                    <div className="max-h-56 space-y-3 overflow-y-auto">
                        {[...quotation.messages]
                            .sort(
                                (a, b) =>
                                    new Date(a.createdAt) - new Date(b.createdAt)
                            )
                            .map((item) => (
                                <div
                                    key={item._id}
                                    className={`flex ${
                                        item.sender === "ADMIN"
                                            ? "justify-end"
                                            : "justify-start"
                                    }`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                                            item.sender === "ADMIN"
                                                ? "bg-primary text-white"
                                                : "bg-bg text-text"
                                        }`}
                                    >
                                        <p>{item.message}</p>
                                        <p
                                            className={`mt-1 text-[10px] ${
                                                item.sender === "ADMIN"
                                                    ? "text-white/70"
                                                    : "text-text-muted"
                                            }`}
                                        >
                                            {item.sender === "ADMIN"
                                                ? "You"
                                                : quotation.name || "Customer"}{" "}
                                            · {formatDate(item.createdAt)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-5">
                <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">
                        Line items
                    </p>

                    <div className="space-y-3">
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="flex flex-wrap items-end gap-3 rounded-xl border border-border p-3"
                            >
                                <div className="min-w-30 flex-1 text-sm">
                                    <p className="font-semibold text-text">
                                        {item.productName ||
                                            (quotation.type === "CUSTOM"
                                                ? "Custom item"
                                                : "Product item")}
                                    </p>
                                    <p className="text-xs text-text-muted">
                                        {[
                                            item.sku && `SKU ${item.sku}`,
                                            // Custom quotes only carry a quantity for a reference product;
                                            // otherwise it is stated in the requirements
                                            item.needsUnitPrice && `Qty ${item.qty}`
                                        ]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </p>
                                    {item.selectedOptions.length > 0 && (
                                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                                            {item.selectedOptions.map((option) => (
                                                <span
                                                    key={`${option.name}:${option.value}`}
                                                    className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-text"
                                                >
                                                    {option.name}: {option.value}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {item.needsUnitPrice && (
                                <div className="w-28">
                                    <FormField label="Unit price">
                                        <input
                                            type="number"
                                            min="0"
                                            className={inputClass}
                                            value={item.unitPrice}
                                            onChange={(e) =>
                                                updateItem(item.id, "unitPrice", e.target.value)
                                            }
                                        />
                                    </FormField>
                                </div>
                                )}
                                {item.needsUnitPrice && (
                                <div className="w-24">
                                    <FormField label="Tax %">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            className={inputClass}
                                            value={item.tax}
                                            onChange={(e) =>
                                                updateItem(item.id, "tax", e.target.value)
                                            }
                                        />
                                    </FormField>
                                </div>
                                )}
                                <p className="text-xs text-text-muted">
                                    {item.needsUnitPrice ? (() => {
                                        const lineTotal =
                                            (Number(item.unitPrice) || 0) * item.qty;
                                        const lineTax =
                                            lineTotal * ((Number(item.tax) || 0) / 100);
                                        return (
                                            <>
                                                Line subtotal: {formatCurrency(lineTotal)}
                                                {" · "}Tax: {formatCurrency(lineTax)}
                                            </>
                                        );
                                    })() : (
                                        "No reference product — price it with the sub total below."
                                    )}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Status">
                        <select
                            className={inputClass}
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            {STATUS_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </FormField>

                    <FormField label="Valid till">
                        <input
                            type="date"
                            className={inputClass}
                            value={validTill}
                            onChange={(e) => setValidTill(e.target.value)}
                        />
                    </FormField>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <FormField label="Sub total">
                        <input
                            type="number"
                            min="0"
                            readOnly
                            className={`${inputClass} cursor-not-allowed opacity-70`}
                            value={subTotal}
                            onChange={(e) => setSubTotal(e.target.value)}
                        />
                    </FormField>

                    <FormField label="Tax %">
                        <input
                            type="text"
                            readOnly
                            className={`${inputClass} cursor-not-allowed opacity-70`}
                            value={
                                subTotal > 0
                                    ? `${((tax / subTotal) * 100).toFixed(2)}% (${formatCurrency(tax)})`
                                    : `0% (${formatCurrency(0)})`
                            }
                            onChange={() => {}}
                        />
                    </FormField>

                    <FormField label="Shipping">
                        <input
                            type="number"
                            min="0"
                            className={inputClass}
                            value={shipping}
                            onChange={(e) => setShipping(e.target.value)}
                        />
                    </FormField>
                </div>

                <FormField label="Message to customer">
                    <textarea
                        className={`${inputClass} min-h-20 resize-y`}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                </FormField>

                {formError && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                        {formError}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-70"
                >
                    {isSaving ? "Saving..." : "Save quotation"}
                </button>
            </form>
        </Modal>
    );
}
