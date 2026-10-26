import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { avoidMatches, checkTitle, shareCard, summarize, validChatBody, validDisplayName } from "@/lib/account";
import * as api from "@/lib/accountApi";
import { analyzeProducts } from "@/lib/analyze";
import { createDemoSupabase } from "@/lib/demoSupabase";
import { samples } from "@/lib/samples";
import { getSupabase, setSupabaseForTests } from "@/lib/supabase";

const routine = samples.find((s) => s.id === "routine-retinoid-bha")!.products.map(({ name, text }) => ({ name, text }));
const analysis = analyzeProducts(routine);

describe("account helpers", () => {
  it("summarizes a check without ingredient text", () => {
    const s = summarize(analysis);
    expect(s.recognized).toBe(analysis.stats.recognized);
    expect(s.findings.map((f) => f.id)).toContain("retinoid-plus-exfoliating-acid");
  });

  it("titles a check from product names and caps the length", () => {
    expect(checkTitle(routine)).toBe("Olay Regenerist Retinol 24 Night Serum + The INKEY List Salicylic Acid Cleanser");
    expect(checkTitle([{ name: "x".repeat(200), text: "" }]).length).toBe(120);
    expect(checkTitle([{ name: " ", text: "" }])).toBe("Untitled check");
  });

  it("shares only product names and flag titles, never ingredient lists", () => {
    const card = shareCard(routine, analysis);
    const json = JSON.stringify(card);
    expect(json).not.toContain("Dimethicone");
    expect(json).not.toContain("Salicylic Acid,");
    expect(card.findings.map((f) => f.title)).toContain("Retinoid + exfoliating acid");
  });

  it("finds ingredients on the avoid list, per product", () => {
    const hits = avoidMatches(analysis, new Set(["benzyl-alcohol", "salicylic-acid"]));
    expect(hits).toEqual([
      { product: "Olay Regenerist Retinol 24 Night Serum", name: "Benzyl Alcohol", ingredientId: "benzyl-alcohol" },
      { product: "The INKEY List Salicylic Acid Cleanser", name: "Salicylic Acid", ingredientId: "salicylic-acid" },
    ]);
  });

  it("validates display names and chat messages", () => {
    expect(validDisplayName("a")).toBe(false);
    expect(validDisplayName("GlowGetter")).toBe(true);
    expect(validDisplayName("x".repeat(31))).toBe(false);
    expect(validChatBody("   ")).toBe(false);
    expect(validChatBody("x".repeat(501))).toBe(false);
  });
});

describe("account data (against the demo backend, which mirrors the database rules)", () => {
  let clock = new Date("2026-10-24T12:00:00Z");
  const client = () => getSupabase()!;
  const signIn = (email: string) => client().auth.signInWithOtp({ email });

  beforeEach(() => {
    clock = new Date("2026-10-24T12:00:00Z");
    setSupabaseForTests(createDemoSupabase({ now: () => clock }));
  });
  afterEach(() => setSupabaseForTests(null));

  it("keeps saved checks, routines and avoid lists private to their owner", async () => {
    await signIn("a@example.com");
    await api.saveCheck("A's check", routine, summarize(analysis));
    await api.saveRoutine("demo-user-a@example.com", routine);
    await api.addAvoid("fragrance");
    expect(await api.listSavedChecks()).toHaveLength(1);

    await client().auth.signOut();
    await signIn("b@example.com");
    expect(await api.listSavedChecks()).toEqual([]);
    expect(await api.getRoutine()).toBeNull();
    expect(await api.listAvoid()).toEqual([]);
  });

  it("refuses writes when signed out", async () => {
    await expect(api.saveCheck("x", routine, summarize(analysis))).rejects.toThrow(/Not signed in/);
  });

  it("requires a display name to post and stamps it server-side", async () => {
    await signIn("a@example.com");
    await expect(api.postMessage("hello")).rejects.toThrow(/display name/);
    await api.setDisplayName("demo-user-a@example.com", "GlowGetter");
    await api.postMessage("  hello  ");
    const [m] = await api.recentMessages();
    expect(m).toMatchObject({ body: "hello", display_name: "GlowGetter" });
  });

  it("rate-limits posting to five messages a minute", async () => {
    await signIn("a@example.com");
    await api.setDisplayName("demo-user-a@example.com", "GlowGetter");
    for (let i = 0; i < 5; i++) await api.postMessage(`message ${i}`);
    await expect(api.postMessage("one too many")).rejects.toThrow(/too fast/);
    clock = new Date(clock.getTime() + 61_000);
    await expect(api.postMessage("later")).resolves.toBeUndefined();
  });

  it("hides a message after three different people report it, and ignores repeat reports", async () => {
    await signIn("spam@example.com");
    await api.setDisplayName("demo-user-spam@example.com", "Spammer");
    await api.postMessage("buy my stuff");
    const [{ id }] = await api.recentMessages();
    for (const who of ["a", "b"]) {
      await client().auth.signOut();
      await signIn(`${who}@example.com`);
      await api.reportMessage(id);
      await api.reportMessage(id);
    }
    expect(await api.recentMessages()).toHaveLength(1);
    await client().auth.signOut();
    await signIn("c@example.com");
    await api.reportMessage(id);
    expect(await api.recentMessages()).toEqual([]);
  });

  it("deletes everything on account deletion", async () => {
    await signIn("a@example.com");
    await api.setDisplayName("demo-user-a@example.com", "GlowGetter");
    await api.saveCheck("A's check", routine, summarize(analysis));
    await api.postMessage("bye");
    await api.deleteMyAccount();
    await signIn("a@example.com");
    expect(await api.listSavedChecks()).toEqual([]);
    expect(await api.getDisplayName("demo-user-a@example.com")).toBeNull();
    expect(await api.recentMessages()).toEqual([]);
  });

  it("is off entirely when no keys are configured", () => {
    setSupabaseForTests(undefined as never);
    expect(getSupabase()).toBeNull();
  });
});
