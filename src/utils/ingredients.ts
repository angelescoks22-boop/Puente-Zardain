import type { Ingredient } from '../types';

export function canRemoveIngredient(
  ingredientId: string,
  ingredients: Ingredient[],
  alreadyRemoved: string[],
): boolean {
  const ingredient = ingredients.find((i) => i.id === ingredientId);
  if (!ingredient) return false;
  if (ingredient.required) return false;
  return !alreadyRemoved.includes(ingredientId);
}

export function validateCustomization(
  ingredients: Ingredient[],
  removedIngredients: string[],
): { valid: boolean; error?: string } {
  const required = ingredients.filter((i) => i.required);
  const missingRequired = required.filter((i) => removedIngredients.includes(i.id));

  if (missingRequired.length > 0) {
    return {
      valid: false,
      error: `No puedes quitar: ${missingRequired.map((i) => i.name).join(', ')}`,
    };
  }
  return { valid: true };
}

export function getCustomizationLabel(removedIngredients: string[], ingredients: Ingredient[]): string {
  if (removedIngredients.length === 0) return '';
  const names = removedIngredients
    .map((id) => ingredients.find((i) => i.id === id)?.name)
    .filter(Boolean);
  return `Sin ${names.join(', ')}`;
}
