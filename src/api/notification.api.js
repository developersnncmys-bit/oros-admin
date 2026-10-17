import axiosInstance from "@/utils/axiosInstance";

export const getNotifications = async (params = {}) => {
    const { data } = await axiosInstance.get("/notifications", { params });

    return data;
};

export const markNotificationRead = async (id) => {
    const { data } = await axiosInstance.patch(`/notifications/${id}`, {
        isRead: true
    });

    return data;
};

export const deleteNotification = async (id) => {
    const { data } = await axiosInstance.delete(`/notifications/${id}`);

    return data;
};

export const clearNotifications = async (params = {}) => {
    const { data } = await axiosInstance.delete("/notifications/clear", {
        params
    });

    return data;
};
