import axiosInstance from "@/utils/axiosInstance";

export const getAdminOrders = async (params = {}) => {
    const { data } = await axiosInstance.get("/orders/admin", { params });

    return data;
};

export const updateOrderStatus = async (id, status) => {
    const { data } = await axiosInstance.patch(`/orders/${id}/status`, { status });

    return data;
};

export const createManualOrder = async (payload) => {
    const { data } = await axiosInstance.post("/orders/manual", payload);

    return data;
};
