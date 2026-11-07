
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, LockKeyhole, ArrowRight, ShieldCheck } from "lucide-react";
import "../auth.css"

import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import AuthInput from "@/components/auth/AuthInput";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Invalid email or password.");
      }

      router.push("/");
      router.refresh();

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-layout">

        {/* Left Branding Section */}
        <div className="auth-visual">
          <Link href="/" className="auth-brand">
            <span className="brand-icon">Q</span>
            <span>
              Quick<span>Own</span>
            </span>
          </Link>

          <div className="auth-visual-content">
            <div className="visual-tag">
              <span className="visual-dot" />
              Welcome back
            </div>

            <h1>
              Shopping
              <br />
              <span>made smarter.</span>
            </h1>

            <p>
              Your smarter shopping experience
              is just one step away. Sign in and
              continue where you left off.
            </p>

            <div className="visual-features">
              <div>
                <ShieldCheck size={20} />
                <span>Secure account access</span>
              </div>
              <div>
                <ShieldCheck size={20} />
                <span>Manage your wishlist</span>
              </div>
              <div>
                <ShieldCheck size={20} />
                <span>Track your orders</span>
              </div>
            </div>
          </div>

          <p className="visual-footer">
            © 2026 QuickOwn. All rights reserved.
          </p>
        </div>

        {/* Right Login Section */}
        <div className="auth-form-section">
          <div className="auth-form-card">

            <div className="auth-mobile-brand">
              <Link href="/" className="auth-brand">
                <span className="brand-icon">Q</span>
                <span>
                  Quick<span>Own</span>
                </span>
              </Link>
            </div>

            <div className="auth-heading">
              <span className="auth-eyebrow">WELCOME BACK</span>
              <h2>Sign in to QuickOwn</h2>
              <p>
                Enter your credentials to access your account.
              </p>
            </div>

            <GoogleAuthButton />

            <div className="auth-divider">
              <span />
              <p>OR CONTINUE WITH EMAIL</p>
              <span />
            </div>

            <form onSubmit={handleSubmit} className="auth-form">

              <AuthInput
                label="Email address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={Mail}
                autoComplete="email"
              />

              <AuthInput
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={LockKeyhole}
                autoComplete="current-password"
              />

              {error && (
                <p className="auth-error">{error}</p>
              )}

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
                {!loading && <ArrowRight size={18} />}
              </button>

            </form>

            <p className="auth-switch">
              Don't have an account?
              <Link href="/signup">Create an account</Link>
            </p>

            <p className="auth-terms">
              Secure login powered by QuickOwn.
            </p>

          </div>
        </div>

      </section>
    </main>
  );
}
