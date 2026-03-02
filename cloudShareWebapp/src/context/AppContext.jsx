import { createContext, useState, useCallback, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-toastify";

const AppContext = createContext();

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

// Helper: check if an error should be silenced (auth, network, or transient)
const isSilentError = (err) => {
  const msg = (err?.message || "").toLowerCase();
  return (
    msg.includes("token") ||
    msg.includes("unauthorized") ||
    msg.includes("401") ||
    msg.includes("authentication") ||
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("load failed") ||
    msg.includes("aborted")
  );
};

// ─── Authenticated fetch helper ────────────────────────────
const authFetch = async (getToken, url, options = {}) => {
  let token;
  try {
    token = await getToken();
  } catch (e) {
    console.warn("getToken() failed:", e);
    throw new Error("Authentication token not available yet");
  }

  // Retry once if token is null (Clerk might still be initializing)
  if (!token) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      token = await getToken();
    } catch (e) {
      throw new Error("Authentication token not available yet");
    }
  }

  if (!token) {
    throw new Error("Authentication token not available yet");
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res;
};

export const AppProvider = ({ children }) => {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  // Only allow API calls when Clerk is fully loaded and user is signed in
  const isReady = isLoaded && isSignedIn;

  // Track if initial data load has succeeded at least once
  const hasLoadedOnce = useRef(false);

  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);

  // ─── Fetch Files ──────────────────────────────────────────
  const fetchFiles = useCallback(async () => {
    if (!isReady) return;
    setLoading(true);
    try {
      const res = await authFetch(getToken, `${API}/files`);
      const data = await res.json();
      setFiles(data);
      hasLoadedOnce.current = true;
    } catch (err) {
      console.error("fetchFiles:", err);
      // Only show toast if we've successfully loaded before (not on initial load)
      if (hasLoadedOnce.current && !isSilentError(err)) {
        toast.error("Failed to load files");
      }
    } finally {
      setLoading(false);
    }
  }, [isReady, getToken]);

  // ─── Fetch Stats ──────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    if (!isReady) return;
    try {
      const res = await authFetch(getToken, `${API}/files/stats`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("fetchStats:", err);
    }
  }, [isReady, getToken]);

  // ─── Upload File ──────────────────────────────────────────
  const uploadFile = async (file, isPublic) => {
    if (!isReady) {
      toast.error("Please sign in to upload files");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("isPublic", String(isPublic));

      const res = await authFetch(getToken, `${API}/files/upload`, {
        method: "POST",
        body: formData,
        // Don't set Content-Type; browser sets multipart boundary automatically
      });
      const newFile = await res.json();

      setFiles((prev) => [newFile, ...prev]);
      toast.success("File uploaded successfully!");
      // Refresh stats & subscription after upload
      fetchStats();
      fetchSubscription();
      return newFile;
    } catch (err) {
      console.error("uploadFile:", err);
      toast.error(err.message || "Upload failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ─── Delete File ──────────────────────────────────────────
  const removeFile = async (fileId) => {
    try {
      await authFetch(getToken, `${API}/files/${fileId}`, { method: "DELETE" });
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      toast.success("File deleted!");
      fetchStats();
      fetchSubscription();
    } catch (err) {
      console.error("removeFile:", err);
      toast.error("Failed to delete file");
    }
  };

  // ─── Toggle Visibility ───────────────────────────────────
  const toggleVisibility = async (fileId) => {
    try {
      const res = await authFetch(getToken, `${API}/files/${fileId}/toggle-visibility`, {
        method: "PUT",
      });
      const updated = await res.json();
      setFiles((prev) => prev.map((f) => (f.id === fileId ? updated : f)));
      toast.success("Visibility updated!");
    } catch (err) {
      console.error("toggleVisibility:", err);
      toast.error("Failed to update visibility");
    }
  };

  // ─── Download File ────────────────────────────────────────
  const downloadFileById = async (fileId, fileName) => {
    try {
      const res = await authFetch(getToken, `${API}/files/${fileId}/download`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Download started!");
    } catch (err) {
      console.error("downloadFile:", err);
      toast.error("Download failed");
    }
  };

  // ─── Transactions ────────────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    if (!isReady) return;
    try {
      const res = await authFetch(getToken, `${API}/transactions`);
      const data = await res.json();
      setTransactions(data);
    } catch (err) {
      console.error("fetchTransactions:", err);
    }
  }, [isReady, getToken]);

  const addTransaction = async (txn) => {
    try {
      const res = await authFetch(getToken, `${API}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: txn.type,
          amount: txn.amount,
          status: txn.status,
          paymentId: txn.paymentId || null,
        }),
      });
      const saved = await res.json();
      setTransactions((prev) => [saved, ...prev]);
    } catch (err) {
      console.error("addTransaction:", err);
    }
  };

  // ─── Subscription ────────────────────────────────────────
  const fetchSubscription = useCallback(async () => {
    if (!isReady) return;
    try {
      const res = await authFetch(getToken, `${API}/subscription`);
      const data = await res.json();
      setSubscription(data);
    } catch (err) {
      console.error("fetchSubscription:", err);
    }
  }, [isReady, getToken]);

  const upgradeSubscription = async (plan) => {
    try {
      const res = await authFetch(getToken, `${API}/subscription/upgrade`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          planName: plan.name,
        }),
      });
      const updated = await res.json();
      setSubscription(updated);
      toast.success(`Upgraded to ${plan.name} plan!`);
    } catch (err) {
      console.error("upgradeSubscription:", err);
      toast.error("Failed to upgrade plan");
    }
  };

  const value = {
    files,
    stats,
    transactions,
    subscription,
    loading,
    fetchFiles,
    fetchStats,
    fetchTransactions,
    fetchSubscription,
    uploadFile,
    removeFile,
    toggleVisibility,
    downloadFileById,
    addTransaction,
    upgradeSubscription,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContext;
