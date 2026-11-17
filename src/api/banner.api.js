import axiosInstance from "@/utils/axiosInstance";

export const getBanners = async (params = {}) => {
    const { data } = await axiosInstance.get("/Banner", { params });

    return data;
};

// Banner create/update send JSON — the media URLs are already hosted on
// Cloudinary by the time these fire (see uploadFileToCloudinary).
export const createBanner = async (payload) => {
    const { data } = await axiosInstance.post("/Banner", payload);

    return data;
};

export const updateBanner = async (id, payload) => {
    const { data } = await axiosInstance.put(`/Banner/${id}`, payload);

    return data;
};

export const deleteBanner = async (id) => {
    const { data } = await axiosInstance.delete(`/Banner/${id}`);

    return data;
};

// Ask the backend for a signed Cloudinary upload envelope. The admin
// uploads directly to Cloudinary with these params, then sends the
// returned URL + publicId to our own API as plain JSON.
export const getBannerUploadSignature = async () => {
    const { data } = await axiosInstance.get("/Banner/upload-signature");

    return data?.data;
};

// Direct, signed upload from the browser to Cloudinary. Does NOT go
// through our axios instance / Vercel — that's the whole point.
export const uploadFileToCloudinary = async (file, sig) => {
    const url = `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`;

    const form = new FormData();
    form.append("file", file);
    form.append("api_key", sig.apiKey);
    form.append("timestamp", sig.timestamp);
    form.append("signature", sig.signature);
    form.append("folder", sig.folder);

    const res = await fetch(url, { method: "POST", body: form });
    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
        const message =
            payload?.error?.message ||
            `Cloudinary upload failed (HTTP ${res.status})`;
        throw new Error(message);
    }

    return {
        secureUrl: payload.secure_url,
        publicId: payload.public_id
    };
};
