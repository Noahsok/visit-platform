import { Decimal } from "@prisma/client/runtime/library";

interface RecipeIngredientWithCost {
  amount: Decimal;
  ingredient: {
    costPerUnit: Decimal | null;
  };
}

/**
 * Calculate the total cost of a drink based on its recipe ingredients.
 * Each ingredient's cost = amount x costPerUnit
 */
export function calculateDrinkCost(
  ingredients: RecipeIngredientWithCost[]
): number {
  return ingredients.reduce((total, ri) => {
    if (!ri.ingredient.costPerUnit) return total;
    const cost = Number(ri.amount) * Number(ri.ingredient.costPerUnit);
    return total + cost;
  }, 0);
}

/**
 * Calculate the margin for a drink.
 * Margin = (menuPrice - cost) / menuPrice
 */
export function calculateDrinkMargin(
  menuPrice: number,
  cost: number
): number {
  if (menuPrice <= 0) return 0;
  return (menuPrice - cost) / menuPrice;
}

/**
 * Calculate house-made ingredient cost from a batch recipe.
 * costPerUnit = total batch input cost / yield amount
 */
export function calculateBatchCostPerUnit(
  totalInputCost: number,
  yieldAmount: number
): number {
  if (yieldAmount <= 0) return 0;
  return totalInputCost / yieldAmount;
}
