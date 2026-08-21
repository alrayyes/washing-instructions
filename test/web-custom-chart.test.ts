import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chartToJson, DIST_MACHINE, type Instruction, parseInstructions } from "@washy-washy/core";
import {
  clearCustomChart,
  readCustomChart,
  writeCustomChart,
} from "../apps/web/src/lib/customChart";
import { loadMachine } from "../src/machine";

/** `bun:test` has no `localStorage` global — a browser API — so stand one in. */
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

let original: typeof localStorage | undefined;

beforeEach(() => {
  original = (globalThis as { localStorage?: typeof localStorage }).localStorage;
  (globalThis as { localStorage: unknown }).localStorage = new MemoryStorage();
});

afterEach(() => {
  (globalThis as { localStorage?: typeof localStorage }).localStorage = original as never;
});

const machine = await loadMachine(DIST_MACHINE);
const csv = await Bun.file("data/washing-instructions.csv.dist").text();
const instructions: Instruction[] = parseInstructions(csv, machine);

describe("readCustomChart / writeCustomChart / clearCustomChart", () => {
  test("round-trips what was written back to the same instructions", () => {
    writeCustomChart(instructions);

    expect(readCustomChart(machine)).toEqual(instructions);
  });

  test("returns null when nothing has been uploaded yet", () => {
    expect(readCustomChart(machine)).toBeNull();
  });

  test("falls back to null for a chart that no longer fits the machine", () => {
    localStorage.setItem(
      "washy-washy:chart",
      JSON.stringify([
        { ...JSON.parse(chartToJson(instructions))[0], program: "Not a real programme" },
      ]),
    );

    expect(readCustomChart(machine)).toBeNull();
  });

  test("falls back to null for a value that isn't valid JSON", () => {
    localStorage.setItem("washy-washy:chart", "not json");

    expect(readCustomChart(machine)).toBeNull();
  });

  test("clear removes a previously uploaded chart", () => {
    writeCustomChart(instructions);

    clearCustomChart();

    expect(readCustomChart(machine)).toBeNull();
  });
});
