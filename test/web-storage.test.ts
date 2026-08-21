import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFilters, writeFilters } from "../apps/web/src/lib/storage";

/**
 * `bun:test` has no `localStorage` global (it's a browser API), so each test
 * stands up its own stand-in and tears it down after — a shared one would
 * leak state between tests in the same file.
 */
class MemoryStorage implements Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  private store = new Map<string, string>();
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
}

class ThrowingStorage implements Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  getItem(): never {
    throw new Error("storage is not available");
  }
  setItem(): never {
    throw new Error("storage is not available");
  }
  removeItem(): never {
    throw new Error("storage is not available");
  }
}

let original: typeof localStorage | undefined;

beforeEach(() => {
  original = (globalThis as { localStorage?: typeof localStorage }).localStorage;
});

afterEach(() => {
  (globalThis as { localStorage?: typeof localStorage }).localStorage = original as never;
});

function stub(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">) {
  (globalThis as { localStorage: unknown }).localStorage = storage;
}

describe("readFilters / writeFilters", () => {
  test("round-trips whatever was last written", () => {
    stub(new MemoryStorage());

    writeFilters({ cut: "wash", pileQuery: "sock" });

    expect(readFilters()).toEqual({ cut: "wash", pileQuery: "sock" });
  });

  test("returns null when nothing has been stored yet", () => {
    stub(new MemoryStorage());

    expect(readFilters()).toBeNull();
  });

  test("ignores a value that isn't valid JSON", () => {
    const storage = new MemoryStorage();
    storage.setItem("washy-washy:filters", "not json");
    stub(storage);

    expect(readFilters()).toBeNull();
  });

  test("ignores a value shaped wrong, such as an unknown cut", () => {
    const storage = new MemoryStorage();
    storage.setItem("washy-washy:filters", JSON.stringify({ cut: "spin", pileQuery: "" }));
    stub(storage);

    expect(readFilters()).toBeNull();
  });

  test("degrades to not remembering when storage itself throws", () => {
    stub(new ThrowingStorage());

    expect(() => writeFilters({ cut: "full", pileQuery: "" })).not.toThrow();
    expect(readFilters()).toBeNull();
  });
});
