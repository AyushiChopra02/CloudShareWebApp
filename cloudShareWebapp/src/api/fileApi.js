import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const api = axios.create({
  baseURL: API_BASE,
});


export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};


export const uploadFile = async (file, isPublic = false) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("isPublic", isPublic);
  const res = await api.post("/files/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const getUserFiles = async () => {
  const res = await api.get("/files");
  return res.data;
};

export const deleteFile = async (fileId) => {
  const res = await api.delete(`/files/${fileId}`);
  return res.data;
};

export const toggleFileVisibility = async (fileId) => {
  const res = await api.patch(`/files/${fileId}/toggle-visibility`);
  return res.data;
};

export const downloadFile = async (fileId) => {
  const res = await api.get(`/files/${fileId}/download`, {
    responseType: "blob",
  });
  return res;
};

export const getPublicFile = async (fileId) => {
  const res = await api.get(`/files/public/${fileId}`);
  return res.data;
};

export const downloadPublicFile = async (fileId) => {
  const res = await api.get(`/files/public/${fileId}/download`, {
    responseType: "blob",
  });
  return res;
};

export const getDashboardStats = async () => {
  const res = await api.get("/dashboard/stats");
  return res.data;
};

export const getSubscription = async () => {
  const res = await api.get("/subscription");
  return res.data;
};

export const purchaseSubscription = async (planId) => {
  const res = await api.post("/subscription/purchase", { planId });
  return res.data;
};


export const getTransactions = async () => {
  const res = await api.get("/transactions");
  return res.data;
};

export default api;
