"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Mail, LockKeyhole, ArrowRight, ShieldCheck } from "lucide-react";
import "../auth.css";

import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import AuthInput from "@/components/auth/AuthInput";
import GsapTextReveal from "@/components/ui/GsapTextReveal";
import { signInWithPassword, isSupabaseConfigured } from "@/lib/supabase";

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
      if (!isSupabaseConfigured) {
        throw new Error(
          "Supabase publishable key is missing or invalid. Copy the complete Publishable key (sb_publishable_...) or legacy anon key from Supabase Project Settings → API Keys into NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in the Frontend Dev run configuration, then restart the frontend."
        );
      }
      const { error: authError } = await signInWithPassword(email, password);
      if (authError) throw authError;

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
            <Image
              src="/icon.svg"
              alt="QuickOwn"
              width={34}
              height={34}
              className="w-[34px] h-[34px] object-contain"
            />
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
              <GsapTextReveal
                as="span"
                scrollTrigger={false}
                delay={0.1}
                stagger={0.06}
                duration={0.8}
                rotate={true}
              >
                Shopping
                <br />
                <span>made smarter.</span>
              </GsapTextReveal>
            </h1>

            <GsapTextReveal
              as="p"
              scrollTrigger={false}
              delay={0.3}
              stagger={0.02}
              duration={0.6}
              y="100%"
            >
              Your smarter shopping experience is just one step away. Sign in
              and continue where you left off.
            </GsapTextReveal>

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

          <p className="visual-footer">© 2026 QuickOwn. All rights reserved.</p>
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
              <GsapTextReveal
                as="h2"
                scrollTrigger={false}
                delay={0.2}
                stagger={0.05}
                duration={0.75}
                rotate={true}
              >
                Sign in to QuickOwn
              </GsapTextReveal>
              <GsapTextReveal
                as="p"
                scrollTrigger={false}
                delay={0.35}
                stagger={0.02}
                duration={0.6}
                y="100%"
              >
                Enter your credentials to access your account.
              </GsapTextReveal>
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

              {error && <p className="auth-error">{error}</p>}

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
              Don&apos;t have an account?
              <Link href="/signup">Create an account</Link>
            </p>

            <p className="auth-terms">Secure login powered by QuickOwn.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
