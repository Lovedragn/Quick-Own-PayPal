"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// React Strict Mode mounts effects twice in development. Reuse the same PKCE
// exchange promise so the one-time authorization code is never redeemed twice.
let pendingOAuthCodeExchange = null;

function exchangeOAuthCodeOnce(code) {
  if (pendingOAuthCodeExchange?.code === code) {
    return pendingOAuthCodeExchange.promise;
  }

  const promise = supabase.auth.exchangeCodeForSession(code).then((result) => {
    if (result.error && pendingOAuthCodeExchange?.code === code) {
      pendingOAuthCodeExchange = null;
    }
    return result;
  }).catch((error) => {
    if (pendingOAuthCodeExchange?.code === code) {
      pendingOAuthCodeExchange = null;
    }
    throw error;
  });

  pendingOAuthCodeExchange = { code, promise };
  return promise;
}

function safeNextPath(value) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/";
  }
  return value;
}

function readAuthError(url) {
  const query = url.searchParams;
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const description =
    query.get("error_description") ||
    hash.get("error_description") ||
    query.get("error") ||
    hash.get("error");
  return description ? description.replace(/\+/g, " ") : "";
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("Completing your secure sign-in…");

  useEffect(() => {
    let active = true;

    async function completeAuthentication() {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error(
          "Supabase is not configured with a valid publishable key. Update NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in the Frontend Dev run configuration, then restart the frontend.",
        );
      }

      const currentUrl = new URL(window.location.href);
      const authError = readAuthError(currentUrl);
      if (authError) throw new Error(authError);

      const nextPath = safeNextPath(currentUrl.searchParams.get("next") || "/");
      const code = currentUrl.searchParams.get("code");

      if (code) {
        const { data, error: exchangeError } =
          await exchangeOAuthCodeOnce(code);
        if (exchangeError) {
          throw new Error(
            exchangeError.message ||
              "Google sign-in could not be completed. Please try again in this browser.",
          );
        }
        if (!data?.session) {
          throw new Error(
            "Google returned successfully, but Supabase did not create a session. Please try signing in again.",
          );
        }
      } else {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data?.session) {
          throw new Error(
            "No authenticated session was returned. Check the Supabase Google provider and redirect URL settings, then try again.",
          );
        }
      }

      if (!active) return;
      setMessage("Signed in successfully. Redirecting…");
      router.replace(nextPath);
      router.refresh();
    }

    completeAuthentication().catch((authError) => {
      if (active) {
        console.error("OAuth callback failed:", authError);
        setError(
          authError?.message ||
            "Sign-in could not be completed. Please return to the login page and try again.",
        );
      }
    });

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 px-6">
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        {error ? (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              !
            </div>
            <h1 className="text-xl font-semibold text-zinc-900">
              Sign-in could not be completed
            </h1>
            <p className="mt-3 break-words text-sm leading-6 text-rose-700">
              {error}
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex rounded-lg bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Return to login
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900" />
            <h1 className="text-xl font-semibold text-zinc-900">
              QuickOwn sign-in
            </h1>
            <p className="mt-2 text-sm text-zinc-600">{message}</p>
          </>
        )}
      </section>
    </main>
  );
}
