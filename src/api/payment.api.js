import axiosInstance from "@/utils/axiosInstance";

// Payments in the admin panel are read off orders/admin (payment.status,
// payment.method, etc). This file is reserved for payment-specific admin
// endpoints if the backend adds a dedicated /payment/admin listing.
export const getAdminPayments = async (params = {}) => {
    const { data } = await axiosInstance.get("/orders/admin", { params });

    return data;
};
