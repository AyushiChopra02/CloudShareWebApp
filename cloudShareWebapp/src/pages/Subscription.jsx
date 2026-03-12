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
  const [processing, setProcessing] = useState(false);

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

    setProcessing(true);

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
        setProcessing(false);
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
          setProcessing(false);
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
        <div className="bg-white rounded-2xl border p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Uploads */}
            <div className="p-4 rounded-xl bg-purple-50">
              <div className="flex items-center gap-2 mb-2">
                <Upload size={16} />
                <span>Uploads</span>
              </div>

              <p className="text-2xl font-bold">
                {subscription.uploadsUsed} /
                {subscription.uploadsLimit}
              </p>
            </div>

            {/* Storage */}
            <div className="p-4 rounded-xl bg-blue-50">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive size={16} />
                <span>Storage</span>
              </div>

              <p className="text-2xl font-bold">
                {formatStorage(subscription.storageUsedBytes)}
                <span className="text-sm ml-2">
                  / {formatStorage(subscription.storageLimitBytes)}
                </span>
              </p>

            </div>

          </div>
        </div>
      )}

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      </div>

    </div>
  );
};

export default Subscription;