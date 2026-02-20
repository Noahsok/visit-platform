"use client";

import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span className="logo" style={{ fontSize: "28px" }}>
            Visit
          </span>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
