// Run from project root: node scripts/seed-prep-recipes.mjs

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const PREPS = [
  {
    name: "Gilda",
    type: "garnish",
    description: "Skewered garnish for Reserve Dirty Martini",
    usedIn: "Reserve Dirty Martini",
    yieldAmount: "Per piece",
    ingredients: [
      { name: "Castelvetrano olives", amount: "2" },
      { name: "Piparra pepper", amount: "1 (halved)" },
      { name: "Anchovy", amount: "1" },
    ],
    method: [
      "Halve the piparra pepper lengthwise",
      "Skewer in order: olive → half pepper → anchovy → half pepper → olive",
      "Store assembled gildas in olive brine until service",
    ],
    storage: "Submerged in olive brine, sealed container, refrigerated",
    shelfLife: "3-5 days",
    qualityCheck: "Olives firm, anchovy intact, peppers not mushy",
    sortOrder: 0,
  },
  {
    name: "Simple Syrup 1:1",
    type: "syrup",
    description: "Standard simple syrup, equal parts by weight",
    usedIn: "Various cocktails",
    baseRatio: "Sugar : Water = 1 : 1 by weight",
    yieldAmount: "~750ml",
    ingredients: [
      { name: "White sugar", amount: "500g" },
      { name: "Hot water", amount: "500ml" },
    ],
    scalingTable: {
      columns: ["Half", "Standard", "Double"],
      rows: [
        { label: "Sugar", Half: "250g", Standard: "500g", Double: "1000g" },
        { label: "Water", Half: "250ml", Standard: "500ml", Double: "1000ml" },
        { label: "Yield", Half: "~375ml", Standard: "~750ml", Double: "~1500ml" },
      ],
    },
    method: [
      "Combine sugar and hot water in container",
      "Stir until sugar fully dissolves",
      "Cool to room temperature",
      "Bottle and label with date",
    ],
    storage: "Glass bottle, label with name and date. Refrigerate.",
    shelfLife: "30 days",
    qualityCheck: "Clear, no cloudiness or fermentation",
    sortOrder: 1,
  },
  {
    name: "Honey Simple 1:1",
    type: "syrup",
    description: "Honey syrup, equal parts by weight",
    usedIn: "Various cocktails",
    baseRatio: "Honey : Water = 1 : 1 by weight",
    yieldAmount: "~750ml",
    ingredients: [
      { name: "Honey", amount: "500g" },
      { name: "Hot water", amount: "500ml" },
    ],
    scalingTable: {
      columns: ["Half", "Standard", "Double"],
      rows: [
        { label: "Honey", Half: "250g", Standard: "500g", Double: "1000g" },
        { label: "Water", Half: "250ml", Standard: "500ml", Double: "1000ml" },
        { label: "Yield", Half: "~375ml", Standard: "~750ml", Double: "~1500ml" },
      ],
    },
    method: [
      "Combine honey and hot water in container",
      "Stir until honey fully dissolves",
      "Cool to room temperature",
      "Bottle and label with date",
    ],
    storage: "Glass bottle, label with name and date. Refrigerate.",
    shelfLife: "30 days",
    qualityCheck: "Clear amber, no crystallization",
    sortOrder: 2,
  },
  {
    name: "Ginger Simple",
    type: "syrup",
    description: "Fresh ginger-infused simple syrup",
    usedIn: "Various cocktails",
    baseRatio: "Sugar : Water : Ginger = 1 : 1 : 0.5 by weight",
    yieldAmount: "~700ml",
    ingredients: [
      { name: "White sugar", amount: "500g" },
      { name: "Hot water", amount: "500ml" },
      { name: "Fresh ginger (sliced)", amount: "250g" },
    ],
    scalingTable: {
      columns: ["Half", "Standard", "Double"],
      rows: [
        { label: "Sugar", Half: "250g", Standard: "500g", Double: "1000g" },
        { label: "Water", Half: "250ml", Standard: "500ml", Double: "1000ml" },
        { label: "Ginger", Half: "125g", Standard: "250g", Double: "500g" },
        { label: "Yield", Half: "~350ml", Standard: "~700ml", Double: "~1400ml" },
      ],
    },
    method: [
      "Slice ginger thinly (no need to peel)",
      "Combine sugar and hot water, stir to dissolve",
      "Add ginger slices, steep 1-2 hours at room temp",
      "Fine strain through chinois",
      "Bottle and label with date",
    ],
    filtration: "Fine strain through chinois",
    storage: "Glass bottle, label with name and date. Refrigerate.",
    shelfLife: "14-21 days",
    qualityCheck: "Golden color, strong ginger aroma, no cloudiness",
    sortOrder: 3,
  },
  {
    name: "Citrus Oleo Saccharum",
    type: "oleo",
    description: "Citrus oil extraction using sugar",
    usedIn: "Various cocktails",
    baseRatio: "Citrus peels : Sugar = 1 : 1 by weight",
    yieldAmount: "~500ml",
    ingredients: [
      { name: "Citrus peels (mixed)", amount: "300g" },
      { name: "White sugar", amount: "300g" },
    ],
    scalingTable: {
      columns: ["Half", "Standard", "Double"],
      rows: [
        { label: "Peels", Half: "150g", Standard: "300g", Double: "600g" },
        { label: "Sugar", Half: "150g", Standard: "300g", Double: "600g" },
        { label: "Yield", Half: "~250ml", Standard: "~500ml", Double: "~1000ml" },
      ],
    },
    method: [
      "Peel citrus, avoiding white pith",
      "Muddle peels with sugar in container",
      "Cover and let sit 4-12 hours (overnight ideal)",
      "Peels will release oils into sugar creating syrupy liquid",
      "Strain out peels, pressing to extract all liquid",
      "Add small amount of warm water if needed to dissolve remaining sugar",
      "Bottle and label with date",
    ],
    filtration: "Fine strain, press peels",
    storage: "Glass bottle, label with name and date. Refrigerate.",
    shelfLife: "14-21 days",
    qualityCheck: "Aromatic, golden color, no bitterness from pith",
    sortOrder: 4,
  },
  {
    name: "Strawberry Oleo Saccharum",
    type: "oleo",
    description: "Strawberry oil extraction using sugar",
    usedIn: "Seasonal cocktails",
    baseRatio: "Strawberries : Sugar = 2 : 1 by weight",
    yieldAmount: "~600ml",
    ingredients: [
      { name: "Fresh strawberries (hulled, quartered)", amount: "500g" },
      { name: "White sugar", amount: "250g" },
    ],
    scalingTable: {
      columns: ["Half", "Standard", "Double"],
      rows: [
        { label: "Strawberries", Half: "250g", Standard: "500g", Double: "1000g" },
        { label: "Sugar", Half: "125g", Standard: "250g", Double: "500g" },
        { label: "Yield", Half: "~300ml", Standard: "~600ml", Double: "~1200ml" },
      ],
    },
    method: [
      "Hull and quarter strawberries",
      "Muddle with sugar in container",
      "Cover and refrigerate 4-12 hours",
      "Strain through chinois, pressing berries",
      "Bottle and label with date",
    ],
    filtration: "Fine strain through chinois",
    storage: "Glass bottle, label with name and date. Refrigerate.",
    shelfLife: "7-10 days",
    qualityCheck: "Bright red/pink, strong strawberry aroma",
    sortOrder: 5,
  },
  {
    name: "Grapefruit Oleo Saccharum",
    type: "oleo",
    description: "Grapefruit oil extraction using sugar",
    usedIn: "Various cocktails",
    baseRatio: "Grapefruit peels : Sugar = 1 : 1 by weight",
    yieldAmount: "~500ml",
    ingredients: [
      { name: "Grapefruit peels", amount: "300g" },
      { name: "White sugar", amount: "300g" },
    ],
    scalingTable: {
      columns: ["Half", "Standard", "Double"],
      rows: [
        { label: "Peels", Half: "150g", Standard: "300g", Double: "600g" },
        { label: "Sugar", Half: "150g", Standard: "300g", Double: "600g" },
        { label: "Yield", Half: "~250ml", Standard: "~500ml", Double: "~1000ml" },
      ],
    },
    method: [
      "Peel grapefruit, avoiding white pith",
      "Muddle peels with sugar in container",
      "Cover and let sit 4-12 hours (overnight ideal)",
      "Strain out peels, pressing to extract all liquid",
      "Add small amount of warm water if needed",
      "Bottle and label with date",
    ],
    filtration: "Fine strain, press peels",
    storage: "Glass bottle, label with name and date. Refrigerate.",
    shelfLife: "14-21 days",
    qualityCheck: "Aromatic, pale pink/yellow, no bitterness",
    sortOrder: 6,
  },
  {
    name: "Lime Cordial (Sous-Vide)",
    type: "cordial",
    description: "Bright lime cordial via sous-vide method",
    usedIn: "Gimlet, various cocktails",
    baseRatio: "Complex — see method",
    yieldAmount: "~750ml",
    ingredients: [
      { name: "Fresh lime juice", amount: "500ml" },
      { name: "White sugar", amount: "500g" },
      { name: "Lime zest (from juiced limes)", amount: "~20g" },
      { name: "Citric acid", amount: "4g" },
    ],
    scalingTable: {
      columns: ["Half", "Standard", "Double"],
      rows: [
        { label: "Lime juice", Half: "250ml", Standard: "500ml", Double: "1000ml" },
        { label: "Sugar", Half: "250g", Standard: "500g", Double: "1000g" },
        { label: "Lime zest", Half: "~10g", Standard: "~20g", Double: "~40g" },
        { label: "Citric acid", Half: "2g", Standard: "4g", Double: "8g" },
        { label: "Yield", Half: "~375ml", Standard: "~750ml", Double: "~1500ml" },
      ],
    },
    method: [
      "Juice limes, reserve zest from spent limes",
      "Combine juice, sugar, zest, and citric acid in sous-vide bag",
      "Seal and cook at 135°F (57°C) for 2 hours",
      "Remove from bath, let cool slightly",
      "Fine strain through chinois",
      "Bottle and label with date",
    ],
    filtration: "Fine strain through chinois",
    storage: "Glass bottle, label with name and date. Refrigerate.",
    shelfLife: "14-21 days",
    qualityCheck: "Bright green-yellow, balanced sweet-tart, no bitterness",
    sortOrder: 7,
  },
  {
    name: "Cranberry Cordial (Pan Steep)",
    type: "cordial",
    description: "Herbal cranberry cordial",
    usedIn: "Seasonal cocktails",
    baseRatio: "Complex — see method",
    yieldAmount: "750ml",
    ingredients: [
      { name: "Lakewood cranberry juice", amount: "600ml" },
      { name: "White sugar", amount: "165g" },
      { name: "Fresh rosemary", amount: "5g" },
      { name: "Fresh thyme", amount: "4g" },
      { name: "Lemon peel", amount: "~5-6g" },
      { name: "Fresh lemon juice", amount: "50ml" },
      { name: "Filtered water", amount: "To 750ml" },
    ],
    scalingTable: {
      columns: ["Half", "Standard", "Double"],
      rows: [
        { label: "Cranberry juice", Half: "300ml", Standard: "600ml", Double: "1200ml" },
        { label: "Sugar", Half: "82g", Standard: "165g", Double: "330g" },
        { label: "Rosemary", Half: "2.5g", Standard: "5g", Double: "10g" },
        { label: "Thyme", Half: "2g", Standard: "4g", Double: "8g" },
        { label: "Lemon juice", Half: "25ml", Standard: "50ml", Double: "100ml" },
        { label: "Yield", Half: "375ml", Standard: "750ml", Double: "1500ml" },
      ],
    },
    method: [
      "Combine cranberry juice + sugar in saucepan",
      "Heat to 160-170°F until dissolved, do not boil",
      "Add rosemary, thyme, lemon peel",
      "Hold at heat 5 min, then steep covered 20-25 min",
      "Strain through chinois",
      "Stir in lemon juice",
      "Add water to reach 750ml",
      "Fine strain",
    ],
    filtration: "Fine strain through chinois",
    storage: "Glass bottle, refrigerate.",
    shelfLife: "10-14 days",
    qualityCheck: "Deep red, herbal aroma, balanced sweet-tart",
    sortOrder: 8,
  },
];

async function seed() {
  // Clear existing prep recipes
  await prisma.prepRecipe.deleteMany({});
  console.log("Cleared existing prep recipes");

  for (const prep of PREPS) {
    await prisma.prepRecipe.create({ data: prep });
    console.log("Created:", prep.name);
  }

  console.log("\nDone! 9 prep recipes seeded.");
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error(e);
  prisma.$disconnect();
});
