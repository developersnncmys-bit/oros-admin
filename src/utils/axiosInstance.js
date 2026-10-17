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

        const message =
            error?.response?.data?.message ||
            error?.message ||
            "Something went wrong";

        return Promise.reject(new Error(message));
    }
);

export default axiosInstance;
