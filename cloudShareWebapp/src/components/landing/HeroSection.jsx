import { Link } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { Cloud, ArrowRight, Shield, Zap, Users } from "lucide-react";
import dashboardImg from "../../assets/dashboard.png";

const HeroSection = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      {/* Animated gradient blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-purple-200/40 blur-3xl animate-float" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-200/40 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
      <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-pink-100/30 blur-3xl animate-float" style={{ animationDelay: "0.8s" }} />

      {/* Navbar */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-16 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-200">
            <Cloud className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent">
            CloudShare
          </span>
        </div>
        <div className="flex items-center gap-3">
          <SignedOut>
            <Link
              to="/sign-in"
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:text-purple-600 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/sign-up"
              className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl hover:shadow-lg hover:shadow-purple-200 transition-all duration-300 hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              to="/dashboard"
              className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl hover:shadow-lg hover:shadow-purple-200 transition-all duration-300"
            >
              Dashboard
            </Link>
          </SignedIn>
        </div>
      </nav>

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 pt-20 pb-8">
        {/* Badge */}
        <div className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 border border-purple-100 mb-6">
          <Zap size={14} className="text-purple-600" />
          <span className="text-xs font-semibold text-purple-700 tracking-wide">
            Next-Gen Cloud File Sharing
          </span>
        </div>

        <h1 className="animate-fade-in-up stagger-1 text-5xl font-extrabold text-gray-900 sm:text-6xl md:text-7xl leading-tight tracking-tight">
          Share Files{" "}
          <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent animate-gradient">
            Securely
          </span>
          <br />
          <span className="text-gray-400">with CloudShare</span>
        </h1>

        <p className="animate-fade-in-up stagger-2 mt-6 text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Upload, share, and manage your files with enterprise-grade security.
          Toggle public/private access and collaborate with anyone via smart links.
        </p>

        <div className="animate-fade-in-up stagger-3 mt-10 flex gap-4 justify-center">
          <SignedOut>
            <Link
              to="/sign-up"
              className="group inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-xl hover:shadow-purple-200/50 transition-all duration-300 font-semibold text-[15px] hover:-translate-y-0.5"
            >
              Get Started Free
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/sign-in"
              className="px-8 py-3.5 border-2 border-gray-200 text-gray-700 rounded-xl hover:border-purple-300 hover:text-purple-600 transition-all duration-300 font-semibold text-[15px]"
            >
              Sign In
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              to="/dashboard"
              className="group inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-xl hover:shadow-purple-200/50 transition-all duration-300 font-semibold text-[15px]"
            >
              Go to Dashboard
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </SignedIn>
        </div>

        {/* Trust badges */}
        <div className="animate-fade-in-up stagger-4 mt-10 flex flex-wrap items-center justify-center gap-6 text-gray-400 text-xs font-medium">
          <span className="flex items-center gap-1.5"><Shield size={14} className="text-green-500" /> End-to-end encryption</span>
          <span className="flex items-center gap-1.5"><Users size={14} className="text-blue-500" /> 10,000+ users</span>
          <span className="flex items-center gap-1.5"><Zap size={14} className="text-amber-500" /> 99.9% uptime</span>
        </div>

        {/* Dashboard preview */}
        <div className="animate-fade-in-up stagger-5 mt-16 w-full flex justify-center">
          <div className="w-full max-w-5xl rounded-2xl shadow-2xl shadow-purple-200/30 overflow-hidden border border-gray-200/60 ring-1 ring-gray-100">
            <img
              src={dashboardImg}
              alt="cloud share dashboard"
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
