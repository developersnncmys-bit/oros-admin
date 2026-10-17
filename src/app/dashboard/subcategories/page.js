"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ImageOff } from "lucide-react";

import {
    getSubCategories,
    createSubCategory,
    updateSubCategory,
    deleteSubCategory
} from "@/api/subCategory.api";
import { getCategories } from "@/api/category.api";
import Modal from "@/components/ui/Modal";
import FormField, { inputClass } from "@/components/ui/FormField";
import Pager from "@/components/admin/Pager";
import CategoryTabs from "@/components/admin/CategoryTabs";
import { extractList } from "@/utils/extractList";
import { slugify } from "@/utils/format";
import { confirmDialog, alertDialog } from "@/store/useDialogStore";

const EMPTY_FORM = {
    name: "",
    slug: "",
    category: "",
    description: ""
};

const PAGE_SIZE = 10;

export default function SubcategoriesPage() {
    const [subCategories, setSubCategories] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    // From the API's totalPage; 0 until the first page loads
    const [totalPages, setTotalPages] = useState(0);
    // Category filter; "" shows every subcategory
    const [categoryFilter, setCategoryFilter] = useState("");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [imageFile, setImageFile] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState("");

    const [refreshKey, setRefreshKey] = useState(0);
    const reload = () => setRefreshKey((key) => key + 1);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            setError("");

            try {
                const [subRes, catRes] = await Promise.all([
                    getSubCategories({
                        page,
                        limit: PAGE_SIZE,
                        category: categoryFilter || undefined
                    }),
                    getCategories({ limit: 1000 })
                ]);

                if (!cancelled) {
                    const pages = Number(subRes?.data?.totalPage) || 0;
                    setTotalPages(pages);
                    setSubCategories(
                        extractList(subRes?.data, ["subCategories", "subCategory"])
                    );
                    setCategories(
                        extractList(catRes?.data, ["categories", "category"])
                    );

                    // A delete can empty the last page — step back to the new last one
                    if (pages > 0 && page > pages) {
                        setPage(pages);
                    }
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Failed to load subcategories");
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [page, categoryFilter, refreshKey]);

    const categoryName = (value) => {
        if (!value) return "—";
        if (typeof value === "object") return value.name;
        return categories.find((c) => c._id === value)?.name || "—";
    };

    const openCreate = () => {
        setEditing(null);
        setForm({ ...EMPTY_FORM, category: categories[0]?._id || "" });
        setImageFile(null);
        setFormError("");
        setIsModalOpen(true);
    };

    const openEdit = (subCategory) => {
        setEditing(subCategory);
        setForm({
            name: subCategory.name || "",
            slug: subCategory.slug || "",
            category:
                typeof subCategory.category === "object"
                    ? subCategory.category?._id
                    : subCategory.category || "",
            description: subCategory.description || ""
        });
        setImageFile(null);
        setFormError("");
        setIsModalOpen(true);
    };

    const handleNameChange = (value) => {
        setForm((prev) => ({
            ...prev,
            name: value,
            slug: editing ? prev.slug : slugify(value)
        }));
    };

    const handleSave = async (event) => {
        event.preventDefault();
        setFormError("");

        if (!form.name.trim()) {
            setFormError("Name is required");
            return;
        }

        if (!form.category) {
            setFormError("Parent category is required");
            return;
        }

        setIsSaving(true);

        try {
            const formData = new FormData();
            formData.append("name", form.name);
            formData.append("slug", form.slug || slugify(form.name));
            formData.append("category", form.category);
            formData.append("description", form.description);

            if (imageFile) {
                formData.append("image", imageFile);
            }

            if (editing) {
                await updateSubCategory(editing._id, formData);
            } else {
                await createSubCategory(formData);
            }

            setIsModalOpen(false);
            reload();
        } catch (err) {
            setFormError(err.message || "Failed to save subcategory");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (subCategory) => {
        if (!(await confirmDialog({ title: "Delete subcategory?", description: `"${subCategory.name}" will be removed permanently.` }))) {
            return;
        }

        try {
            await deleteSubCategory(subCategory._id);
            reload();
        } catch (err) {
            alertDialog(err.message || "Failed to delete subcategory");
        }
    };

    // The API already returns just this page
    const pageRows = subCategories;

    return (
        <div>
            <CategoryTabs />

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <select
                    value={categoryFilter}
                    onChange={(e) => {
                        setCategoryFilter(e.target.value);
                        setPage(1);
                    }}
                    aria-label="Filter by category"
                    className={`${inputClass} w-full sm:w-64`}
                >
                    <option value="">All categories</option>
                    {categories.map((category) => (
                        <option key={category._id} value={category._id}>
                            {category.name}
                        </option>
                    ))}
                </select>

                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark"
                >
                    <Plus size={16} />
                    New subcategory
                </button>
            </div>

            {isLoading && subCategories.length === 0 && (
                <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center text-text-muted">
                    Loading...
                </div>
            )}

            {!isLoading && error && (
                <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center text-red-500">
                    {error}
                </div>
            )}

            {!isLoading && !error && subCategories.length === 0 && (
                <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center text-text-muted">
                    {categoryFilter
                        ? "No subcategories in this category"
                        : "No subcategories yet"}
                </div>
            )}

            {!error && subCategories.length > 0 && (
                // The previous page stays visible, dimmed, until the next one arrives
                <div
                    aria-busy={isLoading}
                    className={`transition-opacity duration-200 ${
                        isLoading ? "pointer-events-none opacity-50" : "opacity-100"
                    }`}
                >
                    {/* Mobile: one card per subcategory */}
                    <div className="space-y-3 md:hidden">
                        {pageRows.map((sub) => (
                            <div
                                key={sub._id}
                                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
                            >
                                {sub.image ? (
                                    <img
                                        src={sub.image}
                                        alt={sub.name}
                                        className="h-11 w-11 shrink-0 rounded-lg border border-border object-cover"
                                    />
                                ) : (
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-bg text-text-muted">
                                        <ImageOff size={14} />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-text">
                                        {sub.name}
                                    </p>
                                    <p className="truncate text-xs text-text-muted">
                                        {categoryName(sub.category)} · {sub.slug}
                                    </p>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                    <button
                                        onClick={() => openEdit(sub)}
                                        className="rounded-lg border border-border p-2 text-text-muted hover:text-text"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(sub)}
                                        className="rounded-lg border border-border p-2 text-text-muted hover:text-red-500"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop / tablet: table */}
                    <div className="hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-border text-xs font-bold uppercase tracking-wide text-text-muted">
                                        <th className="px-5 py-3">Name</th>
                                        <th className="px-5 py-3">Category</th>
                                        <th className="px-5 py-3">Slug</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.map((sub) => (
                                        <tr
                                            key={sub._id}
                                            className="border-b border-border last:border-0"
                                        >
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    {sub.image ? (
                                                        <img
                                                            src={sub.image}
                                                            alt={sub.name}
                                                            className="h-9 w-9 rounded-lg border border-border object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-bg text-text-muted">
                                                            <ImageOff size={14} />
                                                        </div>
                                                    )}
                                                    <span className="font-semibold text-text">
                                                        {sub.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-text-muted">
                                                {categoryName(sub.category)}
                                            </td>
                                            <td className="px-5 py-3 text-text-muted">
                                                {sub.slug}
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => openEdit(sub)}
                                                        className="rounded-lg border border-border p-2 text-text-muted hover:text-text"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(sub)}
                                                        className="rounded-lg border border-border p-2 text-text-muted hover:text-red-500"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {!error && totalPages > 1 && (
                <div className="mt-3 rounded-2xl border border-border bg-card">
                    <Pager
                        page={page}
                        totalPages={totalPages}
                        hasNext={page < totalPages}
                        disabled={isLoading}
                        onPrev={() => setPage((p) => Math.max(1, p - 1))}
                        onNext={() => setPage((p) => p + 1)}
                    />
                </div>
            )}

            {isModalOpen && (
                <Modal
                    title={editing ? "Edit subcategory" : "New subcategory"}
                    onClose={() => setIsModalOpen(false)}
                >
                    <form onSubmit={handleSave} className="space-y-4">
                        <FormField label="Name">
                            <input
                                className={inputClass}
                                value={form.name}
                                onChange={(e) => handleNameChange(e.target.value)}
                            />
                        </FormField>

                        <FormField label="Slug (auto)">
                            <input
                                className={inputClass}
                                value={form.slug}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, slug: e.target.value }))
                                }
                            />
                        </FormField>

                        <FormField label="Parent category">
                            <select
                                className={inputClass}
                                value={form.category}
                                onChange={(e) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        category: e.target.value
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

                        <FormField label="Description">
                            <textarea
                                className={`${inputClass} min-h-20 resize-y`}
                                value={form.description}
                                onChange={(e) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        description: e.target.value
                                    }))
                                }
                            />
                        </FormField>

                        <FormField label="Image">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                                className="text-sm text-text"
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
                            {isSaving ? "Saving..." : "Save subcategory"}
                        </button>
                    </form>
                </Modal>
            )}
        </div>
    );
}
