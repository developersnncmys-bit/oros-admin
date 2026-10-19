import axiosInstance from "@/utils/axiosInstance";

export const getColorFamilies = async () => {
    const { data } = await axiosInstance.get("/color-families");
    return data;
};

export const createColorFamily = async (payload) => {
    const { data } = await axiosInstance.post("/color-families", payload);
    return data;
};

export const updateColorFamily = async (id, payload) => {
    const { data } = await axiosInstance.put(`/color-families/${id}`, payload);
    return data;
};

export const deleteColorFamily = async (id) => {
    const { data } = await axiosInstance.delete(`/color-families/${id}`);
    return data;
};
