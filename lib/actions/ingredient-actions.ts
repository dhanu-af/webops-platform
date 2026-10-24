"use server";

import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/session-user";
import { findBestMatch } from "@/lib/ingredient-match";

export async function findIngredientLibraryMatch(formulationIngredientName: string) {
  try {
    await requireActiveUser();
  } catch {
    return { authorized: false as const };
  }

  const library = await db.ingredient.findMany();
  return { authorized: true as const, ingredient: findBestMatch(formulationIngredientName, library) };
}
