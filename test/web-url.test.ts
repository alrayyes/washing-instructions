import { describe, expect, test } from "bun:test";
import { readUrlFilters } from "../apps/web/src/lib/url";

describe("readUrlFilters", () => {
  test("reads both params from a query string", () => {
    expect(readUrlFilters("?cut=iron&pile=towels")).toEqual({ cut: "iron", pileQuery: "towels" });
  });

  test("reads a bare pile with no cut", () => {
    expect(readUrlFilters("?pile=socks")).toEqual({ pileQuery: "socks" });
  });

  test("reads a bare cut with no pile", () => {
    expect(readUrlFilters("?cut=wash")).toEqual({ cut: "wash" });
  });

  test("returns an empty object for no query string at all", () => {
    expect(readUrlFilters("")).toEqual({});
  });

  test("ignores a cut that isn't one of the known variants", () => {
    expect(readUrlFilters("?cut=spin&pile=towels")).toEqual({ pileQuery: "towels" });
  });

  test("decodes a URL-encoded pile search", () => {
    expect(readUrlFilters("?pile=white%20socks")).toEqual({ pileQuery: "white socks" });
  });
});
