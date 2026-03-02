import { useEffect, useState } from "react";
import { useAppContext } from "../context/useAppContext";
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
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

const getFileIcon = (type) => {
  if (!type) return File;
  if (type.startsWith("image/")) return Image;
  if (type.startsWith("video/")) return Film;
  if (type.startsWith("audio/")) return Music;
  if (type.includes("pdf") || type.includes("document") || type.includes("text"))
    return FileText;
  if (type.includes("zip") || type.includes("archive") || type.includes("rar"))
    return Archive;
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
  return iconGradients[Icon.name] || iconGradients.File;
};

const formatSize = (bytes) => {
  if (!bytes) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
};

const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const MyFiles = () => {
  const { files, fetchFiles, removeFile, toggleVisibility, downloadFileById, loading } =
    useAppContext();
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const filteredFiles = files.filter((f) =>
    f.fileName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyShareLink = (fileId) => {
    const link = `${window.location.origin}/public/${fileId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(fileId);
    toast.success("Share link copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ─── Grid View Card ────────────────────────────────────
  const FileCard = ({ file }) => {
    const IconComponent = getFileIcon(file.fileType);
    const gradient = getIconGradient(file.fileType);
    return (
      <div className="group bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-xl hover:shadow-gray-100/50 hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden">
        {/* Top accent bar */}
        <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />

        {/* Icon & visibility badge */}
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <IconComponent size={22} className="text-white" />
          </div>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
              file.isPublic
                ? "bg-green-50 text-green-700 border border-green-100"
                : "bg-gray-50 text-gray-500 border border-gray-100"
            }`}
          >
            {file.isPublic ? <Globe size={11} /> : <Lock size={11} />}
            {file.isPublic ? "Public" : "Private"}
          </span>
        </div>

        {/* File info */}
        <h3 className="text-sm font-bold text-gray-900 truncate" title={file.fileName}>
          {file.fileName}
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          {formatSize(file.fileSize)} • {formatDate(file.uploadedAt)}
        </p>

        {/* Actions */}
        <div className="mt-4 pt-3.5 border-t border-gray-50 flex items-center gap-1.5">
          <button
            onClick={() => toggleVisibility(file.id)}
            className="p-2 rounded-lg text-gray-400 hover:bg-purple-50 hover:text-purple-600 transition-all"
            title="Toggle visibility"
          >
            {file.isPublic ? <Lock size={14} /> : <Globe size={14} />}
          </button>
          {file.isPublic && (
            <button
              onClick={() => copyShareLink(file.id)}
              className="p-2 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all"
              title="Copy share link"
            >
              {copiedId === file.id ? <Check size={14} className="text-green-500" /> : <Share2 size={14} />}
            </button>
          )}
          <button
            onClick={() => downloadFileById(file.id, file.fileName)}
            className="p-2 rounded-lg text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all"
            title="Download"
          >
            <Download size={14} />
          </button>
          <div className="flex-1" />
          <button
            onClick={() => removeFile(file.id)}
            className="p-2 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  };

  // ─── List View Row ──────────────────────────────────────
  const FileRow = ({ file }) => {
    const IconComponent = getFileIcon(file.fileType);
    const gradient = getIconGradient(file.fileType);
    return (
      <div className="flex items-center gap-4 px-5 py-4 bg-white border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors group">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm`}>
          <IconComponent size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{file.fileName}</p>
          <p className="text-xs text-gray-400">{formatSize(file.fileSize)}</p>
        </div>
        <span className="hidden sm:block text-xs text-gray-400 w-24 font-medium">
          {formatDate(file.uploadedAt)}
        </span>
        <span
          className={`hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
            file.isPublic
              ? "bg-green-50 text-green-700 border border-green-100"
              : "bg-gray-50 text-gray-500 border border-gray-100"
          }`}
        >
          {file.isPublic ? <Globe size={11} /> : <Lock size={11} />}
          {file.isPublic ? "Public" : "Private"}
        </span>
        <div className="flex items-center gap-0.5">
          <button onClick={() => toggleVisibility(file.id)} className="p-2 rounded-lg text-gray-400 hover:bg-purple-50 hover:text-purple-600 transition-all" title="Toggle visibility">
            {file.isPublic ? <Lock size={14} /> : <Globe size={14} />}
          </button>
          {file.isPublic && (
            <button onClick={() => copyShareLink(file.id)} className="p-2 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all" title="Copy share link">
              {copiedId === file.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
          )}
          <button onClick={() => downloadFileById(file.id, file.fileName)} className="p-2 rounded-lg text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all" title="Download">
            <Download size={14} />
          </button>
          <button onClick={() => removeFile(file.id)} className="p-2 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all" title="Delete">
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
          <h1 className="text-3xl font-extrabold text-gray-900">My Files</h1>
          <p className="text-sm text-gray-400 mt-1">
            {files.length} file{files.length !== 1 ? "s" : ""} uploaded
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 w-52 transition-all placeholder:text-gray-300"
            />
          </div>
          {/* View Toggle */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2.5 transition-all ${
                viewMode === "grid" ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Grid3X3 size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2.5 transition-all ${
                viewMode === "list" ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white" : "text-gray-400 hover:text-gray-600"
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
          <Loader2 size={32} className="text-purple-500 animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredFiles.length === 0 && (
        <div className="text-center py-24">
          <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <FileText size={32} className="text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-500">No files found</h3>
          <p className="text-sm text-gray-400 mt-1 mb-4">
            {searchQuery ? "Try a different search term" : "Upload some files to get started"}
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
      {!loading && viewMode === "grid" && filteredFiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.map((file) => (
            <FileCard key={file.id} file={file} />
          ))}
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === "list" && filteredFiles.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {/* List Header */}
          <div className="flex items-center gap-4 px-5 py-3 bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            <div className="w-10" />
            <div className="flex-1">Name</div>
            <div className="hidden sm:block w-24">Date</div>
            <div className="hidden md:block w-20">Access</div>
            <div className="w-36">Actions</div>
          </div>
          {filteredFiles.map((file) => (
            <FileRow key={file.id} file={file} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyFiles;