"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
    getProductSpecs,
    createProductSpec,
    deleteProductSpec
} from "@/api/product.api";
import { inputClass } from "@/components/ui/FormField";
import { extractList } from "@/utils/extractList";
import { confirmDialog, alertDialog } from "@/store/useDialogStore";

export default function SpecsTab({ productId }) {
    const [specs, setSpecs] = useState([]);
    const [label, setLabel] = useState("");
    const [value, setValue] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");

    const [refreshKey, setRefreshKey] = useState(0);
    const reload = () => setRefreshKey((key) => key + 1);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const res = await getProductSpecs(productId);
                if (!cancelled) {
                    setSpecs(extractList(res?.data, ["specs", "spec"]));
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Failed to load specs");
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [productId, refreshKey]);

    const handleAdd = async () => {
        if (!label.trim() || !value.trim()) return;

        setIsSaving(true);
        setError("");

        try {
            await createProductSpec(productId, { label, value });
            setLabel("");
            setValue("");
            reload();
        } catch (err) {
            setError(err.message || "Failed to add spec");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (specId) => {
        if (!(await confirmDialog({ title: "Delete spec?" }))) return;

        try {
            await deleteProductSpec(productId, specId);
            reload();
        } catch (err) {
            alertDialog(err.message || "Failed to delete spec");
        }
    };

    return (
        <div className="space-y-3">
            {specs.map((spec) => (
                <div
                    key={spec._id}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                    <span className="font-semibold text-text">{spec.label}</span>
                    <span className="text-text-muted">{spec.value}</span>
                    <button
                        onClick={() => handleDelete(spec._id)}
                        className="text-text-muted hover:text-red-500"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ))}

            <div className="flex flex-wrap items-center gap-2">
                <input
                    placeholder="Label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className={`${inputClass} min-w-0 flex-1`}
                />
                <input
                    placeholder="Value"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className={`${inputClass} min-w-0 flex-1`}
                />
                <button
                    onClick={handleAdd}
                    disabled={isSaving}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white disabled:opacity-60"
                >
                    <Plus size={16} />
                </button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    );
}
