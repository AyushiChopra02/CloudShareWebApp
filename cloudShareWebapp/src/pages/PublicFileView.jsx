import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Download,
  FileText,
  Cloud,
  Loader2,
  AlertCircle,
  Globe,
} from "lucide-react";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const formatSize = (bytes) => {
  if (!bytes) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
};

const PublicFileView = () => {
  const { fileId } = useParams();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchPublicFile = async () => {
      try {
        const res = await fetch(`${API}/files/public/${fileId}`);
        if (!res.ok) throw new Error("File not found");
        const data = await res.json();
        setFile(data);
      } catch {
        setError("This file is not available, is private, or has been removed.");
      } finally {
        setLoading(false);
      }
    };
    fetchPublicFile();
  }, [fileId]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${API}/files/public/${fileId}/download`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file?.fileName || "download";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={40} className="text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error && !file) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-800">File Not Found</h2>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-purple-200/30 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-[-10%] right-[-5%] w-80 h-80 bg-indigo-200/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />

      <div className="relative w-full max-w-md animate-fade-in-up">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-200">
            <Cloud className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent">CloudShare</span>
        </div>

        {/* File Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl shadow-purple-100/30 border border-white/60 overflow-hidden">
          {/* Banner */}
          <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700 px-6 py-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
            <div className="relative">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 ring-2 ring-white/10">
                <FileText size={28} className="text-white" />
              </div>
              <h2 className="text-lg font-bold text-white truncate px-4">
                {file?.fileName}
              </h2>
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <Globe size={13} className="text-purple-200" />
                <span className="text-sm text-purple-200 font-medium">Shared publicly</span>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-4">
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-400 font-medium">File size</span>
              <span className="font-bold text-gray-800">{formatSize(file?.fileSize)}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-400 font-medium">File type</span>
              <span className="font-bold text-gray-800">
                {file?.fileType?.split("/").pop()?.toUpperCase() || "Unknown"}
              </span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-400 font-medium">Uploaded</span>
              <span className="font-bold text-gray-800">
                {file?.uploadedAt
                  ? new Date(file.uploadedAt).toLocaleDateString()
                  : "—"}
              </span>
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full mt-4 flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-purple-200/50 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all duration-300"
            >
              {downloading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}
              {downloading ? "Downloading..." : "Download File"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6 font-medium">
          Shared via CloudShare • Secure file sharing
        </p>
      </div>
    </div>
  );
};

export default PublicFileView;