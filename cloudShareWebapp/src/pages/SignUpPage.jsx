import { useState, useCallback } from "react";
import { useSignUp } from "@clerk/clerk-react";
import { Link, useNavigate } from "react-router-dom";
import { Cloud, Mail, Lock, User, ArrowRight, Loader2, KeyRound } from "lucide-react";

const CardWrapper = ({ children, title, subtitle }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-indigo-50 px-4 relative overflow-hidden">
    <div className="absolute top-[-15%] left-[-10%] w-96 h-96 rounded-full bg-purple-200/40 blur-3xl" />
    <div className="absolute bottom-[-10%] right-[-5%] w-80 h-80 rounded-full bg-indigo-200/40 blur-3xl" />

    <div className="relative w-full max-w-md">
      <div className="flex items-center justify-center gap-2.5 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-200">
          <Cloud className="w-5 h-5 text-white" />
        </div>
        <span className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent">
          CloudShare
        </span>
      </div>
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-purple-100/50 border border-gray-200/60 p-8">
        <h2 className="text-2xl font-bold text-gray-900 text-center">{title}</h2>
        <p className="text-sm text-gray-500 text-center mt-1.5 mb-6">{subtitle}</p>
        {children}
      </div>
      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account?{" "}
        <Link to="/sign-in" className="text-purple-600 font-semibold hover:text-purple-700 transition-colors">
          Sign In
        </Link>
      </p>
    </div>
  </div>
);

const SignUpPage = () => {
  const { signUp, isLoaded, setActive } = useSignUp();
  const navigate = useNavigate();

  const [step, setStep] = useState("form"); // "form" | "verify"
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = useCallback(
    async (e) => {
      e.preventDefault();
      if (!isLoaded) return;
      setLoading(true);
      setError("");
      try {
        await signUp.create({
          firstName,
          lastName,
          emailAddress: email,
          password,
        });

        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });

        setStep("verify");
      } catch (err) {
        setError(err.errors?.[0]?.longMessage || err.message || "Sign-up failed");
      } finally {
        setLoading(false);
      }
    },
    [isLoaded, signUp, firstName, lastName, email, password]
  );

  const handleVerify = useCallback(
    async (e) => {
      e.preventDefault();
      if (!isLoaded) return;
      setLoading(true);
      setError("");
      try {
        const result = await signUp.attemptEmailAddressVerification({
          code: verifyCode,
        });
        if (result.status === "complete") {
          await setActive({ session: result.createdSessionId });
          navigate("/dashboard");
        } else {
          setError("Verification incomplete. Please try again.");
        }
      } catch (err) {
        setError(err.errors?.[0]?.longMessage || err.message || "Invalid verification code");
      } finally {
        setLoading(false);
      }
    },
    [isLoaded, signUp, verifyCode, setActive, navigate]
  );

  if (step === "form") {
    return (
      <CardWrapper title="Create Account" subtitle="Get started with CloudShare for free">
        <form onSubmit={handleSignUp} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="w-full px-3 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all text-sm"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg hover:shadow-purple-200/50 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>
      </CardWrapper>
    );
  }

  // ─── Step: Verify email OTP ──────────────────────────────
  return (
    <CardWrapper title="Verify Email" subtitle={`Enter the code sent to ${email}`}>
      <form onSubmit={handleVerify} className="space-y-4">
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
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all tracking-[0.3em] text-center font-mono text-lg"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5 text-center">Check your inbox for a 6-digit code</p>
        </div>

        <button
          type="submit"
          disabled={loading || verifyCode.length < 6}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg hover:shadow-purple-200/50 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
          {loading ? "Verifying…" : "Verify & Continue"}
        </button>

        <button
          type="button"
          onClick={async () => {
            try {
              await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
            } catch (err) {
              setError(err.errors?.[0]?.longMessage || err.message || "Failed to resend verification code");
            }
          }}
          className="w-full text-center text-sm text-purple-600 font-semibold hover:text-purple-700 transition-colors"
        >
          Resend Code
        </button>
      </form>
    </CardWrapper>
  );
};

export default SignUpPage;
