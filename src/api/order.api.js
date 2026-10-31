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

// Re-runs the post-payment Shiprocket fulfilment on an order whose
// previous attempt failed (order.shipping.error is set).
export const retryShipmentFulfilment = async (id) => {
    const { data } = await axiosInstance.post(
        `/orders/${id}/shipment/retry`
    );

    return data;
};

// Asks Shiprocket to schedule the courier pickup. Only valid once an
// AWB has already been assigned (order.shipping.shipmentId exists).
export const schedulePickup = async (id) => {
    const { data } = await axiosInstance.post(
        `/orders/${id}/shipment/pickup`
    );

    return data;
};
