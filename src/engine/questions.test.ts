import { describe, it, expect } from "vitest";
import { activeQuestions, questionForDimension, taggableDimensions } from "./questions";
import type { Question } from "../types";

function q(id: string, dimension: string, enabled = true, order = 0): Question {
  return { id, dimension, enabled, type: "single", order, title: id };
}

describe("activeQuestions", () => {
  it("drops disabled questions and sorts by order", () => {
    const asked = activeQuestions([
      q("b", "mode", true, 2),
      q("hidden", "size", false, 1),
      q("a", "level", true, 0),
    ]);
    expect(asked.map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("questionForDimension", () => {
  it("ignores a disabled question on that dimension", () => {
    expect(questionForDimension([q("size", "size", false)], "size")).toBeUndefined();
    expect(questionForDimension([q("size", "size")], "size")?.id).toBe("size");
  });
});

describe("taggableDimensions", () => {
  const dims = [
    { key: "size", matching: true },
    { key: "mode", matching: true },
    { key: "duration", matching: false },
  ];

  it("hides a matching dimension whose question is disabled or missing", () => {
    const kept = taggableDimensions(dims, [q("size", "size", false), q("mode", "mode")]);
    expect(kept.map((d) => d.key)).toEqual(["mode", "duration"]);
  });

  it("always keeps tag-only dimensions, which never have a question", () => {
    expect(taggableDimensions(dims, []).map((d) => d.key)).toEqual(["duration"]);
  });
});
