import { Link } from "react-router-dom";
import { Check, Sparkles } from "lucide-react";
import { pricingPlans } from "../../assets/data";

const PriceSection = () => {
  return (
    <div className="py-24 bg-white relative overflow-hidden">
      {/* Decoration */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/40 rounded-full blur-3xl" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold text-purple-600 tracking-wide uppercase mb-3">
            Pricing
          </p>
          <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Simple, Transparent{" "}
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Pricing
            </span>
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-500">
            Choose the plan that&apos;s right for you. Upgrade anytime.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          {pricingPlans.map((plan, index) => (
            <div
              key={index}
              className={`relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                plan.highlighted
                  ? "border-2 border-purple-500 ring-4 ring-purple-50 shadow-lg shadow-purple-100/30"
                  : "border border-gray-300 hover:shadow-gray-200/50"
              }`}
            >
              {plan.highlighted && (
                <span className="absolute top-0 right-4 inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-b-xl">
                  <Sparkles size={12} />
                  Most Popular
                </span>
              )}
              <div className="px-8 py-8 bg-white">
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="mt-2 text-sm text-gray-500">{plan.description}</p>
                <p className="mt-6">
                  <span className="text-5xl font-extrabold text-gray-900">₹{plan.price}</span>
                  {plan.price !== "0" && (
                    <span className="text-sm text-gray-400 ml-1">/month</span>
                  )}
                </p>
              </div>
              <div className="flex-1 px-8 py-6 bg-gray-50/50">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2.5 text-sm text-gray-600">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <Check size={12} className="text-green-600" />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="px-8 py-6 bg-white">
                <Link
                  to="/sign-up"
                  className={`block w-full py-3.5 text-center rounded-xl font-semibold text-sm transition-all duration-300 ${
                    plan.highlighted
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-purple-200/50 hover:-translate-y-0.5"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PriceSection;  
    