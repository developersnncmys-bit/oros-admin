"use client";

import { useState } from "react";

import { formatCurrency } from "@/utils/format";
import Pager from "@/components/admin/Pager";

const PAGE_SIZE = 8;

export default function BreakdownTable({ title, rows = [], isLoading }) {
    const [page, setPage] = useState(1);
    const [prevRows, setPrevRows] = useState(rows);

    if (rows !== prevRows) {
        setPrevRows(rows);
        setPage(1);
    }

    const totalRevenue = rows.reduce((sum, row) => sum + (row.revenue || 0), 0);
    const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // Some rows come back without a key (e.g. orders with no payment method)
    const rowLabel = (row) => row.key ?? row._id ?? row.status ?? "—";
    const rowKey = (row, index) => `${rowLabel(row)}-${index}`;

    return (
        <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">
                {title}
            </h3>

            <div className="overflow-hidden rounded-2xl border border-border bg-card">
                {isLoading && (
                    <p className="px-5 py-8 text-center text-sm text-text-muted">
                        Loading...
                    </p>
                )}

                {!isLoading && rows.length === 0 && (
                    <p className="px-5 py-8 text-center text-sm text-text-muted">
                        No data in this range
                    </p>
                )}

                {!isLoading && rows.length > 0 && (
                    <>
                        {/* Mobile: one card per row */}
                        <div className="space-y-2 p-3 sm:hidden">
                            {pageRows.map((row, index) => {
                                const sharePercent =
                                    row.sharePercent ??
                                    (totalRevenue > 0
                                        ? ((row.revenue || 0) / totalRevenue) * 100
                                        : 0);

                                return (
                                    <div
                                        key={rowKey(row, index)}
                                        className="rounded-xl border border-border p-3 text-sm"
                                    >
                                        <div className="flex items-center justify-between">
                                            <p className="font-bold uppercase text-text">
                                                {rowLabel(row)}
                                            </p>
                                            <p className="font-semibold text-text">
                                                {formatCurrency(row.revenue)}
                                            </p>
                                        </div>
                                        <p className="mt-1 text-xs text-text-muted">
                                            {row.orders} orders · {sharePercent.toFixed(2)}% share
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Tablet / desktop: table */}
                        <div className="hidden overflow-x-auto sm:block">
                            <table className="w-full min-w-105 text-left text-sm">
                                <thead>
                                    <tr className="border-b border-border text-xs font-bold uppercase tracking-wide text-text-muted">
                                        <th className="px-5 py-3"></th>
                                        <th className="px-5 py-3">Orders</th>
                                        <th className="px-5 py-3">Revenue</th>
                                        <th className="px-5 py-3">Share</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.map((row, index) => {
                                        const sharePercent =
                                            row.sharePercent ??
                                            (totalRevenue > 0
                                                ? ((row.revenue || 0) / totalRevenue) * 100
                                                : 0);

                                        return (
                                            <tr
                                                key={rowKey(row, index)}
                                                className="border-b border-border last:border-0"
                                            >
                                                <td className="px-5 py-3 font-bold uppercase text-text">
                                                    {rowLabel(row)}
                                                </td>
                                                <td className="px-5 py-3 text-text">
                                                    {row.orders}
                                                </td>
                                                <td className="px-5 py-3 font-semibold text-text">
                                                    {formatCurrency(row.revenue)}
                                                </td>
                                                <td className="px-5 py-3 text-text-muted">
                                                    {sharePercent.toFixed(2)}%
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {!isLoading && rows.length > PAGE_SIZE && (
                    <Pager
                        page={page}
                        hasNext={page * PAGE_SIZE < rows.length}
                        onPrev={() => setPage((p) => Math.max(1, p - 1))}
                        onNext={() => setPage((p) => p + 1)}
                    />
                )}
            </div>
        </div>
    );
}
