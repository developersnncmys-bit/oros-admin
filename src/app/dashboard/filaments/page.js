"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";

import {
    getFilaments,
    createFilament,
    updateFilament,
    deleteFilament,
    addFilamentColor,
    updateFilamentColor,
    deleteFilamentColor
} from "@/api/filament.api";
import Modal from "@/components/ui/Modal";
import FormField, { inputClass } from "@/components/ui/FormField";
import Badge from "@/components/ui/Badge";
import { extractList } from "@/utils/extractList";
import { confirmDialog, alertDialog } from "@/store/useDialogStore";

const EMPTY_FILAMENT = {
    name: "",
    type: "PLA",
    priceDelta: 0,
    priceMultiplier: 1,
    isActive: true
};

const EMPTY_COLOR = {
    name: "",
    hex: "#000000",
    hexSecondary: "",
    hexTertiary: "",
    stock: 0
};

export default function FilamentsPage() {
    const [filaments, setFilaments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const [filamentModal, setFilamentModal] = useState(null);
    const [colorModal, setColorModal] = useState(null);

    const [refreshKey, setRefreshKey] = useState(0);
    const reload = () => setRefreshKey((k) => k + 1);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            setError("");

            try {
                const res = await getFilaments();
                if (!cancelled) {
                    setFilaments(extractList(res?.data, ["filaments", "filament"]));
                }
            } catch (err) {
                if (!cancelled) setError(err.message || "Failed to load filaments");
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [refreshKey]);

    const handleDeleteFilament = async (filament) => {
        const ok = await confirmDialog({
            title: `Delete ${filament.name}?`,
            description: "All colors in this filament will be removed."
        });
        if (!ok) return;

        try {
            await deleteFilament(filament._id);
            reload();
        } catch (err) {
            alertDialog(err.message || "Failed to delete filament");
        }
    };

    const handleDeleteColor = async (color) => {
        const ok = await confirmDialog({ title: `Delete ${color.name}?` });
        if (!ok) return;

        try {
            await deleteFilamentColor(color._id);
            reload();
        } catch (err) {
            alertDialog(err.message || "Failed to delete color");
        }
    };

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-text">Filaments</h1>
                    <p className="text-xs text-text-muted">
                        Shared catalog — colors here apply to every product that
                        offers filament selection.
                    </p>
                </div>
                <button
                    onClick={() => setFilamentModal({ mode: "create", form: EMPTY_FILAMENT })}
                    className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-dark"
                >
                    <Plus size={14} />
                    New filament
                </button>
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

            {!isLoading && !error && filaments.length === 0 && (
                <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center text-text-muted">
                    No filaments yet. Add one, or run the seed script to populate from
                    the Filament Inventory PDF.
                </div>
            )}

            <div className="space-y-3">
                {filaments.map((filament) => (
                    <FilamentCard
                        key={filament._id}
                        filament={filament}
                        onEdit={() =>
                            setFilamentModal({
                                mode: "edit",
                                id: filament._id,
                                form: {
                                    name: filament.name,
                                    type: filament.type,
                                    priceDelta: filament.priceDelta ?? 0,
                                    priceMultiplier: filament.priceMultiplier ?? 1,
                                    isActive: filament.isActive !== false
                                }
                            })
                        }
                        onDelete={() => handleDeleteFilament(filament)}
                        onAddColor={() =>
                            setColorModal({
                                mode: "create",
                                filamentId: filament._id,
                                filamentName: filament.name,
                                form: EMPTY_COLOR
                            })
                        }
                        onEditColor={(color) =>
                            setColorModal({
                                mode: "edit",
                                id: color._id,
                                filamentId: filament._id,
                                filamentName: filament.name,
                                form: {
                                    name: color.name,
                                    hex: color.hex,
                                    hexSecondary: color.hexSecondary || "",
                                    hexTertiary: color.hexTertiary || "",
                                    stock: color.stock ?? 0
                                }
                            })
                        }
                        onDeleteColor={handleDeleteColor}
                    />
                ))}
            </div>

            {filamentModal && (
                <FilamentModal
                    state={filamentModal}
                    onClose={() => setFilamentModal(null)}
                    onSaved={() => {
                        setFilamentModal(null);
                        reload();
                    }}
                />
            )}

            {colorModal && (
                <ColorModal
                    state={colorModal}
                    onClose={() => setColorModal(null)}
                    onSaved={() => {
                        setColorModal(null);
                        reload();
                    }}
                />
            )}
        </div>
    );
}

function FilamentCard({
    filament,
    onEdit,
    onDelete,
    onAddColor,
    onEditColor,
    onDeleteColor
}) {
    const colors = filament.colors || [];
    const inStock = colors.filter((c) => c.stock > 0).length;

    return (
        <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <p className="text-base font-bold text-text">
                        {filament.name}{" "}
                        <span className="ml-1 text-xs font-normal text-text-muted">
                            ({filament.type})
                        </span>
                    </p>
                    <p className="text-xs text-text-muted">
                        +₹{filament.priceDelta ?? 0} · ×{filament.priceMultiplier ?? 1}
                        {" · "}
                        {inStock}/{colors.length} colors in stock
                    </p>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={onEdit}
                        className="rounded-lg p-2 text-text-muted hover:bg-bg hover:text-text"
                        title="Edit filament"
                    >
                        <Pencil size={14} />
                    </button>
                    <button
                        onClick={onDelete}
                        className="rounded-lg p-2 text-text-muted hover:bg-bg hover:text-red-500"
                        title="Delete filament"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {colors.map((color) => (
                    <div
                        key={color._id}
                        className="flex items-center gap-3 rounded-lg border border-border bg-bg p-2.5"
                    >
                        <ColorSwatch color={color} />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-text">
                                {color.name}
                            </p>
                            {color.stock > 0 ? (
                                <p className="text-[11px] text-text-muted">
                                    Stock: {color.stock}
                                </p>
                            ) : (
                                <Badge tone="danger">OUT OF STOCK</Badge>
                            )}
                        </div>
                        <div className="flex gap-0.5">
                            <button
                                onClick={() => onEditColor(color)}
                                className="rounded p-1 text-text-muted hover:text-text"
                                title="Edit color"
                            >
                                <Pencil size={12} />
                            </button>
                            <button
                                onClick={() => onDeleteColor(color)}
                                className="rounded p-1 text-text-muted hover:text-red-500"
                                title="Delete color"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>
                ))}

                <button
                    onClick={onAddColor}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2.5 text-xs font-semibold text-text-muted hover:border-accent hover:text-accent"
                >
                    <Plus size={12} />
                    Add color
                </button>
            </div>
        </div>
    );
}

function ColorSwatch({ color }) {
    const stops = [color.hex, color.hexSecondary, color.hexTertiary].filter(Boolean);

    if (stops.length <= 1) {
        return (
            <span
                className="block h-8 w-8 shrink-0 rounded border border-border"
                style={{ background: stops[0] || "#eee" }}
            />
        );
    }

    const slice = 100 / stops.length;
    const bg = stops
        .map((hex, i) => `${hex} ${i * slice}% ${(i + 1) * slice}%`)
        .join(", ");

    return (
        <span
            className="block h-8 w-8 shrink-0 rounded border border-border"
            style={{ background: `linear-gradient(90deg, ${bg})` }}
        />
    );
}

function FilamentModal({ state, onClose, onSaved }) {
    const [form, setForm] = useState(state.form);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState("");

    const handleSave = async (event) => {
        event.preventDefault();
        setFormError("");
        setIsSaving(true);

        try {
            if (state.mode === "create") {
                await createFilament(form);
            } else {
                await updateFilament(state.id, form);
            }
            onSaved();
        } catch (err) {
            setFormError(err.message || "Failed to save filament");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            title={state.mode === "create" ? "New filament" : "Edit filament"}
            onClose={onClose}
        >
            <form onSubmit={handleSave} className="space-y-4">
                <FormField label="Name">
                    <input
                        className={inputClass}
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="PLA Pro"
                        required
                    />
                </FormField>

                <FormField label="Type / family">
                    <input
                        className={inputClass}
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                        placeholder="PLA, PETG, ABS, ASA"
                        required
                    />
                </FormField>

                <div className="grid grid-cols-2 gap-3">
                    <FormField label="Price delta (+₹)">
                        <input
                            type="number"
                            min="0"
                            step="1"
                            className={inputClass}
                            value={form.priceDelta}
                            onChange={(e) =>
                                setForm({ ...form, priceDelta: e.target.value })
                            }
                        />
                    </FormField>
                    <FormField label="Price multiplier (×)">
                        <input
                            type="number"
                            min="0"
                            step="0.1"
                            className={inputClass}
                            value={form.priceMultiplier}
                            onChange={(e) =>
                                setForm({ ...form, priceMultiplier: e.target.value })
                            }
                        />
                    </FormField>
                </div>

                <label className="flex items-center gap-2 text-sm text-text">
                    <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    />
                    Active (available to products)
                </label>

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
                    {isSaving ? "Saving..." : "Save filament"}
                </button>
            </form>
        </Modal>
    );
}

function ColorModal({ state, onClose, onSaved }) {
    const [form, setForm] = useState(state.form);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState("");

    const handleSave = async (event) => {
        event.preventDefault();
        setFormError("");
        setIsSaving(true);

        try {
            if (state.mode === "create") {
                await addFilamentColor(state.filamentId, form);
            } else {
                await updateFilamentColor(state.id, form);
            }
            onSaved();
        } catch (err) {
            setFormError(err.message || "Failed to save color");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            title={`${state.mode === "create" ? "New color" : "Edit color"} · ${state.filamentName}`}
            onClose={onClose}
        >
            <form onSubmit={handleSave} className="space-y-4">
                <FormField label="Color name">
                    <input
                        className={inputClass}
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Nuclear Red"
                        required
                    />
                </FormField>

                <FormField label="Primary hex">
                    <div className="flex gap-2">
                        <input
                            type="color"
                            className="h-10 w-14 cursor-pointer rounded-lg border border-border"
                            value={form.hex || "#000000"}
                            onChange={(e) => setForm({ ...form, hex: e.target.value })}
                        />
                        <input
                            className={inputClass}
                            value={form.hex}
                            onChange={(e) => setForm({ ...form, hex: e.target.value })}
                            placeholder="#c92a2a"
                            required
                        />
                    </div>
                </FormField>

                <div className="grid grid-cols-2 gap-3">
                    <FormField label="Secondary hex (optional)">
                        <div className="flex gap-2">
                            <input
                                type="color"
                                className="h-10 w-14 cursor-pointer rounded-lg border border-border"
                                value={form.hexSecondary || "#000000"}
                                onChange={(e) =>
                                    setForm({ ...form, hexSecondary: e.target.value })
                                }
                            />
                            <input
                                className={inputClass}
                                value={form.hexSecondary}
                                onChange={(e) =>
                                    setForm({ ...form, hexSecondary: e.target.value })
                                }
                                placeholder="#000000"
                            />
                        </div>
                    </FormField>
                    <FormField label="Tertiary hex (optional)">
                        <div className="flex gap-2">
                            <input
                                type="color"
                                className="h-10 w-14 cursor-pointer rounded-lg border border-border"
                                value={form.hexTertiary || "#000000"}
                                onChange={(e) =>
                                    setForm({ ...form, hexTertiary: e.target.value })
                                }
                            />
                            <input
                                className={inputClass}
                                value={form.hexTertiary}
                                onChange={(e) =>
                                    setForm({ ...form, hexTertiary: e.target.value })
                                }
                                placeholder="#e55a1a"
                            />
                        </div>
                    </FormField>
                </div>

                <FormField label="Stock (0 = out of stock)">
                    <input
                        type="number"
                        min="0"
                        step="1"
                        className={inputClass}
                        value={form.stock}
                        onChange={(e) => setForm({ ...form, stock: e.target.value })}
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
                    {isSaving ? "Saving..." : "Save color"}
                </button>
            </form>
        </Modal>
    );
}
