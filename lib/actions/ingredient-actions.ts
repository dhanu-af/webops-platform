"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { findBestMatch } from "@/lib/ingredient-match";

export async function findIngredientLibraryMatch(formulationIngredientName: string) {
  const session = await auth();
  if (!session?.user) return { authorized: false as const };

  const library = await db.ingredient.findMany();
  return { authorized: true as const, ingredient: findBestMatch(formulationIngredientName, library) };
}
