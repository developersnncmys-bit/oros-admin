import axiosInstance from "@/utils/axiosInstance";

export const getUsers = async (params = {}) => {
    const { data } = await axiosInstance.get("/user", { params });

    return data;
};

export const createUser = async (payload) => {
    const { data } = await axiosInstance.post("/user/create", payload);

    return data;
};

export const updateUser = async (id, payload) => {
    const { data } = await axiosInstance.put(`/user/update/${id}`, payload);

    return data;
};

export const deleteUser = async (id) => {
    const { data } = await axiosInstance.delete(`/user/${id}`);

    return data;
};

export const getProfile = async () => {
    const { data } = await axiosInstance.get("/user/profile");

    return data;
};

export const updateProfile = async (payload) => {
    const { data } = await axiosInstance.patch("/user/profile", payload, {
        headers: { "Content-Type": "multipart/form-data" }
    });

    return data;
};
