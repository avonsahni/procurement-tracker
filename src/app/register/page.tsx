"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import {
  Building2, Globe, Phone, MapPin, User, Mail, Lock,
  ChevronRight, ChevronLeft, CheckCircle2, Package,
  Briefcase, ArrowRight, Loader2, Eye, EyeOff,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  // Step 1 — Organisation
  orgName:      string;
  orgType:      string;
  website:      string;
  // Step 2 — Location & Contact
  addressLine1: string;
  city:         string;
  stateRegion:  string;
  country:      string;
  phone:        string;
  // Step 3 — Admin Account
  fullName:     string;
  jobTitle:     string;
  email:        string;
  password:     string;
  confirmPassword: string;
  agreeTerms:   boolean;
}

const EMPTY: FormData = {
  orgName: "", orgType: "", website: "",
  addressLine1: "", city: "", stateRegion: "", country: "", phone: "",
  fullName: "", jobTitle: "", email: "", password: "", confirmPassword: "", agreeTerms: false,
};

const ORG_TYPES = [
  "Construction", "Engineering", "Real Estate", "Infrastructure",
  "Architecture", "Project Management", "Facilities Management", "Other",
];

const COUNTRIES = [
  "United Kingdom", "India", "United Arab Emirates", "United States",
  "Australia", "Canada", "Singapore", "Germany", "France", "Netherlands",
  "Saudi Arabia", "Qatar", "Other",
];

// ─── Step indicator (matches procurement timeline style) ───────────────────────

const STEPS = [
  { num: 1, label: "Organisation" },
  { num: 2, label: "Location & Contact" },
  { num: 3, label: "Admin Account" },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEPS.map((s, i) => {
        const done    = s.num < current;
        const active  = s.num === current;
        return (
          <div key={s.num} className="flex items-center">
            {/* Circle */}
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all ${
                done   ? "bg-emerald-500 border-emerald-500 text-white" :
                active ? "bg-blue-600 border-blue-600 text-white" :
                         "bg-white border-slate-300 text-slate-400"
              }`}>
                {done ? <CheckCircle2 className="w-5 h-5" /> : s.num}
              </div>
              <span className={`mt-1.5 text-[11px] font-medium whitespace-nowrap ${
                active ? "text-blue-600" : done ? "text-emerald-600" : "text-slate-400"
              }`}>{s.label}</span>
            </div>
            {/* Connector */}
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-16 sm:w-24 mx-1 mb-5 transition-all ${
                s.num < current ? "bg-emerald-400" : "bg-slate-200"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Field helpers ────────────────────────────────────────────────────────────

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Input({ icon: Icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon?: any }) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
      <input
        {...props}
        className={`w-full py-2.5 border border-slate-200 rounded-xl outline-none
          focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
          text-sm text-slate-900 placeholder-slate-400 bg-white transition
          ${Icon ? "pl-10 pr-4" : "px-4"}`}
      />
    </div>
  );
}

function Select({ icon: Icon, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { icon?: any }) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />}
      <select
        {...props}
        className={`w-full py-2.5 border border-slate-200 rounded-xl outline-none
          focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
          text-sm text-slate-900 bg-white appearance-none transition
          ${Icon ? "pl-10 pr-8" : "px-4 pr-8"}`}
      >
        {children}
      </select>
      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 rotate-90 pointer-events-none" />
    </div>
  );
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function Step1({ data, onChange, errors }: {
  data: FormData;
  onChange: (k: keyof FormData, v: string) => void;
  errors: Partial<Record<keyof FormData, string>>;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Organisation Details</h2>
        <p className="text-sm text-slate-500 mt-1">Tell us about your company — this becomes your workspace name.</p>
      </div>

      <Field label="Organisation Name" required error={errors.orgName}>
        <Input icon={Building2} placeholder="e.g. Tata Communications Ltd"
          value={data.orgName} onChange={e => onChange("orgName", e.target.value)} />
      </Field>

      <Field label="Industry / Type" required error={errors.orgType}>
        <Select icon={Briefcase} value={data.orgType} onChange={e => onChange("orgType", e.target.value)}>
          <option value="">Select organisation type</option>
          {ORG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
      </Field>

      <Field label="Website" error={errors.website}>
        <Input icon={Globe} placeholder="https://yourcompany.com" type="url"
          value={data.website} onChange={e => onChange("website", e.target.value)} />
      </Field>

      {/* Info callout */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3.5 flex gap-3">
        <Package className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Your organisation will have its own isolated workspace. All projects, packages,
          and vendors are private to your team.
        </p>
      </div>
    </div>
  );
}

function Step2({ data, onChange, errors }: {
  data: FormData;
  onChange: (k: keyof FormData, v: string) => void;
  errors: Partial<Record<keyof FormData, string>>;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Location & Contact</h2>
        <p className="text-sm text-slate-500 mt-1">Registered office address and primary contact details.</p>
      </div>

      <Field label="Address" required error={errors.addressLine1}>
        <Input icon={MapPin} placeholder="123 Business Park, Floor 4"
          value={data.addressLine1} onChange={e => onChange("addressLine1", e.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="City" required error={errors.city}>
          <Input placeholder="Mumbai" value={data.city} onChange={e => onChange("city", e.target.value)} />
        </Field>
        <Field label="State / Region">
          <Input placeholder="Maharashtra" value={data.stateRegion} onChange={e => onChange("stateRegion", e.target.value)} />
        </Field>
      </div>

      <Field label="Country" required error={errors.country}>
        <Select icon={Globe} value={data.country} onChange={e => onChange("country", e.target.value)}>
          <option value="">Select country</option>
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
      </Field>

      <Field label="Phone Number" required error={errors.phone}>
        <Input icon={Phone} placeholder="+91 98765 43210" type="tel"
          value={data.phone} onChange={e => onChange("phone", e.target.value)} />
      </Field>
    </div>
  );
}

function Step3({ data, onChange, errors }: {
  data: FormData;
  onChange: (k: keyof FormData, v: string | boolean) => void;
  errors: Partial<Record<keyof FormData, string>>;
}) {
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Admin Account</h2>
        <p className="text-sm text-slate-500 mt-1">
          This will be the first user and administrator of your workspace.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Full Name" required error={errors.fullName}>
          <Input icon={User} placeholder="Jane Smith"
            value={data.fullName} onChange={e => onChange("fullName", e.target.value)} />
        </Field>
        <Field label="Job Title" required error={errors.jobTitle}>
          <Input icon={Briefcase} placeholder="Project Director"
            value={data.jobTitle} onChange={e => onChange("jobTitle", e.target.value)} />
        </Field>
      </div>

      <Field label="Email Address" required error={errors.email}>
        <Input icon={Mail} type="email" placeholder="jane@yourcompany.com"
          value={data.email} onChange={e => onChange("email", e.target.value)} />
      </Field>

      <Field label="Password" required error={errors.password}>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type={showPass ? "text" : "password"}
            placeholder="Minimum 8 characters"
            value={data.password}
            onChange={e => onChange("password", e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm text-slate-900 placeholder-slate-400 bg-white transition"
          />
          <button type="button" onClick={() => setShowPass(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </Field>

      <Field label="Confirm Password" required error={errors.confirmPassword}>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type={showConfirm ? "text" : "password"}
            placeholder="Repeat your password"
            value={data.confirmPassword}
            onChange={e => onChange("confirmPassword", e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm text-slate-900 placeholder-slate-400 bg-white transition"
          />
          <button type="button" onClick={() => setShowConfirm(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </Field>

      {/* Password strength */}
      {data.password && (
        <div className="space-y-1">
          {[
            { label: "At least 8 characters", ok: data.password.length >= 8 },
            { label: "Passwords match",        ok: data.password === data.confirmPassword && data.confirmPassword.length > 0 },
          ].map(({ label, ok }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${ok ? "bg-emerald-500" : "bg-slate-200"}`}>
                {ok && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              <span className={`text-xs ${ok ? "text-emerald-600" : "text-slate-400"}`}>{label}</span>
            </div>
          ))}
        </div>
      )}

      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={data.agreeTerms}
          onChange={e => onChange("agreeTerms", e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-blue-600 flex-shrink-0"
        />
        <span className="text-xs text-slate-500 leading-relaxed group-hover:text-slate-700 transition">
          I agree to the{" "}
          <span className="text-blue-600 font-medium">Terms of Service</span> and{" "}
          <span className="text-blue-600 font-medium">Privacy Policy</span>.
          Your organisation's data is isolated and never shared with other accounts.
        </span>
      </label>
      {errors.agreeTerms && <p className="text-xs text-red-600">{errors.agreeTerms}</p>}
    </div>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({ orgName, email, onGoToLogin }: {
  orgName: string; email: string; onGoToLogin: () => void;
}) {
  return (
    <div className="text-center py-6 space-y-5">
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-emerald-500" />
        </div>
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-900">Organisation registered!</h2>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-sm mx-auto">
          <strong className="text-slate-700">{orgName}</strong> has been created. A confirmation
          email has been sent to <strong className="text-slate-700">{email}</strong>.
          Confirm your email then sign in to get started.
        </p>
      </div>
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-sm text-slate-600 text-left space-y-1.5 max-w-sm mx-auto">
        <p className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Private workspace created</p>
        <p className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> You are the organisation admin</p>
        <p className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 14-day free trial started</p>
      </div>
      <button
        onClick={onGoToLogin}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition"
      >
        Go to Sign In <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Main registration page ───────────────────────────────────────────────────

export default function RegisterPage() {
  const { signup } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [done, setDone] = useState(false);

  const set = (k: keyof FormData, v: string | boolean) =>
    setData(d => ({ ...d, [k]: v }));

  // ── Validation per step ──────────────────────────────────────────────────

  function validateStep1(): boolean {
    const e: typeof errors = {};
    if (!data.orgName.trim())  e.orgName  = "Organisation name is required";
    if (!data.orgType)         e.orgType  = "Please select an organisation type";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2(): boolean {
    const e: typeof errors = {};
    if (!data.addressLine1.trim()) e.addressLine1 = "Address is required";
    if (!data.city.trim())         e.city         = "City is required";
    if (!data.country)             e.country      = "Please select a country";
    if (!data.phone.trim())        e.phone        = "Phone number is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep3(): boolean {
    const e: typeof errors = {};
    if (!data.fullName.trim())  e.fullName  = "Your name is required";
    if (!data.jobTitle.trim())  e.jobTitle  = "Job title is required";
    if (!data.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
                                e.email     = "Valid email address required";
    if (data.password.length < 8)
                                e.password  = "Minimum 8 characters";
    if (data.password !== data.confirmPassword)
                                e.confirmPassword = "Passwords do not match";
    if (!data.agreeTerms)       e.agreeTerms = "You must agree to continue";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Navigation ───────────────────────────────────────────────────────────

  const next = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const back = () => {
    setErrors({});
    setStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep3()) return;

    setSubmitting(true);
    setApiError("");
    try {
      const { needsConfirmation } = await signup(
        data.email, data.password, data.fullName, data.orgName,
        // Extra fields via extended signup
        {
          jobTitle: data.jobTitle,
          orgType: data.orgType,
          website: data.website,
          addressLine1: data.addressLine1,
          city: data.city,
          stateRegion: data.stateRegion,
          country: data.country,
          phone: data.phone,
        }
      );
      setDone(true);
    } catch (err: any) {
      setApiError(err.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 text-base tracking-tight">ProcureTrack</span>
        </a>
        <a href="/" className="text-sm text-slate-500 hover:text-slate-800 transition">
          Already registered? <span className="text-blue-600 font-medium">Sign in</span>
        </a>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">

          {/* Page heading */}
          {!done && (
            <div className="text-center mb-8">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Register your organisation
              </h1>
              <p className="text-sm text-slate-500 mt-1.5">
                Set up your private procurement workspace in 3 quick steps.
              </p>
            </div>
          )}

          {/* Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
            {done ? (
              <SuccessScreen
                orgName={data.orgName}
                email={data.email}
                onGoToLogin={() => router.push("/")}
              />
            ) : (
              <>
                <StepIndicator current={step} />

                {apiError && (
                  <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    {apiError}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {step === 1 && <Step1 data={data} onChange={set} errors={errors} />}
                  {step === 2 && <Step2 data={data} onChange={set} errors={errors} />}
                  {step === 3 && <Step3 data={data} onChange={set} errors={errors} />}

                  {/* Navigation buttons */}
                  <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-100">
                    {step > 1 ? (
                      <button
                        type="button"
                        onClick={back}
                        className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                      >
                        <ChevronLeft className="w-4 h-4" /> Back
                      </button>
                    ) : (
                      <a href="/"
                        className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 transition">
                        <ChevronLeft className="w-4 h-4" /> Back to home
                      </a>
                    )}

                    {step < 3 ? (
                      <button
                        type="button"
                        onClick={next}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition"
                      >
                        Continue <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-60"
                      >
                        {submitting
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating workspace…</>
                          : <><CheckCircle2 className="w-4 h-4" /> Register Organisation</>
                        }
                      </button>
                    )}
                  </div>
                </form>

                {/* Step counter */}
                <p className="text-center text-xs text-slate-400 mt-4">
                  Step {step} of {STEPS.length}
                </p>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="py-5 px-6 border-t border-slate-200 bg-white text-center">
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} ProcureTrack · GDPR compliant · Your data is private and isolated
        </p>
      </footer>
    </div>
  );
}
