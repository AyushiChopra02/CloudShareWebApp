import { useState, useCallback } from "react";
import { useAppContext } from "../context/useAppContext";
import {
  Upload as UploadIcon,
  CloudUpload,
  FileText,
  X,
  Check,
  Loader2,
  Globe,
  Lock,
  Sparkles,
  Image,
  Film,
  Music,
  Archive,
  File,
} from "lucide-react";

const getFileIcon = (name) => {
  if (!name) return File;
  const ext = name.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return Image;
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) return Film;
  if (["mp3", "wav", "ogg", "flac", "aac"].includes(ext)) return Music;
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return Archive;
  if (["pdf", "doc", "docx", "txt", "md"].includes(ext)) return FileText;
  return File;
};

const Upload = () => {
  const { uploadFile, loading } = useAppContext();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isPublic, setIsPublic] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  }, []);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setUploadProgress((prev) => ({ ...prev, [i]: "uploading" }));
      try {
        await uploadFile(file, isPublic);
        setUploadProgress((prev) => ({ ...prev, [i]: "done" }));
      } catch {
        setUploadProgress((prev) => ({ ...prev, [i]: "error" }));
      }
    }
    setTimeout(() => {
      setSelectedFiles([]);
      setUploadProgress({});
    }, 2000);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Upload Files</h1>
        <p className="mt-1.5 text-sm text-gray-500">
          Drag & drop files or click to browse. Uploaded files can be shared publicly.
        </p>
      </div>

      {/* Visibility Toggle */}
      <div className="mb-6 flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <span className="text-sm font-semibold text-gray-700">Visibility:</span>
        <button
          onClick={() => setIsPublic(false)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            !isPublic
              ? "bg-gray-900 text-white shadow-lg shadow-gray-300/30"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          <Lock size={14} />
          Private
        </button>
        <button
          onClick={() => setIsPublic(true)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            isPublic
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-200/50"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          <Globe size={14} />
          Public
        </button>
      </div>

      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-300 ${
          dragActive
            ? "border-purple-400 bg-purple-50/80 scale-[1.01]"
            : "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/30"
        }`}
      >
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className={`w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center transition-all duration-300 ${
          dragActive
            ? "bg-gradient-to-br from-purple-500 to-indigo-500 scale-110"
            : "bg-gradient-to-br from-gray-100 to-gray-200"
        }`}>
          <CloudUpload
            size={32}
            className={`transition-colors duration-300 ${dragActive ? "text-white" : "text-gray-400"}`}
          />
        </div>
        <p className="text-lg font-bold text-gray-700">
          {dragActive ? "Drop files here..." : "Drag & drop files here"}
        </p>
        <p className="mt-2 text-sm text-gray-400">
          or <span className="text-purple-600 font-semibold cursor-pointer hover:underline">browse files</span> from your device
        </p>
        <p className="mt-4 text-xs text-gray-300">
          Supports all file types up to 50 MB
        </p>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="mt-6 animate-fade-in-up">
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Sparkles size={14} className="text-purple-500" />
            Selected Files ({selectedFiles.length})
          </h3>
          <div className="space-y-2.5">
            {selectedFiles.map((file, index) => {
              const FileIcon = getFileIcon(file.name);
              return (
                <div
                  key={index}
                  className={`flex items-center gap-4 p-4 bg-white rounded-xl border transition-all duration-300 ${
                    uploadProgress[index] === "done"
                      ? "border-green-200 bg-green-50/50"
                      : uploadProgress[index] === "error"
                      ? "border-red-200 bg-red-50/50"
                      : "border-gray-100 hover:shadow-md"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shrink-0">
                    <FileIcon size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
                  </div>
                  {uploadProgress[index] === "uploading" && (
                    <Loader2 size={18} className="text-purple-500 animate-spin" />
                  )}
                  {uploadProgress[index] === "done" && (
                    <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                  {!uploadProgress[index] && (
                    <button
                      onClick={() => removeSelectedFile(index)}
                      className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-red-100 hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={loading || selectedFiles.length === 0}
            className="w-full mt-5 flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-purple-200/50 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-300"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <UploadIcon size={18} />
                Upload {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default Upload;