"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Layers, ChevronDown, Check } from "lucide-react";

import {
    getFilaments,
    createFilament,
    updateFilament,
    deleteFilament,
    addFilamentColor,
    updateFilamentColor,
    deleteFilamentColor
} from "@/api/filament.api";
import {
    getColorFamilies,
    createColorFamily,
    updateColorFamily,
    deleteColorFamily
} from "@/api/colorFamily.api";
import Modal from "@/components/ui/Modal";
import FormField, { inputClass } from "@/components/ui/FormField";
import Badge from "@/components/ui/Badge";
import { extractList } from "@/utils/extractList";
import { confirmDialog, alertDialog } from "@/store/useDialogStore";

const EMPTY_FILAMENT = {
    name: "",
    type: "PLA",
    colorFamily: "",
    finish: "",
    priceDelta: 0,
    priceMultiplier: 1,
    isActive: true
};

// Suggested values for the Finish combobox — matches the parenthetical
// in the inventory PDF. Admin can type anything; these are just hints.
const FINISH_SUGGESTIONS = [
    "Regular",
    "Matte",
    "Silk",
    "Metallic",
    "Glow",
    "Sparkle",
    "Marble",
    "Translucent",
    "Dual Color Silk",
    "Tri Color Silk"
];

// Text input + themed suggestion popover. Replaces <datalist>, which
// renders as a browser-styled black box that can't be themed.
// Admin can still type any custom value — suggestions are a shortcut.
function FinishCombobox({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(-1);
    const wrapRef = useRef(null);

    // Filter by current input, case-insensitive. If the input matches
    // a suggestion exactly, still show all so the user can switch.
    const needle = (value || "").trim().toLowerCase();
    const matches = needle
        ? FINISH_SUGGESTIONS.filter((f) =>
              f.toLowerCase().includes(needle)
          )
        : FINISH_SUGGESTIONS;

    useEffect(() => {
        if (!open) return;
        const onClickOutside = (event) => {
            if (!wrapRef.current?.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, [open]);

    const pick = (option) => {
        onChange(option);
        setOpen(false);
        setHighlight(-1);
    };

    const onKeyDown = (event) => {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setHighlight((h) => Math.min(h + 1, matches.length - 1));
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
        } else if (event.key === "Enter") {
            if (open && highlight >= 0 && matches[highlight]) {
                event.preventDefault();
                pick(matches[highlight]);
            }
        } else if (event.key === "Escape") {
            setOpen(false);
            setHighlight(-1);
        }
    };

    return (
        <div ref={wrapRef} className="relative">
            <input
                className={`${inputClass} pr-9`}
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setOpen(true);
                    setHighlight(-1);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKeyDown}
                placeholder="Matte, Silk, Metallic, Sparkle…"
                autoComplete="off"
            />
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-muted hover:bg-bg hover:text-text"
                tabIndex={-1}
                aria-label="Toggle suggestions"
            >
                <ChevronDown
                    size={14}
                    className={`transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>

            {open && matches.length > 0 && (
                <ul
                    role="listbox"
                    className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-card py-1 shadow-lg"
                >
                    {matches.map((option, i) => {
                        const isSelected =
                            option.toLowerCase() === needle;
                        const isHighlighted = i === highlight;
                        return (
                            <li
                                key={option}
                                role="option"
                                aria-selected={isSelected}
                                onMouseEnter={() => setHighlight(i)}
                                onMouseDown={(e) => {
                                    // mousedown fires before input blur so
                                    // the click isn't swallowed by close
                                    e.preventDefault();
                                    pick(option);
                                }}
                                className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm ${
                                    isHighlighted
                                        ? "bg-bg text-text"
                                        : "text-text-muted hover:bg-bg hover:text-text"
                                }`}
                            >
                                <span>{option}</span>
                                {isSelected && (
                                    <Check size={13} className="text-accent" />
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

const EMPTY_COLOR = {
    name: "",
    hex: "#000000",
    hexSecondary: "",
    hexTertiary: "",
    stock: 0
};

export default function FilamentsPage() {
    const [filaments, setFilaments] = useState([]);
    const [colorFamilies, setColorFamilies] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const [filamentModal, setFilamentModal] = useState(null);
    const [colorModal, setColorModal] = useState(null);
    const [familiesOpen, setFamiliesOpen] = useState(false);

    const [refreshKey, setRefreshKey] = useState(0);
    const reload = () => setRefreshKey((k) => k + 1);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            setError("");

            try {
                const [filamentsRes, familiesRes] = await Promise.all([
                    getFilaments(),
                    getColorFamilies()
                ]);
                if (!cancelled) {
                    setFilaments(
                        extractList(filamentsRes?.data, ["filaments", "filament"])
                    );
                    setColorFamilies(
                        extractList(familiesRes?.data, [
                            "colorFamilies",
                            "colorFamily"
                        ])
                    );
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
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setFamiliesOpen(true)}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-text hover:bg-bg"
                    >
                        <Layers size={14} />
                        Manage color families
                    </button>
                    <button
                        onClick={() => setFilamentModal({ mode: "create", form: EMPTY_FILAMENT })}
                        className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-dark"
                    >
                        <Plus size={14} />
                        New filament
                    </button>
                </div>
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
                                    colorFamily:
                                        filament.colorFamily?._id ||
                                        filament.colorFamily ||
                                        "",
                                    finish: filament.finish || "",
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
                    colorFamilies={colorFamilies}
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

            {familiesOpen && (
                <ColorFamiliesManagerModal
                    onClose={() => setFamiliesOpen(false)}
                    onChanged={reload}
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
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-bold text-text">
                            {filament.name}{" "}
                            <span className="ml-1 text-xs font-normal text-text-muted">
                                ({filament.type}
                                {filament.finish ? ` · ${filament.finish}` : ""})
                            </span>
                        </p>
                        {filament.colorFamily?.name && (
                            <Badge tone="accent">
                                {filament.colorFamily.name}
                            </Badge>
                        )}
                    </div>
                    <p className="mt-0.5 text-xs text-text-muted">
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

function FilamentModal({ state, colorFamilies = [], onClose, onSaved }) {
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

                <FormField label="Color family (optional)">
                    <select
                        className={inputClass}
                        value={form.colorFamily || ""}
                        onChange={(e) =>
                            setForm({ ...form, colorFamily: e.target.value })
                        }
                    >
                        <option value="">— None —</option>
                        {colorFamilies.map((f) => (
                            <option key={f._id} value={f._id}>
                                {f.name}
                            </option>
                        ))}
                    </select>
                </FormField>

                <FormField label="Finish (optional)">
                    <FinishCombobox
                        value={form.finish}
                        onChange={(finish) => setForm({ ...form, finish })}
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

function ColorFamiliesManagerModal({ onClose, onChanged }) {
    const [families, setFamilies] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [actionError, setActionError] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: "", displayOrder: 0 });
    const [newForm, setNewForm] = useState({ name: "", displayOrder: 0 });
    const [isBusy, setIsBusy] = useState(false);

    const reload = useCallback(async () => {
        setIsLoading(true);
        setLoadError("");
        try {
            const res = await getColorFamilies();
            setFamilies(
                extractList(res?.data, ["colorFamilies", "colorFamily"])
            );
        } catch (err) {
            setLoadError(err.message || "Failed to load color families");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    const beginEdit = (family) => {
        setActionError("");
        setEditingId(family._id);
        setEditForm({
            name: family.name,
            displayOrder: family.displayOrder ?? 0
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setActionError("");
    };

    const saveEdit = async (id) => {
        if (!editForm.name.trim()) return;
        setIsBusy(true);
        setActionError("");
        try {
            await updateColorFamily(id, editForm);
            setEditingId(null);
            await reload();
            onChanged?.();
        } catch (err) {
            setActionError(err.message || "Failed to save family");
        } finally {
            setIsBusy(false);
        }
    };

    const handleDelete = async (family) => {
        const ok = await confirmDialog({
            title: `Delete ${family.name}?`,
            description:
                "Filaments linked to this family will keep their colors but lose the family tag."
        });
        if (!ok) return;

        setIsBusy(true);
        setActionError("");
        try {
            await deleteColorFamily(family._id);
            await reload();
            onChanged?.();
        } catch (err) {
            setActionError(err.message || "Failed to delete family");
        } finally {
            setIsBusy(false);
        }
    };

    const handleCreate = async (event) => {
        event.preventDefault();
        if (!newForm.name.trim()) return;
        setIsBusy(true);
        setActionError("");
        try {
            await createColorFamily(newForm);
            setNewForm({ name: "", displayOrder: 0 });
            await reload();
            onChanged?.();
        } catch (err) {
            setActionError(err.message || "Failed to create family");
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <Modal title="Color families" onClose={onClose}>
            <div className="space-y-4">
                <p className="text-xs text-text-muted">
                    Top-level grouping for filaments (e.g. Pure, Radiant,
                    Special). Assigning a family to a filament is optional.
                </p>

                {isLoading && (
                    <div className="rounded-lg border border-border bg-bg px-3 py-6 text-center text-sm text-text-muted">
                        Loading...
                    </div>
                )}

                {!isLoading && loadError && (
                    <div className="rounded-lg border border-border bg-bg px-3 py-6 text-center text-sm text-red-500">
                        {loadError}
                    </div>
                )}

                {!isLoading && !loadError && (
                    <ul className="space-y-2">
                        {families.length === 0 && (
                            <li className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-text-muted">
                                No color families yet. Add one below.
                            </li>
                        )}

                        {families.map((family) => {
                            const isEditing = editingId === family._id;
                            return (
                                <li
                                    key={family._id}
                                    className="rounded-lg border border-border bg-bg p-3"
                                >
                                    {isEditing ? (
                                        <div className="flex flex-wrap items-end gap-2">
                                            <div className="flex-1 min-w-[160px]">
                                                <label className="mb-1 block text-[11px] font-semibold text-text-muted">
                                                    Name
                                                </label>
                                                <input
                                                    className={inputClass}
                                                    value={editForm.name}
                                                    onChange={(e) =>
                                                        setEditForm({
                                                            ...editForm,
                                                            name: e.target.value
                                                        })
                                                    }
                                                />
                                            </div>
                                            <div className="w-24">
                                                <label className="mb-1 block text-[11px] font-semibold text-text-muted">
                                                    Order
                                                </label>
                                                <input
                                                    type="number"
                                                    className={inputClass}
                                                    value={editForm.displayOrder}
                                                    onChange={(e) =>
                                                        setEditForm({
                                                            ...editForm,
                                                            displayOrder:
                                                                e.target.value
                                                        })
                                                    }
                                                />
                                            </div>
                                            <button
                                                onClick={() =>
                                                    saveEdit(family._id)
                                                }
                                                disabled={isBusy}
                                                className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text hover:bg-card"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-text">
                                                    {family.name}
                                                </p>
                                                <p className="text-[11px] text-text-muted">
                                                    Order:{" "}
                                                    {family.displayOrder ?? 0}
                                                </p>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() =>
                                                        beginEdit(family)
                                                    }
                                                    className="rounded p-1.5 text-text-muted hover:bg-card hover:text-text"
                                                    title="Edit"
                                                >
                                                    <Pencil size={13} />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleDelete(family)
                                                    }
                                                    className="rounded p-1.5 text-text-muted hover:bg-card hover:text-red-500"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}

                {actionError && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                        {actionError}
                    </p>
                )}

                <form
                    onSubmit={handleCreate}
                    className="rounded-lg border border-dashed border-border p-3"
                >
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                        Add new family
                    </p>
                    <div className="flex flex-wrap items-end gap-2">
                        <div className="flex-1 min-w-[160px]">
                            <label className="mb-1 block text-[11px] font-semibold text-text-muted">
                                Name
                            </label>
                            <input
                                className={inputClass}
                                value={newForm.name}
                                onChange={(e) =>
                                    setNewForm({
                                        ...newForm,
                                        name: e.target.value
                                    })
                                }
                                placeholder="Pure"
                                required
                            />
                        </div>
                        <div className="w-24">
                            <label className="mb-1 block text-[11px] font-semibold text-text-muted">
                                Order
                            </label>
                            <input
                                type="number"
                                className={inputClass}
                                value={newForm.displayOrder}
                                onChange={(e) =>
                                    setNewForm({
                                        ...newForm,
                                        displayOrder: e.target.value
                                    })
                                }
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isBusy || !newForm.name.trim()}
                            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
                        >
                            <Plus size={12} />
                            Add
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
