import axiosInstance from "@/utils/axiosInstance";

export const getSubCategories = async (params = {}) => {
    const { data } = await axiosInstance.get("/subCategory", { params });

    return data;
};

export const createSubCategory = async (formData) => {
    const { data } = await axiosInstance.post("/subCategory", formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });

    return data;
};

export const updateSubCategory = async (id, formData) => {
    const { data } = await axiosInstance.put(`/subCategory/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });

    return data;
};

export const deleteSubCategory = async (id) => {
    const { data } = await axiosInstance.delete(`/subCategory/${id}`);

    return data;
};
