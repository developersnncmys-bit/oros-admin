"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ImageOff } from "lucide-react";

import {
    getBanners,
    createBanner,
    updateBanner,
    deleteBanner
} from "@/api/banner.api";
import Modal from "@/components/ui/Modal";
import FormField, { inputClass } from "@/components/ui/FormField";
import Badge from "@/components/ui/Badge";
import { extractList } from "@/utils/extractList";
import { confirmDialog, alertDialog } from "@/store/useDialogStore";

const EMPTY_FORM = {
    type: "SLIDER",
    order: 1,
    tone: "LIGHT",
    kicker: "",
    title1: "",
    title1Color: "#2b1b4d",
    title2: "",
    title2Color: "#ff5a2c",
    subTitle: "",
    subTitleColor: "#2b1b4d",
    ctaLabel: "",
    ctaUrl: "",
    isActive: true
};

export default function BannersPage() {
    const [banners, setBanners] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [desktopFile, setDesktopFile] = useState(null);
    const [mobileFile, setMobileFile] = useState(null);
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
                const res = await getBanners();
                if (!cancelled) {
                    setBanners(extractList(res?.data, ["banners", "banner"]));
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Failed to load banners");
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
    }, [refreshKey]);

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setDesktopFile(null);
        setMobileFile(null);
        setFormError("");
        setIsModalOpen(true);
    };

    const openEdit = (banner) => {
        setEditing(banner);
        setForm({
            type: banner.type || "SLIDER",
            order: banner.order || 1,
            tone: banner.tone || "LIGHT",
            kicker: banner.kicker || "",
            title1: banner.title1 || "",
            title1Color: banner.title1Color || "#2b1b4d",
            title2: banner.title2 || "",
            title2Color: banner.title2Color || "#ff5a2c",
            subTitle: banner.subTitle || "",
            subTitleColor: banner.subTitleColor || "#2b1b4d",
            ctaLabel: banner.ctaLabel || "",
            ctaUrl: banner.ctaUrl || "",
            isActive: banner.isActive ?? true
        });
        setDesktopFile(null);
        setMobileFile(null);
        setFormError("");
        setIsModalOpen(true);
    };

    const handleSave = async (event) => {
        event.preventDefault();
        setFormError("");

        if (!editing && (!desktopFile || !mobileFile)) {
            setFormError("Desktop and mobile media are both required");
            return;
        }

        setIsSaving(true);

        try {
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => {
                formData.append(key, value);
            });

            if (desktopFile) {
                formData.append("mediaDesktop", desktopFile);
            }

            if (mobileFile) {
                formData.append("mediaMobile", mobileFile);
            }

            if (editing) {
                await updateBanner(editing._id, formData);
            } else {
                await createBanner(formData);
            }

            setIsModalOpen(false);
            reload();
        } catch (err) {
            setFormError(err.message || "Failed to save banner");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (banner) => {
        if (!(await confirmDialog({ title: "Delete banner?", description: "This banner will be removed permanently." }))) {
            return;
        }

        try {
            await deleteBanner(banner._id);
            reload();
        } catch (err) {
            alertDialog(err.message || "Failed to delete banner");
        }
    };

    return (
        <div>
            <div className="mb-5 flex items-center justify-end">
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark"
                >
                    <Plus size={16} />
                    New banner
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

            {!isLoading && !error && banners.length === 0 && (
                <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center text-text-muted">
                    No banners yet
                </div>
            )}

            {!isLoading && !error && banners.length > 0 && (
                <>
                    {/* Mobile: one card per banner */}
                    <div className="space-y-3 md:hidden">
                        {banners.map((banner) => (
                            <div
                                key={banner._id}
                                className="rounded-2xl border border-border bg-card p-4"
                            >
                                <div className="flex items-start gap-3">
                                    {banner.mediaUrlDesktop ? (
                                        <img
                                            src={banner.mediaUrlDesktop}
                                            alt=""
                                            className="h-12 w-20 shrink-0 rounded-lg border border-border object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-lg border border-border bg-bg text-text-muted">
                                            <ImageOff size={14} />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="font-bold text-text">{banner.type}</p>
                                            <Badge tone={banner.isActive ? "success" : "neutral"}>
                                                {banner.isActive ? "Live" : "Hidden"}
                                            </Badge>
                                        </div>
                                        <p className="truncate text-sm text-text-muted">
                                            {banner.title1 || banner.title2 || "—"}
                                        </p>
                                        <p className="text-xs text-text-muted">
                                            Order {banner.order}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-3 flex justify-end gap-2 border-t border-border pt-3">
                                    <button
                                        onClick={() => openEdit(banner)}
                                        className="rounded-lg border border-border p-2 text-text-muted hover:text-text"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(banner)}
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
                                        <th className="px-5 py-3">Preview</th>
                                        <th className="px-5 py-3">Type</th>
                                        <th className="px-5 py-3">Title</th>
                                        <th className="px-5 py-3">Order</th>
                                        <th className="px-5 py-3">Active</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {banners.map((banner) => (
                                        <tr
                                            key={banner._id}
                                            className="border-b border-border last:border-0"
                                        >
                                            <td className="px-5 py-3">
                                                {banner.mediaUrlDesktop ? (
                                                    <img
                                                        src={banner.mediaUrlDesktop}
                                                        alt=""
                                                        className="h-10 w-16 rounded-lg border border-border object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-10 w-16 items-center justify-center rounded-lg border border-border bg-bg text-text-muted">
                                                        <ImageOff size={14} />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 font-bold text-text">
                                                {banner.type}
                                            </td>
                                            <td className="px-5 py-3 text-text-muted">
                                                {banner.title1 || banner.title2 || "—"}
                                            </td>
                                            <td className="px-5 py-3 text-text">
                                                {banner.order}
                                            </td>
                                            <td className="px-5 py-3">
                                                <Badge tone={banner.isActive ? "success" : "neutral"}>
                                                    {banner.isActive ? "Live" : "Hidden"}
                                                </Badge>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => openEdit(banner)}
                                                        className="rounded-lg border border-border p-2 text-text-muted hover:text-text"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(banner)}
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
                </>
            )}

            {isModalOpen && (
                <Modal
                    title={editing ? "Edit banner" : "New banner"}
                    onClose={() => setIsModalOpen(false)}
                    maxWidth="max-w-2xl"
                >
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField label="Type">
                                <select
                                    className={inputClass}
                                    value={form.type}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, type: e.target.value }))
                                    }
                                >
                                    <option value="SHOWREEL">Showreel</option>
                                    <option value="SLIDER">Slider</option>
                                </select>
                            </FormField>

                            <FormField label="Order">
                                <input
                                    type="number"
                                    min="1"
                                    className={inputClass}
                                    value={form.order}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, order: e.target.value }))
                                    }
                                />
                            </FormField>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField label="Tone">
                                <select
                                    className={inputClass}
                                    value={form.tone}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, tone: e.target.value }))
                                    }
                                >
                                    <option value="LIGHT">Light (dark text)</option>
                                    <option value="DARK">Dark (light text)</option>
                                </select>
                            </FormField>

                            <FormField label="Kicker">
                                <input
                                    className={inputClass}
                                    value={form.kicker}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, kicker: e.target.value }))
                                    }
                                />
                            </FormField>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField label="Title 1">
                                <input
                                    className={inputClass}
                                    value={form.title1}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, title1: e.target.value }))
                                    }
                                />
                            </FormField>

                            <FormField label="Title 1 colour">
                                <input
                                    type="color"
                                    className="h-10 w-full rounded-lg border border-border"
                                    value={form.title1Color}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            title1Color: e.target.value
                                        }))
                                    }
                                />
                            </FormField>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField label="Title 2">
                                <input
                                    className={inputClass}
                                    value={form.title2}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, title2: e.target.value }))
                                    }
                                />
                            </FormField>

                            <FormField label="Title 2 colour">
                                <input
                                    type="color"
                                    className="h-10 w-full rounded-lg border border-border"
                                    value={form.title2Color}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            title2Color: e.target.value
                                        }))
                                    }
                                />
                            </FormField>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField label="Subtitle">
                                <input
                                    className={inputClass}
                                    value={form.subTitle}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            subTitle: e.target.value
                                        }))
                                    }
                                />
                            </FormField>

                            <FormField label="Subtitle colour">
                                <input
                                    type="color"
                                    className="h-10 w-full rounded-lg border border-border"
                                    value={form.subTitleColor}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            subTitleColor: e.target.value
                                        }))
                                    }
                                />
                            </FormField>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField label="CTA label">
                                <input
                                    className={inputClass}
                                    value={form.ctaLabel}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            ctaLabel: e.target.value
                                        }))
                                    }
                                />
                            </FormField>

                            <FormField label="CTA URL">
                                <input
                                    className={inputClass}
                                    value={form.ctaUrl}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            ctaUrl: e.target.value
                                        }))
                                    }
                                />
                            </FormField>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField label="Desktop media (leave empty to keep)">
                                <input
                                    type="file"
                                    accept="image/*,video/*"
                                    onChange={(e) =>
                                        setDesktopFile(e.target.files?.[0] || null)
                                    }
                                    className="text-sm text-text"
                                />
                            </FormField>

                            <FormField label="Mobile media (leave empty to keep)">
                                <input
                                    type="file"
                                    accept="image/*,video/*"
                                    onChange={(e) =>
                                        setMobileFile(e.target.files?.[0] || null)
                                    }
                                    className="text-sm text-text"
                                />
                            </FormField>
                        </div>

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
                            {isSaving ? "Saving..." : "Save banner"}
                        </button>
                    </form>
                </Modal>
            )}
        </div>
    );
}
