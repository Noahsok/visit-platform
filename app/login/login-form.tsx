"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const ADMIN_ROLES = ["owner", "manager"];

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/newburgh";
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const doLogin = useCallback(
    async (code: string) => {
      setError("");
      setLoading(true);

      const result = await signIn("credentials", {
        passcode: code,
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
    },
    [callbackUrl, router]
  );

  function handleTap(digit: string) {
    if (loading) return;
    setError("");
    const next = passcode + digit;
    if (next.length <= 4) {
      setPasscode(next);
      if (next.length === 4) {
        doLogin(next);
      }
    }
  }

  function handleDelete() {
    if (loading) return;
    setError("");
    setPasscode((prev) => prev.slice(0, -1));
  }

  // Physical keyboard support
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (loading) return;
      if (e.key >= "0" && e.key <= "9") {
        handleTap(e.key);
      } else if (e.key === "Backspace") {
        handleDelete();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const dots = Array.from({ length: 4 }, (_, i) => (
    <div
      key={i}
      style={{
        width: 16,
        height: 16,
        borderRadius: "50%",
        background: i < passcode.length ? "var(--accent)" : "transparent",
        border: `2px solid ${i < passcode.length ? "var(--accent)" : "var(--text-dim)"}`,
        transition: "all 0.15s",
      }}
    />
  ));

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <span
        className="logo"
        style={{ fontSize: "28px", display: "block", marginBottom: "40px" }}
      >
        Visit
      </span>

      {/* Dot indicators */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "12px" }}>
        {dots}
      </div>

      {/* Error / loading */}
      <div style={{ height: "28px", display: "flex", alignItems: "center" }}>
        {loading && (
          <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>
            Signing in...
          </span>
        )}
        {error && (
          <span style={{ color: "var(--danger)", fontSize: "13px" }}>
            {error}
          </span>
        )}
      </div>

      {/* Keypad */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 72px)",
          gap: "12px",
          marginTop: "8px",
        }}
      >
        {keys.map((key, i) => {
          if (key === "") {
            return <div key={i} />;
          }
          if (key === "del") {
            return (
              <button
                key={i}
                onClick={handleDelete}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  border: "none",
                  background: "transparent",
                  color: "var(--text-muted)",
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                ←
              </button>
            );
          }
          return (
            <button
              key={i}
              onClick={() => handleTap(key)}
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                border: "1px solid var(--text-dim)",
                background: "transparent",
                color: "var(--text)",
                fontSize: "24px",
                fontFamily: "'Playfair Display', serif",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                WebkitTapHighlightColor: "transparent",
                transition: "background 0.1s",
              }}
              onPointerDown={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.08)";
              }}
              onPointerUp={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "transparent";
              }}
              onPointerLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "transparent";
              }}
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
