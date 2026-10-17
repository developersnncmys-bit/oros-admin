"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, ImageUp, Upload } from "lucide-react";

import Modal from "@/components/ui/Modal";
import {
    downloadBulkTemplate,
    bulkImportProducts,
    bulkUploadMedia
} from "@/api/product.api";

const STEPS = ["1. Import products", "2. Upload images"];

// Mirrors the backend template (GET /product/bulk-template), one example row
const EXAMPLE_COLUMNS = [
    { key: "sku", value: "MUG001", note: "Required, unique. Images are matched by this" },
    { key: "name", value: "Custom 3D Mug", note: "Required" },
    { key: "slug", value: "custom-3d-mug", note: "URL name, lowercase-with-dashes" },
    { key: "category", value: "Home Decor", note: "Category name (must already exist)" },
    { key: "subcategory", value: "Mugs", note: "Subcategory name (must already exist)" },
    { key: "short_description", value: "A made to order mug", note: "" },
    { key: "long_description", value: "Printed after order confirmation...", note: "" },
    { key: "base_price", value: "499", note: "Number" },
    { key: "tax_rate", value: "18", note: "Percent" },
    { key: "lead_time", value: "5", note: "Days" },
    { key: "customisable", value: "TRUE", note: "TRUE / FALSE" },
    { key: "min_qty", value: "1", note: "Number" },
    { key: "seo_title", value: "Custom 3D Mug", note: "" },
    { key: "seo_description", value: "Buy a custom 3D mug...", note: "" },
    { key: "specs", value: '[{"label":"Material","value":"Ceramic"}]', note: "JSON array" },
    {
        key: "options",
        value: '[{"name":"Size","values":["11oz","15oz"]}]',
        note: "JSON array"
    },
    {
        key: "price_slabs",
        value: '[{"minQty":1,"maxQty":9,"unitPrice":499},{"minQty":10,"maxQty":49,"unitPrice":450}]',
        note: "JSON array"
    }
];

const saveBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

export const downloadTemplateFile = async () => {
    const blob = await downloadBulkTemplate();
    saveBlob(blob, "product-import-template.xlsx");
};

export default function BulkImportModal({ onClose, onImported }) {
    const [step, setStep] = useState(STEPS[0]);

    return (
        <Modal title="Bulk import products" onClose={onClose} maxWidth="max-w-4xl">
            <div className="mb-4 flex flex-wrap gap-2 border-b border-border pb-4">
                {STEPS.map((item) => (
                    <button
                        key={item}
                        onClick={() => setStep(item)}
                        className={`rounded-lg px-3.5 py-2.5 text-xs font-semibold transition ${
                            step === item
                                ? "bg-primary text-white"
                                : "bg-bg text-text-muted hover:text-text"
                        }`}
                    >
                        {item}
                    </button>
                ))}
            </div>

            {step === STEPS[0] && (
                <ProductsStep
                    onImported={onImported}
                    onNext={() => setStep(STEPS[1])}
                />
            )}
            {step === STEPS[1] && <MediaStep onImported={onImported} />}
        </Modal>
    );
}

function ProductsStep({ onImported, onNext }) {
    const [file, setFile] = useState(null);
    const [isBusy, setIsBusy] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState(null);

    const handleDownload = async () => {
        setError("");
        try {
            await downloadTemplateFile();
        } catch (err) {
            setError(err.message || "Failed to download template");
        }
    };

    const handleImport = async () => {
        if (!file) return;

        setIsBusy(true);
        setError("");
        setResult(null);

        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await bulkImportProducts(formData);
            setResult({ message: res?.message, ...(res?.data || {}) });
            onImported?.();
        } catch (err) {
            setError(err.message || "Import failed");
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-text-muted">
                    Fill one row per product in the template, then upload it here.
                    Images are not part of the Excel file. Add them in step 2.
                </p>
                <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-text hover:bg-bg"
                >
                    <Download size={15} />
                    Download template (.xlsx)
                </button>
            </div>

            <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">
                    Example row
                </p>
                <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-border bg-bg font-bold text-text-muted">
                                <th className="px-3 py-2">Column</th>
                                <th className="px-3 py-2">Example value</th>
                                <th className="px-3 py-2">Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {EXAMPLE_COLUMNS.map((col) => (
                                <tr key={col.key} className="border-b border-border last:border-0">
                                    <td className="whitespace-nowrap px-3 py-2 font-mono font-semibold text-text">
                                        {col.key}
                                    </td>
                                    <td className="break-all px-3 py-2 font-mono text-text">
                                        {col.value}
                                    </td>
                                    <td className="px-3 py-2 text-text-muted">{col.note}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border p-4">
                <FileSpreadsheet size={20} className="text-text-muted" />
                <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => {
                        setFile(e.target.files?.[0] || null);
                        setResult(null);
                    }}
                    className="flex-1 text-sm text-text"
                />
                <button
                    onClick={handleImport}
                    disabled={!file || isBusy}
                    className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-40"
                >
                    <Upload size={15} />
                    {isBusy ? "Importing..." : "Import products"}
                </button>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            {result && (
                <>
                    <ResultSummary result={result} />
                    <button
                        onClick={onNext}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                    >
                        Next: upload images
                    </button>
                </>
            )}
        </div>
    );
}

function MediaStep({ onImported }) {
    const [files, setFiles] = useState([]);
    const [isBusy, setIsBusy] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState(null);

    const handleUpload = async () => {
        if (!files.length) return;

        setIsBusy(true);
        setError("");
        setResult(null);

        try {
            const formData = new FormData();
            files.forEach((file) => formData.append("files", file));
            const res = await bulkUploadMedia(formData);
            setResult({ message: res?.message, ...(res?.data || {}) });
            onImported?.();
        } catch (err) {
            setError(err.message || "Upload failed");
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="rounded-xl bg-bg p-4 text-sm text-text">
                <p className="mb-2 font-semibold">How image upload works</p>
                <ol className="list-decimal space-y-1 pl-5 text-text-muted">
                    <li>Import the products first (step 1). Images only attach to products that already exist.</li>
                    <li>
                        Name each image file with the product <b className="text-text">SKU</b>.
                        Extra images for the same product get a suffix:
                    </li>
                </ol>
                <div className="mt-2 grid gap-1 pl-5 font-mono text-xs text-text">
                    <span>MUG001.jpg → MUG001 (first image becomes the primary image)</span>
                    <span>MUG001-2.jpg → MUG001</span>
                    <span>MUG001_3.png → MUG001</span>
                    <span>MUG001-video.mp4 → MUG001</span>
                </div>
                <ol start={3} className="mt-2 list-decimal space-y-1 pl-5 text-text-muted">
                    <li>Select all images together (up to 200 at a time) and click Upload.</li>
                    <li>You can still add or reorder images per product from Edit → Media.</li>
                </ol>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border p-4">
                <ImageUp size={20} className="text-text-muted" />
                <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={(e) => {
                        setFiles(Array.from(e.target.files || []).slice(0, 200));
                        setResult(null);
                    }}
                    className="flex-1 text-sm text-text"
                />
                <button
                    onClick={handleUpload}
                    disabled={!files.length || isBusy}
                    className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-40"
                >
                    <Upload size={15} />
                    {isBusy ? "Uploading..." : `Upload ${files.length || ""} file(s)`}
                </button>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            {result && <ResultSummary result={result} />}
        </div>
    );
}

function ResultSummary({ result }) {
    const errors = Array.isArray(result.errors) ? result.errors : [];

    return (
        <div className="rounded-xl border border-border p-4 text-sm">
            {result.message && <p className="mb-2 font-semibold text-text">{result.message}</p>}
            <div className="flex flex-wrap gap-4 text-text-muted">
                {result.total !== undefined && <span>Total: {result.total}</span>}
                {result.success !== undefined && (
                    <span className="text-green-600">Success: {result.success}</span>
                )}
                {result.failed !== undefined && (
                    <span className="text-red-500">Failed: {result.failed}</span>
                )}
            </div>

            {errors.length > 0 && (
                <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-xs text-red-500">
                    {errors.map((item, index) => (
                        <li key={index}>
                            {[
                                item.row !== undefined && `Row ${item.row}`,
                                item.file,
                                item.sku
                            ]
                                .filter(Boolean)
                                .join(" · ")}
                            {": "}
                            {item.message}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
