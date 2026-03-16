import { useEffect, useState } from "react";
import { useAppContext } from "../context/useAppContext";
import { useUser } from "@clerk/clerk-react";
import {
  CreditCard,
  Check,
  Zap,
  Crown,
  Loader2,
  HardDrive,
  Upload,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "react-toastify";

// Helper to format bytes as MB/GB
function formatStorage(bytes) {
  if (bytes == null || isNaN(bytes)) return "0 MB";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "forever",
    icon: Zap,
    color: "border-gray-200",
    features: [
      "10 file uploads",
      "100 MB storage",
      "Basic sharing",
      "7-day file retention",
    ],
    buttonClass: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    buttonText: "Current Plan",
  },
  {
    id: "premium",
    name: "Premium",
    price: 49900,
    displayPrice: "499",
    period: "/month",
    icon: Crown,
    color: "border-purple-500 ring-2 ring-purple-100",
    features: [
      "500 file uploads",
      "10 GB storage",
      "Advanced sharing",
      "30-day file retention",
      "Priority support",
      "Download analytics",
    ],
    buttonClass: "bg-purple-600 text-white hover:bg-purple-700",
    buttonText: "Upgrade Now",
    highlighted: true,
  },
];

const RAZORPAY_KEY =
  import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_yourkeyhere";

const Subscription = () => {
  const {
    subscription,
    fetchSubscription,
    upgradeSubscription,
    addTransaction,
  } = useAppContext();

  const { user } = useUser();
  const [processingPlanId, setProcessingPlanId] = useState(null);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const currentPlan = subscription?.plan || "Free";

  const handlePayment = (plan) => {
    if (plan.id === "free") return;

    if (!window.Razorpay) {
      toast.error("Payment gateway loading. Try again.");
      return;
    }

    setProcessingPlanId(plan.id);

    const options = {
      key: RAZORPAY_KEY,
      amount: plan.price,
      currency: "INR",
      name: "CloudShare",
      description: `${plan.name} Plan`,
      handler: function (response) {
        const txn = {
          id: response.razorpay_payment_id || "txn-" + Date.now(),
          type: `${plan.name} Subscription`,
          amount: plan.price / 100,
          date: new Date().toISOString(),
          status: "completed",
        };

        addTransaction(txn);
        upgradeSubscription(plan);
        setProcessingPlanId(null);
        toast.success("Payment successful!");
      },
      prefill: {
        name: user?.fullName || "",
        email: user?.primaryEmailAddress?.emailAddress || "",
      },
      theme: {
        color: "#7c3aed",
      },
      modal: {
        ondismiss: function () {
          setProcessingPlanId(null);
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <div className="max-w-4xl mx-auto">

      {/* Current Usage */}
      {subscription && (
        <div className="bg-white rounded-2xl border border-gray-300 p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Uploads */}
            <div className="p-4 rounded-xl bg-purple-50 border border-gray-300">
              <div className="flex items-center gap-2 mb-2">
                <Upload size={16} className="text-purple-600" />
                <span className="text-sm font-semibold text-gray-700">Uploads</span>
              </div>

              <p className="text-2xl font-bold text-gray-900">
                {subscription.uploadsUsed} /
                {subscription.uploadsLimit}
              </p>
            </div>

            {/* Storage */}
            <div className="p-4 rounded-xl bg-blue-50 border border-gray-300">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive size={16} className="text-blue-600" />
                <span className="text-sm font-semibold text-gray-700">Storage</span>
              </div>

              <p className="text-2xl font-bold text-gray-900">
                {formatStorage(subscription.storageUsedBytes)}
                <span className="text-sm ml-2 text-gray-500">
                  / {formatStorage(subscription.storageLimitBytes)}
                </span>
              </p>

            </div>

          </div>
        </div>
      )}

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
<<<<<<< Updated upstream
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-2xl border p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${plan.highlighted ? 'border-purple-300 hover:shadow-purple-100' : 'border-gray-200 hover:shadow-gray-100'}`}
          >
            <h3 className="text-lg font-bold">{plan.name}</h3>

            <div className="mb-4">
              ₹{plan.displayPrice || plan.price}
              <span className="text-sm ml-1">{plan.period}</span>
            </div>

            <ul className="mb-4">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check size={14} />
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handlePayment(plan)}
              disabled={currentPlan.toLowerCase() === plan.id || processing}
              className={`w-full py-3 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                currentPlan.toLowerCase() === plan.id
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : plan.highlighted
                    ? 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {processing && currentPlan.toLowerCase() !== plan.id ? (
                <><Loader2 size={16} className="animate-spin" /> Processing...</>
              ) : currentPlan.toLowerCase() === plan.id ? (
                <><Check size={16} /> Current Plan</>
              ) : (
                plan.buttonText
              )}
            </button>
          </div>
        ))}
=======
        {plans.map((plan) => {
          const PlanIcon = plan.icon;
          const isCurrentPlan = currentPlan.toLowerCase() === plan.id;
          const isProcessing = processingPlanId === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl border-2 p-6 transition-all duration-300 cursor-default
                hover:shadow-xl hover:-translate-y-1
                ${
                  plan.highlighted
                    ? "border-purple-500 ring-2 ring-purple-100 hover:shadow-purple-200/40"
                    : "border-gray-300 hover:border-purple-300 hover:shadow-gray-200/50"
                }
              `}
            >
              {plan.highlighted && (
                <span className="absolute top-0 right-4 inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-b-xl">
                  <Sparkles size={12} />
                  Popular
                </span>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg ${
                  plan.highlighted
                    ? "bg-gradient-to-br from-purple-600 to-indigo-600"
                    : "bg-gradient-to-br from-gray-500 to-gray-600"
                }`}>
                  <PlanIcon size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  {isCurrentPlan && (
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">Active</span>
                  )}
                </div>
              </div>

              <div className="mb-5">
                <span className="text-4xl font-extrabold text-gray-900">₹{plan.displayPrice || plan.price}</span>
                <span className="text-sm text-gray-500 ml-1">{plan.period}</span>
              </div>

              <ul className="mb-6 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check size={12} className="text-green-600" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePayment(plan)}
                disabled={isCurrentPlan || processingPlanId !== null}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  isCurrentPlan
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : plan.highlighted
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-purple-200/50 hover:-translate-y-0.5 disabled:opacity-60"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-60"
                }`}
              >
                {isProcessing ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </span>
                ) : isCurrentPlan ? (
                  "Current Plan"
                ) : (
                  plan.buttonText
                )}
              </button>
            </div>
          );
        })}
>>>>>>> Stashed changes
      </div>

    </div>
  );
};

export default Subscription;