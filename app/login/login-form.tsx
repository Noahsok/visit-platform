"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

const ADMIN_ROLES = ["owner", "manager"];

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/newburgh";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!result?.ok) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    // Fetch session to determine redirect based on role
    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    const role = session?.user?.role;

    if (role && ADMIN_ROLES.includes(role)) {
      router.push(callbackUrl);
    } else {
      // Staff roles redirect to staff view
      const venue = callbackUrl.split("/")[1] || "newburgh";
      router.push(`/${venue}/staff`);
    }

    router.refresh();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "360px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <span
            className="logo"
            style={{ fontSize: "28px", display: "block", marginBottom: "8px" }}
          >
            Visit
          </span>
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
            Sign in to continue
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label className="form-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-row">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p
              style={{
                color: "var(--danger)",
                fontSize: "13px",
                marginBottom: "14px",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn"
            disabled={loading}
            style={{ width: "100%", padding: "12px", fontSize: "14px" }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
