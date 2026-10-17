import axiosInstance from "@/utils/axiosInstance";

export const getBanners = async (params = {}) => {
    const { data } = await axiosInstance.get("/Banner", { params });

    return data;
};

export const createBanner = async (formData) => {
    const { data } = await axiosInstance.post("/Banner", formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });

    return data;
};

export const updateBanner = async (id, formData) => {
    const { data } = await axiosInstance.put(`/Banner/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });

    return data;
};

export const deleteBanner = async (id) => {
    const { data } = await axiosInstance.delete(`/Banner/${id}`);

    return data;
};
