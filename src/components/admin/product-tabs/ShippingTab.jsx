"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import {
    getAllProductShipping,
    createProductShipping,
    updateProductShipping,
    deleteProductShipping
} from "@/api/product.api";
import FormField, { inputClass } from "@/components/ui/FormField";
import { confirmDialog, alertDialog } from "@/store/useDialogStore";

const resolveRecord = (data) => {
    if (!data) return null;

    for (const key of ["shipping", "productShipping", "shippingRecords"]) {
        const value = data[key];
        if (Array.isArray(value)) return value[0] || null;
        if (value && typeof value === "object") return value;
    }

    return null;
};

export default function ShippingTab({ productId }) {
    const [record, setRecord] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({ weight: "", length: "", width: "", height: "" });
    const [error, setError] = useState("");

    const [refreshKey, setRefreshKey] = useState(0);
    const reload = () => setRefreshKey((key) => key + 1);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const res = await getAllProductShipping({ productId });
                const found = resolveRecord(res?.data);

                if (!cancelled) {
                    setRecord(found);

                    if (found) {
                        setForm({
                            weight: found.weight,
                            length: found.length,
                            width: found.width,
                            height: found.height
                        });
                    }
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Failed to load shipping info");
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [productId, refreshKey]);

    const handleSave = async (event) => {
        event.preventDefault();
        setError("");

        const payload = {
            weight: Number(form.weight),
            length: Number(form.length),
            width: Number(form.width),
            height: Number(form.height)
        };

        try {
            if (record) {
                await updateProductShipping(record._id, payload);
            } else {
                await createProductShipping(productId, payload);
            }

            setIsEditing(false);
            reload();
        } catch (err) {
            setError(err.message || "Failed to save shipping info");
        }
    };

    const handleDelete = async () => {
        if (!record || !(await confirmDialog({ title: "Remove shipping details?", confirmLabel: "Remove" }))) return;

        try {
            await deleteProductShipping(record._id);
            setRecord(null);
            setForm({ weight: "", length: "", width: "", height: "" });
        } catch (err) {
            alertDialog(err.message || "Failed to delete shipping info");
        }
    };

    if (!isEditing && record) {
        return (
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm">
                <span className="text-text">
                    {record.weight} kg · {record.length}×{record.width}×{record.height} cm
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsEditing(true)}
                        className="text-text-muted hover:text-text"
                    >
                        <Pencil size={14} />
                    </button>
                    <button
                        onClick={handleDelete}
                        className="text-text-muted hover:text-red-500"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Weight (kg)">
                    <input
                        type="number"
                        step="0.01"
                        className={inputClass}
                        value={form.weight}
                        onChange={(e) => setForm((p) => ({ ...p, weight: e.target.value }))}
                    />
                </FormField>
                <FormField label="Length (cm)">
                    <input
                        type="number"
                        step="0.1"
                        className={inputClass}
                        value={form.length}
                        onChange={(e) => setForm((p) => ({ ...p, length: e.target.value }))}
                    />
                </FormField>
                <FormField label="Width (cm)">
                    <input
                        type="number"
                        step="0.1"
                        className={inputClass}
                        value={form.width}
                        onChange={(e) => setForm((p) => ({ ...p, width: e.target.value }))}
                    />
                </FormField>
                <FormField label="Height (cm)">
                    <input
                        type="number"
                        step="0.1"
                        className={inputClass}
                        value={form.height}
                        onChange={(e) => setForm((p) => ({ ...p, height: e.target.value }))}
                    />
                </FormField>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
                type="submit"
                className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent-dark"
            >
                Save shipping
            </button>
        </form>
    );
}
