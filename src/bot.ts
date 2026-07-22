import { Composer } from "grammy";
import { createBot, type BotContext } from "./toolkit/index.js";
import type { StorageAdapter } from "grammy";
import { createDataStore, type DataStore } from "./data.js";

type FlowStep =
  | "idle"
  | "tip_awaiting_recipient"
  | "tip_awaiting_amount"
  | "tip_confirming"
  | "withdraw_awaiting_address"
  | "withdraw_awaiting_amount"
  | "withdraw_confirming";

export interface Session {
  step: FlowStep;
  tipRecipient?: number;
  tipAmount?: number;
  tipGroupId?: number;
  withdrawAddress?: string;
  withdrawAmount?: number;
}

export type Ctx = BotContext<Session>;

let _dataStore: DataStore | null = null;

export function getDataStore(): DataStore {
  if (!_dataStore) _dataStore = createDataStore();
  return _dataStore;
}

export interface BuildBotOptions {
  handlers?: Composer<Ctx>[];
  storage?: StorageAdapter<Session>;
}

export async function buildBot(token: string, opts: BuildBotOptions = {}) {
  const bot = createBot<Session>(token, {
    initial: () => ({ step: "idle" }),
    storage: opts.storage,
  });

  const handlers = opts.handlers ?? (await loadHandlersFromDisk());
  for (const h of handlers) bot.use(h);

  bot.on("message", (ctx) => ctx.reply("Sorry, I didn't understand that. Try /help."));

  return bot;
}

async function loadHandlersFromDisk(): Promise<Composer<Ctx>[]> {
  const { readdirSync } = await import("node:fs");
  const dir = new URL("./handlers/", import.meta.url);
  let files: string[] = [];
  try {
    files = readdirSync(dir).filter(
      (f) =>
        (f.endsWith(".js") || f.endsWith(".ts")) &&
        !f.endsWith(".d.ts") &&
        !f.includes(".test.") &&
        !f.includes(".spec."),
    );
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    files = [];
  }
  const out: Composer<Ctx>[] = [];
  for (const file of files.sort()) {
    const mod = (await import(new URL(file, dir).href)) as { default?: Composer<Ctx> };
    if (!mod.default) {
      throw new Error(`handler ${file} must default-export a grammY Composer`);
    }
    out.push(mod.default);
  }
  return out;
}
