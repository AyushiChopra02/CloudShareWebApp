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
  CreditCard,
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
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const Dashboard = () => {
  const {
    files,
    stats,
    subscription,
    transactions,
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
  }, [fetchFiles, fetchStats, fetchSubscription, fetchTransactions]);

  const statCards = [
    {
      label: "Total Files",
      value: stats?.totalFiles ?? files.length,
      icon: FolderOpen,
      gradient: "from-purple-500 to-indigo-500",
      bg: "bg-purple-50",
      text: "text-purple-600",
    },
    {
      label: "Storage Used",
      value: stats?.totalStorage ?? formatSize(files.reduce((a, f) => a + (f.fileSize || 0), 0)),
      icon: HardDrive,
      gradient: "from-blue-500 to-cyan-500",
      bg: "bg-blue-50",
      text: "text-blue-600",
    },
    {
      label: "Public Files",
      value: stats?.publicFiles ?? files.filter((f) => f.isPublic).length,
      icon: Globe,
      gradient: "from-emerald-500 to-teal-500",
      bg: "bg-emerald-50",
      text: "text-emerald-600",
    },
    {
      label: "Private Files",
      value: stats?.privateFiles ?? files.filter((f) => !f.isPublic).length,
      icon: Lock,
      gradient: "from-amber-500 to-orange-500",
      bg: "bg-amber-50",
      text: "text-amber-600",
    },
  ];

  const recentFiles = [...files]
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
    .slice(0, 5);

  const recentTxns = [...transactions].slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">
          Welcome, {user?.firstName || "User"}{" "}
          <span className="inline-block animate-float">👋</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1.5">
          Here&apos;s an overview of your cloud storage activity.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {statCards.map((card, i) => (
          <div
            key={card.label}
            className={`animate-fade-in-up stagger-${i + 1} group relative bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-xl hover:shadow-gray-100/50 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden`}
          >
            {/* Subtle gradient accent top */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient}`} />
            <div className="flex items-center justify-between mb-3">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <card.icon size={20} className="text-white" />
              </div>
              <TrendingUp size={14} className="text-green-400" />
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{card.value}</p>
            <p className="text-xs font-medium text-gray-400 mt-1 tracking-wide">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions + Recent Files */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-shadow duration-300">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles size={16} className="text-purple-500" />
            Quick Actions
          </h2>
          <div className="space-y-2.5">
            {[
              { to: "/upload", icon: Upload, label: "Upload Files", gradient: "from-purple-500 to-indigo-500", bg: "bg-purple-50 hover:bg-purple-100", text: "text-purple-700" },
              { to: "/myfiles", icon: FolderOpen, label: "View My Files", gradient: "from-blue-500 to-cyan-500", bg: "bg-blue-50 hover:bg-blue-100", text: "text-blue-700" },
              { to: "/subscription", icon: Crown, label: "Subscription", gradient: "from-emerald-500 to-teal-500", bg: "bg-emerald-50 hover:bg-emerald-100", text: "text-emerald-700" },
              { to: "/transaction", icon: Receipt, label: "Transactions", gradient: "from-amber-500 to-orange-500", bg: "bg-amber-50 hover:bg-amber-100", text: "text-amber-700" },
            ].map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className={`group flex items-center gap-3 p-3 rounded-xl ${action.bg} ${action.text} transition-all duration-200`}
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center`}>
                  <action.icon size={14} className="text-white" />
                </div>
                <span className="text-sm font-semibold">{action.label}</span>
                <ArrowRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Files */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Recent Files</h2>
            <Link to="/myfiles" className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 transition-colors">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="text-purple-500 animate-spin" />
            </div>
          ) : recentFiles.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                <FileText size={24} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">No files uploaded yet.</p>
              <Link to="/upload" className="text-xs text-purple-600 font-semibold mt-2 inline-block hover:underline">
                Upload your first file
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shrink-0 shadow-sm">
                    <FileText size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{file.fileName}</p>
                    <p className="text-xs text-gray-400">
                      {formatSize(file.fileSize)} • {formatDate(file.uploadedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.isPublic && (
                      <Share2 size={13} className="text-green-500" />
                    )}
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${file.isPublic ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                      {file.isPublic ? "Public" : "Private"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subscription + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Subscription</h2>
            <Link to="/subscription" className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 transition-colors">
              Manage <ArrowRight size={12} />
            </Link>
          </div>
          {subscription ? (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${subscription.plan === "Premium" ? "bg-gradient-to-br from-purple-500 to-indigo-500 shadow-lg shadow-purple-200/50" : "bg-gray-100"}`}>
                  <Crown size={20} className={subscription.plan === "Premium" ? "text-white" : "text-gray-500"} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">{subscription.plan} Plan</p>
                    {subscription.plan === "Premium" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-600">PRO</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {subscription.expiresAt ? `Expires ${formatDate(subscription.expiresAt)}` : "No expiration"}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-400 font-medium">Uploads</span>
                    <span className="font-bold text-gray-600">{subscription.uploadsUsed} / {subscription.uploadsLimit}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min((subscription.uploadsUsed / subscription.uploadsLimit) * 100, 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-400 font-medium">Storage</span>
                    <span className="font-bold text-gray-600">{subscription.storageUsed} / {subscription.storageLimit}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2.5 rounded-full w-1/6 transition-all duration-500" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Loading...</p>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Recent Transactions</h2>
            <Link to="/transaction" className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 transition-colors">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {recentTxns.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                <Receipt size={24} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentTxns.map((txn) => (
                <div key={txn.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${txn.status === "completed" ? "bg-gradient-to-br from-emerald-400 to-green-500" : "bg-gradient-to-br from-amber-400 to-orange-500"}`}>
                    <CreditCard size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{txn.type}</p>
                    <p className="text-xs text-gray-400">{formatDate(txn.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-gray-900">₹{txn.amount}</p>
                    <span className={`text-[11px] font-semibold ${txn.status === "completed" ? "text-green-600" : "text-amber-600"}`}>
                      {txn.status?.charAt(0).toUpperCase() + txn.status?.slice(1)}
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