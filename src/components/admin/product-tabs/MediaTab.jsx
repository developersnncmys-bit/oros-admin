"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import {
    getProductMedia,
    createProductMedia,
    updateProductMedia,
    deleteProductMedia
} from "@/api/product.api";
import { extractList } from "@/utils/extractList";
import { confirmDialog, alertDialog } from "@/store/useDialogStore";

export default function MediaTab({ productId }) {
    const [media, setMedia] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState("");

    const [refreshKey, setRefreshKey] = useState(0);
    const reload = () => setRefreshKey((key) => key + 1);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsLoading(true);

            try {
                const res = await getProductMedia(productId);
                if (!cancelled) {
                    setMedia(extractList(res?.data, ["media"]));
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Failed to load media");
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
    }, [productId, refreshKey]);

    const handleUpload = async (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;

        setIsUploading(true);
        setError("");

        try {
            for (const file of files) {
                const formData = new FormData();
                formData.append("file", file);
                await createProductMedia(productId, formData);
            }
            reload();
        } catch (err) {
            setError(err.message || "Failed to upload media");
        } finally {
            setIsUploading(false);
            event.target.value = "";
        }
    };

    const handleAltChange = (mediaId, altText) => {
        setMedia((prev) =>
            prev.map((m) => (m._id === mediaId ? { ...m, altText } : m))
        );
    };

    const handleAltBlur = async (mediaId, altText) => {
        try {
            await updateProductMedia(productId, mediaId, { altText });
        } catch {
            // non-critical field, ignore
        }
    };

    const setPrimary = async (mediaId) => {
        try {
            await updateProductMedia(productId, mediaId, { isPrimary: true });
            reload();
        } catch (err) {
            alertDialog(err.message || "Failed to set primary media");
        }
    };

    const handleDelete = async (mediaId) => {
        if (!(await confirmDialog({ title: "Remove media?", description: "This file will be removed from the product.", confirmLabel: "Remove" }))) return;

        try {
            await deleteProductMedia(productId, mediaId);
            reload();
        } catch (err) {
            alertDialog(err.message || "Failed to delete media");
        }
    };

    return (
        <div className="space-y-4">
            {isLoading && <p className="text-sm text-text-muted">Loading...</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {media.map((item) => (
                    <div key={item._id} className="rounded-xl border border-border p-2">
                        {item.type === "VIDEO" ? (
                            <video
                                src={item.url}
                                className="h-28 w-full rounded-lg object-cover"
                                muted
                            />
                        ) : (
                            <img
                                src={item.url}
                                alt={item.altText || ""}
                                className="h-28 w-full rounded-lg object-cover"
                            />
                        )}

                        <input
                            value={item.altText || ""}
                            onChange={(e) => handleAltChange(item._id, e.target.value)}
                            onBlur={(e) => handleAltBlur(item._id, e.target.value)}
                            placeholder="Alt text"
                            className="mt-2 w-full rounded-md border border-border px-2 py-1 text-xs outline-none"
                        />

                        <div className="mt-2 flex items-center justify-between">
                            {item.isPrimary ? (
                                <span className="text-xs font-bold text-emerald-600">
                                    Primary
                                </span>
                            ) : (
                                <button
                                    onClick={() => setPrimary(item._id)}
                                    className="text-xs font-semibold text-accent hover:text-accent-dark"
                                >
                                    Set primary
                                </button>
                            )}

                            <button
                                onClick={() => handleDelete(item._id)}
                                className="text-text-muted hover:text-red-500"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <label className="inline-flex cursor-pointer items-center rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-bg">
                {isUploading ? "Uploading..." : "Upload images / video"}
                <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleUpload}
                    disabled={isUploading}
                    className="hidden"
                />
            </label>
        </div>
    );
}
