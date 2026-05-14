import { useEffect } from "react";
import { useAppContext } from "../context/useAppContext";
import { useUser } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import {
  FolderOpen,
  Upload,
  HardDrive,
  Globe,
  Lock,
  ArrowRight,
  FileText,
  Receipt,
  Crown,
  Loader2,
  Share2,
  Sparkles,
  TrendingUp,
} from "lucide-react";

const formatSize = (bytes) => {
  if (!bytes) return "0 B";
  if (typeof bytes === "string") return bytes;
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
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

const Dashboard = () => {
  const {
    files,
    stats,
   
    fetchFiles,
    fetchStats,
    fetchSubscription,
    fetchTransactions,
    loading,
  } = useAppContext();

  const { user } = useUser();

  useEffect(() => {
    fetchFiles();
    fetchStats();
    fetchSubscription();
    fetchTransactions();
  }, [
    fetchFiles,
    fetchStats,
    fetchSubscription,
    fetchTransactions,
  ]);

  const statCards = [
    {
      label: "Total Files",
      value: stats?.totalFiles ?? files?.length ?? 0,
      icon: FolderOpen,
      gradient: "from-purple-500 to-indigo-500",
    },
    {
      label: "Storage Used",
      value:
        stats?.totalStorage ??
        formatSize(
          (files || []).reduce(
            (a, f) => a + (f.fileSize || 0),
            0
          )
        ),
      icon: HardDrive,
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      label: "Public Files",
      value:
        stats?.publicFiles ??
        (files || []).filter((f) => f.isPublic).length,
      icon: Globe,
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      label: "Private Files",
      value:
        stats?.privateFiles ??
        (files || []).filter((f) => !f.isPublic).length,
      icon: Lock,
      gradient: "from-amber-500 to-orange-500",
    },
  ];

  const recentFiles = [...(files || [])]
    .sort(
      (a, b) =>
        new Date(b.uploadedAt) -
        new Date(a.uploadedAt)
    )
    .slice(0, 5);


  return (
    <div className="max-w-7xl mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
          Welcome, {user?.firstName || "User"}{" "}
          <span className="inline-block animate-float">
            👋
          </span>
        </h1>

        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1.5">
          Here&apos;s an overview of your cloud
          storage activity.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {statCards.map((card, i) => (
          <div
            key={card.label}
            className={`animate-fade-in-up stagger-${
              i + 1
            } group relative bg-white dark:bg-[#232336] rounded-2xl border border-gray-100 dark:border-[#35354a] p-5 hover:shadow-xl hover:shadow-gray-100/50 dark:hover:shadow-black/30 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden`}
          >
            <div
              className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient}`}
            />

            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
              >
                <card.icon
                  size={20}
                  className="text-white"
                />
              </div>

              <TrendingUp
                size={14}
                className="text-green-400"
              />
            </div>

            <p className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {card.value}
            </p>

            <p className="text-xs font-medium text-gray-400 dark:text-gray-400 mt-1 tracking-wide">
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions + Recent Files */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Quick Actions */}
        <div className="bg-white dark:bg-[#232336] rounded-2xl border border-gray-100 dark:border-[#35354a] p-6 hover:shadow-lg transition-shadow duration-300">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Sparkles
              size={16}
              className="text-purple-500"
            />
            Quick Actions
          </h2>

          <div className="space-y-2.5">
            {[
              {
                to: "/upload",
                icon: Upload,
                label: "Upload Files",
                gradient:
                  "from-purple-500 to-indigo-500",
                bg: "bg-purple-50 hover:bg-purple-100",
                text: "text-purple-700",
              },
              {
                to: "/myfiles",
                icon: FolderOpen,
                label: "View My Files",
                gradient:
                  "from-blue-500 to-cyan-500",
                bg: "bg-blue-50 hover:bg-blue-100",
                text: "text-blue-700",
              },
              {
                to: "/subscription",
                icon: Crown,
                label: "Subscription",
                gradient:
                  "from-emerald-500 to-teal-500",
                bg: "bg-emerald-50 hover:bg-emerald-100",
                text: "text-emerald-700",
              },
              {
                to: "/transaction",
                icon: Receipt,
                label: "Transactions",
                gradient:
                  "from-amber-500 to-orange-500",
                bg: "bg-amber-50 hover:bg-amber-100",
                text: "text-amber-700",
              },
            ].map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className={`group flex items-center gap-3 p-3 rounded-xl ${action.bg} ${action.text} transition-all duration-200`}
              >
                <div
                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center`}
                >
                  <action.icon
                    size={14}
                    className="text-white"
                  />
                </div>

                <span className="text-sm font-semibold">
                  {action.label}
                </span>

                <ArrowRight
                  size={14}
                  className="ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Files */}
        <div className="lg:col-span-2 bg-white dark:bg-[#232336] rounded-2xl border border-gray-100 dark:border-[#35354a] p-6 hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Recent Files
            </h2>

            <Link
              to="/myfiles"
              className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2
                size={24}
                className="text-purple-500 animate-spin"
              />
            </div>
          ) : recentFiles.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                <FileText
                  size={24}
                  className="text-gray-300"
                />
              </div>

              <p className="text-sm text-gray-400">
                No files uploaded yet.
              </p>

              <Link
                to="/upload"
                className="text-xs text-purple-600 font-semibold mt-2 inline-block hover:underline"
              >
                Upload your first file
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shrink-0 shadow-sm">
                    <FileText
                      size={16}
                      className="text-white"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                      {file.fileName}
                    </p>

                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {formatSize(file.fileSize)} •{" "}
                      {formatDate(file.uploadedAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {file.isPublic && (
                      <Share2
                        size={13}
                        className="text-green-500"
                      />
                    )}

                    <span
                      className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${
                        file.isPublic
                          ? "bg-green-50 text-green-600"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {file.isPublic
                        ? "Public"
                        : "Private"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;