"use client";

import { useState, useEffect } from "react";
import { X, Check, Zap, Crown, Loader2, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

interface PricingRow {
  tier: string;
  price_inr: number;
  price_inr_annual: number | null;
  period: string;
  description: string | null;
}

interface BillingUpgradeModalProps {
  currentPlan: string;
  onClose: () => void;
  onSuccess: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PLAN_FEATURES: Record<string, string[]> = {
  starter: [
    "Up to 10 team members",
    "Unlimited packages",
    "Budget analytics",
    "Document storage",
    "Audit trail",
    "Email support",
  ],
  pro: [
    "Up to 50 team members",
    "Everything in Starter",
    "GDPR data export",
    "Priority support",
    "Custom branding",
    "Dedicated onboarding",
  ],
};

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function BillingUpgradeModal({
  currentPlan,
  onClose,
  onSuccess,
}: BillingUpgradeModalProps) {
  const [period, setPeriod]       = useState<"monthly" | "annual">("monthly");
  const [pricing, setPricing]     = useState<PricingRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [error, setError]         = useState("");

  useEffect(() => {
    apiFetch("/api/billing/pricing")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setPricing(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getPrice = (row: PricingRow) =>
    period === "annual"
      ? (row.price_inr_annual ?? row.price_inr * 10)
      : row.price_inr;

  const handleSubscribe = async (plan: "starter" | "pro") => {
    setError("");
    setSubscribing(plan);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error("Failed to load Razorpay checkout. Check your connection.");

      const res  = await apiFetch("/api/billing/subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ plan, period }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not initiate subscription");

      const { subscriptionId, keyId } = data;
      if (!keyId) throw new Error("Razorpay key not configured — contact support.");

      const row = pricing.find(p => p.tier === plan);
      const amountPaise = Math.round(getPrice(row!) * 100);

      await new Promise<void>((resolve, reject) => {
        const options = {
          key:             keyId,
          subscription_id: subscriptionId,
          name:            "ProcureTrack",
          description:     `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan — ${period}`,
          amount:          amountPaise,
          currency:        "INR",
          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_subscription_id: string;
            razorpay_signature: string;
          }) => {
            try {
              const vRes = await apiFetch("/api/billing/verify", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ ...response, plan, period }),
              });
              const vData = await vRes.json();
              if (!vRes.ok) throw new Error(vData.error || "Payment verification failed");
              resolve();
            } catch (err) { reject(err); }
          },
          modal: {
            ondismiss: () => reject(new Error("dismissed")),
          },
          theme: { color: "#2563eb" },
        };
        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (resp: any) => {
          reject(new Error(resp.error?.description || "Payment failed"));
        });
        rzp.open();
      });

      onSuccess();
    } catch (e: any) {
      if (e.message !== "dismissed") setError(e.message || "Something went wrong");
    } finally {
      setSubscribing(null);
    }
  };

  const plans: Array<{ key: "starter" | "pro"; label: string; color: string; icon: any; highlight: boolean }> = [
    { key: "starter", label: "Starter", color: "blue",   icon: Zap,   highlight: false },
    { key: "pro",     label: "Pro",     color: "violet", icon: Crown, highlight: true  },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Upgrade Your Plan</h2>
            <p className="text-sm text-slate-500 mt-0.5">Choose the plan that fits your team</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Period toggle */}
        <div className="px-6 pt-5 flex justify-center">
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
            {(["monthly", "annual"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                  period === p ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {p === "monthly" ? "Monthly" : "Annual"}
                {p === "annual" && (
                  <span className="ml-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                    2 months free
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-2 flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : plans.map(({ key, label, color, icon: Icon, highlight }) => {
            const row   = pricing.find(p => p.tier === key);
            const price = row ? getPrice(row) : null;
            const isCurrent = currentPlan === key;
            const isBusy    = subscribing === key;

            return (
              <div
                key={key}
                className={`rounded-xl border-2 p-5 flex flex-col gap-4 relative transition ${
                  highlight
                    ? "border-violet-400 bg-violet-50/30"
                    : "border-slate-200 bg-white"
                }`}
              >
                {highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    Most Popular
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    color === "violet" ? "bg-violet-100" : "bg-blue-100"
                  }`}>
                    <Icon className={`w-4 h-4 ${color === "violet" ? "text-violet-600" : "text-blue-600"}`} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{label}</h3>
                  {isCurrent && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ml-auto">
                      Current
                    </span>
                  )}
                </div>

                <div>
                  {price !== null ? (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-extrabold text-slate-900">
                          ₹{Math.round(price).toLocaleString("en-IN")}
                        </span>
                        <span className="text-sm text-slate-500">/{period === "annual" ? "year" : "month"}</span>
                      </div>
                      {period === "annual" && row && (
                        <p className="text-xs text-emerald-600 mt-0.5">
                          Saves ₹{Math.round(row.price_inr * 2).toLocaleString("en-IN")} vs monthly
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Pricing not set</p>
                  )}
                  {row?.description && (
                    <p className="text-xs text-slate-500 mt-1">{row.description}</p>
                  )}
                </div>

                <ul className="space-y-2 flex-1">
                  {(PLAN_FEATURES[key] ?? []).map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(key)}
                  disabled={isCurrent || !!subscribing || price === null}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
                    isCurrent
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : highlight
                      ? "bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50"
                      : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                  }`}
                >
                  {isBusy ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                  ) : isCurrent ? (
                    "Current Plan"
                  ) : (
                    `Subscribe to ${label}`
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Footer note */}
        <div className="px-6 pb-5 text-center text-xs text-slate-400">
          Powered by Razorpay · Secure payment · Cancel anytime · GST applicable
        </div>
      </div>
    </div>
  );
}
