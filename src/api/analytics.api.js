import axiosInstance from "@/utils/axiosInstance";

export const getDashboardAnalytics = async (params = {}) => {
    const { data } = await axiosInstance.get("/analytics/dashboard", { params });

    return data;
};

export const getOverviewAnalytics = async (params = {}) => {
    const { data } = await axiosInstance.get("/analytics/overview", { params });

    return data;
};

export const getSalesTrend = async (params = {}) => {
    const { data } = await axiosInstance.get("/analytics/sales-trend", { params });

    return data;
};

export const getTopProducts = async (params = {}) => {
    const { data } = await axiosInstance.get("/analytics/top-products", { params });

    return data;
};

export const getTopCategories = async (params = {}) => {
    const { data } = await axiosInstance.get("/analytics/top-categories", { params });

    return data;
};

export const getTopCustomers = async (params = {}) => {
    const { data } = await axiosInstance.get("/analytics/top-customers", { params });

    return data;
};

export const getOrderBreakdown = async (params = {}) => {
    const { data } = await axiosInstance.get("/analytics/order-breakdown", { params });

    return data;
};

export const getQuotationAnalytics = async (params = {}) => {
    const { data } = await axiosInstance.get("/analytics/quotations", { params });

    return data;
};

export const getNonMovingProducts = async (params = {}) => {
    const { data } = await axiosInstance.get("/analytics/non-moving-products", { params });

    return data;
};

export const getProductTimeAnalytics = async (params = {}) => {
    const { data } = await axiosInstance.get("/analytics/product-time-analytics", { params });

    return data;
};
