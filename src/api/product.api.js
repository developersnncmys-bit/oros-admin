import axiosInstance from "@/utils/axiosInstance";

export const getProducts = async (params = {}) => {
    const { data } = await axiosInstance.get("/product", { params });

    return data;
};

export const getProductById = async (id) => {
    const { data } = await axiosInstance.get(`/product/${id}`);

    return data;
};

export const createProduct = async (payload) => {
    const { data } = await axiosInstance.post("/product", payload);

    return data;
};

export const updateProduct = async (id, payload) => {
    const { data } = await axiosInstance.put(`/product/${id}`, payload);

    return data;
};

export const deleteProduct = async (id) => {
    const { data } = await axiosInstance.delete(`/product/${id}`);

    return data;
};

// specs
export const getProductSpecs = async (productId) => {
    const { data } = await axiosInstance.get(`/product/${productId}/specs`);
    return data;
};

export const createProductSpec = async (productId, payload) => {
    const { data } = await axiosInstance.post(`/product/${productId}/specs`, payload);
    return data;
};

export const updateProductSpec = async (productId, specId, payload) => {
    const { data } = await axiosInstance.put(`/product/${productId}/specs/${specId}`, payload);
    return data;
};

export const deleteProductSpec = async (productId, specId) => {
    const { data } = await axiosInstance.delete(`/product/${productId}/specs/${specId}`);
    return data;
};

// options
export const getProductOptions = async (productId) => {
    const { data } = await axiosInstance.get(`/product/${productId}/options`);
    return data;
};

export const createProductOption = async (productId, payload) => {
    const { data } = await axiosInstance.post(`/product/${productId}/options`, payload);
    return data;
};

export const updateProductOption = async (productId, optionId, payload) => {
    const { data } = await axiosInstance.put(`/product/${productId}/options/${optionId}`, payload);
    return data;
};

export const deleteProductOption = async (productId, optionId) => {
    const { data } = await axiosInstance.delete(`/product/${productId}/options/${optionId}`);
    return data;
};

// option values
export const getOptionValues = async (optionId) => {
    const { data } = await axiosInstance.get(`/product/options/${optionId}/values`);
    return data;
};

export const createOptionValue = async (optionId, payload) => {
    const { data } = await axiosInstance.post(`/product/options/${optionId}/values`, payload);
    return data;
};

export const updateOptionValue = async (optionId, valueId, payload) => {
    const { data } = await axiosInstance.put(`/product/options/${optionId}/values/${valueId}`, payload);
    return data;
};

export const deleteOptionValue = async (optionId, valueId) => {
    const { data } = await axiosInstance.delete(`/product/options/${optionId}/values/${valueId}`);
    return data;
};

// price slabs
export const getPriceSlabs = async (productId) => {
    const { data } = await axiosInstance.get(`/product/${productId}/price-slabs`);
    return data;
};

export const createPriceSlab = async (productId, payload) => {
    const { data } = await axiosInstance.post(`/product/${productId}/price-slabs`, payload);
    return data;
};

export const updatePriceSlab = async (productId, slabId, payload) => {
    const { data } = await axiosInstance.put(`/product/${productId}/price-slabs/${slabId}`, payload);
    return data;
};

export const deletePriceSlab = async (productId, slabId) => {
    const { data } = await axiosInstance.delete(`/product/${productId}/price-slabs/${slabId}`);
    return data;
};

// media
export const getProductMedia = async (productId) => {
    const { data } = await axiosInstance.get(`/product/${productId}/media`);
    return data;
};

export const createProductMedia = async (productId, formData) => {
    const { data } = await axiosInstance.post(`/product/${productId}/media`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
    return data;
};

export const updateProductMedia = async (productId, mediaId, payload) => {
    const { data } = await axiosInstance.put(`/product/${productId}/media/${mediaId}`, payload);
    return data;
};

export const deleteProductMedia = async (productId, mediaId) => {
    const { data } = await axiosInstance.delete(`/product/${productId}/media/${mediaId}`);
    return data;
};

// product shipping
export const getAllProductShipping = async (params = {}) => {
    const { data } = await axiosInstance.get("/product/shipping", { params });
    return data;
};

export const createProductShipping = async (productId, payload) => {
    const { data } = await axiosInstance.post("/product/shipping", payload, {
        params: { productId }
    });
    return data;
};

export const updateProductShipping = async (id, payload) => {
    const { data } = await axiosInstance.patch(`/product/shipping/${id}`, payload);
    return data;
};

export const deleteProductShipping = async (id) => {
    const { data } = await axiosInstance.delete(`/product/shipping/${id}`);
    return data;
};

// bulk
export const downloadBulkTemplate = async () => {
    const response = await axiosInstance.get("/product/bulk-template", {
        responseType: "blob"
    });
    return response.data;
};

export const bulkImportProducts = async (formData) => {
    const { data } = await axiosInstance.post("/product/bulk-import", formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
    return data;
};

export const bulkUploadMedia = async (formData) => {
    const { data } = await axiosInstance.post("/product/bulk-media", formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
    return data;
};
