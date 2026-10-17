"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getFilaments } from "@/api/filament.api";
import { getProductById, setProductFilaments } from "@/api/product.api";
import { extractList } from "@/utils/extractList";

export default function FilamentsTab({ productId, onClose }) {
    const [filaments, setFilaments] = useState([]);
    const [selected, setSelected] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [justSaved, setJustSaved] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            setError("");

            try {
                const [filamentsRes, productRes] = await Promise.all([
                    getFilaments(),
                    getProductById(productId)
                ]);

                if (cancelled) return;

                const list = extractList(filamentsRes?.data, [
                    "filaments",
                    "filament"
                ]);
                setFilaments(list);

                // The product payload returns full filament objects (populated),
                // but we only need their ids for the checkbox state.
                const current =
                    productRes?.data?.product?.filaments ||
                    productRes?.data?.filaments ||
                    [];
                setSelected(
                    new Set(
                        current.map((f) =>
                            typeof f === "object" ? f._id : f
                        )
                    )
                );
            } catch (err) {
                if (!cancelled)
                    setError(err.message || "Failed to load filaments");
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [productId]);

    const toggle = (id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError("");

        try {
            await setProductFilaments(productId, Array.from(selected));
            setJustSaved(true);
            // Let the "saved" banner flash briefly, then close the modal.
            setTimeout(() => {
                onClose?.();
            }, 900);
        } catch (err) {
            setError(err.message || "Failed to save");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <p className="py-6 text-center text-sm text-text-muted">
                Loading filaments...
            </p>
        );
    }

    if (!filaments.length) {
        return (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
                <p className="mb-2 text-sm text-text">
                    No filaments in the catalog yet.
                </p>
                <Link
                    href="/dashboard/filaments"
                    className="text-xs font-bold text-accent hover:underline"
                >
                    Open the Filaments page to add some →
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-xs text-text-muted">
                Tick each filament this product can be made in. Customers will see
                those filaments and their in-stock colors on the product page.
            </p>

            <div className="grid grid-cols-2 gap-1.5">
                {filaments.map((filament) => {
                    const colorCount = filament.colors?.length || 0;
                    const inStock = (filament.colors || []).filter(
                        (c) => c.stock > 0
                    ).length;
                    const checked = selected.has(filament._id);

                    return (
                        <label
                            key={filament._id}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 transition ${
                                checked
                                    ? "border-accent bg-accent/5"
                                    : "border-border bg-card hover:border-accent/40"
                            }`}
                        >
                            <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggle(filament._id)}
                                className="h-3.5 w-3.5 shrink-0"
                            />

                            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold leading-tight text-text">
                                        {filament.name}
                                        <span className="ml-1 text-[11px] font-normal text-text-muted">
                                            {filament.type}
                                        </span>
                                    </p>
                                    <p className="text-[10px] leading-tight text-text-muted">
                                        {inStock}/{colorCount} ·{" "}
                                        {filament.priceDelta > 0 &&
                                            `+₹${filament.priceDelta}`}
                                        {filament.priceDelta > 0 &&
                                            filament.priceMultiplier !== 1 &&
                                            " · "}
                                        {filament.priceMultiplier !== 1 &&
                                            `×${filament.priceMultiplier}`}
                                        {filament.priceDelta === 0 &&
                                            filament.priceMultiplier === 1 &&
                                            "base price"}
                                    </p>
                                </div>

                                <div className="flex shrink-0 -space-x-1">
                                    {(filament.colors || [])
                                        .slice(0, 5)
                                        .map((color) => (
                                            <span
                                                key={color._id}
                                                className={`block h-4 w-4 rounded-full border-2 border-card ${
                                                    color.stock <= 0
                                                        ? "opacity-30"
                                                        : ""
                                                }`}
                                                style={{ background: color.hex }}
                                                title={
                                                    color.stock > 0
                                                        ? color.name
                                                        : `${color.name} — OOS`
                                                }
                                            />
                                        ))}
                                    {colorCount > 5 && (
                                        <span className="ml-1 flex h-4 items-center text-[9px] font-bold text-text-muted">
                                            +{colorCount - 5}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </label>
                    );
                })}
            </div>

            {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                </p>
            )}

            {justSaved && (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                    ✓ Filaments saved
                </p>
            )}

            <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-text-muted">
                    {selected.size} filament{selected.size === 1 ? "" : "s"}{" "}
                    selected
                </p>
                <button
                    onClick={handleSave}
                    disabled={isSaving || justSaved}
                    className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-70"
                >
                    {isSaving ? "Saving..." : justSaved ? "Saved" : "Save filaments"}
                </button>
            </div>
        </div>
    );
}
