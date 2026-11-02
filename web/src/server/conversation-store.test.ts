import { describe, expect, it } from "vitest";
import { savedBranch } from "./conversation-store";

const entry = (id: string, parentId: string | null, text: string, role = "user") => ({ id, parentId, blob: JSON.stringify({ role, parts: [{ type: "text", text }] }) });

describe("saved conversation context", () => {
  it("uses only the saved ancestors of the selected prompt", () => {
    const rows = [entry("a", null, "Soup for four"), entry("b", "a", "Which ingredients?", "assistant"), entry("other", "a", "Unrelated branch"), entry("c", "b", "Tomatoes and stock")];
    expect(savedBranch(rows, "c").map((message) => message.content)).toEqual(["Soup for four", "Which ingredients?", "Tomatoes and stock"]);
  });
  it("refuses missing parents instead of discarding context", () => {
    expect(() => savedBranch([entry("a", "missing", "Soup")], "a")).toThrow("missing parent");
  });
  it("refuses cycles", () => {
    expect(() => savedBranch([entry("a", "b", "Soup"), entry("b", "a", "Stock")], "b")).toThrow("requires review");
  });
});
