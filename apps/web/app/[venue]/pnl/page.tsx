export default function PnlPage({ params }: { params: { venue: string } }) {
  return (
    <div>
      <h2>P&L Dashboard</h2>
      <p>Profit and loss for {params.venue}. Square sync button will live here.</p>
    </div>
  );
}
