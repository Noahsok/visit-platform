import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Visit Platform</h1>
      <p>Select a venue:</p>
      <nav style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
        <Link href="/newburgh">Newburgh</Link>
        <Link href="/bushwick">Bushwick</Link>
      </nav>
    </main>
  );
}
