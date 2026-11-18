import axios from "axios";

import { useAuthStore } from "@/store/useAuthStore";

const axiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: {
        "Content-Type": "application/json"
    }
});

axiosInstance.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

// Heuristics for messages that look like internals leaking through
// (DB auth strings, driver exceptions, network stack traces, etc.).
// If any of these match, we swap the message for a friendly one so
// users don't see things like "bad auth : authentication failed".
const TECHNICAL_PATTERNS = [
    /bad auth/i,
    /authentication failed/i,
    /\bmongo/i,
    /mongoose/i,
    /ECONNREFUSED/,
    /ENOTFOUND/,
    /ETIMEDOUT/,
    /EAI_AGAIN/,
    /ECONNRESET/,
    /\batlas\b/i,
    /\bcluster\b/i,
    /ObjectId/,
    /ValidationError:/,
    /CastError:/,
    /SyntaxError:/,
    /TypeError:/,
    /\bE11000\b/,
    /\bnetwork error\b/i,
];

const friendlyFallback = (status, raw) => {
    if (status === 401 || status === 403) {
        return "Your session has expired. Please sign in again.";
    }
    if (status === 404) return "We couldn't find what you were looking for.";
    if (status === 429) return "Too many requests. Please wait a moment and try again.";
    if (status >= 500 || !status) {
        return "Our server is having trouble right now. Please try again in a moment.";
    }
    return "Something went wrong. Please try again.";
};

const sanitizeMessage = (status, raw) => {
    if (!raw || typeof raw !== "string") return friendlyFallback(status, raw);
    if (TECHNICAL_PATTERNS.some((re) => re.test(raw))) {
        return friendlyFallback(status, raw);
    }
    return raw;
};

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;

        if (status === 401) {
            useAuthStore.getState().logout();

            if (typeof window !== "undefined") {
                // plain utility module, outside the React tree — a full
                // reload is intentional here to reset all in-memory state
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                window.location.href = "/";
            }
        }

        const rawMessage =
            error?.response?.data?.message ||
            error?.message ||
            "Something went wrong";

        return Promise.reject(new Error(sanitizeMessage(status, rawMessage)));
    }
);

export default axiosInstance;
