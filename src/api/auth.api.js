import axiosInstance from "@/utils/axiosInstance";

// admin-panel-only: checks role server-side and refuses to send an
// OTP at all unless the phone belongs to an admin/staff account
export const requestLoginOtp = async ({ phone }) => {
    const { data } = await axiosInstance.post("/auth/admin/login-otp", {
        phone
    });

    return data;
};

export const verifyLoginOtp = async ({ phone, otp }) => {
    const { data } = await axiosInstance.post("/auth/login/otp-verify", {
        phone,
        otp
    });

    return data;
};

export const adminLogin = async ({ email, password }) => {
    const { data } = await axiosInstance.post("/auth/admin/login", {
        email,
        password
    });

    return data;
};

export const getMe = async () => {
    const { data } = await axiosInstance.get("/auth/me");

    return data;
};
