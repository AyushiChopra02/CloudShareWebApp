import { useEffect, useState, useCallback } from "react";
import { useAppContext } from "../context/useAppContext";
import { useAuth } from "@clerk/clerk-react";
import {
  Grid3X3,
  List,
  Trash2,
  Download,
  Globe,
  Lock,
  FileText,
  Image,
  Film,
  Music,
  Archive,
  File,
  Share2,
  Copy,
  Check,
  Search,
  Loader2,
  Upload,
  X,
  Eye,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8080/api";

const getFileIcon = (type) => {
  if (!type) return File;

  if (type.startsWith("image/")) return Image;
  if (type.startsWith("video/")) return Film;
  if (type.startsWith("audio/")) return Music;

  if (
    type.includes("pdf") ||
    type.includes("document") ||
    type.includes("text")
  ) {
    return FileText;
  }

  if (
    type.includes("zip") ||
    type.includes("archive") ||
    type.includes("rar")
  ) {
    return Archive;
  }

  return File;
};

const iconGradients = {
  Image: "from-pink-500 to-rose-500",
  Film: "from-blue-500 to-cyan-500",
  Music: "from-emerald-500 to-teal-500",
  Archive: "from-amber-500 to-orange-500",
  FileText: "from-purple-500 to-indigo-500",
  File: "from-gray-400 to-gray-500",
};

const getIconGradient = (type) => {
  const Icon = getFileIcon(type);
  return (
    iconGradients[Icon.name] || iconGradients.File
  );
};

const formatSize = (bytes) => {
  if (!bytes) return "—";

  if (bytes < 1024) return bytes + " B";

  if (bytes < 1048576) {
    return (bytes / 1024).toFixed(1) + " KB";
  }

  return (bytes / 1048576).toFixed(1) + " MB";
};

const formatDate = (date) => {
  if (!date) return "—";

  const d = new Date(date);

  return (
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
};

const MyFiles = () => {
  const {
    files,
    fetchFiles,
    removeFile,
    toggleVisibility,
    downloadFileById,
    loading,
  } = useAppContext();

  const { getToken } = useAuth();

  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] =
    useState("");
  const [copiedId, setCopiedId] = useState(null);

  const [previewFile, setPreviewFile] =
    useState(null);

  const [previewUrl, setPreviewUrl] =
    useState(null);

  const [previewLoading, setPreviewLoading] =
    useState(false);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const filteredFiles = files.filter((f) =>
    f.fileName
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const copyShareLink = (fileId) => {
    const link = `${window.location.origin}/public/${fileId}`;

    navigator.clipboard.writeText(link);

    setCopiedId(fileId);

    toast.success("Share link copied!");

    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePreview = async (e, file) => {
    e.stopPropagation();

    setPreviewFile(file);
    setPreviewLoading(true);
    setPreviewUrl(null);

    try {
      const token = await getToken();

      const res = await fetch(
        `${API_BASE}/files/${file.id}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Failed to load image");
      }

      const blob = await res.blob();

      setPreviewUrl(
        URL.createObjectURL(blob)
      );
    } catch (err) {
      console.error("Preview failed:", err);

      toast.error("Failed to load image preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewFile(null);
    setPreviewUrl(null);
  }, [previewUrl]);

  // ─── Grid View Card ─────────────────────
  const FileCard = ({ file }) => {
    const IconComponent = getFileIcon(
      file.fileType
    );

    const gradient = getIconGradient(
      file.fileType
    );

    return (
      <div className="group bg-white rounded-2xl border border-gray-300 p-5 hover:shadow-xl hover:shadow-gray-100/50 hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden">
        {/* Accent bar */}
        <div
          className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-100 transition-opacity`}
        />

        {/* Top */}
        <div className="flex items-start justify-between mb-4">
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
          >
            <IconComponent
              size={22}
              className="text-white"
            />
          </div>

          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
              file.isPublic
                ? "bg-green-50 text-green-700 border border-green-100"
                : "bg-gray-50 text-gray-500 border border-gray-100"
            }`}
          >
            {file.isPublic ? (
              <Globe size={11} />
            ) : (
              <Lock size={11} />
            )}

            {file.isPublic
              ? "Public"
              : "Private"}
          </span>
        </div>

        {/* File Info */}
        <h3
          className="text-sm font-bold text-gray-900 truncate"
          title={file.fileName}
        >
          {file.fileName}
        </h3>

        <p className="text-xs text-gray-400 mt-1">
          {formatSize(file.fileSize)} •{" "}
          {formatDate(file.uploadedAt)}
        </p>

        {/* Actions */}
        <div className="mt-4 pt-3.5 border-t border-gray-300 flex items-center gap-1.5">
          {file.fileType?.startsWith(
            "image/"
          ) && (
            <button
              onClick={(e) =>
                handlePreview(e, file)
              }
              className="p-2 rounded-lg text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
              title="Preview image"
            >
              <Eye size={14} />
            </button>
          )}

          <button
            onClick={() =>
              toggleVisibility(file.id)
            }
            className="p-2 rounded-lg text-gray-400 hover:bg-purple-50 hover:text-purple-600 transition-all"
            title="Toggle visibility"
          >
            {file.isPublic ? (
              <Lock size={14} />
            ) : (
              <Globe size={14} />
            )}
          </button>

          {file.isPublic && (
            <button
              onClick={() =>
                copyShareLink(file.id)
              }
              className="p-2 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all"
              title="Copy share link"
            >
              {copiedId === file.id ? (
                <Check
                  size={14}
                  className="text-green-500"
                />
              ) : (
                <Share2 size={14} />
              )}
            </button>
          )}

          <button
            onClick={() =>
              downloadFileById(
                file.id,
                file.fileName
              )
            }
            className="p-2 rounded-lg text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all"
            title="Download"
          >
            <Download size={14} />
          </button>

          <div className="flex-1" />

          <button
            onClick={() =>
              removeFile(file.id)
            }
            className="p-2 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            My Files
          </h1>

          <p className="text-sm text-gray-400 mt-1">
            {files.length} file
            {files.length !== 1 ? "s" : ""}{" "}
            uploaded
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"
            />

            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(
                  e.target.value
                )
              }
              className="pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 w-52 transition-all placeholder:text-gray-300"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() =>
                setViewMode("grid")
              }
              className={`p-2.5 transition-all ${
                viewMode === "grid"
                  ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Grid3X3 size={16} />
            </button>

            <button
              onClick={() =>
                setViewMode("list")
              }
              className={`p-2.5 transition-all ${
                viewMode === "list"
                  ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2
            size={32}
            className="text-purple-500 animate-spin"
          />
        </div>
      )}

      {/* Empty State */}
      {!loading &&
        filteredFiles.length === 0 && (
          <div className="text-center py-24">
            <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
              <FileText
                size={32}
                className="text-gray-300"
              />
            </div>

            <h3 className="text-lg font-bold text-gray-500">
              No files found
            </h3>

            <p className="text-sm text-gray-400 mt-1 mb-4">
              {searchQuery
                ? "Try a different search term"
                : "Upload some files to get started"}
            </p>

            {!searchQuery && (
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-purple-200/50 transition-all"
              >
                <Upload size={16} />
                Upload Files
              </Link>
            )}
          </div>
        )}

      {/* Grid View */}
      {!loading &&
        viewMode === "grid" &&
        filteredFiles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFiles.map((file) => (
              <FileCard
                key={file.id}
                file={file}
              />
            ))}
          </div>
        )}

      {/* Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={closePreview}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 truncate pr-4">
                {previewFile.fileName}
              </h3>

              <button
                onClick={closePreview}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Image */}
            <div className="flex items-center justify-center p-4 bg-gray-50 min-h-[200px] max-h-[65vh] overflow-auto">
              {previewLoading ? (
                <Loader2
                  size={32}
                  className="text-purple-500 animate-spin"
                />
              ) : previewUrl ? (
                <img
                  src={previewUrl}
                  alt={previewFile.fileName}
                  className="max-w-full max-h-[60vh] object-contain rounded-lg"
                />
              ) : (
                <p className="text-sm text-gray-400">
                  Failed to load image
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyFiles;