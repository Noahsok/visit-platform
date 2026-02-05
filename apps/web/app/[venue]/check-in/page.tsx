export default function CheckInPage({ params }: { params: { venue: string } }) {
  return (
    <div>
      <h2>Member Check-In</h2>
      <p>Door management for {params.venue}.</p>
    </div>
  );
}
