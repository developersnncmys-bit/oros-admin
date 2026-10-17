"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Search } from "lucide-react";

import { getUsers, createUser, updateUser } from "@/api/user.api";
import Modal from "@/components/ui/Modal";
import FormField, { inputClass } from "@/components/ui/FormField";
import { extractList } from "@/utils/extractList";
import { confirmDialog, alertDialog } from "@/store/useDialogStore";

const EMPTY_FORM = {
    name: "",
    phone: "",
    email: "",
    role: "staff",
    isBlocked: false
};

export default function TeamPage() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [submittedSearch, setSubmittedSearch] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);
    const reload = () => setRefreshKey((key) => key + 1);

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
                    role: "team",
                    ...(submittedSearch ? { phone: submittedSearch } : {})
                });
                if (!cancelled) {
                    setUsers(extractList(res?.data, ["users", "user"]));
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Failed to load team members");
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

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setFormError("");
        setIsModalOpen(true);
    };

    const openEdit = (user) => {
        setEditing(user);
        setForm({
            name: user.name || "",
            phone: user.phone || "",
            email: user.email || "",
            role: user.role || "staff",
            isBlocked: user.isBlocked || false
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
            if (editing) {
                await updateUser(editing._id, {
                    name: form.name,
                    phone: form.phone,
                    email: form.email,
                    isBlocked: form.isBlocked
                });
            } else {
                await createUser({
                    name: form.name,
                    phone: form.phone,
                    email: form.email,
                    role: "staff"
                });
            }

            setIsModalOpen(false);
            reload();
        } catch (err) {
            setFormError(err.message || "Failed to save team member");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleBlock = async (user) => {
        const action = user.isBlocked ? "Unblock" : "Block";
        const confirmed = await confirmDialog({
            title: `${action} team member?`,
            description: user.isBlocked
                ? `"${user.name || user.phone}" will be able to log in again.`
                : `"${user.name || user.phone}" will not be able to log in.`,
            confirmLabel: action,
            tone: user.isBlocked ? "primary" : "danger"
        });
        if (!confirmed) return;

        try {
            await updateUser(user._id, { isBlocked: !user.isBlocked });
            reload();
        } catch (err) {
            alertDialog(err.message || "Failed to update team member");
        }
    };

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
                    New staff
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

            {!isLoading && !error && users.length === 0 && (
                <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center text-text-muted">
                    No team members found
                </div>
            )}

            {!isLoading && !error && users.length > 0 && (
                <>
                    {/* Mobile: one card per team member */}
                    <div className="space-y-3 md:hidden">
                        {users.map((user) => (
                            <div
                                key={user._id}
                                className="rounded-2xl border border-border bg-card p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-text">
                                            {user.name}
                                        </p>
                                        <p className="text-xs text-text-muted">{user.phone}</p>
                                        <p className="truncate text-xs text-text-muted">
                                            {user.email}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => openEdit(user)}
                                        className="shrink-0 rounded-lg border border-border p-2 text-text-muted hover:text-text"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                </div>

                                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                                    <p className="text-xs text-text-muted">
                                        <span className="capitalize text-text">{user.role}</span>
                                    </p>
                                    <button
                                        onClick={() => toggleBlock(user)}
                                        className={`rounded-lg px-3 py-2 text-xs font-bold ${
                                            user.isBlocked
                                                ? "bg-emerald-50 text-emerald-600"
                                                : "bg-red-50 text-red-500"
                                        }`}
                                    >
                                        {user.isBlocked ? "Unblock" : "Block"}
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
                                        <th className="px-5 py-3">Phone</th>
                                        <th className="px-5 py-3">Email</th>
                                        <th className="px-5 py-3">Role</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr
                                            key={user._id}
                                            className="border-b border-border last:border-0"
                                        >
                                            <td className="px-5 py-3 font-semibold text-text">
                                                {user.name}
                                            </td>
                                            <td className="px-5 py-3 text-text-muted">
                                                {user.phone}
                                            </td>
                                            <td className="px-5 py-3 text-text-muted">
                                                {user.email}
                                            </td>
                                            <td className="px-5 py-3 capitalize text-text">
                                                {user.role}
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => toggleBlock(user)}
                                                        className={`rounded-lg px-3 py-2.5 text-xs font-bold ${
                                                            user.isBlocked
                                                                ? "bg-emerald-50 text-emerald-600"
                                                                : "bg-red-50 text-red-500"
                                                        }`}
                                                    >
                                                        {user.isBlocked ? "Unblock" : "Block"}
                                                    </button>
                                                    <button
                                                        onClick={() => openEdit(user)}
                                                        className="rounded-lg border border-border p-2 text-text-muted hover:text-text"
                                                    >
                                                        <Pencil size={14} />
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
                    title={editing ? "Edit team member" : "New staff"}
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

                        {/* Team tab can only add staff; existing roles are shown, not changed */}
                        <FormField label="Role">
                            <input
                                className={`${inputClass} capitalize`}
                                value={form.role}
                                disabled
                            />
                        </FormField>

                        {editing && (
                            <label className="flex items-center gap-2 text-sm font-medium text-text">
                                <input
                                    type="checkbox"
                                    checked={form.isBlocked}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            isBlocked: e.target.checked
                                        }))
                                    }
                                />
                                Blocked
                            </label>
                        )}

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
                            {isSaving ? "Saving..." : "Save changes"}
                        </button>
                    </form>
                </Modal>
            )}
        </div>
    );
}
