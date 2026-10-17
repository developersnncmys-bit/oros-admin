"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Download, Eye, FileText, Image as ImageIcon, Loader2, X } from "lucide-react";

// Formats the 3D viewer can open (STEP/IGES load their parser from a CDN)
const VIEWABLE = [".stl", ".obj", ".3mf", ".step", ".stp", ".iges", ".igs"];

const IMAGES = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"];

const extensionOf = (name = "") => {
    const dot = name.lastIndexOf(".");
    return dot === -1 ? "" : name.slice(dot).toLowerCase();
};

const fileNameOf = (file) =>
    file.fileName || decodeURIComponent(file.fileUrl.split("/").pop() || "model");

// How a file is previewed: in the 3D viewer, as an image, as a PDF, or in a new tab
const previewKind = (file) => {
    const ext = extensionOf(fileNameOf(file));
    const mime = file.mime || "";
    if (VIEWABLE.includes(ext)) return "model";
    if (IMAGES.includes(ext) || mime.startsWith("image/")) return "image";
    if (ext === ".pdf" || mime === "application/pdf") return "pdf";
    return "other";
};

const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Pulls the file into the browser so it can be saved or opened under its
// original name, whatever the storage URL looks like.
const fetchAsFile = async (file) => {
    const res = await fetch(file.fileUrl);
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    const blob = await res.blob();
    return new File([blob], fileNameOf(file), { type: blob.type });
};

// When the storage blocks a cross-origin fetch, ask it for an attachment
// response instead and let the browser handle the download.
const attachmentUrl = (file) => {
    const url = file.fileUrl;
    if (url.includes("/api/quotation/files/")) {
        return `${url}?download=1&name=${encodeURIComponent(fileNameOf(file))}`;
    }
    if (url.includes("res.cloudinary.com")) {
        return url.replace("/upload/", "/upload/fl_attachment/");
    }
    return url;
};

const saveFile = async (file) => {
    const link = document.createElement("a");

    try {
        const blob = await fetchAsFile(file);
        const objectUrl = URL.createObjectURL(blob);
        link.href = objectUrl;
        link.download = fileNameOf(file);
        link.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
        link.href = attachmentUrl(file);
        link.rel = "noopener";
        link.click();
    }
};

function ModelViewer({ file, onClose }) {
    const mountRef = useRef(null);
    const [status, setStatus] = useState("loading");
    const [error, setError] = useState("");

    useEffect(() => {
        let viewer = null;
        let cancelled = false;

        (async () => {
            try {
                // Browser-only library, so it is loaded on demand
                const OV = await import("online-3d-viewer");
                if (cancelled || !mountRef.current) return;

                viewer = new OV.EmbeddedViewer(mountRef.current, {
                    backgroundColor: new OV.RGBAColor(245, 246, 248, 255),
                    defaultColor: new OV.RGBColor(160, 170, 185),
                    onModelLoaded: () => !cancelled && setStatus("ready"),
                    onModelLoadFailed: () => {
                        if (cancelled) return;
                        setStatus("error");
                        setError("This model could not be opened.");
                    }
                });

                try {
                    viewer.LoadModelFromFileList([await fetchAsFile(file)]);
                } catch {
                    // Cross-origin fetch blocked — let the viewer request the URL
                    viewer.LoadModelFromUrlList([file.fileUrl]);
                }
            } catch (err) {
                if (cancelled) return;
                setStatus("error");
                setError(err.message || "This model could not be opened.");
            }
        })();

        return () => {
            cancelled = true;
            viewer?.Destroy();
        };
    }, [file]);

    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
            <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text">
                            {fileNameOf(file)}
                        </p>
                        <p className="text-xs text-text-muted">
                            Drag to rotate · scroll to zoom · right-drag to pan
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={() => saveFile(file)}
                            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text"
                        >
                            <Download size={14} /> Download
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close viewer"
                            className="rounded-lg border border-border p-2 text-text"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                <div className="relative flex-1">
                    <div ref={mountRef} className="absolute inset-0" />
                    {status !== "ready" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-text-muted">
                            {status === "loading" ? (
                                <>
                                    <Loader2 className="animate-spin" size={22} />
                                    Loading model…
                                </>
                            ) : (
                                <p>{error} Download it to open in your CAD tool.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function FilePreview({ file, onClose }) {
    const kind = previewKind(file);

    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
            <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
                    <p className="min-w-0 truncate text-sm font-semibold text-text">
                        {fileNameOf(file)}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={() => saveFile(file)}
                            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text"
                        >
                            <Download size={14} /> Download
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close preview"
                            className="rounded-lg border border-border p-2 text-text"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 items-center justify-center overflow-auto bg-black/5">
                    {kind === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={file.fileUrl}
                            alt={fileNameOf(file)}
                            className="max-h-full max-w-full object-contain"
                        />
                    ) : (
                        <iframe
                            src={file.fileUrl}
                            title={fileNameOf(file)}
                            className="h-full w-full"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

const FileGlyph = ({ kind }) =>
    kind === "model" ? <Box size={16} /> : kind === "image" ? <ImageIcon size={16} /> : <FileText size={16} />;

/**
 * Files the customer attached to a quotation, each with its own download
 * button and — for 3D models — a button that opens the in-browser viewer.
 */
export default function QuotationFiles({ files = [] }) {
    const [viewing, setViewing] = useState(null);
    const [downloading, setDownloading] = useState(null);

    if (files.length === 0) return null;

    const download = async (file) => {
        setDownloading(file._id);
        try {
            await saveFile(file);
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div className="mb-5 rounded-xl border border-border p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-muted">
                Customer files ({files.length})
            </p>

            <ul className="space-y-2">
                {files.map((file) => {
                    const name = fileNameOf(file);
                    const kind = previewKind(file);

                    return (
                        <li
                            key={file._id}
                            className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
                        >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                <FileGlyph kind={kind} />
                            </span>

                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-text" title={name}>
                                    {name}
                                </p>
                                <p className="text-xs text-text-muted">
                                    {[extensionOf(name).slice(1).toUpperCase(), formatSize(file.size)]
                                        .filter(Boolean)
                                        .join(" · ")}
                                </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        kind === "other"
                                            ? window.open(file.fileUrl, "_blank", "noopener")
                                            : setViewing(file)
                                    }
                                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text"
                                >
                                    {kind === "model" ? <Box size={14} /> : <Eye size={14} />}
                                    {kind === "model" ? "View 3D" : "View"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => download(file)}
                                    disabled={downloading === file._id}
                                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                                >
                                    {downloading === file._id ? (
                                        <Loader2 className="animate-spin" size={14} />
                                    ) : (
                                        <Download size={14} />
                                    )}
                                    Download
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ul>

            {viewing &&
                (previewKind(viewing) === "model" ? (
                    <ModelViewer file={viewing} onClose={() => setViewing(null)} />
                ) : (
                    <FilePreview file={viewing} onClose={() => setViewing(null)} />
                ))}
        </div>
    );
}
