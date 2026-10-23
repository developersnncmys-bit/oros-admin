"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Pencil, Trash2, Eye, ChevronLeft, ChevronRight, Search, X, ImageOff } from "lucide-react";

import { getProducts, getProductById, deleteProduct } from "@/api/product.api";
import { getCategories } from "@/api/category.api";
import { getSubCategories } from "@/api/subCategory.api";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import DetailsTab from "@/components/admin/product-tabs/DetailsTab";
import MediaTab from "@/components/admin/product-tabs/MediaTab";
import SpecsTab from "@/components/admin/product-tabs/SpecsTab";
import OptionsTab from "@/components/admin/product-tabs/OptionsTab";
import PriceSlabsTab from "@/components/admin/product-tabs/PriceSlabsTab";
import ShippingTab from "@/components/admin/product-tabs/ShippingTab";
import FilamentsTab from "@/components/admin/product-tabs/FilamentsTab";
import { extractList } from "@/utils/extractList";
import { formatCurrency } from "@/utils/format";
import BulkImportModal, { downloadTemplateFile } from "@/components/admin/BulkImportModal";
import { confirmDialog, alertDialog } from "@/store/useDialogStore";

const TABS = ["Details", "Media", "Specs", "Options & values", "Filaments", "Price slabs", "Shipping"];
const PAGE_SIZE = 8;

const STATUS_TONE = {
    PUBLISHED: "success",
    DRAFT: "neutral",
    ARCHIVED: "danger"
};

export default function ProductsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [viewingProductId, setViewingProductId] = useState(null);
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [page, setPage] = useState(1);
    // From the API's pagination block; 0 until the first page loads
    const [totalPages, setTotalPages] = useState(0);

    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [category, setCategory] = useState("");
    const [subcategory, setSubcategory] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");

    const [refreshKey, setRefreshKey] = useState(0);
    const reload = () => setRefreshKey((key) => key + 1);

    useEffect(() => {
        let cancelled = false;

        const loadFilters = async () => {
            try {
                const [catRes, subRes] = await Promise.all([
                    getCategories({ limit: 1000 }),
                    getSubCategories({ limit: 1000 })
                ]);

                if (!cancelled) {
                    setCategories(extractList(catRes?.data, ["categories", "category"]));
                    setSubCategories(
                        extractList(subRes?.data, ["subCategories", "subCategory"])
                    );
                }
            } catch {
                // filters stay empty; the product list still works
            }
        };

        loadFilters();

        return () => {
            cancelled = true;
        };
    }, []);

    // Debounce typing so we don't hit the API on every keystroke
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput.trim());
            setPage(1);
        }, 350);

        return () => clearTimeout(timer);
    }, [searchInput]);

    const visibleSubCategories = category
        ? subCategories.filter((sub) => {
              const parent =
                  typeof sub.category === "object" ? sub.category?._id : sub.category;
              return parent === category;
          })
        : subCategories;

    const handleCategoryChange = (value) => {
        setCategory(value);
        setSubcategory("");
        setPage(1);
    };

    const handleSubcategoryChange = (value) => {
        setSubcategory(value);
        setPage(1);
    };

    const hasFilters = Boolean(category || subcategory || searchInput);

    const clearFilters = () => {
        setCategory("");
        setSubcategory("");
        setSearchInput("");
        setSearch("");
        setPage(1);
    };

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            setError("");

            try {
                const params = { page, limit: PAGE_SIZE };
                if (search) params.search = search;
                if (category) params.category = category;
                if (subcategory) params.subcategory = subcategory;

                const res = await getProducts(params);
                if (!cancelled) {
                    setProducts(extractList(res?.data, ["products", "product"]));
                    const pagination = res?.data?.pagination;
                    setTotalPages(pagination?.totalPages || 0);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Failed to load products");
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
    }, [page, search, category, subcategory, refreshKey]);

    useEffect(() => {
        const openFromLink = async () => {
            const id = searchParams.get("id");
            if (!id) {
                return;
            }

            try {
                const res = await getProductById(id);
                const product = res?.data?.product || res?.data;
                if (product) {
                    setEditingProduct(product);
                    setIsModalOpen(true);
                }
            } finally {
                router.replace("/dashboard/products");
            }
        };

        openFromLink();
    }, [searchParams, router]);

    const openCreate = () => {
        setEditingProduct(null);
        setIsModalOpen(true);
    };

    const openEdit = (product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const openView = (product) => {
        setViewingProductId(product._id);
    };

    // Fired by the view modal's "Edit this product" button — swap preview for editor
    const promoteViewToEdit = (product) => {
        setViewingProductId(null);
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleDelete = async (product) => {
        if (!(await confirmDialog({ title: "Delete product?", description: `"${product.name}" will be removed permanently.` }))) return;

        try {
            await deleteProduct(product._id);
            reload();
        } catch (err) {
            alertDialog(err.message || "Failed to delete product");
        }
    };

    const categoryName = (product) =>
        typeof product.category === "object" ? product.category?.name : "—";

    return (
        <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() =>
                            downloadTemplateFile().catch((err) =>
                                alertDialog(err.message || "Failed to download template")
                            )
                        }
                        className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-text hover:bg-bg"
                    >
                        Sample .xlsx
                    </button>
                    <button
                        onClick={() => setIsBulkOpen(true)}
                        className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-text hover:bg-bg"
                    >
                        Bulk import
                    </button>
                </div>

                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark"
                >
                    <Plus size={16} />
                    New product
                </button>
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-3">
                <div className="relative min-w-[200px] flex-1">
                    <Search
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                    />
                    <input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search by name or SKU"
                        className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-text outline-none focus:border-primary"
                    />
                </div>

                <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    aria-label="Filter by category"
                    className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-text outline-none focus:border-primary"
                >
                    <option value="">All categories</option>
                    {categories.map((item) => (
                        <option key={item._id} value={item._id}>
                            {item.name}
                        </option>
                    ))}
                </select>

                <select
                    value={subcategory}
                    onChange={(e) => handleSubcategoryChange(e.target.value)}
                    aria-label="Filter by subcategory"
                    className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-text outline-none focus:border-primary"
                >
                    <option value="">All subcategories</option>
                    {visibleSubCategories.map((item) => (
                        <option key={item._id} value={item._id}>
                            {item.name}
                        </option>
                    ))}
                </select>

                {hasFilters && (
                    <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text-muted hover:text-text"
                    >
                        <X size={14} />
                        Clear
                    </button>
                )}
            </div>

            {isLoading && products.length === 0 && (
                <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center text-text-muted">
                    Loading...
                </div>
            )}

            {!isLoading && error && (
                <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center text-red-500">
                    {error}
                </div>
            )}

            {!isLoading && !error && products.length === 0 && (
                <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center text-text-muted">
                    {hasFilters ? "No products match these filters" : "No products yet"}
                </div>
            )}

            {!error && products.length > 0 && (
                // The previous page stays visible, dimmed, until the next one arrives
                <div
                    aria-busy={isLoading}
                    className={`transition-opacity duration-200 ${
                        isLoading ? "pointer-events-none opacity-50" : "opacity-100"
                    }`}
                >
                    {/* Mobile: one card per product */}
                    <div className="space-y-3 md:hidden">
                        {products.map((product) => (
                            <div
                                key={product._id}
                                className="rounded-2xl border border-border bg-card p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-text">
                                            {product.name}
                                        </p>
                                        <p className="text-xs text-text-muted">{product.sku}</p>
                                    </div>
                                    <Badge tone={STATUS_TONE[product.status] || "neutral"}>
                                        {product.status}
                                    </Badge>
                                </div>

                                <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
                                    <div>
                                        <p className="text-xs font-bold uppercase text-text-muted">
                                            Price
                                        </p>
                                        <p className="font-semibold text-text">
                                            {formatCurrency(product.basePrice)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold uppercase text-text-muted">
                                            Category
                                        </p>
                                        <p className="text-text-muted">{categoryName(product)}</p>
                                    </div>
                                </div>

                                <div className="mt-3 flex justify-end gap-2 border-t border-border pt-3">
                                    <button
                                        onClick={() => openView(product)}
                                        title="View"
                                        className="rounded-lg border border-border p-2 text-text-muted hover:text-text"
                                    >
                                        <Eye size={14} />
                                    </button>
                                    <button
                                        onClick={() => openEdit(product)}
                                        title="Edit"
                                        className="rounded-lg border border-border p-2 text-text-muted hover:text-text"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(product)}
                                        title="Delete"
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
                                        <th className="px-5 py-3">SKU</th>
                                        <th className="px-5 py-3">Price</th>
                                        <th className="px-5 py-3">Category</th>
                                        <th className="px-5 py-3">Status</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((product) => (
                                        <tr
                                            key={product._id}
                                            className="border-b border-border last:border-0"
                                        >
                                            <td className="px-5 py-3 font-semibold text-text">
                                                {product.name}
                                            </td>
                                            <td className="px-5 py-3 text-text-muted">
                                                {product.sku}
                                            </td>
                                            <td className="px-5 py-3 text-text">
                                                {formatCurrency(product.basePrice)}
                                            </td>
                                            <td className="px-5 py-3 text-text-muted">
                                                {categoryName(product)}
                                            </td>
                                            <td className="px-5 py-3">
                                                <Badge tone={STATUS_TONE[product.status] || "neutral"}>
                                                    {product.status}
                                                </Badge>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => openView(product)}
                                                        title="View"
                                                        className="rounded-lg border border-border p-2 text-text-muted hover:text-text"
                                                    >
                                                        <Eye size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => openEdit(product)}
                                                        title="Edit"
                                                        className="rounded-lg border border-border p-2 text-text-muted hover:text-text"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(product)}
                                                        title="Delete"
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

            {!error && !(isLoading && products.length === 0) && (
                <div className="mt-3 flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-3">
                    <p className="text-xs text-text-muted">
                        Page {page} of {Math.max(totalPages, 1)}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1 || isLoading}
                            className="flex items-center gap-1 rounded-lg border border-border px-3 py-2.5 text-xs font-semibold text-text disabled:opacity-40"
                        >
                            <ChevronLeft size={14} />
                            Prev
                        </button>
                        <button
                            onClick={() => setPage((p) => p + 1)}
                            disabled={
                                isLoading ||
                                (totalPages
                                    ? page >= totalPages
                                    : products.length < PAGE_SIZE)
                            }
                            className="flex items-center gap-1 rounded-lg border border-border px-3 py-2.5 text-xs font-semibold text-text disabled:opacity-40"
                        >
                            Next
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}

            {isBulkOpen && (
                <BulkImportModal
                    onClose={() => setIsBulkOpen(false)}
                    onImported={reload}
                />
            )}

            {isModalOpen && (
                <ProductModal
                    product={editingProduct}
                    onClose={() => {
                        setIsModalOpen(false);
                        reload();
                    }}
                />
            )}

            {viewingProductId && (
                <ProductViewModal
                    productId={viewingProductId}
                    onClose={() => setViewingProductId(null)}
                    onEdit={promoteViewToEdit}
                />
            )}
        </div>
    );
}

function ProductModal({ product: initialProduct, onClose }) {
    const [product, setProduct] = useState(initialProduct);
    const [tab, setTab] = useState("Details");

    return (
        <Modal
            title={product ? "Edit product" : "New product"}
            onClose={onClose}
            maxWidth="max-w-3xl"
        >
            <div className="mb-4 flex flex-wrap gap-2 border-b border-border pb-4">
                {TABS.map((item) => {
                    const disabled = item !== "Details" && !product;

                    return (
                        <button
                            key={item}
                            disabled={disabled}
                            onClick={() => setTab(item)}
                            className={`rounded-lg px-3.5 py-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                tab === item
                                    ? "bg-primary text-white"
                                    : "bg-bg text-text-muted hover:text-text"
                            }`}
                        >
                            {item}
                        </button>
                    );
                })}
            </div>

            {tab === "Details" && (
                <DetailsTab
                    product={product}
                    onSaved={(saved) => {
                        setProduct(saved);
                        // Advance to Media regardless of create vs edit —
                        // the toast confirms the save and the admin keeps
                        // moving through the tabs in order.
                        setTab("Media");
                    }}
                />
            )}

            {tab === "Media" && product && <MediaTab productId={product._id} />}
            {tab === "Specs" && product && <SpecsTab productId={product._id} />}
            {tab === "Options & values" && product && (
                <OptionsTab productId={product._id} />
            )}
            {tab === "Filaments" && product && (
                <FilamentsTab productId={product._id} onClose={onClose} />
            )}
            {tab === "Price slabs" && product && (
                <PriceSlabsTab productId={product._id} />
            )}
            {tab === "Shipping" && product && <ShippingTab productId={product._id} />}

            <div className="mt-5 border-t border-border pt-4">
                <button
                    onClick={onClose}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-bg"
                >
                    Done
                </button>
            </div>
        </Modal>
    );
}

function ProductViewModal({ productId, onClose, onEdit }) {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const res = await getProductById(productId);
                if (!cancelled) setData(res?.data || null);
            } catch (err) {
                if (!cancelled) setError(err.message || "Failed to load product");
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [productId]);

    const product = data?.product;
    const images = (data?.media || [])
        .filter((m) => m.type !== "VIDEO" && m.url)
        .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));

    // Stock across every colour of every linked filament; the storefront's
    // "in stock" count is the same roll-up.
    const totalStock = (data?.filaments || []).reduce(
        (sum, f) => sum + (f.colors || []).reduce((s, c) => s + (c.stock || 0), 0),
        0
    );

    const sizeOptions = (data?.options || []).filter((o) =>
        /size|dimension/i.test(o.name || "")
    );
    const formatDims = (v) => {
        const parts = [v.length, v.width, v.height].filter(
            (n) => n != null && n !== ""
        );
        return parts.length ? `${parts.join(" × ")} ${v.unit || "cm"}` : "";
    };


    return (
        <Modal
            title={product?.name || "Product"}
            onClose={onClose}
            maxWidth="max-w-3xl"
        >
            {isLoading && (
                <p className="py-10 text-center text-sm text-text-muted">Loading...</p>
            )}

            {!isLoading && error && (
                <p className="py-10 text-center text-sm text-red-500">{error}</p>
            )}

            {!isLoading && !error && product && (
                <div className="space-y-5">
                    <p className="-mt-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                        {product.sku}
                    </p>

                    {images.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                            {images.map((m) => (
                                <div
                                    key={m._id || m.url}
                                    className="aspect-square overflow-hidden rounded-lg border border-border bg-bg"
                                >
                                    <img
                                        src={m.url}
                                        alt={product.name}
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-border text-text-muted">
                            <ImageOff size={24} />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <ViewStat label="Status">
                            <Badge tone={STATUS_TONE[product.status] || "neutral"}>
                                {product.status}
                            </Badge>
                        </ViewStat>
                        <ViewStat label="Selling price">
                            <p className="text-lg font-bold text-text">
                                {formatCurrency(product.basePrice)}
                            </p>
                        </ViewStat>
                        <ViewStat label="Stock">
                            <p
                                className={`text-lg font-bold ${
                                    totalStock > 0 ? "text-text" : "text-red-500"
                                }`}
                            >
                                {totalStock} in stock
                            </p>
                        </ViewStat>
                        <ViewStat label="Lead time">
                            <p className="text-lg font-bold text-text">
                                {product.leadTimeDays ?? "—"}
                                <span className="ml-1 text-xs font-normal text-text-muted">
                                    days
                                </span>
                            </p>
                        </ViewStat>
                    </div>

                    {product.shortDescription && (
                        <div>
                            <p className="mb-1 text-xs font-bold uppercase text-text-muted">
                                Short description
                            </p>
                            <p className="text-sm text-text">{product.shortDescription}</p>
                        </div>
                    )}

                    {product.longDescription && (
                        <div>
                            <p className="mb-1 text-xs font-bold uppercase text-text-muted">
                                Description
                            </p>
                            <p className="whitespace-pre-wrap text-sm text-text">
                                {product.longDescription}
                            </p>
                        </div>
                    )}

                    {sizeOptions.map((opt) => (
                        <div key={opt._id}>
                            <p className="mb-1.5 text-xs font-bold uppercase text-text-muted">
                                {opt.name}
                            </p>
                            <div className="divide-y divide-border rounded-xl border border-border">
                                {(opt.values || []).map((v) => {
                                    const dims = formatDims(v);
                                    return (
                                        <div
                                            key={v._id}
                                            className="flex items-center justify-between px-3 py-2 text-sm"
                                        >
                                            <span className="font-semibold text-text">
                                                {v.value}
                                            </span>
                                            <span className="text-text-muted">
                                                {dims || "— no dimensions —"}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-border pt-4">
                <button
                    onClick={onClose}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-bg"
                >
                    Close
                </button>
                {product && (
                    <button
                        onClick={() => onEdit(product)}
                        className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent-dark"
                    >
                        <Pencil size={14} />
                        Edit this product
                    </button>
                )}
            </div>
        </Modal>
    );
}

function ViewStat({ label, children }) {
    return (
        <div className="rounded-xl border border-border bg-bg px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                {label}
            </p>
            <div className="mt-1">{children}</div>
        </div>
    );
}
