"use client";

import { useAuth } from "@/components/auth/AuthContext";
import { AlertCircle, Clock, XCircle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * Shown instead of the app when the user's organisation subscription is blocked:
 *   - paused by platform admin
 *   - canceled
 *   - free trial expired
 */
export default function SubscriptionGate() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const isTrialExpired =
    user?.orgStatus === "trial" &&
    user.trialEndsAt &&
    new Date(user.trialEndsAt) < new Date();

  const isPaused = user?.orgStatus === "paused";
  const isCanceled = user?.orgStatus === "canceled";

  const config = isPaused
    ? {
        icon: <AlertCircle className="w-8 h-8 text-amber-500" />,
        bg: "bg-amber-50",
        border: "border-amber-200",
        title: "Account Paused",
        message:
          "Your organisation's account has been temporarily paused. Please contact support to reactivate it.",
        color: "text-amber-700",
      }
    : isCanceled
    ? {
        icon: <XCircle className="w-8 h-8 text-red-500" />,
        bg: "bg-red-50",
        border: "border-red-200",
        title: "Subscription Canceled",
        message:
          "Your subscription has been canceled. Contact support if you believe this is a mistake or would like to reactivate.",
        color: "text-red-700",
      }
    : {
        icon: <Clock className="w-8 h-8 text-blue-500" />,
        bg: "bg-blue-50",
        border: "border-blue-200",
        title: "Free Trial Expired",
        message:
          "Your 14-day free trial has ended. Please upgrade your plan to continue using the app.",
        color: "text-blue-700",
      };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm max-w-md w-full overflow-hidden">
        {/* Header stripe */}
        <div className={`${config.bg} ${config.border} border-b px-6 py-5 flex items-start gap-4`}>
          <div className="mt-0.5 flex-shrink-0">{config.icon}</div>
          <div>
            <h1 className={`text-lg font-semibold ${config.color}`}>{config.title}</h1>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">{config.message}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Org / user info */}
          <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Account</span>
              <span className="font-medium text-slate-700 truncate ml-4">{user?.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Email</span>
              <span className="font-medium text-slate-700 truncate ml-4">{user?.username}</span>
            </div>
            {user?.trialEndsAt && (
              <div className="flex justify-between">
                <span className="text-slate-400">Trial ended</span>
                <span className="font-medium text-slate-700">
                  {new Date(user.trialEndsAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="space-y-2">
            <a
              href="mailto:support@yourapp.com?subject=Subscription%20Query"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
            >
              Contact Support
            </a>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
