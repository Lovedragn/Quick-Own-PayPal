
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, LockKeyhole, ArrowRight, ShieldCheck } from "lucide-react";

import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import AuthInput from "@/components/auth/AuthInput";
import "../auth.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to create account.");
      }

      router.push("/login");
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
              Smart shopping starts here
            </div>

            <h1>
              Own more.
              <br />
              <span>Spend less.</span>
            </h1>

            <p>
              Discover a smarter way to shop.
              Get the products you need without
              paying more than you should.
            </p>

            <div className="visual-features">
              <div>
                <ShieldCheck size={20} />
                <span>Secure authentication</span>
              </div>
              <div>
                <ShieldCheck size={20} />
                <span>Simple shopping experience</span>
              </div>
              <div>
                <ShieldCheck size={20} />
                <span>Your account, your control</span>
              </div>
            </div>
          </div>

          <p className="visual-footer">
            © 2026 QuickOwn. All rights reserved.
          </p>
        </div>

        {/* Right Signup Section */}
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
              <span className="auth-eyebrow">GET STARTED</span>
              <h2>Create your account</h2>
              <p>
                Join QuickOwn and start shopping smarter.
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
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={LockKeyhole}
                autoComplete="new-password"
              />

              <AuthInput
                label="Confirm password"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={LockKeyhole}
                autoComplete="new-password"
              />

              {error && (
                <p className="auth-error">{error}</p>
              )}

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                {loading ? "Creating account..." : "Create account"}
                {!loading && <ArrowRight size={18} />}
              </button>

            </form>

            <p className="auth-switch">
              Already have an account?
              <Link href="/login">Log in</Link>
            </p>

            <p className="auth-terms">
              By continuing, you agree to our Terms of Service
              and Privacy Policy.
            </p>

          </div>
        </div>

      </section>
    </main>
  );
}
