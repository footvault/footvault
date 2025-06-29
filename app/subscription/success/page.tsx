"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function SubscriptionSuccessPage() {
  const params = useSearchParams();

  useEffect(() => {
    // Optionally, call your backend to verify and update the user's plan
    // You can POST params to your own API if you want to sync immediately
  }, [params]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] bg-gradient-to-br from-green-100 to-blue-100">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-lg w-full flex flex-col items-center">
        <svg width="64" height="64" fill="none" viewBox="0 0 24 24" className="mb-4">
          <circle cx="12" cy="12" r="12" fill="#22c55e" />
          <path d="M7 13l3 3 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h1 className="text-3xl font-bold text-green-700 mb-2 text-center">Subscription Successful!</h1>
        <p className="text-lg text-gray-700 mb-6 text-center">
          Thank you for subscribing. Your plan is now active.<br />
          You can now enjoy all the premium features.
        </p>
        <a
          href="/subscription"
          className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg font-semibold shadow hover:bg-green-700 transition"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
