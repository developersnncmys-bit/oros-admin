"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
    getProductOptions,
    createProductOption,
    deleteProductOption,
    getOptionValues,
    createOptionValue,
    deleteOptionValue
} from "@/api/product.api";
import { inputClass } from "@/components/ui/FormField";
import { extractList } from "@/utils/extractList";
import { confirmDialog, alertDialog } from "@/store/useDialogStore";

const OPTION_TYPES = ["SELECT", "TEXT", "COLOR", "FILE"];
const DIMENSION_UNITS = ["mm", "cm", "in"];

// Dimension inputs only make sense on a size-type option. Match loosely so
// "Size", "Sizes", "Dimensions" all qualify without a dedicated option type.
const isSizeOption = (option) => /size|dimension/i.test(option?.name || "");

const formatDimensions = (val) => {
    const parts = [val.length, val.width, val.height].filter(
        (n) => n != null && n !== ""
    );
    if (!parts.length) return "";
    return `${parts.join(" × ")} ${val.unit || "cm"}`;
};

export default function OptionsTab({ productId }) {
    const [options, setOptions] = useState([]);
    const [valuesByOption, setValuesByOption] = useState({});

    const [optionName, setOptionName] = useState("");
    const [optionType, setOptionType] = useState("SELECT");
    const [isRequired, setIsRequired] = useState(true);
    const [error, setError] = useState("");

    const [newValue, setNewValue] = useState({});

    const [refreshKey, setRefreshKey] = useState(0);
    const reload = () => setRefreshKey((key) => key + 1);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const res = await getProductOptions(productId);
                const list = extractList(res?.data, ["options", "option"]);

                const valuePairs = await Promise.all(
                    list.map(async (option) => {
                        const valRes = await getOptionValues(option._id);
                        return [
                            option._id,
                            extractList(valRes?.data, ["values", "value"])
                        ];
                    })
                );

                if (!cancelled) {
                    setOptions(list);
                    setValuesByOption(Object.fromEntries(valuePairs));
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Failed to load options");
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [productId, refreshKey]);

    const handleAddOption = async () => {
        if (!optionName.trim()) return;

        setError("");

        try {
            await createProductOption(productId, {
                name: optionName,
                type: optionType,
                isRequired
            });
            setOptionName("");
            reload();
        } catch (err) {
            setError(err.message || "Failed to add option");
        }
    };

    const handleDeleteOption = async (optionId) => {
        if (!(await confirmDialog({ title: "Delete option?", description: "The option and all its values will be removed." }))) return;

        try {
            await deleteProductOption(productId, optionId);
            reload();
        } catch (err) {
            alertDialog(err.message || "Failed to delete option");
        }
    };

    const handleAddValue = async (optionId) => {
        const draft = newValue[optionId];
        if (!draft?.value?.trim()) return;

        const toDim = (v) =>
            v === undefined || v === "" || v === null ? null : Number(v);

        try {
            await createOptionValue(optionId, {
                value: draft.value,
                priceDelta: Number(draft.priceDelta) || 0,
                priceMultiplier: Number(draft.priceMultiplier) || 1,
                length: toDim(draft.length),
                width: toDim(draft.width),
                height: toDim(draft.height),
                unit: draft.unit || "cm"
            });
            setNewValue((prev) => ({ ...prev, [optionId]: {} }));
            reload();
        } catch (err) {
            alertDialog(err.message || "Failed to add value");
        }
    };

    const handleDeleteValue = async (optionId, valueId) => {
        if (!(await confirmDialog({ title: "Delete value?" }))) return;

        try {
            await deleteOptionValue(optionId, valueId);
            reload();
        } catch (err) {
            alertDialog(err.message || "Failed to delete value");
        }
    };

    return (
        <div className="space-y-5">
            {options.map((option) => (
                <div key={option._id} className="rounded-xl border border-border p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-bold text-text">
                            {option.name}{" "}
                            <span className="font-normal text-text-muted">
                                ({option.type}
                                {option.isRequired ? ", required" : ""})
                            </span>
                        </p>
                        <button
                            onClick={() => handleDeleteOption(option._id)}
                            className="text-text-muted hover:text-red-500"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>

                    <div className="space-y-2">
                        {(valuesByOption[option._id] || []).map((val) => {
                            const dims = isSizeOption(option) ? formatDimensions(val) : "";
                            return (
                                <div
                                    key={val._id}
                                    className="flex items-center justify-between gap-3 rounded-lg bg-bg px-3 py-2 text-sm"
                                >
                                    <div className="min-w-0">
                                        <p className="font-medium text-text">{val.value}</p>
                                        {dims && (
                                            <p className="text-xs text-text-muted">{dims}</p>
                                        )}
                                    </div>
                                    <span className="shrink-0 text-text-muted">
                                        +₹{val.priceDelta} · ×{val.priceMultiplier}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteValue(option._id, val._id)}
                                        className="text-text-muted hover:text-red-500"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <input
                            placeholder="e.g. Red"
                            value={newValue[option._id]?.value || ""}
                            onChange={(e) =>
                                setNewValue((prev) => ({
                                    ...prev,
                                    [option._id]: {
                                        ...prev[option._id],
                                        value: e.target.value
                                    }
                                }))
                            }
                            className={`${inputClass} min-w-0 flex-1`}
                        />
                        <input
                            type="number"
                            placeholder="+₹"
                            value={newValue[option._id]?.priceDelta || ""}
                            onChange={(e) =>
                                setNewValue((prev) => ({
                                    ...prev,
                                    [option._id]: {
                                        ...prev[option._id],
                                        priceDelta: e.target.value
                                    }
                                }))
                            }
                            className={`${inputClass} w-24`}
                        />
                        <input
                            type="number"
                            placeholder="×"
                            value={newValue[option._id]?.priceMultiplier || ""}
                            onChange={(e) =>
                                setNewValue((prev) => ({
                                    ...prev,
                                    [option._id]: {
                                        ...prev[option._id],
                                        priceMultiplier: e.target.value
                                    }
                                }))
                            }
                            className={`${inputClass} w-20`}
                        />
                        <button
                            onClick={() => handleAddValue(option._id)}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    {isSizeOption(option) && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-bold uppercase text-text-muted">
                                Dimensions
                            </span>
                            {["length", "width", "height"].map((dim, i) => (
                                <input
                                    key={dim}
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    placeholder={["L", "W", "H"][i]}
                                    value={newValue[option._id]?.[dim] || ""}
                                    onChange={(e) =>
                                        setNewValue((prev) => ({
                                            ...prev,
                                            [option._id]: {
                                                ...prev[option._id],
                                                [dim]: e.target.value
                                            }
                                        }))
                                    }
                                    className={`${inputClass} w-16`}
                                />
                            ))}
                            <select
                                value={newValue[option._id]?.unit || "cm"}
                                onChange={(e) =>
                                    setNewValue((prev) => ({
                                        ...prev,
                                        [option._id]: {
                                            ...prev[option._id],
                                            unit: e.target.value
                                        }
                                    }))
                                }
                                className={`${inputClass} w-20`}
                            >
                                {DIMENSION_UNITS.map((u) => (
                                    <option key={u} value={u}>
                                        {u}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            ))}

            <div className="flex flex-wrap items-center gap-2">
                <input
                    placeholder="Option name (e.g. Colour)"
                    value={optionName}
                    onChange={(e) => setOptionName(e.target.value)}
                    className={`${inputClass} min-w-0 flex-1`}
                />
                <select
                    value={optionType}
                    onChange={(e) => setOptionType(e.target.value)}
                    className={`${inputClass} w-32`}
                >
                    {OPTION_TYPES.map((type) => (
                        <option key={type} value={type}>
                            {type}
                        </option>
                    ))}
                </select>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-text">
                    <input
                        type="checkbox"
                        checked={isRequired}
                        onChange={(e) => setIsRequired(e.target.checked)}
                    />
                    Req
                </label>
                <button
                    onClick={handleAddOption}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white"
                >
                    <Plus size={16} />
                </button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    );
}
