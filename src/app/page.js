"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Box } from "lucide-react";

import { requestLoginOtp, verifyLoginOtp } from "@/api/auth.api";
import { useAuthStore, ADMIN_ROLES } from "@/store/useAuthStore";



const OTP_LENGTH = 6;

export default function LoginPage() {
    const router = useRouter();
    const { user, token, setAuth } = useAuthStore();

    const [step, setStep] = useState("PHONE");
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const otpBoxRefs = useRef([]);

    const handleOtpBoxChange = (index, rawValue) => {
        const digit = rawValue.replace(/\D/g, "").slice(-1);
        const next = otp.split("");
        next[index] = digit;
        const nextOtp = next.join("").slice(0, OTP_LENGTH);
        setOtp(nextOtp);

        if (digit && index < OTP_LENGTH - 1) {
            otpBoxRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpBoxKeyDown = (index, event) => {
        if (event.key === "Backspace" && !otp[index] && index > 0) {
            otpBoxRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (event) => {
        const pasted = event.clipboardData
            .getData("text")
            .replace(/\D/g, "")
            .slice(0, OTP_LENGTH);

        if (!pasted) {
            return;
        }

        event.preventDefault();
        setOtp(pasted);
        otpBoxRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
    };

    useEffect(() => {
        if (token && user && ADMIN_ROLES.includes(user.role)) {
            router.replace("/dashboard");
        }
    }, [token, user, router]);

    const handlePhoneSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (!/^\d{10}$/.test(phone)) {
            setError("Enter a valid 10-digit mobile number");
            return;
        }

        setIsLoading(true);

        try {
            await requestLoginOtp({ phone });
            setStep("OTP");
        } catch (err) {
            setError(err.message || "Failed to send OTP");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (otp.length !== OTP_LENGTH) {
            setError(`Enter the ${OTP_LENGTH}-digit code`);
            return;
        }

        setIsLoading(true);

        try {
            const res = await verifyLoginOtp({ phone, otp });
            const nextUser = res?.data?.user;
            const nextToken = res?.data?.token;

            if (!nextUser || !nextToken) {
                throw new Error("Unexpected response from server");
            }

            if (!ADMIN_ROLES.includes(nextUser.role)) {
                setError("This account doesn't have access to the admin console");
                setIsLoading(false);
                return;
            }

            setAuth({ user: nextUser, token: nextToken });
            router.replace("/dashboard");
        } catch (err) {
            setError(err.message || "Invalid or expired OTP");
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        setError("");
        setIsLoading(true);

        try {
            await requestLoginOtp({ phone });
        } catch (err) {
            setError(err.message || "Failed to resend OTP");
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangeNumber = () => {
        setStep("PHONE");
        setOtp("");
        setError("");
    };

    return (
        <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-2">
            {/* Left — brand panel */}
            <div className="relative hidden flex-col items-center justify-center overflow-hidden bg-primary px-14 text-white lg:flex">
                <div
                    className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl"
                    aria-hidden
                />
                <div
                    className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/10 blur-3xl"
                    aria-hidden
                />

                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="rounded-2xl bg-white p-5">
                        <img
                            src="/logo/Orosent-20.svg"
                            alt="OROS"
                            className="h-20 w-20 object-contain"
                        />
                    </div>

                    <h1 className="mt-8 max-w-lg text-5xl font-extrabold leading-tight tracking-tight">
                        One filament. <span className="text-accent">Every shape.</span>
                    </h1>

                    <p className="mt-4 max-w-sm text-base leading-6 text-white/70">
                        Made-to-order 3D prints, run from one console.
                    </p>
                </div>
            </div>

            {/* Right — login form */}
            <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg px-4 py-10 sm:px-6 sm:py-12">
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.4]"
                    style={{
                        backgroundImage:
                            "radial-gradient(var(--color-primary) 1px, transparent 1px)",
                        backgroundSize: "24px 24px",
                        maskImage:
                            "radial-gradient(ellipse at center, black, transparent 70%)",
                        WebkitMaskImage:
                            "radial-gradient(ellipse at center, black, transparent 70%)"
                    }}
                    aria-hidden
                />
                <div
                    className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
                    aria-hidden
                />
                <div
                    className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
                    aria-hidden
                />
                <div className="relative z-10 mb-8 flex justify-center lg:hidden">
                    <div className="rounded-xl border border-border bg-white p-3">
                        <img
                            src="/logo/Orosent-20.svg"
                            alt="OROS"
                            className="h-14 w-14 object-contain"
                        />
                    </div>
                </div>

                <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-white p-6 shadow-xl shadow-primary/5 transition hover:shadow-2xl hover:shadow-primary/10 sm:p-8">
                    {step === "PHONE" ? (
                        <>
                            <div className="mb-6 flex items-center gap-2.5">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Box size={18} />
                                </div>
                                <h2 className="text-xl font-bold text-text">
                                    Sign in
                                </h2>
                            </div>

                            <form
                                onSubmit={handlePhoneSubmit}
                                className="space-y-5"
                            >
                                <div>
                                    <label
                                        htmlFor="phone"
                                        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted"
                                    >
                                        Mobile number
                                    </label>
                                    <div className="flex items-center rounded-lg border border-border bg-white transition hover:border-primary/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                                        <span className="border-r border-border px-4 py-2.5 text-sm font-medium text-text-muted">
                                            +91
                                        </span>
                                        <input
                                            id="phone"
                                            type="tel"
                                            inputMode="numeric"
                                            autoComplete="tel"
                                            maxLength={10}
                                            value={phone}
                                            onChange={(e) =>
                                                setPhone(
                                                    e.target.value.replace(/\D/g, "")
                                                )
                                            }
                                            placeholder="98765 43210"
                                            className="w-full bg-transparent px-4 py-2.5 text-sm text-text outline-none"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                                        {error}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white shadow-md shadow-accent/30 transition hover:scale-[1.02] hover:bg-accent-dark hover:shadow-lg hover:shadow-accent/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
                                >
                                    {isLoading && (
                                        <Loader2 size={16} className="animate-spin" />
                                    )}
                                    {isLoading ? "Sending code..." : "Send OTP"}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={handleChangeNumber}
                                className="mb-4 flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-text"
                            >
                                <ArrowLeft size={14} />
                                Change number
                            </button>

                            <h2 className="text-2xl font-bold text-text">
                                Verify your number
                            </h2>
                            <p className="mt-1 text-sm text-text-muted">
                                Enter the {OTP_LENGTH}-digit code sent to{" "}
                                <span className="font-semibold text-text">
                                    +91 {phone}
                                </span>
                            </p>

                            <form
                                onSubmit={handleOtpSubmit}
                                className="mt-8 space-y-5"
                            >
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                                        OTP code
                                    </label>
                                    <div className="flex gap-1.5 sm:gap-2">
                                        {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                                            <input
                                                key={index}
                                                ref={(el) => {
                                                    otpBoxRefs.current[index] = el;
                                                }}
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete={index === 0 ? "one-time-code" : "off"}
                                                maxLength={1}
                                                value={otp[index] || ""}
                                                onChange={(e) =>
                                                    handleOtpBoxChange(index, e.target.value)
                                                }
                                                onKeyDown={(e) => handleOtpBoxKeyDown(index, e)}
                                                onPaste={handleOtpPaste}
                                                className="aspect-square min-w-0 max-w-12 flex-1 rounded-lg border border-border bg-white text-center text-base font-semibold text-text outline-none transition focus:scale-105 focus:border-primary focus:ring-2 focus:ring-primary/15 sm:text-lg"
                                            />
                                        ))}
                                    </div>
                                </div>

                                {error && (
                                    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                                        {error}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white shadow-md shadow-accent/30 transition hover:scale-[1.02] hover:bg-accent-dark hover:shadow-lg hover:shadow-accent/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
                                >
                                    {isLoading && (
                                        <Loader2 size={16} className="animate-spin" />
                                    )}
                                    {isLoading ? "Verifying..." : "Verify & sign in"}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleResend}
                                    disabled={isLoading}
                                    className="w-full text-center text-xs font-semibold text-primary hover:text-accent disabled:opacity-60"
                                >
                                    Resend code
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
