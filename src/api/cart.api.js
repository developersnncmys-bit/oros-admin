import axiosInstance from "@/utils/axiosInstance";

// abandoned carts screen reads every customer's cart
export const getAllCarts = async (params = {}) => {
    const { data } = await axiosInstance.get("/cart/admin", { params });

    return data;
};
