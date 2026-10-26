// An in-memory stand-in for the parts of the Supabase client this app uses.
// Enabled with NEXT_PUBLIC_SUPABASE_URL=demo (for local demos and screenshots)
// and used directly by tests. It mirrors the database rules in
// supabase/migrations: owner-only rows, display-name stamping, the posting rate
// limit, and hiding a message after three reports. Nothing leaves the browser.
import type { SupabaseClient } from "@supabase/supabase-js";

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;
type Result = { data: unknown; error: { message: string } | null };
type Listener = { event: "INSERT" | "DELETE" | "UPDATE"; cb: (payload: { new: Row; old: Row }) => void };

const OWNER_COLUMN: Record<string, string> = {
  profiles: "id",
  saved_checks: "user_id",
  routines: "user_id",
  avoid_ingredients: "user_id",
  chat_reports: "reporter_id",
};
const PRIMARY_KEYS: Record<string, string[]> = {
  profiles: ["id"],
  routines: ["user_id"],
  avoid_ingredients: ["user_id", "ingredient_id"],
  chat_reports: ["message_id", "reporter_id"],
};

export interface DemoOptions {
  /** Persist between page loads (browser demo). Tests leave this off. */
  storageKey?: string;
  now?: () => Date;
}

export function createDemoSupabase(options: DemoOptions = {}): SupabaseClient {
  const now = options.now ?? (() => new Date());
  const load = (): { tables: Tables; user: { id: string; email: string } | null; seq: number } => {
    if (options.storageKey) {
      try {
        const saved = localStorage.getItem(options.storageKey);
        if (saved) return JSON.parse(saved);
      } catch {
        // Fall through to an empty demo.
      }
    }
    return { tables: {}, user: null, seq: 1 };
  };
  const state = load();
  const save = () => {
    if (!options.storageKey) return;
    try {
      localStorage.setItem(options.storageKey, JSON.stringify(state));
    } catch {
      // Demo data just won't persist.
    }
  };
  const table = (name: string) => (state.tables[name] ??= []);
  const authListeners = new Set<(event: string, session: unknown) => void>();
  const chatListeners: Listener[] = [];
  const session = () => (state.user ? { user: state.user } : null);
  const emitAuth = () => authListeners.forEach((l) => l(state.user ? "SIGNED_IN" : "SIGNED_OUT", session()));
  const emitChat = (event: Listener["event"], row: Row, old: Row = row) =>
    chatListeners.filter((l) => l.event === event).forEach((l) => l.cb({ new: row, old }));

  const visible = (name: string, row: Row) => {
    if (name === "chat_messages") return !row.hidden;
    if (name === "profiles") return true;
    const owner = OWNER_COLUMN[name];
    return Boolean(state.user) && row[owner] === state.user!.id;
  };

  function query(name: string) {
    const filters: [string, unknown][] = [];
    let order: { col: string; asc: boolean } | null = null;
    let limit = Infinity;
    let op: "select" | "insert" | "upsert" | "delete" = "select";
    let payload: Row | Row[] | null = null;

    const run = (): Result => {
      const uid = state.user?.id;
      const err = (message: string): Result => ({ data: null, error: { message } });
      if (op === "select") {
        let rows = table(name).filter((r) => visible(name, r) && filters.every(([c, v]) => r[c] === v));
        if (order) {
          const { col, asc } = order;
          rows = [...rows].sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : 1) * (asc ? 1 : -1));
        }
        return { data: rows.slice(0, limit).map((r) => ({ ...r })), error: null };
      }
      if (!uid) return err("Not signed in");
      if (op === "delete") {
        const removed = table(name).filter((r) => visible(name, r) && filters.every(([c, v]) => r[c] === v) && (name !== "chat_messages" || r.user_id === uid));
        state.tables[name] = table(name).filter((r) => !removed.includes(r));
        removed.forEach((r) => name === "chat_messages" && emitChat("DELETE", r));
        save();
        return { data: null, error: null };
      }
      for (const input of ([] as Row[]).concat(payload ?? [])) {
        const row: Row = { ...input };
        const owner = OWNER_COLUMN[name];
        if (owner) {
          if (row[owner] !== undefined && row[owner] !== uid) return err("new row violates row-level security policy");
          row[owner] = uid;
        }
        if (name === "chat_messages") {
          const profile = table("profiles").find((p) => p.id === uid);
          if (!profile) return err("Set a display name before posting");
          const recent = table(name).filter((m) => m.user_id === uid && now().getTime() - new Date(String(m.created_at)).getTime() < 60_000);
          if (recent.length >= 5) return err("You are posting too fast. Try again in a minute.");
          const body = String(row.body ?? "").trim();
          if (body.length < 1 || body.length > 500) return err("violates check constraint");
          Object.assign(row, { id: state.seq++, user_id: uid, display_name: profile.display_name, hidden: false, created_at: now().toISOString() });
        } else if (name === "saved_checks") {
          Object.assign(row, { id: `demo-${state.seq++}`, created_at: now().toISOString() });
        } else if (name === "chat_reports") {
          row.created_at = now().toISOString();
        }
        const keys = PRIMARY_KEYS[name];
        const existing = keys ? table(name).findIndex((r) => keys.every((k) => r[k] === row[k])) : -1;
        if (existing >= 0) {
          if (op === "insert") return err("duplicate key value violates unique constraint");
          table(name)[existing] = { ...table(name)[existing], ...row };
        } else {
          table(name).push(row);
        }
        if (name === "chat_messages") emitChat("INSERT", row);
        if (name === "chat_reports") {
          const count = table(name).filter((r) => r.message_id === row.message_id).length;
          const message = table("chat_messages").find((m) => m.id === row.message_id);
          if (message && count >= 3) {
            message.hidden = true;
            emitChat("UPDATE", message);
          }
        }
      }
      save();
      return { data: null, error: null };
    };

    const builder = {
      select: () => builder,
      insert: (rows: Row | Row[]) => ((op = "insert"), (payload = rows), builder),
      upsert: (rows: Row | Row[]) => ((op = "upsert"), (payload = rows), builder),
      delete: () => ((op = "delete"), builder),
      eq: (col: string, value: unknown) => (filters.push([col, value]), builder),
      order: (col: string, opts?: { ascending?: boolean }) => ((order = { col, asc: opts?.ascending ?? true }), builder),
      limit: (n: number) => ((limit = n), builder),
      maybeSingle: () => {
        const result = run();
        return Promise.resolve({ ...result, data: Array.isArray(result.data) ? (result.data[0] ?? null) : result.data });
      },
      then: (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(run()).then(resolve, reject),
    };
    return builder;
  }

  const client = {
    from: (name: string) => query(name),
    rpc: async (fn: string) => {
      if (fn !== "delete_my_account" || !state.user) return { data: null, error: { message: "Not signed in" } };
      const uid = state.user.id;
      for (const [name, rows] of Object.entries(state.tables)) {
        const owner = name === "chat_messages" ? "user_id" : OWNER_COLUMN[name];
        // Like the real cascade, deleted messages are pushed to every open chat.
        if (name === "chat_messages") rows.filter((r) => r[owner] === uid).forEach((r) => emitChat("DELETE", r));
        state.tables[name] = rows.filter((r) => r[owner] !== uid);
      }
      save();
      return { data: null, error: null };
    },
    auth: {
      getSession: async () => ({ data: { session: session() }, error: null }),
      onAuthStateChange: (cb: (event: string, s: unknown) => void) => {
        authListeners.add(cb);
        return { data: { subscription: { unsubscribe: () => authListeners.delete(cb) } } };
      },
      // Demo only: "sending" the link signs in straight away. Real Supabase emails a link.
      signInWithOtp: async ({ email }: { email: string }) => {
        state.user = { id: `demo-user-${email.toLowerCase()}`, email };
        save();
        setTimeout(emitAuth, 0);
        return { data: {}, error: null };
      },
      signOut: async () => {
        state.user = null;
        save();
        emitAuth();
        return { error: null };
      },
    },
    channel: () => {
      const channel = {
        on: (_type: string, filter: { event: Listener["event"] }, cb: Listener["cb"]) => (chatListeners.push({ event: filter.event, cb }), channel),
        subscribe: () => channel,
      };
      return channel;
    },
    removeChannel: async () => {
      chatListeners.length = 0;
      return "ok";
    },
  };
  return client as unknown as SupabaseClient;
}
