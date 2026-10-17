"use client";

import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";


import {
    getProductTimeAnalytics,
    getDashboardAnalytics,
    getTopProducts,
    getTopCategories,
    getTopCustomers,
    getSalesTrend,
    getOverviewAnalytics
} from "@/api/analytics.api";
import StatCard from "@/components/admin/StatCard";
import BreakdownTable from "@/components/admin/BreakdownTable";
import Pager from "@/components/admin/Pager";
import { formatDuration, formatCurrency, formatDate } from "@/utils/format";

const PAGE_SIZE = 8;

const toISODate = (date) => date.toISOString().slice(0, 10);

export default function DashboardPage() {
    const [from, setFrom] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 29);
        return toISODate(d);
    });
    const [to, setTo] = useState(() => toISODate(new Date()));
    const [groupBy, setGroupBy] = useState("Day");

    const [page, setPage] = useState(1);
    const [rows, setRows] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const [dashboard, setDashboard] = useState(null);
    const [isDashboardLoading, setIsDashboardLoading] = useState(true);
    const [dashboardError, setDashboardError] = useState("");

    const [productsPage, setProductsPage] = useState(1);
    const [products, setProducts] = useState([]);
    const [isProductsLoading, setIsProductsLoading] = useState(true);

    const [categoriesPage, setCategoriesPage] = useState(1);
    const [categories, setCategories] = useState([]);
    const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);

    const [customersPage, setCustomersPage] = useState(1);
    const [customers, setCustomers] = useState([]);
    const [isCustomersLoading, setIsCustomersLoading] = useState(true);

    const [catalogue, setCatalogue] = useState(null);
    const [isCatalogueLoading, setIsCatalogueLoading] = useState(true);

    const [trend, setTrend] = useState(null);
    const [isTrendLoading, setIsTrendLoading] = useState(true);
    const [trendPage, setTrendPage] = useState(1);

    const [prevRange, setPrevRange] = useState({ from, to, groupBy });
    if (
        prevRange.from !== from ||
        prevRange.to !== to ||
        prevRange.groupBy !== groupBy
    ) {
        setPrevRange({ from, to, groupBy });
        setProductsPage(1);
        setCategoriesPage(1);
        setCustomersPage(1);
        setTrendPage(1);
    }


    

    // product engagement table — its own pagination, unaffected by date filters
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            setError("");

            try {
                const res = await getProductTimeAnalytics({
                    page,
                    limit: PAGE_SIZE
                });

                if (!cancelled) {
                    setRows(res?.data?.analytics || []);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Failed to load analytics");
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
    }, [page]);

    // overview + order breakdown + quotations — driven by the date range / group-by filters
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsDashboardLoading(true);
            setDashboardError("");

            try {
                const res = await getDashboardAnalytics({
                    from,
                    to,
                    groupBy: groupBy.toLowerCase()
                });

                if (!cancelled) {
                    setDashboard(res?.data || null);
                }
            } catch (err) {
                if (!cancelled) {
                    setDashboardError(err.message || "Failed to load dashboard");
                }
            } finally {
                if (!cancelled) {
                    setIsDashboardLoading(false);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [from, to, groupBy]);

    // top products — paginated, driven by date range
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsProductsLoading(true);

            try {
                const res = await getTopProducts({
                    from,
                    to,
                    page: productsPage,
                    limit: PAGE_SIZE
                });

                if (!cancelled) {
                    setProducts(res?.data?.products || []);
                }
            } finally {
                if (!cancelled) {
                    setIsProductsLoading(false);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [from, to, productsPage]);

    // top categories — paginated, driven by date range
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsCategoriesLoading(true);

            try {
                const res = await getTopCategories({
                    from,
                    to,
                    page: categoriesPage,
                    limit: PAGE_SIZE
                });

                if (!cancelled) {
                    setCategories(res?.data?.categories || []);
                }
            } finally {
                if (!cancelled) {
                    setIsCategoriesLoading(false);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [from, to, categoriesPage]);

    // top customers — paginated, driven by date range
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsCustomersLoading(true);

            try {
                const res = await getTopCustomers({
                    from,
                    to,
                    page: customersPage,
                    limit: PAGE_SIZE
                });

                if (!cancelled) {
                    setCustomers(res?.data?.customers || []);
                }
            } finally {
                if (!cancelled) {
                    setIsCustomersLoading(false);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [from, to, customersPage]);

    // catalogue & customers — driven by date range
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsCatalogueLoading(true);

            try {
                const res = await getOverviewAnalytics({ from, to });

                if (!cancelled) {
                    setCatalogue(res?.data || null);
                }
            } finally {
                if (!cancelled) {
                    setIsCatalogueLoading(false);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [from, to]);

    // sales & revenue trend — driven by the date range / group-by filters
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsTrendLoading(true);

            try {
                const res = await getSalesTrend({
                    from,
                    to,
                    groupBy: groupBy.toLowerCase()
                });

                if (!cancelled) {
                    setTrend(res?.data || null);
                }
            } finally {
                if (!cancelled) {
                    setIsTrendLoading(false);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [from, to, groupBy]);

    const totalDuration = rows.reduce((sum, row) => sum + (row.totalDuration || 0), 0);
    const totalViews = rows.reduce((sum, row) => sum + (row.totalviews || 0), 0);
    const avgTimePerView = totalViews > 0 ? totalDuration / totalViews : 0;

    const breakdown = dashboard?.orderBreakdown;
    const quotations = dashboard?.quotations;
    const overview = dashboard?.overview;

    const trendSeries = trend?.series || [];
    const trendPageRows = trendSeries.slice(
        (trendPage - 1) * PAGE_SIZE,
        trendPage * PAGE_SIZE
    );

    return (
        <div className="space-y-8">
            {/* Product engagement */}
            <div>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-text-muted">
                    Product engagement · Time on page
                </h2>

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                        label="Time on top products"
                        value={formatDuration(totalDuration)}
                    />
                    <StatCard
                        label="Views on top products"
                        value={totalViews}
                    />
                    <StatCard
                        label="Avg time / view"
                        value={formatDuration(avgTimePerView)}
                    />
                    <StatCard
                        label="Rank shown"
                        value={
                            rows.length
                                ? `${(page - 1) * PAGE_SIZE + 1}–${(page - 1) * PAGE_SIZE + rows.length}`
                                : "—"
                        }
                    />
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card">
                {isLoading && (
                    <p className="px-5 py-10 text-center text-sm text-text-muted">
                        Loading...
                    </p>
                )}

                {!isLoading && error && (
                    <p className="px-5 py-10 text-center text-sm text-red-500">{error}</p>
                )}

                {!isLoading && !error && rows.length === 0 && (
                    <p className="px-5 py-10 text-center text-sm text-text-muted">
                        No product views recorded yet
                    </p>
                )}

                {!isLoading && !error && rows.length > 0 && (
                    <>
                        {/* Mobile: one card per product */}
                        <div className="space-y-3 p-3 md:hidden">
                            {rows.map((row, index) => (
                                <div
                                    key={row.productId}
                                    className="rounded-xl border border-border p-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="shrink-0 text-xs text-text-muted">
                                            {(page - 1) * PAGE_SIZE + index + 1}
                                        </span>
                                        {row.productImage ? (
                                            <img
                                                src={row.productImage}
                                                alt={row.productName}
                                                className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-bg text-text-muted">
                                                <ImageOff size={16} />
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-text">
                                                {row.productName}
                                            </p>
                                            <p className="text-xs text-text-muted">{row.sku}</p>
                                        </div>
                                    </div>

                                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-sm">
                                        <div>
                                            <p className="text-xs font-bold uppercase text-text-muted">
                                                Total time
                                            </p>
                                            <p className="font-semibold text-text">
                                                {formatDuration(row.totalDuration)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase text-text-muted">
                                                Views · Avg
                                            </p>
                                            <p className="text-text">
                                                {row.totalviews} ·{" "}
                                                {formatDuration(row.averageDuration)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Tablet / desktop: table */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-border text-xs font-bold uppercase tracking-wide text-text-muted">
                                        <th className="px-5 py-3">#</th>
                                        <th className="px-5 py-3">Product</th>
                                        <th className="px-5 py-3">SKU</th>
                                        <th className="px-5 py-3">Total time</th>
                                        <th className="px-5 py-3">Views</th>
                                        <th className="px-5 py-3">Avg / view</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, index) => (
                                        <tr
                                            key={row.productId}
                                            className="border-b border-border last:border-0"
                                        >
                                            <td className="px-5 py-3 text-text-muted">
                                                {(page - 1) * PAGE_SIZE + index + 1}
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    {row.productImage ? (
                                                        <img
                                                            src={row.productImage}
                                                            alt={row.productName}
                                                            className="h-10 w-10 rounded-lg border border-border object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-bg text-text-muted">
                                                            <ImageOff size={16} />
                                                        </div>
                                                    )}
                                                    <span className="font-semibold text-text">
                                                        {row.productName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-text-muted">
                                                {row.sku}
                                            </td>
                                            <td className="px-5 py-3 font-semibold text-text">
                                                {formatDuration(row.totalDuration)}
                                            </td>
                                            <td className="px-5 py-3 text-text">
                                                {row.totalviews}
                                            </td>
                                            <td className="px-5 py-3 text-text">
                                                {formatDuration(row.averageDuration)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {!isLoading && !error && (rows.length === PAGE_SIZE || page > 1) && (
                    <Pager
                        page={page}
                        hasNext={rows.length === PAGE_SIZE}
                        onPrev={() => setPage((p) => Math.max(1, p - 1))}
                        onNext={() => setPage((p) => p + 1)}
                    />
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-6">
                <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-muted">
                        From
                    </label>
                    <input
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-text outline-none focus:border-primary"
                    />
                </div>

                <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-muted">
                        To
                    </label>
                    <input
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-text outline-none focus:border-primary"
                    />
                </div>

                <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-muted">
                        Group by
                    </label>
                    <select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value)}
                        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-text outline-none focus:border-primary"
                    >
                        <option>Day</option>
                        <option>Week</option>
                        <option>Month</option>
                        <option>Year</option>
                    </select>
                </div>
            </div>

            {/* Sales & revenue */}
            <div>
                <h2 className="mb-4 text-lg font-extrabold text-text">
                    Sales &amp; revenue
                </h2>

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                        label="Revenue"
                        value={
                            isDashboardLoading
                                ? "—"
                                : formatCurrency(overview?.revenue?.total)
                        }
                        delta={overview?.revenue?.growthPercent}
                    />
                    <StatCard
                        label="Orders"
                        value={isDashboardLoading ? "—" : overview?.orders?.total ?? 0}
                        delta={overview?.orders?.growthPercent}
                    />
                    <StatCard
                        label="Avg order value"
                        value={
                            isDashboardLoading
                                ? "—"
                                : formatCurrency(overview?.averageOrderValue?.value)
                        }
                        delta={overview?.averageOrderValue?.growthPercent}
                    />
                    <StatCard
                        label="Units sold"
                        value={isDashboardLoading ? "—" : overview?.unitsSold ?? 0}
                    />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                        label="Subtotal"
                        value={isTrendLoading ? "—" : formatCurrency(trend?.subtotal)}
                    />
                    <StatCard
                        label="Tax"
                        value={isTrendLoading ? "—" : formatCurrency(trend?.tax)}
                    />
                    <StatCard
                        label="Shipping"
                        value={isTrendLoading ? "—" : formatCurrency(trend?.shipping)}
                    />
                    <StatCard
                        label="Prev revenue"
                        value={
                            isTrendLoading ? "—" : formatCurrency(trend?.previousRevenue)
                        }
                    />
                </div>

                {!isTrendLoading && trend?.bestDay && (
                    <p className="mt-4 text-sm text-text-muted">
                        Best day: <span className="font-semibold text-text">{formatDate(trend.bestDay.date)}</span>
                        {" — "}
                        {formatCurrency(trend.bestDay.revenue)} from {trend.bestDay.orders}{" "}
                        orders
                    </p>
                )}

                <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
                    {isTrendLoading && (
                        <p className="px-5 py-10 text-center text-sm text-text-muted">
                            Loading...
                        </p>
                    )}

                    {!isTrendLoading && trendSeries.length === 0 && (
                        <p className="px-5 py-10 text-center text-sm text-text-muted">
                            No sales in this range
                        </p>
                    )}

                    {!isTrendLoading && trendSeries.length > 0 && (
                        <>
                            {/* Mobile: one card per date */}
                            <div className="space-y-2 p-3 sm:hidden">
                                {trendPageRows.map((point) => (
                                    <div
                                        key={point.date}
                                        className="flex items-center justify-between rounded-xl border border-border p-3 text-sm"
                                    >
                                        <p className="text-text">{formatDate(point.date)}</p>
                                        <div className="text-right">
                                            <p className="font-semibold text-text">
                                                {formatCurrency(point.revenue)}
                                            </p>
                                            <p className="text-xs text-text-muted">
                                                {point.orders} orders
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Tablet / desktop: table */}
                            <div className="hidden overflow-x-auto sm:block">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border text-xs font-bold uppercase tracking-wide text-text-muted">
                                            <th className="px-5 py-3">Date</th>
                                            <th className="px-5 py-3">Revenue</th>
                                            <th className="px-5 py-3">Orders</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {trendPageRows.map((point) => (
                                            <tr
                                                key={point.date}
                                                className="border-b border-border last:border-0"
                                            >
                                                <td className="px-5 py-3 text-text">
                                                    {formatDate(point.date)}
                                                </td>
                                                <td className="px-5 py-3 font-semibold text-text">
                                                    {formatCurrency(point.revenue)}
                                                </td>
                                                <td className="px-5 py-3 text-text-muted">
                                                    {point.orders}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {!isTrendLoading && trendSeries.length > PAGE_SIZE && (
                        <Pager
                            page={trendPage}
                            hasNext={trendPage * PAGE_SIZE < trendSeries.length}
                            onPrev={() => setTrendPage((p) => Math.max(1, p - 1))}
                            onNext={() => setTrendPage((p) => p + 1)}
                        />
                    )}
                </div>
            </div>

            {/* Order breakdown */}
            <div>
                <h2 className="mb-4 text-lg font-extrabold text-text">
                    Order breakdown
                </h2>

                {dashboardError ? (
                    <p className="rounded-2xl border border-border bg-card px-5 py-8 text-center text-sm text-red-500">
                        {dashboardError}
                    </p>
                ) : (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <BreakdownTable
                            title="By status"
                            rows={breakdown?.byStatus}
                            isLoading={isDashboardLoading}
                        />
                        <BreakdownTable
                            title="By source"
                            rows={breakdown?.bySource}
                            isLoading={isDashboardLoading}
                        />
                        <BreakdownTable
                            title="By payment status"
                            rows={breakdown?.byPaymentStatus}
                            isLoading={isDashboardLoading}
                        />
                        <BreakdownTable
                            title="By payment method"
                            rows={breakdown?.byPaymentMethod}
                            isLoading={isDashboardLoading}
                        />
                    </div>
                )}
            </div>

            {/* Quotations */}
            <div>
                <h2 className="mb-4 text-lg font-extrabold text-text">
                    Quotations
                </h2>

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                        label="Total quotations"
                        value={
                            isDashboardLoading
                                ? "—"
                                : quotations?.total?.quotations ?? 0
                        }
                    />
                    <StatCard
                        label="Quoted value"
                        value={
                            isDashboardLoading
                                ? "—"
                                : formatCurrency(quotations?.total?.quotedValue)
                        }
                    />
                    <StatCard
                        label="Converted"
                        value={
                            isDashboardLoading
                                ? "—"
                                : quotations?.total?.converted ?? 0
                        }
                    />
                    <StatCard
                        label="Conversion rate"
                        value={
                            isDashboardLoading
                                ? "—"
                                : `${quotations?.total?.conversionRatePercent ?? 0}%`
                        }
                    />
                </div>

                <div className="mt-6">
                    <BreakdownTable
                        title="By status"
                        rows={quotations?.byStatus}
                        isLoading={isDashboardLoading}
                    />
                </div>
            </div>

            {/* Top products */}
            <div>
                <h2 className="mb-4 text-lg font-extrabold text-text">Top products</h2>

                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    {isProductsLoading && (
                        <p className="px-5 py-10 text-center text-sm text-text-muted">
                            Loading...
                        </p>
                    )}

                    {!isProductsLoading && products.length === 0 && (
                        <p className="px-5 py-10 text-center text-sm text-text-muted">
                            No sales in this range
                        </p>
                    )}

                    {!isProductsLoading && products.length > 0 && (
                        <>
                            {/* Mobile: one card per product */}
                            <div className="space-y-3 p-3 md:hidden">
                                {products.map((product) => (
                                    <div
                                        key={product.productId}
                                        className="flex items-center gap-3 rounded-xl border border-border p-3"
                                    >
                                        {product.image ? (
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-bg text-text-muted">
                                                <ImageOff size={16} />
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-semibold text-text">
                                                {product.name}
                                            </p>
                                            <p className="text-xs text-text-muted">
                                                {product.unitsSold} sold · {product.orders ?? 0}{" "}
                                                orders
                                            </p>
                                        </div>
                                        <p className="shrink-0 font-semibold text-text">
                                            {formatCurrency(product.revenue)}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Tablet / desktop: table */}
                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border text-xs font-bold uppercase tracking-wide text-text-muted">
                                            <th className="px-5 py-3">Name</th>
                                            <th className="px-5 py-3">Value</th>
                                            <th className="px-5 py-3">Detail</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map((product) => (
                                            <tr
                                                key={product.productId}
                                                className="border-b border-border last:border-0"
                                            >
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-3">
                                                        {product.image ? (
                                                            <img
                                                                src={product.image}
                                                                alt={product.name}
                                                                className="h-10 w-10 rounded-lg border border-border object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-bg text-text-muted">
                                                                <ImageOff size={16} />
                                                            </div>
                                                        )}
                                                        <span className="font-semibold text-text">
                                                            {product.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 font-semibold text-text">
                                                    {formatCurrency(product.revenue)}
                                                </td>
                                                <td className="px-5 py-3 text-text-muted">
                                                    {product.unitsSold} sold ·{" "}
                                                    {product.orders ?? 0} orders
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {!isProductsLoading && (products.length === PAGE_SIZE || productsPage > 1) && (
                        <Pager
                            page={productsPage}
                            hasNext={products.length === PAGE_SIZE}
                            onPrev={() => setProductsPage((p) => Math.max(1, p - 1))}
                            onNext={() => setProductsPage((p) => p + 1)}
                        />
                    )}
                </div>
            </div>

            {/* Top categories */}
            <div>
                <h2 className="mb-4 text-lg font-extrabold text-text">Top categories</h2>

                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    {isCategoriesLoading && (
                        <p className="px-5 py-10 text-center text-sm text-text-muted">
                            Loading...
                        </p>
                    )}

                    {!isCategoriesLoading && categories.length === 0 && (
                        <p className="px-5 py-10 text-center text-sm text-text-muted">
                            No sales in this range
                        </p>
                    )}

                    {!isCategoriesLoading && categories.length > 0 && (
                        <>
                            {/* Mobile: one card per category */}
                            <div className="space-y-3 p-3 sm:hidden">
                                {categories.map((category) => (
                                    <div
                                        key={category.categoryId || category.name}
                                        className="flex items-center justify-between rounded-xl border border-border p-3"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-text">
                                                {category.name}
                                            </p>
                                            <p className="text-xs text-text-muted">
                                                {Number(category.sharePercent ?? 0).toFixed(2)}%
                                                share · {category.unitsSold} units
                                            </p>
                                        </div>
                                        <p className="shrink-0 font-semibold text-text">
                                            {formatCurrency(category.revenue)}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Tablet / desktop: table */}
                            <div className="hidden overflow-x-auto sm:block">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border text-xs font-bold uppercase tracking-wide text-text-muted">
                                            <th className="px-5 py-3">Name</th>
                                            <th className="px-5 py-3">Value</th>
                                            <th className="px-5 py-3">Detail</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {categories.map((category) => (
                                            <tr
                                                key={category.categoryId || category.name}
                                                className="border-b border-border last:border-0"
                                            >
                                                <td className="px-5 py-3 font-semibold text-text">
                                                    {category.name}
                                                </td>
                                                <td className="px-5 py-3 font-semibold text-text">
                                                    {formatCurrency(category.revenue)}
                                                </td>
                                                <td className="px-5 py-3 text-text-muted">
                                                    {Number(category.sharePercent ?? 0).toFixed(2)}
                                                    % share · {category.unitsSold} units
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {!isCategoriesLoading &&
                        (categories.length === PAGE_SIZE || categoriesPage > 1) && (
                            <Pager
                                page={categoriesPage}
                                hasNext={categories.length === PAGE_SIZE}
                                onPrev={() => setCategoriesPage((p) => Math.max(1, p - 1))}
                                onNext={() => setCategoriesPage((p) => p + 1)}
                            />
                        )}
                </div>
            </div>

            {/* Top customers */}
            <div>
                <h2 className="mb-4 text-lg font-extrabold text-text">Top customers</h2>

                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    {isCustomersLoading && (
                        <p className="px-5 py-10 text-center text-sm text-text-muted">
                            Loading...
                        </p>
                    )}

                    {!isCustomersLoading && customers.length === 0 && (
                        <p className="px-5 py-10 text-center text-sm text-text-muted">
                            No orders in this range
                        </p>
                    )}

                    {!isCustomersLoading && customers.length > 0 && (
                        <>
                            {/* Mobile: one card per customer */}
                            <div className="space-y-3 p-3 sm:hidden">
                                {customers.map((customer) => (
                                    <div
                                        key={customer.customerId || customer.phone}
                                        className="flex items-center justify-between rounded-xl border border-border p-3"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-text">
                                                {customer.name}
                                            </p>
                                            <p className="text-xs text-text-muted">
                                                {customer.phone ? `${customer.phone} · ` : ""}
                                                {customer.orders} orders
                                            </p>
                                        </div>
                                        <p className="shrink-0 font-semibold text-text">
                                            {formatCurrency(customer.revenue)}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Tablet / desktop: table */}
                            <div className="hidden overflow-x-auto sm:block">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border text-xs font-bold uppercase tracking-wide text-text-muted">
                                            <th className="px-5 py-3">Name</th>
                                            <th className="px-5 py-3">Value</th>
                                            <th className="px-5 py-3">Detail</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {customers.map((customer) => (
                                            <tr
                                                key={customer.customerId || customer.phone}
                                                className="border-b border-border last:border-0"
                                            >
                                                <td className="px-5 py-3">
                                                    <span className="font-semibold text-text">
                                                        {customer.name}
                                                    </span>
                                                    {customer.phone && (
                                                        <span className="ml-2 text-text-muted">
                                                            · {customer.phone}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3 font-semibold text-text">
                                                    {formatCurrency(customer.revenue)}
                                                </td>
                                                <td className="px-5 py-3 text-text-muted">
                                                    {customer.orders} orders
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {!isCustomersLoading &&
                        (customers.length === PAGE_SIZE || customersPage > 1) && (
                            <Pager
                                page={customersPage}
                                hasNext={customers.length === PAGE_SIZE}
                                onPrev={() => setCustomersPage((p) => Math.max(1, p - 1))}
                                onNext={() => setCustomersPage((p) => p + 1)}
                            />
                        )}
                </div>
            </div>

            {/* Catalogue & customers */}
            <div>
                <h2 className="mb-4 text-lg font-extrabold text-text">
                    Catalogue &amp; customers
                </h2>

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                        label="Published products"
                        value={
                            isCatalogueLoading ? "—" : catalogue?.publishedProducts ?? 0
                        }
                    />
                    <StatCard
                        label="Open quotations"
                        value={isCatalogueLoading ? "—" : catalogue?.openQuotations ?? 0}
                    />
                    <StatCard
                        label="New customers"
                        value={isCatalogueLoading ? "—" : catalogue?.newCustomers ?? 0}
                    />
                    <StatCard
                        label="Total customers"
                        value={isCatalogueLoading ? "—" : catalogue?.totalCustomers ?? 0}
                    />
                </div>
            </div>
        </div>
    );
}
