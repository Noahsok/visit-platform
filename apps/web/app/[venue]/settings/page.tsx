export default function SettingsPage({ params }: { params: { venue: string } }) {
  return (
    <div>
      <h2>Venue Settings</h2>
      <p>Configuration for {params.venue}.</p>
    </div>
  );
}
