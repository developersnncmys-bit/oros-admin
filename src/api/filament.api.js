import axiosInstance from "@/utils/axiosInstance";

export const getFilaments = async () => {
    const { data } = await axiosInstance.get("/filaments");
    return data;
};

export const createFilament = async (payload) => {
    const { data } = await axiosInstance.post("/filaments", payload);
    return data;
};

export const updateFilament = async (id, payload) => {
    const { data } = await axiosInstance.put(`/filaments/${id}`, payload);
    return data;
};

export const deleteFilament = async (id) => {
    const { data } = await axiosInstance.delete(`/filaments/${id}`);
    return data;
};

export const addFilamentColor = async (filamentId, payload) => {
    const { data } = await axiosInstance.post(
        `/filaments/${filamentId}/colors`,
        payload
    );
    return data;
};

export const updateFilamentColor = async (colorId, payload) => {
    const { data } = await axiosInstance.put(
        `/filaments/colors/${colorId}`,
        payload
    );
    return data;
};

export const deleteFilamentColor = async (colorId) => {
    const { data } = await axiosInstance.delete(`/filaments/colors/${colorId}`);
    return data;
};
