"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

const ADMIN_ROLES = ["owner", "manager"];

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/newburgh";
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      passcode,
      redirect: false,
    });

    if (!result?.ok) {
      setError("Invalid passcode");
      setLoading(false);
      setPasscode("");
      return;
    }

    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    const role = session?.user?.role;

    if (role && ADMIN_ROLES.includes(role)) {
      router.push(callbackUrl);
    } else {
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
      <div style={{ width: "100%", maxWidth: "300px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <span
            className="logo"
            style={{ fontSize: "28px", display: "block", marginBottom: "8px" }}
          >
            Visit
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <input
              id="passcode"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="form-input"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              required
              autoComplete="off"
              autoFocus
              placeholder="Enter passcode"
              style={{ textAlign: "center", fontSize: "24px", letterSpacing: "8px", padding: "16px" }}
            />
          </div>

          {error && (
            <p
              style={{
                color: "var(--danger)",
                fontSize: "13px",
                marginBottom: "14px",
                textAlign: "center",
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
            {loading ? "..." : "Go"}
          </button>
        </form>
      </div>
    </div>
  );
}
