export default function RecipesPage({ params }: { params: { venue: string } }) {
  return (
    <div>
      <h2>Recipes</h2>
      <p>Recipe management for {params.venue}. Build starts here.</p>
    </div>
  );
}
