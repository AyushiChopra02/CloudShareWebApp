import { Link } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { ArrowRight, Sparkles } from "lucide-react";

const CTASection = () => {
  return (
    <div className="relative py-24 overflow-hidden">
      {/* Animated gradient bg */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-700 via-indigo-600 to-purple-800 animate-gradient" />
      {/* Decorative */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />

      <div className="relative max-w-4xl mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-semibold mb-6">
          <Sparkles size={14} />
          Start for free, upgrade anytime
        </div>
        <h2 className="text-4xl font-extrabold text-white sm:text-5xl leading-tight">
          Ready to get started?
        </h2>
        <p className="mt-5 text-lg text-purple-100/80 max-w-2xl mx-auto leading-relaxed">
          Join thousands of users who trust CloudShare for secure file sharing.
          Start uploading in seconds — no credit card required.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <SignedOut>
            <Link
              to="/sign-up"
              className="group inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-purple-700 rounded-xl font-bold hover:shadow-2xl hover:shadow-purple-900/30 transition-all duration-300 hover:-translate-y-0.5"
            >
              Create Free Account
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              to="/dashboard"
              className="group inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-purple-700 rounded-xl font-bold hover:shadow-2xl hover:shadow-purple-900/30 transition-all duration-300 hover:-translate-y-0.5"
            >
              Go to Dashboard
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </SignedIn>
        </div>
      </div>
    </div>
  );
};

export default CTASection;