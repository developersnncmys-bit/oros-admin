"use client";

import { useEffect, useState } from "react";
import { User as UserIcon } from "lucide-react";

import { getProfile, updateProfile } from "@/api/user.api";
import { useAuthStore } from "@/store/useAuthStore";
import FormField, { inputClass } from "@/components/ui/FormField";

export default function SettingsPage() {
    const authUser = useAuthStore((state) => state.user);
    const setAuth = useAuthStore((state) => state.setAuth);
    const token = useAuthStore((state) => state.token);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [form, setForm] = useState({ name: "", email: "" });
    const [profileImage, setProfileImage] = useState(null);
    const [preview, setPreview] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            setError("");

            try {
                const res = await getProfile();
                const user = res?.data?.user || res?.data;

                if (!cancelled && user) {
                    setForm({
                        name: user.name || "",
                        email: user.email || ""
                    });
                    setPreview(user.profileImage || "");
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Failed to load profile");
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
    }, []);

    const handleImageChange = (file) => {
        setProfileImage(file);
        setPreview(file ? URL.createObjectURL(file) : preview);
    };

    const handleSave = async (event) => {
        event.preventDefault();
        setFormError("");
        setSuccessMessage("");

        if (!form.name.trim()) {
            setFormError("Name is required");
            return;
        }

        setIsSaving(true);

        try {
            const formData = new FormData();
            formData.append("name", form.name);
            formData.append("email", form.email);

            if (profileImage) {
                formData.append("profileImage", profileImage);
            }

            const res = await updateProfile(formData);
            const updatedUser = res?.data?.user || res?.data;

            if (updatedUser) {
                setAuth({ user: { ...authUser, ...updatedUser }, token });
                setPreview(updatedUser.profileImage || preview);
            }

            setProfileImage(null);
            setSuccessMessage("Profile updated successfully");
        } catch (err) {
            setFormError(err.message || "Failed to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center text-text-muted">
                Loading...
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center text-red-500">
                {error}
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-xl">
            <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="mb-5 text-lg font-bold text-text">Edit profile</h2>

                <form onSubmit={handleSave} className="space-y-4">
                    <div className="flex items-center gap-4">
                        {preview ? (
                            <img
                                src={preview}
                                alt="Profile"
                                className="h-16 w-16 rounded-full border border-border object-cover"
                            />
                        ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-bg text-text-muted">
                                <UserIcon size={22} />
                            </div>
                        )}

                        <FormField label="Profile image">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
                                className="text-sm text-text"
                            />
                        </FormField>
                    </div>

                    <FormField label="Name">
                        <input
                            className={inputClass}
                            value={form.name}
                            onChange={(e) =>
                                setForm((prev) => ({ ...prev, name: e.target.value }))
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

                    {successMessage && (
                        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600">
                            {successMessage}
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
            </div>
        </div>
    );
}
