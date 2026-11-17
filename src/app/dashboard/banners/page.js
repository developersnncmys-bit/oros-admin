"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ImageOff } from "lucide-react";

import {
    getBanners,
    createBanner,
    updateBanner,
    deleteBanner,
    getBannerUploadSignature,
    uploadFileToCloudinary
} from "@/api/banner.api";
import Modal from "@/components/ui/Modal";
import FormField, { inputClass } from "@/components/ui/FormField";
import Badge from "@/components/ui/Badge";
import { extractList } from "@/utils/extractList";
import { confirmDialog, alertDialog } from "@/store/useDialogStore";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const formatMb = (bytes) => (bytes / (1024 * 1024)).toFixed(2);

// Build an admin-readable alert for a failed banner save. Prefers the
// most specific reason we can prove (which file, its actual size, which
// server rule was tripped) and only falls back to the raw server string
// when nothing more specific matches.
function describeBannerFailure(err, { desktopFile, mobileFile }) {
    const raw = err?.message || "";
    const status = err?.status || err?.response?.status;

    // 1. Oversized — client-provable (names the exact file and its size)
    const oversized = [];
    if (desktopFile && desktopFile.size > MAX_FILE_SIZE_BYTES) {
        oversized.push(
            `Desktop file "${desktopFile.name}" is ${formatMb(desktopFile.size)} MB`
        );
    }
    if (mobileFile && mobileFile.size > MAX_FILE_SIZE_BYTES) {
        oversized.push(
            `Mobile file "${mobileFile.name}" is ${formatMb(mobileFile.size)} MB`
        );
    }
    if (oversized.length > 0) {
        return {
            title: "Media file is too large",
            description: `${oversized.join(" and ")}. Maximum allowed is ${MAX_FILE_SIZE_MB} MB per file. Please pick a smaller file.`
        };
    }

    // 2. Server said "too large" (413 from our multer handler)
    if (status === 413 || /file too large|too large|maximum size/i.test(raw)) {
        return {
            title: "Media file is too large",
            description:
                raw ||
                `The server rejected the upload because the file is larger than ${MAX_FILE_SIZE_MB} MB.`
        };
    }

    // 3. Mongoose complained about the media URL paths — multer never
    //    received the files (usually a bad Content-Type or the field
    //    name mismatch), so the save was attempted without any URLs.
    if (/mediaUrl(Desktop|Mobile)/i.test(raw)) {
        return {
            title: "Media files didn't upload",
            description:
                "The desktop and mobile media files didn't reach the server. Please re-pick both files and click Save again."
        };
    }

    // 4. Network — request never got a response
    if (/network error/i.test(raw)) {
        return {
            title: "Couldn't reach the server",
            description:
                "The banner upload didn't complete because the server couldn't be reached. Check your internet connection and try again."
        };
    }

    // 5. Auth
    if (status === 401 || /unauthori[sz]ed/i.test(raw)) {
        return {
            title: "Session expired",
            description: "Please sign in again and retry the banner save."
        };
    }
    if (status === 403 || /forbidden/i.test(raw)) {
        return {
            title: "Not allowed",
            description: "This account doesn't have permission to add or update banners."
        };
    }

    // 6. Fallback — use the server's own message so the admin at least
    //    sees the real reason, not a generic placeholder.
    return {
        title: "Failed to save banner",
        description: raw || "An unknown error occurred. Please try again."
    };
}

function MediaPreview({ file, previewUrl, fallbackUrl }) {
    // Prefer the picked file's blob URL; fall back to the saved banner's URL
    // when editing and no new file has been chosen.
    const src = previewUrl || fallbackUrl || "";
    if (!src) return null;

    const isVideo = file
        ? file.type?.startsWith("video/")
        : /\.(mp4|mov|webm)(\?|$)/i.test(src);

    return (
        <div className="mt-2 flex items-center gap-2">
            {isVideo ? (
                <video
                    src={src}
                    className="h-16 w-28 rounded-lg border border-border object-cover"
                    muted
                    playsInline
                />
            ) : (
                <img
                    src={src}
                    alt="preview"
                    className="h-16 w-28 rounded-lg border border-border object-cover"
                />
            )}
            {file && (
                <span className="truncate text-xs text-text-muted">
                    {file.name} · {(file.size / (1024 * 1024)).toFixed(2)} MB
                </span>
            )}
        </div>
    );
}

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
    const [desktopPreview, setDesktopPreview] = useState("");
    const [mobilePreview, setMobilePreview] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState("");

    // Build object-URL previews for the picked files and revoke them when
    // the file changes or the component unmounts, to avoid memory leaks.
    useEffect(() => {
        if (!desktopFile) {
            setDesktopPreview("");
            return;
        }
        const url = URL.createObjectURL(desktopFile);
        setDesktopPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [desktopFile]);

    useEffect(() => {
        if (!mobileFile) {
            setMobilePreview("");
            return;
        }
        const url = URL.createObjectURL(mobileFile);
        setMobilePreview(url);
        return () => URL.revokeObjectURL(url);
    }, [mobileFile]);

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

    const handleFileSelect = (event, setFile, slot) => {
        const file = event.target.files?.[0] || null;

        if (!file) {
            setFile(null);
            return;
        }

        const isMedia =
            file.type?.startsWith("image/") || file.type?.startsWith("video/");

        if (!isMedia) {
            const message = `"${file.name}" isn't an image or video. Please pick a JPG, PNG, WebP, MP4, MOV or WebM file for the ${slot} media.`;
            setFormError(message);
            alertDialog(message, "Unsupported file type");
            event.target.value = "";
            setFile(null);
            return;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            const message = `"${file.name}" is ${formatMb(file.size)} MB. The ${slot} media must be under ${MAX_FILE_SIZE_MB} MB — please pick a smaller file or compress this one.`;
            setFormError(message);
            alertDialog(message, "Media file is too large");
            // reset the native input so the same oversized file can be re-picked after optimising
            event.target.value = "";
            setFile(null);
            return;
        }

        setFormError("");
        setFile(file);
    };

    const handleSave = async (event) => {
        event.preventDefault();
        setFormError("");

        if (!editing && (!desktopFile || !mobileFile)) {
            const missing = [];
            if (!desktopFile) missing.push("desktop");
            if (!mobileFile) missing.push("mobile");
            const message = `Please select the ${missing.join(" and ")} media file${missing.length > 1 ? "s" : ""} before saving.`;
            setFormError(message);
            alertDialog(message, "Missing media files");
            return;
        }

        // Safety net: re-validate size at submit time in case a file ended up
        // in state without going through handleFileSelect.
        const oversized = [
            ["Desktop", desktopFile],
            ["Mobile", mobileFile]
        ].find(([, file]) => file && file.size > MAX_FILE_SIZE_BYTES);

        if (oversized) {
            const [label, file] = oversized;
            const message = `${label} media "${file.name}" is ${formatMb(file.size)} MB. Maximum allowed is ${MAX_FILE_SIZE_MB} MB — please choose a smaller file.`;
            setFormError(message);
            alertDialog(message, "Media file is too large");
            return;
        }

        setIsSaving(true);

        try {
            const payload = { ...form };

            // Upload picked files directly to Cloudinary, bypassing Vercel's
            // 4.5 MB request-body cap. Only hit the signature endpoint if at
            // least one file actually needs uploading.
            if (desktopFile || mobileFile) {
                const sig = await getBannerUploadSignature();

                if (desktopFile) {
                    const { secureUrl, publicId } = await uploadFileToCloudinary(
                        desktopFile,
                        sig
                    );
                    payload.mediaUrlDesktop = secureUrl;
                    payload.mediaUrlDesktopPublicId = publicId;
                }

                if (mobileFile) {
                    const { secureUrl, publicId } = await uploadFileToCloudinary(
                        mobileFile,
                        sig
                    );
                    payload.mediaUrlMobile = secureUrl;
                    payload.mediaUrlMobilePublicId = publicId;
                }
            }

            if (editing) {
                await updateBanner(editing._id, payload);
            } else {
                await createBanner(payload);
            }

            setIsModalOpen(false);
            reload();
        } catch (err) {
            const { title, description } = describeBannerFailure(err, {
                desktopFile,
                mobileFile
            });
            setFormError(description);
            alertDialog(description, title);
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
                            <FormField label={`Desktop media (max ${MAX_FILE_SIZE_MB} MB, leave empty to keep)`}>
                                <input
                                    type="file"
                                    accept="image/*,video/*"
                                    onChange={(e) => handleFileSelect(e, setDesktopFile, "desktop")}
                                    className="text-sm text-text"
                                />
                                <MediaPreview
                                    file={desktopFile}
                                    previewUrl={desktopPreview}
                                    fallbackUrl={editing?.mediaUrlDesktop}
                                />
                            </FormField>

                            <FormField label={`Mobile media (max ${MAX_FILE_SIZE_MB} MB, leave empty to keep)`}>
                                <input
                                    type="file"
                                    accept="image/*,video/*"
                                    onChange={(e) => handleFileSelect(e, setMobileFile, "mobile")}
                                    className="text-sm text-text"
                                />
                                <MediaPreview
                                    file={mobileFile}
                                    previewUrl={mobilePreview}
                                    fallbackUrl={editing?.mediaUrlMobile}
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
