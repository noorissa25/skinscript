// Data access for signed-in features. Row-level security in
// supabase/migrations limits every query to the signed-in person's own rows.
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { CheckSummary, SavedProduct, SharedCheck } from "./account";
import { getSupabase } from "./supabase";

export interface SavedCheck {
  id: string;
  title: string;
  products: SavedProduct[];
  summary: CheckSummary;
  created_at: string;
}

export interface ChatMessage {
  id: number;
  user_id: string;
  display_name: string;
  body: string;
  shared_check: SharedCheck | null;
  created_at: string;
}

function db() {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Accounts are not configured");
  return supabase;
}

function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

// ---------- Profile ----------
export async function getDisplayName(userId: string): Promise<string | null> {
  const data = check(await db().from("profiles").select("display_name").eq("id", userId).maybeSingle());
  return (data as { display_name: string } | null)?.display_name ?? null;
}

export async function setDisplayName(userId: string, displayName: string) {
  check(await db().from("profiles").upsert({ id: userId, display_name: displayName.trim() }));
}

// ---------- Saved checks ----------
export async function listSavedChecks(): Promise<SavedCheck[]> {
  return check(
    await db().from("saved_checks").select("id,title,products,summary,created_at").order("created_at", { ascending: false }).limit(50),
  ) as SavedCheck[];
}

export async function saveCheck(title: string, products: SavedProduct[], summary: CheckSummary) {
  check(await db().from("saved_checks").insert({ title, products, summary }));
}

export async function deleteSavedCheck(id: string) {
  check(await db().from("saved_checks").delete().eq("id", id));
}

// ---------- Routine ----------
export async function getRoutine(): Promise<SavedProduct[] | null> {
  const data = check(await db().from("routines").select("products").maybeSingle());
  return (data as { products: SavedProduct[] } | null)?.products ?? null;
}

export async function saveRoutine(userId: string, products: SavedProduct[]) {
  check(await db().from("routines").upsert({ user_id: userId, products, updated_at: new Date().toISOString() }));
}

// ---------- Avoid list ----------
export async function listAvoid(): Promise<string[]> {
  const data = check(await db().from("avoid_ingredients").select("ingredient_id"));
  return (data as { ingredient_id: string }[]).map((r) => r.ingredient_id);
}

export async function addAvoid(ingredientId: string) {
  check(await db().from("avoid_ingredients").upsert({ ingredient_id: ingredientId }));
}

export async function removeAvoid(ingredientId: string) {
  check(await db().from("avoid_ingredients").delete().eq("ingredient_id", ingredientId));
}

// ---------- Chat ----------
const CHAT_FIELDS = "id,user_id,display_name,body,shared_check,created_at";

export async function recentMessages(limit = 50): Promise<ChatMessage[]> {
  const data = check(await db().from("chat_messages").select(CHAT_FIELDS).order("created_at", { ascending: false }).limit(limit));
  return (data as ChatMessage[]).reverse();
}

export async function postMessage(body: string, sharedCheck: SharedCheck | null = null) {
  // display_name and user_id are stamped by a database trigger; the rate limit is enforced there too.
  check(await db().from("chat_messages").insert({ body: body.trim(), shared_check: sharedCheck, display_name: "" }));
}

export async function deleteMessage(id: number) {
  check(await db().from("chat_messages").delete().eq("id", id));
}

export async function reportMessage(id: number) {
  const result = await db().from("chat_reports").insert({ message_id: id });
  // Reporting the same message twice is a no-op, not an error for the person.
  if (result.error && !/duplicate key/i.test(result.error.message)) throw new Error(result.error.message);
}

export function subscribeToChat(onInsert: (m: ChatMessage) => void, onDelete: (id: number) => void): () => void {
  const supabase = db();
  const channel: RealtimeChannel = supabase
    .channel("chat_messages")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => onInsert(payload.new as ChatMessage))
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_messages" }, (payload) =>
      onDelete((payload.old as { id: number }).id),
    )
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages" }, (payload) => {
      // A message hidden by reports disappears for everyone.
      if ((payload.new as { hidden?: boolean }).hidden) onDelete((payload.new as { id: number }).id);
    })
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

// ---------- Account ----------
export async function deleteMyAccount() {
  check(await db().rpc("delete_my_account"));
  await db().auth.signOut();
}
