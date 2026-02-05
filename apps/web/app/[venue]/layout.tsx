export default function VenueLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { venue: string };
}) {
  return (
    <div>
      <nav style={{ padding: "1rem", borderBottom: "1px solid #eee", display: "flex", gap: "1.5rem" }}>
        <strong style={{ textTransform: "capitalize" }}>{params.venue}</strong>
        <a href={`/${params.venue}/recipes`}>Recipes</a>
        <a href={`/${params.venue}/inventory`}>Inventory</a>
        <a href={`/${params.venue}/pnl`}>P&L</a>
        <a href={`/${params.venue}/check-in`}>Check-In</a>
        <a href={`/${params.venue}/settings`}>Settings</a>
      </nav>
      <main style={{ padding: "1.5rem" }}>{children}</main>
    </div>
  );
}
