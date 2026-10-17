"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
    getPriceSlabs,
    createPriceSlab,
    deletePriceSlab
} from "@/api/product.api";
import { inputClass } from "@/components/ui/FormField";
import { extractList } from "@/utils/extractList";
import { confirmDialog, alertDialog } from "@/store/useDialogStore";

export default function PriceSlabsTab({ productId }) {
    const [slabs, setSlabs] = useState([]);
    const [form, setForm] = useState({ minQty: "", maxQty: "", unitPrice: "" });
    const [error, setError] = useState("");

    const [refreshKey, setRefreshKey] = useState(0);
    const reload = () => setRefreshKey((key) => key + 1);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const res = await getPriceSlabs(productId);
                if (!cancelled) {
                    setSlabs(extractList(res?.data, ["priceSlabs", "priceSlab"]));
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Failed to load price slabs");
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [productId, refreshKey]);

    const handleAdd = async () => {
        if (!form.minQty || !form.unitPrice) return;

        setError("");

        try {
            await createPriceSlab(productId, {
                minQty: Number(form.minQty),
                maxQty: form.maxQty ? Number(form.maxQty) : null,
                unitPrice: Number(form.unitPrice)
            });
            setForm({ minQty: "", maxQty: "", unitPrice: "" });
            reload();
        } catch (err) {
            setError(err.message || "Failed to add price slab");
        }
    };

    const handleDelete = async (slabId) => {
        if (!(await confirmDialog({ title: "Delete price slab?" }))) return;

        try {
            await deletePriceSlab(productId, slabId);
            reload();
        } catch (err) {
            alertDialog(err.message || "Failed to delete price slab");
        }
    };

    return (
        <div className="space-y-3">
            {slabs.map((slab) => (
                <div
                    key={slab._id}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                    <span className="text-text">
                        {slab.minQty} – {slab.maxQty ?? "∞"} units
                    </span>
                    <span className="font-semibold text-text">₹{slab.unitPrice}</span>
                    <button
                        onClick={() => handleDelete(slab._id)}
                        className="text-text-muted hover:text-red-500"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ))}

            <div className="flex flex-wrap items-center gap-2">
                <input
                    type="number"
                    placeholder="Min qty"
                    value={form.minQty}
                    onChange={(e) => setForm((p) => ({ ...p, minQty: e.target.value }))}
                    className={`${inputClass} min-w-0 flex-1`}
                />
                <input
                    type="number"
                    placeholder="Max qty"
                    value={form.maxQty}
                    onChange={(e) => setForm((p) => ({ ...p, maxQty: e.target.value }))}
                    className={`${inputClass} min-w-0 flex-1`}
                />
                <input
                    type="number"
                    placeholder="Unit price"
                    value={form.unitPrice}
                    onChange={(e) =>
                        setForm((p) => ({ ...p, unitPrice: e.target.value }))
                    }
                    className={`${inputClass} min-w-0 flex-1`}
                />
                <button
                    onClick={handleAdd}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white"
                >
                    <Plus size={16} />
                </button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    );
}
