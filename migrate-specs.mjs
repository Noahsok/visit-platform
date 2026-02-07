const V1_SPECS = [
  { name: "Reserve Martini", glassware: "Martini V", method: "stir", garnish: "Lemon twist", notes: "Lemon expression over pour\nLemon twist in glass\nIce: crack ice" },
  { name: "Reserve Dirty", glassware: "Martini V", method: "stir", garnish: "Gilda", notes: "Ice: crack ice" },
  { name: "Classic Martini", glassware: "Nick & Nora", method: "stir", garnish: "uncut lemon", notes: "Lemon expression over pour\nuncut lemon peel in glass\nIce: crack ice" },
  { name: "Naked & Famous", glassware: "Coupe", method: null, garnish: "none", notes: "Ice: crack ice" },
  { name: "Newburgh", glassware: "Coupe", method: "stir", garnish: null, notes: "Ice: crack ice" },
  { name: "Dirty G&T", glassware: "Wine Glass", method: "build", garnish: null, notes: null },
  { name: "Shakerato Campari", glassware: "Nick & Nora", method: "dry shake", garnish: null, notes: "Ice: mid cube" },
  { name: "Shakerato Amaro", glassware: "Nick & Nora", method: "dry shake", garnish: null, notes: null },
  { name: "Blasphemy", glassware: "Rocks", method: "stir", garnish: null, notes: "Ice: crack ice" },
  { name: "Duck Confit Cosmopolitan", glassware: "Nick & Nora", method: "shake", garnish: null, notes: "Ice: mid cube" },
  { name: "Cosmopolitan", glassware: "Nick & Nora", method: "shake", garnish: "Lime wedge", notes: "Ice: mid cube" },
  { name: "Gin and Sin", glassware: "Nick & Nora", method: null, garnish: null, notes: "Ice: crack ice" },
  { name: "Cognac Neat (Hine)", glassware: "Rocks", method: "build", garnish: null, notes: "Ice: none" },
];

async function migrate() {
  const res = await fetch("http://localhost:3002/api/recipes");
  const recipes = await res.json();
  console.log(`Found ${recipes.length} recipes\n`);

  for (const s of V1_SPECS) {
    const match = recipes.find(r => r.name === s.name);
    if (!match) { console.log("❌ Not found:", s.name); continue; }

    const r = await fetch(`http://localhost:3002/api/recipes/${match.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        glassware: s.glassware,
        method: s.method,
        garnishDescription: s.garnish,
        notes: s.notes,
      }),
    });
    console.log(r.ok ? "✅" : "❌", s.name);
  }
  console.log("\nDone!");
}

migrate();