import axiosInstance from "@/utils/axiosInstance";

export const getCategories = async (params = {}) => {
    const { data } = await axiosInstance.get("/category", { params });

    return data;
};

export const createCategory = async (formData) => {
    const { data } = await axiosInstance.post("/category", formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });

    return data;
};

export const updateCategory = async (id, formData) => {
    const { data } = await axiosInstance.put(`/category/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });

    return data;
};

export const deleteCategory = async (id) => {
    const { data } = await axiosInstance.delete(`/category/${id}`);

    return data;
};
