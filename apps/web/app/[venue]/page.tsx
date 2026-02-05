export default function VenueDashboard({
  params,
}: {
  params: { venue: string };
}) {
  return (
    <div>
      <h1 style={{ textTransform: "capitalize" }}>{params.venue} Dashboard</h1>
      <p>Overview coming soon — quick stats, recent activity, alerts.</p>
    </div>
  );
}
