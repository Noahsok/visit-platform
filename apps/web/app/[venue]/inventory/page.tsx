export default function InventoryPage({ params }: { params: { venue: string } }) {
  return (
    <div>
      <h2>Inventory</h2>
      <p>Stock levels and batch tracking for {params.venue}.</p>
    </div>
  );
}
