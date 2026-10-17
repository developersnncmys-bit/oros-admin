"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ImageOff } from "lucide-react";

import {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory
} from "@/api/category.api";
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
    description: "",
    isActive: true
};

const PAGE_SIZE = 8;

export default function CategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    // From the API's totalPage; 0 until the first page loads
    const [totalPages, setTotalPages] = useState(0);

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
                const res = await getCategories({ page, limit: PAGE_SIZE });
                if (!cancelled) {
                    const pages = Number(res?.data?.totalPage) || 0;
                    setCategories(extractList(res?.data, ["categories", "category"]));
                    setTotalPages(pages);

                    // A delete can empty the last page — step back to the new last one
                    if (pages > 0 && page > pages) {
                        setPage(pages);
                    }
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Failed to load categories");
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
    }, [page, refreshKey]);

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setImageFile(null);
        setFormError("");
        setIsModalOpen(true);
    };

    const openEdit = (category) => {
        setEditing(category);
        setForm({
            name: category.name || "",
            slug: category.slug || "",
            description: category.description || "",
            isActive: category.isActive ?? true
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

        setIsSaving(true);

        try {
            const formData = new FormData();
            formData.append("name", form.name);
            formData.append("slug", form.slug || slugify(form.name));
            formData.append("description", form.description);
            formData.append("isActive", form.isActive);

            if (imageFile) {
                formData.append("image", imageFile);
            }

            if (editing) {
                await updateCategory(editing._id, formData);
            } else {
                await createCategory(formData);
            }

            setIsModalOpen(false);
            reload();
        } catch (err) {
            setFormError(err.message || "Failed to save category");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (category) => {
        if (!(await confirmDialog({ title: "Delete category?", description: `"${category.name}" will be removed permanently.` }))) {
            return;
        }

        try {
            await deleteCategory(category._id);
            reload();
        } catch (err) {
            alertDialog(err.message || "Failed to delete category");
        }
    };

    // The API already returns just this page
    const pageRows = categories;

    return (
        <div>
            <CategoryTabs />

            <div className="mb-5 flex items-center justify-end">
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark"
                >
                    <Plus size={16} />
                    New category
                </button>
            </div>

            {isLoading && categories.length === 0 && (
                <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center text-text-muted">
                    Loading...
                </div>
            )}

            {!isLoading && error && (
                <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center text-red-500">
                    {error}
                </div>
            )}

            {!isLoading && !error && categories.length === 0 && (
                <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center text-text-muted">
                    No categories yet
                </div>
            )}

            {!error && categories.length > 0 && (
                // The previous page stays visible, dimmed, until the next one arrives
                <div
                    aria-busy={isLoading}
                    className={`transition-opacity duration-200 ${
                        isLoading ? "pointer-events-none opacity-50" : "opacity-100"
                    }`}
                >
                    {/* Mobile: one card per category */}
                    <div className="space-y-3 md:hidden">
                        {pageRows.map((category) => (
                            <div
                                key={category._id}
                                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
                            >
                                {category.image ? (
                                    <img
                                        src={category.image}
                                        alt={category.name}
                                        className="h-11 w-11 shrink-0 rounded-lg border border-border object-cover"
                                    />
                                ) : (
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-bg text-text-muted">
                                        <ImageOff size={14} />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-text">
                                        {category.name}
                                    </p>
                                    <p className="truncate text-xs text-text-muted">
                                        {category.slug} ·{" "}
                                        {category.isActive ? "Active" : "Inactive"}
                                    </p>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                    <button
                                        onClick={() => openEdit(category)}
                                        className="rounded-lg border border-border p-2 text-text-muted hover:text-text"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(category)}
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
                                        <th className="px-5 py-3">Slug</th>
                                        <th className="px-5 py-3">Active</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.map((category) => (
                                        <tr
                                            key={category._id}
                                            className="border-b border-border last:border-0"
                                        >
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    {category.image ? (
                                                        <img
                                                            src={category.image}
                                                            alt={category.name}
                                                            className="h-9 w-9 rounded-lg border border-border object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-bg text-text-muted">
                                                            <ImageOff size={14} />
                                                        </div>
                                                    )}
                                                    <span className="font-semibold text-text">
                                                        {category.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-text-muted">
                                                {category.slug}
                                            </td>
                                            <td className="px-5 py-3 text-text">
                                                {category.isActive ? "Yes" : "No"}
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => openEdit(category)}
                                                        className="rounded-lg border border-border p-2 text-text-muted hover:text-text"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(category)}
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
                    title={editing ? "Edit category" : "New category"}
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

                        <label className="flex items-center gap-2 text-sm font-medium text-text">
                            <input
                                type="checkbox"
                                checked={form.isActive}
                                onChange={(e) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        isActive: e.target.checked
                                    }))
                                }
                            />
                            Active
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
                            {isSaving ? "Saving..." : "Save category"}
                        </button>
                    </form>
                </Modal>
            )}
        </div>
    );
}
