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
    price: 49900, // in paise for Razorpay
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

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_yourkeyhere";

const Subscription = () => {
  const { subscription, fetchSubscription, upgradeSubscription, addTransaction, loading } =
    useAppContext();
  const { user } = useUser();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const currentPlan = subscription?.plan || "Free";

  const handlePayment = (plan) => {
    if (plan.id === "free") return;

    // Check if Razorpay script is loaded
    if (!window.Razorpay) {
      toast.error("Payment gateway is loading. Please try again in a moment.");
      return;
    }

    setProcessing(true);

    const options = {
      key: RAZORPAY_KEY,
      amount: plan.price, // in paise
      currency: "INR",
      name: "CloudShare",
      description: `${plan.name} Plan - Monthly Subscription`,
      image: "",
      handler: function (response) {
        // Payment successful
        const txn = {
          id: response.razorpay_payment_id || "txn-" + Date.now(),
          type: `${plan.name} Subscription`,
          amount: plan.price / 100,
          date: new Date().toISOString(),
          status: "completed",
          paymentId: response.razorpay_payment_id,
        };

        addTransaction(txn);
        upgradeSubscription(plan);
        setProcessing(false);
        toast.success("Payment successful! Plan upgraded.");
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
          toast.info("Payment cancelled.");
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function (response) {
      setProcessing(false);
      const txn = {
        id: "txn-" + Date.now(),
        type: `${plan.name} Subscription (Failed)`,
        amount: plan.price / 100,
        date: new Date().toISOString(),
        status: "failed",
        error: response.error?.description,
      };
      addTransaction(txn);
      toast.error("Payment failed: " + (response.error?.description || "Unknown error"));
    });
    rzp.open();
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Subscription</h1>
        <p className="text-sm text-gray-500 mt-1.5">Manage your plan and storage.</p>
      </div>

      {/* Current Usage */}
      {subscription && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8 shadow-sm hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Current Usage</h2>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${currentPlan === "Premium" ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-200/50" : "bg-gray-100 text-gray-600"}`}>
              <Crown size={12} />
              {currentPlan} Plan
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-purple-50">
              <div className="flex items-center gap-2 mb-2">
                <Upload size={16} className="text-purple-600" />
                <span className="text-sm font-medium text-purple-700">Uploads</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">
                {subscription.uploadsUsed}{" "}
                <span className="text-sm font-normal text-purple-600">
                  / {subscription.uploadsLimit}
                </span>
              </p>
              <div className="mt-2 w-full bg-purple-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      (subscription.uploadsUsed / subscription.uploadsLimit) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
            <div className="p-4 rounded-xl bg-blue-50">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Storage</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">
                {subscription.storageUsed}{" "}
                <span className="text-sm font-normal text-blue-600">
                  / {subscription.storageLimit}
                </span>
              </p>
              <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full w-1/5 transition-all" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-2xl border-2 p-6 relative ${plan.color} transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
          >
            {plan.highlighted && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-full shadow-lg shadow-purple-200/50">
                Recommended
              </span>
            )}
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  plan.highlighted ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-600"
                }`}
              >
                <plan.icon size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
              </div>
            </div>
            <div className="mb-6">
              <span className="text-3xl font-extrabold text-gray-900">
                ₹{plan.displayPrice || plan.price}
              </span>
              <span className="text-sm text-gray-500 ml-1">{plan.period}</span>
            </div>
            <ul className="space-y-3 mb-6">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-gray-700">
                  <Check size={16} className="text-green-500 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handlePayment(plan)}
              disabled={currentPlan.toLowerCase() === plan.id || processing}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${plan.highlighted && currentPlan.toLowerCase() !== plan.id ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-xl hover:shadow-purple-200/50 hover:-translate-y-0.5" : plan.buttonClass}`}
            >
              {processing && plan.highlighted ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing...
                </>
              ) : currentPlan.toLowerCase() === plan.id ? (
                <>
                  <ShieldCheck size={16} />
                  Current Plan
                </>
              ) : (
                plan.buttonText
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Payment security note */}
      <div className="mt-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 border border-gray-100">
          <ShieldCheck size={14} className="text-green-500" />
          <p className="text-xs text-gray-400 font-medium">
            Payments are securely processed via Razorpay. We never store your card details.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Subscription;