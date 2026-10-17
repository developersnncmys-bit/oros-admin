"use client";

import { useEffect, useState } from "react";

import { getCategories } from "@/api/category.api";
import { getSubCategories } from "@/api/subCategory.api";
import { createProduct, updateProduct } from "@/api/product.api";
import FormField, { inputClass } from "@/components/ui/FormField";
import { extractList } from "@/utils/extractList";
import { slugify } from "@/utils/format";

const STATUS_OPTIONS = ["DRAFT", "PUBLISHED", "ARCHIVED"];

export default function DetailsTab({ product, onSaved }) {
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");

    const [form, setForm] = useState({
        name: product?.name || "",
        sku: product?.sku || "",
        slug: product?.slug || "",
        basePrice: product?.basePrice ?? "",
        category:
            typeof product?.category === "object"
                ? product.category?._id
                : product?.category || "",
        subcategory:
            typeof product?.subcategory === "object"
                ? product.subcategory?._id
                : product?.subcategory || "",
        taxRate: product?.taxRate ?? 0,
        leadTimeDays: product?.leadTimeDays ?? 1,
        minQty: product?.minQty ?? 1,
        status: product?.status || "DRAFT",
        shortDescription: product?.shortDescription || "",
        longDescription: product?.longDescription || "",
        isCustomisable: product?.isCustomisable || false
    });

    useEffect(() => {
        const load = async () => {
            try {
                const [catRes, subRes] = await Promise.all([
                    // The category API pages by default; the picker needs them all
                    getCategories({ limit: 1000 }),
                    getSubCategories({ limit: 1000 })
                ]);

                setCategories(extractList(catRes?.data, ["categories", "category"]));
                setSubCategories(
                    extractList(subRes?.data, ["subCategories", "subCategory"])
                );
            } catch {
                // dropdowns are non-critical, save still works without them
            }
        };

        load();
    }, []);

    const filteredSubCategories = subCategories.filter((sub) => {
        const catId =
            typeof sub.category === "object" ? sub.category?._id : sub.category;
        return catId === form.category;
    });

    const handleNameChange = (value) => {
        setForm((prev) => ({
            ...prev,
            name: value,
            slug: product ? prev.slug : slugify(value)
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setIsSaving(true);

        const payload = {
            name: form.name,
            sku: form.sku,
            slug: form.slug || slugify(form.name),
            basePrice: Number(form.basePrice) || 0,
            category: form.category,
            subcategory: form.subcategory,
            taxRate: Number(form.taxRate) || 0,
            leadTimeDays: Number(form.leadTimeDays) || 0,
            minQty: Number(form.minQty) || 1,
            status: form.status,
            shortDescription: form.shortDescription,
            longDescription: form.longDescription,
            isCustomisable: form.isCustomisable
        };

        try {
            const res = product
                ? await updateProduct(product._id, payload)
                : await createProduct(payload);

            onSaved(res?.data?.product || res?.data);
        } catch (err) {
            setError(err.message || "Failed to save product");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Name">
                    <input
                        className={inputClass}
                        value={form.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                    />
                </FormField>

                <FormField label="SKU">
                    <input
                        className={inputClass}
                        value={form.sku}
                        onChange={(e) =>
                            setForm((prev) => ({ ...prev, sku: e.target.value }))
                        }
                    />
                </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Slug (auto)">
                    <input
                        className={inputClass}
                        value={form.slug}
                        onChange={(e) =>
                            setForm((prev) => ({ ...prev, slug: e.target.value }))
                        }
                    />
                </FormField>

                <FormField label="Base price">
                    <input
                        type="number"
                        min="0"
                        className={inputClass}
                        value={form.basePrice}
                        onChange={(e) =>
                            setForm((prev) => ({ ...prev, basePrice: e.target.value }))
                        }
                    />
                </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Category">
                    <select
                        className={inputClass}
                        value={form.category}
                        onChange={(e) =>
                            setForm((prev) => ({
                                ...prev,
                                category: e.target.value,
                                subcategory: ""
                            }))
                        }
                    >
                        <option value="">Select...</option>
                        {categories.map((category) => (
                            <option key={category._id} value={category._id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </FormField>

                <FormField label="Subcategory">
                    <select
                        className={inputClass}
                        value={form.subcategory}
                        onChange={(e) =>
                            setForm((prev) => ({
                                ...prev,
                                subcategory: e.target.value
                            }))
                        }
                    >
                        <option value="">Select...</option>
                        {filteredSubCategories.map((sub) => (
                            <option key={sub._id} value={sub._id}>
                                {sub.name}
                            </option>
                        ))}
                    </select>
                </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Tax rate %">
                    <input
                        type="number"
                        min="0"
                        className={inputClass}
                        value={form.taxRate}
                        onChange={(e) =>
                            setForm((prev) => ({ ...prev, taxRate: e.target.value }))
                        }
                    />
                </FormField>

                <FormField label="Lead time (days)">
                    <input
                        type="number"
                        min="0"
                        className={inputClass}
                        value={form.leadTimeDays}
                        onChange={(e) =>
                            setForm((prev) => ({
                                ...prev,
                                leadTimeDays: e.target.value
                            }))
                        }
                    />
                </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Min qty">
                    <input
                        type="number"
                        min="1"
                        className={inputClass}
                        value={form.minQty}
                        onChange={(e) =>
                            setForm((prev) => ({ ...prev, minQty: e.target.value }))
                        }
                    />
                </FormField>

                <FormField label="Status">
                    <select
                        className={inputClass}
                        value={form.status}
                        onChange={(e) =>
                            setForm((prev) => ({ ...prev, status: e.target.value }))
                        }
                    >
                        {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                </FormField>
            </div>

            <FormField label="Short description">
                <textarea
                    className={`${inputClass} min-h-16 resize-y`}
                    value={form.shortDescription}
                    onChange={(e) =>
                        setForm((prev) => ({
                            ...prev,
                            shortDescription: e.target.value
                        }))
                    }
                />
            </FormField>

            <FormField label="Long description">
                <textarea
                    className={`${inputClass} min-h-24 resize-y`}
                    value={form.longDescription}
                    onChange={(e) =>
                        setForm((prev) => ({
                            ...prev,
                            longDescription: e.target.value
                        }))
                    }
                />
            </FormField>

            <label className="flex items-center gap-2 text-sm font-medium text-text">
                <input
                    type="checkbox"
                    checked={form.isCustomisable}
                    onChange={(e) =>
                        setForm((prev) => ({
                            ...prev,
                            isCustomisable: e.target.checked
                        }))
                    }
                />
                Customisable
            </label>

            {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                </p>
            )}

            <button
                type="submit"
                disabled={isSaving}
                className="w-full rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-70"
            >
                {isSaving ? "Saving..." : product ? "Save details" : "Create product"}
            </button>
        </form>
    );
}
