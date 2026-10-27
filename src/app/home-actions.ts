"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { isUuid } from "@/lib/home";
import { isKnownPage } from "@/lib/home-pages";

// Everything that changes the home page layout. NOTE: no login yet, same as the other pages.

const cleanName = (s: string) => {
  const name = s.trim().slice(0, 60);
  if (!name) throw new Error("Name can't be empty.");
  return name;
};
const checkId = (id: string) => {
  if (!isUuid(id)) throw new Error("Bad id.");
  return id;
};
function done() {
  revalidatePath("/"); // home page
  revalidatePath("/c/[id]", "page"); // every category page
}
async function run(label: string, query: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await query;
  if (error) throw new Error(`Couldn't ${label}: ${error.message}`);
}
// Next position at the end of a list.
async function endOf(table: "home_categories" | "home_items", categoryId?: string) {
  let q = db().from(table).select("id", { count: "exact", head: true });
  if (categoryId) q = q.eq("category_id", categoryId);
  const { count } = await q;
  return count ?? 0;
}
// Save a new order: each id gets its index as its position.
async function saveOrder(table: "home_categories" | "home_items", ids: string[]) {
  const results = await Promise.all(
    ids.map((id, i) => db().from(table).update({ position: i }).eq("id", checkId(id))),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(`Couldn't save the order: ${failed.error.message}`);
}

/* Categories */

export async function addCategory(name: string) {
  await run("add the category", db().from("home_categories").insert({ name: cleanName(name), position: await endOf("home_categories") }));
  done();
}

export async function renameCategory(id: string, name: string) {
  await run("rename", db().from("home_categories").update({ name: cleanName(name) }).eq("id", checkId(id)));
  done();
}

// Also deletes the subcategories inside it (not the pages themselves, like your budget data).
export async function deleteCategory(id: string) {
  await run("delete", db().from("home_categories").delete().eq("id", checkId(id)));
  done();
}

export async function reorderCategories(ids: string[]) {
  await saveOrder("home_categories", ids);
  done();
}

/* Subcategories */

export async function addItem(categoryId: string, name: string) {
  await run(
    "add the page",
    db().from("home_items").insert({
      category_id: checkId(categoryId),
      name: cleanName(name),
      position: await endOf("home_items", categoryId),
    }),
  );
  done();
}

export async function updateItem(id: string, changes: { name?: string; blurb?: string; href?: string | null }) {
  const row: { name?: string; blurb?: string | null; href?: string | null } = {};
  if (changes.name !== undefined) row.name = cleanName(changes.name);
  if (changes.blurb !== undefined) row.blurb = changes.blurb.trim().slice(0, 120) || null;
  if (changes.href !== undefined) {
    if (changes.href !== null && !isKnownPage(changes.href)) throw new Error("Unknown page.");
    row.href = changes.href;
  }
  await run("save", db().from("home_items").update(row).eq("id", checkId(id)));
  done();
}

export async function deleteItem(id: string) {
  await run("delete", db().from("home_items").delete().eq("id", checkId(id)));
  done();
}

export async function reorderItems(ids: string[]) {
  await saveOrder("home_items", ids);
  done();
}

// Moves a subcategory to the end of another category.
export async function moveItem(id: string, categoryId: string) {
  const position = await endOf("home_items", checkId(categoryId));
  await run("move", db().from("home_items").update({ category_id: categoryId, position }).eq("id", checkId(id)));
  done();
}
