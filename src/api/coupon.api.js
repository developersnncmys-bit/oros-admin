import axiosInstance from "@/utils/axiosInstance";

export const getCoupons = async (params = {}) => {
    const { data } = await axiosInstance.get("/coupons", { params });

    return data;
};

export const getCouponById = async (id) => {
    const { data } = await axiosInstance.get(`/coupons/${id}`);

    return data;
};

export const createCoupon = async (payload) => {
    const { data } = await axiosInstance.post("/coupons", payload);

    return data;
};

export const updateCoupon = async (id, payload) => {
    const { data } = await axiosInstance.put(`/coupons/${id}`, payload);

    return data;
};

export const deleteCoupon = async (id) => {
    const { data } = await axiosInstance.delete(`/coupons/${id}`);

    return data;
};
