import type { StorageAdapter } from "grammy";
import { MemorySessionStorage } from "./toolkit/session/memory.js";

export interface User {
  telegram_id: number;
  display_name: string;
  solana_address?: string;
  balance: number;
  last_deposit_ts?: number;
  [key: string]: unknown;
}

export interface Tip {
  id: string;
  amount: number;
  timestamp: number;
  sender_id: number;
  recipient_id: number;
  group_id: number;
  message_id?: number;
  [key: string]: unknown;
}

export interface Withdrawal {
  id: string;
  amount: number;
  status: "pending" | "approved" | "completed" | "failed";
  network_fee: number;
  target_address: string;
  timestamp: number;
  user_id: number;
  [key: string]: unknown;
}

interface IndexStore {
  ids: number[];
  [key: string]: unknown;
}

class DomainStore<T extends Record<string, unknown>> {
  constructor(
    private adapter: StorageAdapter<T>,
    private indexAdapter: StorageAdapter<IndexStore>,
    private indexKey: string,
  ) {}

  async get(id: number): Promise<T | undefined> {
    return this.adapter.read(String(id));
  }

  async set(id: number, value: T): Promise<void> {
    await this.adapter.write(String(id), value);
  }

  async getAll(): Promise<T[]> {
    const index = await this.indexAdapter.read(this.indexKey);
    if (!index) return [];
    const results: T[] = [];
    for (const id of index.ids) {
      const item = await this.adapter.read(String(id));
      if (item) results.push(item);
    }
    return results;
  }

  async addId(id: number): Promise<void> {
    const index = (await this.indexAdapter.read(this.indexKey)) ?? { ids: [] };
    if (!index.ids.includes(id)) {
      index.ids.push(id);
      await this.indexAdapter.write(this.indexKey, index);
    }
  }

  async removeId(id: number): Promise<void> {
    const index = (await this.indexAdapter.read(this.indexKey)) ?? { ids: [] };
    index.ids = index.ids.filter((i) => i !== id);
    await this.indexAdapter.write(this.indexKey, index);
  }
}

function makeStore<T extends Record<string, unknown>>(
  prefix: string,
  indexPrefix: string,
  indexKey: string,
): DomainStore<T> {
  const adapter = new MemorySessionStorage<T>();
  const indexAdapter = new MemorySessionStorage<IndexStore>();
  return new DomainStore<T>(adapter, indexAdapter, indexKey);
}

export function createDataStore() {
  return {
    users: makeStore<User>("user:", "idx:", "users"),
    tips: makeStore<Tip>("tip:", "idx:", "tips"),
    withdrawals: makeStore<Withdrawal>("wd:", "idx:", "withdrawals"),
  };
}

export type DataStore = ReturnType<typeof createDataStore>;
