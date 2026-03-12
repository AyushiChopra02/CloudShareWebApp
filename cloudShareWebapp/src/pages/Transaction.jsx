import { useEffect } from "react";
import { useAppContext } from "../context/useAppContext";
import {
  Receipt,
  Loader2,
  CreditCard,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusConfig = {
  completed: {
    icon: CheckCircle2,
    bg: "bg-emerald-50 border border-emerald-100",
    text: "text-emerald-700",
    iconGradient: "from-emerald-400 to-green-500",
  },
  pending: {
    icon: Clock,
    bg: "bg-amber-50 border border-amber-100",
    text: "text-amber-700",
    iconGradient: "from-amber-400 to-orange-500",
  },
  failed: {
    icon: XCircle,
    bg: "bg-red-50 border border-red-100",
    text: "text-red-700",
    iconGradient: "from-red-400 to-rose-500",
  },
};

const Transaction = () => {
  const { transactions, fetchTransactions, loading } = useAppContext();

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Transactions</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
          View your billing and payment history.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-purple-500 animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <Receipt size={32} className="text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-500">No transactions yet</h3>
          <p className="text-sm text-gray-400 mt-1">
            Your transaction history will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-5 gap-4 px-6 py-3.5 bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            <div className="col-span-2">Transaction</div>
            <div>Amount</div>
            <div>Date</div>
            <div>Status</div>
          </div>

          {/* Rows */}
          {transactions.map((txn) => {
            const status = statusConfig[txn.status] || statusConfig.pending;
            return (
              <div
                key={txn.id}
                className="grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-4 px-6 py-4 border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors"
              >
                <div className="col-span-2 flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                      txn.type?.includes("Subscription")
                        ? "from-purple-500 to-indigo-500"
                        : status.iconGradient
                    } flex items-center justify-center shrink-0 shadow-sm`}
                  >
                    <CreditCard size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{txn.type}</p>
                    <p className="text-xs text-gray-400 sm:hidden">{formatDate(txn.date)}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-extrabold text-gray-900">₹{txn.amount}</span>
                </div>
                <div className="hidden sm:flex items-center">
                  <span className="text-sm text-gray-400">{formatDate(txn.date)}</span>
                </div>
                <div className="flex items-center">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${status.bg} ${status.text}`}
                  >
                    <status.icon size={12} />
                    {txn.status?.charAt(0).toUpperCase() + txn.status?.slice(1)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Transaction;