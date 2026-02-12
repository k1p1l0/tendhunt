"use client";

import React, { useState, useRef } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { cn } from "@/lib/utils";
import { CheckCircle } from "lucide-react";

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "PLACEHOLDER-SITE-KEY";

const roles = [
  "Business Development",
  "Sales",
  "Bid Manager",
  "Director / C-Suite",
  "Procurement",
  "Other",
] as const;

export function WaitlistForm() {
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileInstance>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!turnstileToken) {
      setError("Please complete the verification");
      return;
    }

    setStatus("submitting");
    setError("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          company: formData.get("company"),
          role: formData.get("role"),
          "cf-turnstile-response": turnstileToken,
        }),
      });

      const data = (await res.json()) as { error?: string; success?: boolean };

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setStatus("error");
        turnstileRef.current?.reset();
        return;
      }

      setStatus("success");
    } catch {
      setError("Network error — please try again");
      setStatus("error");
      turnstileRef.current?.reset();
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <CheckCircle className="size-12 text-green-500" />
        <p className="text-charcoal-700 text-lg font-medium dark:text-neutral-100">
          You&apos;re on the list!
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          We&apos;ll email you when TendHunt launches.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <input
          type="email"
          name="email"
          required
          placeholder="Work email"
          className={cn(
            "rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition",
            "focus:border-brand focus:ring-brand/20 focus:ring-2",
            "dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder-gray-500"
          )}
        />
        <input
          type="text"
          name="company"
          required
          placeholder="Company name"
          className={cn(
            "rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition",
            "focus:border-brand focus:ring-brand/20 focus:ring-2",
            "dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder-gray-500"
          )}
        />
      </div>

      <select
        name="role"
        required
        defaultValue=""
        className={cn(
          "rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition",
          "focus:border-brand focus:ring-brand/20 focus:ring-2",
          "dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder-gray-500"
        )}
      >
        <option value="" disabled>
          Your role
        </option>
        {roles.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>

      <div className="flex justify-center">
        <Turnstile
          ref={turnstileRef}
          siteKey={TURNSTILE_SITE_KEY}
          onSuccess={setTurnstileToken}
          onExpire={() => setTurnstileToken("")}
          options={{ theme: "auto", size: "normal" }}
        />
      </div>

      {error && (
        <p className="text-center text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className={cn(
          "bg-charcoal-900 rounded-xl px-6 py-3 text-sm font-medium text-white transition duration-150 active:scale-[0.98] sm:text-base",
          "dark:bg-white dark:text-black",
          "disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        {status === "submitting" ? "Submitting..." : "Join the Waitlist"}
      </button>
    </form>
  );
}
