  "use client";
import { useEffect } from "react";

export default function CheckInPage() {
  useEffect(() => {
    window.location.href = "/dashboard.html";
  }, []);

  return <p>Loading dashboard...</p>;
}
