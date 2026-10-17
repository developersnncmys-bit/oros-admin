"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Search } from "lucide-react";

import OrdersView from "@/components/admin/OrdersView";
import { getUsers, createUser, updateUser } from "@/api/user.api";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import FormField, { inputClass } from "@/components/ui/FormField";
import { extractList } from "@/utils/extractList";
import { formatDate } from "@/utils/format";
import { confirmDialog, alertDialog } from "@/store/useDialogStore";

const EMPTY_FORM = {
    name: "",
    phone: "",
    email: ""
};

export default function CustomersPage() {
    const [customers, setCustomers] = useState([]);
    const [selected, setSelected] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [submittedSearch, setSubmittedSearch] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState("");

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            setError("");

            try {
                const res = await getUsers({
                    role: "user",
                    ...(submittedSearch ? { phone: submittedSearch } : {})
                });
                if (!cancelled) {
                    setCustomers(extractList(res?.data, ["users", "user"]));
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Failed to load customers");
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
    }, [submittedSearch, refreshKey]);

    const handleSearch = (event) => {
        event.preventDefault();
        setSubmittedSearch(search);
    };

    const openOrders = (customer) => {
        setSelected(customer);
    };

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setFormError("");
        setIsModalOpen(true);
    };

    const openEdit = (event, customer) => {
        // row/card click opens orders; keep the button from triggering it
        event.stopPropagation();

        setEditing(customer);
        setForm({
            name: customer.name || "",
            phone: customer.phone || "",
            email: customer.email || ""
        });
        setFormError("");
        setIsModalOpen(true);
    };

    const handleSave = async (event) => {
        event.preventDefault();
        setFormError("");

        if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
            setFormError("Name, phone and email are required");
            return;
        }

        setIsSaving(true);

        try {
            const payload = {
                name: form.name,
                phone: form.phone,
                email: form.email,
                ...(editing ? {} : { role: "user" })
            };

            if (editing) {
                await updateUser(editing._id, payload);
            } else {
                await createUser(payload);
            }

            setIsModalOpen(false);
            setRefreshKey((key) => key + 1);
        } catch (err) {
            setFormError(err.message || "Failed to save customer");
        } finally {
            setIsSaving(false);
        }
    };

    const editButton = (customer) => (
        <button
            onClick={(event) => openEdit(event, customer)}
            title="Edit customer"
            className="rounded-lg border border-border p-2 text-text-muted hover:text-text"
        >
            <Pencil size={14} />
        </button>
    );

    const toggleBlock = async (event, customer) => {
        // row/card click opens orders; keep the button from triggering it
        event.stopPropagation();

        const action = customer.isBlocked ? "Unblock" : "Block";
        const confirmed = await confirmDialog({
            title: `${action} customer?`,
            description: customer.isBlocked
                ? `"${customer.name || customer.phone}" will be able to log in and order again.`
                : `"${customer.name || customer.phone}" will not be able to log in or place orders.`,
            confirmLabel: action,
            tone: customer.isBlocked ? "primary" : "danger"
        });
        if (!confirmed) return;

        try {
            await updateUser(customer._id, { isBlocked: !customer.isBlocked });
            setRefreshKey((key) => key + 1);
        } catch (err) {
            alertDialog(err.message || "Failed to update customer");
        }
    };

    const blockButton = (customer, padding) => (
        <button
            onClick={(event) => toggleBlock(event, customer)}
            className={`rounded-lg px-3 ${padding} text-xs font-bold ${
                customer.isBlocked
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-red-50 text-red-500"
            }`}
        >
            {customer.isBlocked ? "Unblock" : "Block"}
        </button>
    );

    const statusBadge = (customer) => (
        <Badge tone={customer.isBlocked ? "danger" : "success"}>
            {customer.isBlocked ? "Blocked" : "Active"}
        </Badge>
    );

    if (selected) {
        return (
            <OrdersView
                userId={selected._id}
                customerName={selected.name}
                customer={selected}
                onBack={() => setSelected(null)}
            />
        );
    }

    return (
        <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <form onSubmit={handleSearch} className="flex items-center gap-2">
                    <div className="relative">
                        <Search
                            size={15}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                        />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by phone"
                            className="rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-text outline-none focus:border-primary"
                        />
                    </div>
                </form>

                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark"
                >
                    <Plus size={16} />
                    New customer
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

            {!isLoading && !error && customers.length === 0 && (
                <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center text-text-muted">
                    No customers found
                </div>
            )}

            {!isLoading && !error && customers.length > 0 && (
                <>
                    {/* Mobile: one card per customer */}
                    <div className="space-y-3 md:hidden">
                        {customers.map((customer) => (
                            <div
                                key={customer._id}
                                onClick={() => openOrders(customer)}
                                className="block w-full cursor-pointer rounded-2xl border border-border bg-card p-4 text-left"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-text">
                                            {customer.name}
                                        </p>
                                        <p className="text-xs text-text-muted">
                                            {customer.phone}
                                        </p>
                                        <p className="truncate text-xs text-text-muted">
                                            {customer.email}
                                        </p>
                                    </div>
                                    {statusBadge(customer)}
                                </div>

                                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                                    <span className="text-xs font-bold text-accent">
                                        View orders
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {blockButton(customer, "py-2")}
                                        {editButton(customer)}
                                    </div>
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
                                        <th className="px-5 py-3">Phone</th>
                                        <th className="px-5 py-3">Email</th>
                                        <th className="px-5 py-3">Type</th>
                                        <th className="px-5 py-3">Joined</th>
                                        <th className="px-5 py-3">Status</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customers.map((customer) => (
                                        <tr
                                            key={customer._id}
                                            onClick={() => openOrders(customer)}
                                            className="cursor-pointer border-b border-border last:border-0 hover:bg-bg"
                                        >
                                            <td className="px-5 py-3 font-semibold text-text">
                                                {customer.name}
                                            </td>
                                            <td className="px-5 py-3 text-text-muted">
                                                {customer.phone}
                                            </td>
                                            <td className="px-5 py-3 text-text-muted">
                                                {customer.email}
                                            </td>
                                            <td className="px-5 py-3 capitalize text-text-muted">
                                                {customer.accountType}
                                            </td>
                                            <td className="px-5 py-3 text-text-muted">
                                                {formatDate(customer.createdAt)}
                                            </td>
                                            <td className="px-5 py-3">
                                                {statusBadge(customer)}
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center justify-end gap-3">
                                                    <span className="text-xs font-bold text-accent hover:text-accent-dark">
                                                        View orders
                                                    </span>
                                                    {blockButton(customer, "py-2.5")}
                                                    {editButton(customer)}
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
                    title={editing ? "Edit customer" : "New customer"}
                    onClose={() => setIsModalOpen(false)}
                >
                    <form onSubmit={handleSave} className="space-y-4">
                        <FormField label="Name">
                            <input
                                className={inputClass}
                                value={form.name}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, name: e.target.value }))
                                }
                            />
                        </FormField>

                        <FormField label="Phone">
                            <input
                                className={inputClass}
                                value={form.phone}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, phone: e.target.value }))
                                }
                            />
                        </FormField>

                        <FormField label="Email">
                            <input
                                type="email"
                                className={inputClass}
                                value={form.email}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, email: e.target.value }))
                                }
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
                            {isSaving ? "Saving..." : editing ? "Save changes" : "Add customer"}
                        </button>
                    </form>
                </Modal>
            )}
        </div>
    );
}
