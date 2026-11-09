"use client";

import { useState } from "react";
import { signInWithGoogle, isSupabaseConfigured } from "@/lib/supabase";

export default function GoogleAuthButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError("");

    try {
      if (!isSupabaseConfigured) {
        throw new Error(
          "Supabase publishable key is missing or incomplete. Copy the complete key from Supabase Project Settings → API Keys into NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in the Frontend Dev run configuration, then restart the frontend."
        );
      }
      const { error: authError } = await signInWithGoogle();
      if (authError) throw authError;
    } catch (err) {
      console.error("Google Auth error:", err);
      setError(err.message || "Failed to start Google sign in");
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={loading}
        className="google-auth-btn"
      >
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
            transform="translate(0 4)"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.73 7.16l7.24 5.62c4.23-3.9 6.53-9.63 6.53-17.25Z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a24 24 0 0 0 0 21.56l7.98-6.19Z"
            transform="translate(0 0)"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.9-5.78l-7.24-5.62c-2.01 1.35-4.59 2.15-8.66 2.15-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
          />
        </svg>

        <span>{loading ? "Redirecting..." : "Continue with Google"}</span>
      </button>
      {error && <p className="text-xs text-rose-500 mt-2 text-center">{error}</p>}
    </div>
  );
}
