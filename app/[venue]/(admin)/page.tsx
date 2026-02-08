"use client";

import { useParams } from "next/navigation";

export default function TonightPage() {
  const params = useParams();
  const venue = params.venue as string;

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Tonight\u2019s Menu</h2>
      </div>
      <div className="empty-state">
        <p>No drinks on tonight\u2019s menu yet.</p>
        <p className="empty-hint">Go to Drinks tab to add drinks to tonight\u2019s menu.</p>
      </div>
    </div>
  );
}
