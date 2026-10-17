"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getAllCarts } from "@/api/cart.api";
import StatCard from "@/components/admin/StatCard";
import Badge from "@/components/ui/Badge";
import { extractList } from "@/utils/extractList";
import { formatCurrency } from "@/utils/format";

export default function AbandonedCartsPage() {
    const router = useRouter();
    const [cartItems, setCartItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [hidden, setHidden] = useState({});

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            setError("");

            try {
                const res = await getAllCarts();
                setCartItems(extractList(res?.data, ["carts"]));
            } catch (err) {
                setError(err.message || "Failed to load abandoned carts");
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, []);

    // backend returns one aggregate doc per user already: { _id, user, products, productDetails }
    const groups = useMemo(() => {
        return cartItems.map((group) => {
            const productMap = new Map(
                (group.productDetails || []).map((p) => [String(p._id), p])
            );

            const items = (group.products || []).map((entry, index) => ({
                key: `${group._id}-${entry.product}-${index}`,
                qty: entry.qty,
                unitPrice: entry.unitPrice,
                selectedOptions: entry.selectedOptions,
                product: productMap.get(String(entry.product)) || null
            }));

            return { key: group._id || "unknown", user: group.user, items };
        });
    }, [cartItems]);

    const totalUnits = groups.reduce(
        (sum, group) =>
            sum + group.items.reduce((s, item) => s + (item.qty || 0), 0),
        0
    );

    const totalValue = groups.reduce(
        (sum, group) =>
            sum +
            group.items.reduce(
                (s, item) => s + (item.qty || 0) * (item.unitPrice || 0),
                0
            ),
        0
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Abandoned carts" value={groups.length} />
                <StatCard label="Units in carts" value={totalUnits} />
                <StatCard label="Recoverable value" value={formatCurrency(totalValue)} />
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

            {!isLoading && !error && groups.length === 0 && (
                <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center text-text-muted">
                    No abandoned carts right now
                </div>
            )}

            {!isLoading &&
                !error &&
                groups.map((group) => {
                    const key = group.key;
                    const isHidden = hidden[key];
                    const units = group.items.reduce((s, i) => s + (i.qty || 0), 0);
                    const value = group.items.reduce(
                        (s, i) => s + (i.qty || 0) * (i.unitPrice || 0),
                        0
                    );

                    return (
                        <div
                            key={key}
                            className="overflow-hidden rounded-2xl border border-border bg-card"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                                <div>
                                    <p className="text-sm text-text-muted">
                                        Name:{" "}
                                        <span className="font-bold text-text">
                                            {group.user?.name || "—"}
                                        </span>
                                    </p>
                                    <p className="text-sm text-text-muted">
                                        Mobile:{" "}
                                        <span className="font-bold text-text">
                                            {group.user?.phone || "—"}
                                        </span>
                                    </p>
                                </div>

                                <div className="flex items-center gap-4">
                                    <p className="text-sm text-text-muted">
                                        {group.items.length} items · {units} units
                                    </p>
                                    <p className="text-sm font-bold text-text">
                                        {formatCurrency(value)}
                                    </p>
                                    <button
                                        onClick={() =>
                                            setHidden((prev) => ({
                                                ...prev,
                                                [key]: !prev[key]
                                            }))
                                        }
                                        className="text-xs font-bold text-accent hover:text-accent-dark"
                                    >
                                        {isHidden ? "Show" : "Hide"}
                                    </button>
                                </div>
                            </div>

                            {!isHidden && (
                                <div className="space-y-3 border-t border-border px-5 py-4">
                                    {group.items.map((item) => {
                                        const product = item.product;

                                        return (
                                            <div
                                                key={item.key}
                                                className="rounded-xl border border-border p-4"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-text">
                                                            {product?.name || "Product"}
                                                        </p>
                                                        <p className="text-xs text-text-muted">
                                                            {product?.sku}
                                                            {product?.sku && " · "}
                                                            {product?.status}
                                                            {product?._id && (
                                                                <>
                                                                    {" · "}
                                                                    <button
                                                                        onClick={() =>
                                                                            router.push(
                                                                                `/dashboard/products?id=${product._id}`
                                                                            )
                                                                        }
                                                                        className="font-bold text-accent hover:text-accent-dark"
                                                                    >
                                                                        View product
                                                                    </button>
                                                                </>
                                                            )}
                                                        </p>
                                                        {product?.description && (
                                                            <p className="mt-1 line-clamp-1 text-sm text-text-muted">
                                                                {product.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <p className="shrink-0 text-right text-sm font-bold text-text">
                                                        {formatCurrency(item.unitPrice)} × {item.qty}
                                                        <br />
                                                        {formatCurrency(item.unitPrice * item.qty)}
                                                    </p>
                                                </div>

                                                {item.selectedOptions?.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {item.selectedOptions.map((opt, idx) => (
                                                            <Badge key={idx} tone="neutral">
                                                                {opt.name}: {opt.value}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
        </div>
    );
}
