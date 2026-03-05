import { useState, useCallback } from "react";
import { useSignIn } from "@clerk/clerk-react";
import { Link, useNavigate } from "react-router-dom";
import { Cloud, Mail, Lock, ArrowRight, Loader2, KeyRound, ArrowLeft } from "lucide-react";

  // ─── Shared card wrapper ─────────────────────────────────
  const CardWrapper = ({ children, title, subtitle }) => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-indigo-50 px-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-15%] left-[-10%] w-96 h-96 rounded-full bg-purple-200/40 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-5%] w-80 h-80 rounded-full bg-indigo-200/40 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-200">
            <Cloud className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent">
            CloudShare
          </span>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-purple-100/50 border border-gray-200/60 p-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center">{title}</h2>
          <p className="text-sm text-gray-500 text-center mt-1.5 mb-6">{subtitle}</p>
          {children}
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{" "}
          <Link to="/sign-up" className="text-purple-600 font-semibold hover:text-purple-700 transition-colors">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );


const SignInPage = () => {
  const { signIn, isLoaded, setActive } = useSignIn();
  const navigate = useNavigate();

  // "choose" | "password" | "otp-send" | "otp-verify"
  const [mode, setMode] = useState("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ─── Email + Password sign-in ─────────────────────────────
  const handlePasswordSignIn = useCallback(
    async (e) => {
      e.preventDefault();
      if (!isLoaded) return;
      setLoading(true);
      setError("");
      try {
        const result = await signIn.create({
          identifier: email,
          password,
        });
        if (result.status === "complete") {
          await setActive({ session: result.createdSessionId });
          navigate("/dashboard");
        } else {
          setError("Sign-in could not be completed. Please try again.");
        }
      } catch (err) {
        setError(err.errors?.[0]?.longMessage || err.message || "Sign-in failed");
      } finally {
        setLoading(false);
      }
    },
    [isLoaded, signIn, email, password, setActive, navigate]
  );

  // ─── Send OTP to email ───────────────────────────────────
  const handleSendOtp = useCallback(
    async (e) => {
      e.preventDefault();
      if (!isLoaded) return;
      setLoading(true);
      setError("");
      try {
        const result = await signIn.create({
          identifier: email,
        });

        // Find the email_code first factor
        const emailCodeFactor = result.supportedFirstFactors?.find(
          (f) => f.strategy === "email_code"
        );

        if (!emailCodeFactor) {
          setError("Email OTP is not available for this account. Try password sign-in.");
          setLoading(false);
          return;
        }

        await signIn.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: emailCodeFactor.emailAddressId,
        });

        setMode("otp-verify");
      } catch (err) {
        setError(err.errors?.[0]?.longMessage || err.message || "Failed to send OTP");
      } finally {
        setLoading(false);
      }
    },
    [isLoaded, signIn, email]
  );

  // ─── Verify OTP code ─────────────────────────────────────
  const handleVerifyOtp = useCallback(
    async (e) => {
      e.preventDefault();
      if (!isLoaded) return;
      setLoading(true);
      setError("");
      try {
        const result = await signIn.attemptFirstFactor({
          strategy: "email_code",
          code: otpCode,
        });
        if (result.status === "complete") {
          await setActive({ session: result.createdSessionId });
          navigate("/dashboard");
        } else {
          setError("Verification incomplete. Please try again.");
        }
      } catch (err) {
        setError(err.errors?.[0]?.longMessage || err.message || "Invalid OTP code");
      } finally {
        setLoading(false);
      }
    },
    [isLoaded, signIn, otpCode, setActive, navigate]
  );

  // ─── Mode: Choose method ─────────────────────────────────
  if (mode === "choose") {
    return (
      <CardWrapper title="Welcome" subtitle="Choose how you'd like to sign in">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => { setError(""); setMode("password"); }}
            className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all duration-200 text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-sm">
              <Lock size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">Email & Password</p>
              <p className="text-xs text-gray-400">Sign in with your credentials</p>
            </div>
            <ArrowRight size={16} className="text-gray-300 group-hover:text-purple-500 transition-colors" />
          </button>

          <button
            onClick={() => { setError(""); setMode("otp-send"); }}
            className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all duration-200 text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-sm">
              <KeyRound size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">Email OTP</p>
              <p className="text-xs text-gray-400">Get a one-time code sent to your email</p>
            </div>
            <ArrowRight size={16} className="text-gray-300 group-hover:text-purple-500 transition-colors" />
          </button>
        </div>
      </CardWrapper>
    );
  }

  // ─── Mode: Password sign-in ──────────────────────────────
  if (mode === "password") {
    return (
      <CardWrapper title="Sign In" subtitle="Enter your email and password">
        <form onSubmit={handlePasswordSignIn} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  autoComplete="username"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  autoComplete="current-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg hover:shadow-purple-200/50 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
            {loading ? "Signing in…" : "Sign In"}
          </button>

          <button
            type="button"
            onClick={() => { setError(""); setMode("choose"); }}
            className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-purple-600 transition-colors mt-2"
          >
            <ArrowLeft size={14} /> Back to options
          </button>
        </form>
      </CardWrapper>
    );
  }

  // ─── Mode: OTP — Enter email ─────────────────────────────
  if (mode === "otp-send") {
    return (
      <CardWrapper title="Email OTP" subtitle="We'll send a verification code to your email">
        <form onSubmit={handleSendOtp} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-lg hover:shadow-emerald-200/50 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
            {loading ? "Sending code…" : "Send OTP Code"}
          </button>

          <button
            type="button"
            onClick={() => { setError(""); setMode("choose"); }}
            className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-purple-600 transition-colors mt-2"
          >
            <ArrowLeft size={14} /> Back to options
          </button>
        </form>
      </CardWrapper>
    );
  }

  // ─── Mode: OTP — Verify code ─────────────────────────────
  if (mode === "otp-verify") {
    return (
      <CardWrapper title="Verify OTP" subtitle={`Enter the code sent to ${email}`}>
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Verification Code</label>
            <div className="relative">
              <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="******"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all tracking-[0.3em] text-center font-mono text-lg"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5 text-center">Check your inbox for a 6-digit code</p>
          </div>

          <button
            type="submit"
            disabled={loading || otpCode.length < 6}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg hover:shadow-purple-200/50 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
            {loading ? "Verifying…" : "Verify & Sign In"}
          </button>

          <div className="flex items-center justify-between mt-2">
            <button
              type="button"
              onClick={() => { setError(""); setMode("otp-send"); }}
              className="text-sm text-gray-500 hover:text-purple-600 transition-colors flex items-center gap-1"
            >
              <ArrowLeft size={14} /> Change email
            </button>
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading}
              className="text-sm text-purple-600 font-semibold hover:text-purple-700 transition-colors disabled:opacity-50"
            >
              Resend Code
            </button>
          </div>
        </form>
      </CardWrapper>
    );
  }

  return null;
};

export default SignInPage;
