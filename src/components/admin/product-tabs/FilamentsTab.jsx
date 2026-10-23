"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";

import { getFilaments } from "@/api/filament.api";
import {
    getProductById,
    setProductFilaments,
    updateProduct
} from "@/api/product.api";
import { extractList } from "@/utils/extractList";
import { showToast } from "@/store/useToastStore";

export default function FilamentsTab({ productId, onClose }) {
    const [filaments, setFilaments] = useState([]);
    const [selected, setSelected] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");

    // Dual-colour combination manager — only used when the product has
    // allowDualColor set on it. combos is [{primary, secondary}] of
    // FilamentColor ids; pairs are stored and treated as unordered.
    const [allowDualColor, setAllowDualColor] = useState(false);
    const [combos, setCombos] = useState([]);
    const [newPrimary, setNewPrimary] = useState("");
    const [newSecondary, setNewSecondary] = useState("");
    const [combosSaving, setCombosSaving] = useState(false);
    const [combosError, setCombosError] = useState("");

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
                const productDoc =
                    productRes?.data?.product || productRes?.data || {};
                const current = productDoc.filaments || [];
                setSelected(
                    new Set(
                        current.map((f) =>
                            typeof f === "object" ? f._id : f
                        )
                    )
                );
                setAllowDualColor(!!productDoc.allowDualColor);
                setCombos(
                    (productDoc.allowedColorCombos || []).map((pair) => ({
                        primary:
                            typeof pair.primary === "object"
                                ? pair.primary._id
                                : pair.primary,
                        secondary:
                            typeof pair.secondary === "object"
                                ? pair.secondary._id
                                : pair.secondary
                    }))
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

    // Flat list of {id, name, hex, filamentName} across the currently-ticked
    // filaments. Combos are only pickable from this set — the dropdowns
    // narrow with the filament selection so admin can't define a pair whose
    // colour isn't actually available on this product.
    const availableColors = useMemo(() => {
        const list = [];
        filaments
            .filter((f) => selected.has(f._id))
            .forEach((f) => {
                (f.colors || []).forEach((c) => {
                    list.push({
                        id: c._id,
                        name: c.name,
                        hex: c.hex,
                        filamentId: f._id,
                        filamentName: f.name
                    });
                });
            });
        return list;
    }, [filaments, selected]);

    // Dual-colour prints share a filament (you can't mix PLA Metallic and
    // PLA Pro on one object), so once Primary is picked the Secondary list
    // is narrowed to colours from the same filament. Clears Secondary when
    // the Primary move breaks that invariant.
    const primaryFilamentId = useMemo(() => {
        if (!newPrimary) return null;
        return (
            availableColors.find((c) => c.id === newPrimary)?.filamentId ||
            null
        );
    }, [availableColors, newPrimary]);

    const secondaryChoices = useMemo(() => {
        if (!primaryFilamentId) return availableColors;
        return availableColors.filter(
            (c) => c.filamentId === primaryFilamentId
        );
    }, [availableColors, primaryFilamentId]);

    useEffect(() => {
        if (!newSecondary || !primaryFilamentId) return;
        const sec = availableColors.find((c) => c.id === newSecondary);
        if (sec && sec.filamentId !== primaryFilamentId) {
            setNewSecondary("");
        }
    }, [availableColors, newSecondary, primaryFilamentId]);

    const colorById = useMemo(() => {
        const map = new Map();
        // include colours from every filament, not just selected ones, so
        // existing combos that reference an unticked filament still render
        // their swatch and name rather than appearing as a bare id.
        filaments.forEach((f) =>
            (f.colors || []).forEach((c) =>
                map.set(c._id, {
                    id: c._id,
                    name: c.name,
                    hex: c.hex,
                    filamentName: f.name
                })
            )
        );
        return map;
    }, [filaments]);

    // directional: {A→B} and {B→A} are distinct pairs
    const pairKey = (a, b) => `${a}|${b}`;
    const existingPairKeys = new Set(
        combos.map((p) => pairKey(p.primary, p.secondary))
    );

    const addPair = () => {
        setCombosError("");
        if (!newPrimary || !newSecondary) {
            setCombosError("Pick both a Primary and a Secondary colour");
            return;
        }
        if (newPrimary === newSecondary) {
            setCombosError("Primary and Secondary must be different");
            return;
        }
        if (existingPairKeys.has(pairKey(newPrimary, newSecondary))) {
            setCombosError("That combination is already in the list");
            return;
        }
        setCombos((prev) => [
            ...prev,
            { primary: newPrimary, secondary: newSecondary }
        ]);
        setNewPrimary("");
        setNewSecondary("");
    };

    const removePair = (idx) => {
        setCombos((prev) => prev.filter((_, i) => i !== idx));
    };

    const saveCombos = async () => {
        setCombosSaving(true);
        setCombosError("");
        try {
            await updateProduct(productId, { allowedColorCombos: combos });
            showToast("Colour combinations saved");
            // stay on the tab — the admin confirms via toast and clicks
            // Done at the bottom of the modal when they're finished
        } catch (err) {
            setCombosError(err.message || "Failed to save combinations");
            showToast(err.message || "Failed to save combinations", {
                tone: "error"
            });
        } finally {
            setCombosSaving(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError("");

        try {
            await setProductFilaments(productId, Array.from(selected));
            showToast("Filaments saved");
            // stay on the tab so the admin can scroll down and set the
            // Colour combinations next
        } catch (err) {
            setError(err.message || "Failed to save");
            showToast(err.message || "Failed to save filaments", {
                tone: "error"
            });
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

            <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-text-muted">
                    {selected.size} filament{selected.size === 1 ? "" : "s"}{" "}
                    selected
                </p>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-70"
                >
                    {isSaving ? "Saving..." : "Save filaments"}
                </button>
            </div>

            {allowDualColor && (
                <div className="mt-4 rounded-xl border border-border p-4">
                    <div className="mb-3">
                        <p className="text-sm font-bold text-text">
                            Colour combinations
                        </p>
                        <p className="mt-0.5 text-xs text-text-muted">
                            Define the exact Primary + Secondary pairs
                            customers can pick. Leave empty to allow any pair.
                            Pairs are directional — the first colour is the
                            Primary slot on the storefront, the second is the
                            Secondary slot.
                        </p>
                    </div>

                    {combos.length > 0 ? (
                        <ul className="mb-3 space-y-1.5">
                            {combos.map((pair, idx) => {
                                const a = colorById.get(pair.primary);
                                const b = colorById.get(pair.secondary);
                                return (
                                    <li
                                        key={`${pair.primary}-${pair.secondary}-${idx}`}
                                        className="flex items-center justify-between gap-3 rounded-lg bg-bg px-3 py-2 text-sm"
                                    >
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span className="flex -space-x-1">
                                                <span
                                                    className="h-4 w-4 rounded-full border border-card"
                                                    style={{
                                                        background:
                                                            a?.hex || "#ccc"
                                                    }}
                                                />
                                                <span
                                                    className="h-4 w-4 rounded-full border border-card"
                                                    style={{
                                                        background:
                                                            b?.hex || "#ccc"
                                                    }}
                                                />
                                            </span>
                                            <span className="truncate text-text">
                                                {a?.name || "Unknown"} +{" "}
                                                {b?.name || "Unknown"}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => removePair(idx)}
                                            className="text-text-muted hover:text-red-500"
                                            aria-label="Remove pair"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="mb-3 text-xs italic text-text-muted">
                            No combinations defined — all pairs allowed.
                        </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={newPrimary}
                            onChange={(e) => setNewPrimary(e.target.value)}
                            className="min-w-0 flex-1 rounded-lg border border-border bg-card px-2 py-2 text-sm"
                        >
                            <option value="">Primary colour…</option>
                            {availableColors.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} · {c.filamentName}
                                </option>
                            ))}
                        </select>
                        <select
                            value={newSecondary}
                            onChange={(e) => setNewSecondary(e.target.value)}
                            disabled={!newPrimary}
                            className="min-w-0 flex-1 rounded-lg border border-border bg-card px-2 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">
                                {newPrimary
                                    ? "Secondary colour…"
                                    : "Pick a Primary first"}
                            </option>
                            {secondaryChoices
                                .filter((c) => c.id !== newPrimary)
                                .map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} · {c.filamentName}
                                    </option>
                                ))}
                        </select>
                        <button
                            onClick={addPair}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white"
                            aria-label="Add pair"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    {availableColors.length === 0 && (
                        <p className="mt-2 text-xs italic text-text-muted">
                            Tick at least one filament above to pick colours
                            from.
                        </p>
                    )}

                    {combosError && (
                        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                            {combosError}
                        </p>
                    )}

                    <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-xs text-text-muted">
                            {combos.length} combination
                            {combos.length === 1 ? "" : "s"}
                        </p>
                        <button
                            onClick={saveCombos}
                            disabled={combosSaving}
                            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-70"
                        >
                            {combosSaving ? "Saving..." : "Save combinations"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
