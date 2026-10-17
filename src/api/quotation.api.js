import axiosInstance from "@/utils/axiosInstance";

export const getQuotations = async (params = {}) => {
    const { data } = await axiosInstance.get("/quotation", { params });

    return data;
};

export const updateQuotationByAdmin = async (id, payload) => {
    const { data } = await axiosInstance.put(`/quotation/${id}/admin`, payload);

    return data;
};
