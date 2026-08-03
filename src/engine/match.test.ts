import { describe, expect, it } from "vitest";
import { matchRecommendations } from "./match";
import type { DimensionDef, Question, RecommendationRow } from "../types";

function q(id: string, dimension: string, enabled = true): Question {
  return { id, dimension, enabled, type: "single", order: 0, title: id };
}

const size: DimensionDef = {
  key: "size", label: "Size", matching: true, order: 0, builtin: true,
};
const stage: DimensionDef = {
  key: "stage", label: "Stage", matching: false, order: 1, builtin: true,
};
/** An admin-created dimension with its own question. */
const duration: DimensionDef = {
  key: "duration", label: "Duration", matching: true, order: 2, builtin: false,
};

function rec(name: string, dims: Record<string, string>): RecommendationRow {
  return { name, description: "", pros: "", cons: "", body: "", dims };
}

describe("matchRecommendations", () => {
  const small = rec("Small only", { size: "small" });
  const anySize = rec("Any size", { size: "any" });
  const smallOrMedium = rec("Small or medium", { size: "small,medium" });

  it("keeps rows whose value matches the answer", () => {
    const out = matchRecommendations([small, anySize], { participants: "small" }, [size], [q("participants", "size")]);
    expect(out.map((m) => m.row.name)).toEqual(["Small only", "Any size"]);
  });

  it("drops rows whose value does not match", () => {
    const out = matchRecommendations([small, anySize], { participants: "large" }, [size], [q("participants", "size")]);
    expect(out.map((m) => m.row.name)).toEqual(["Any size"]);
  });

  it("treats a comma-separated list as a set of accepted values", () => {
    const out = matchRecommendations([smallOrMedium], { participants: "medium" }, [size], [q("participants", "size")]);
    expect(out).toHaveLength(1);
  });

  it("ignores dimensions that are not flagged for matching", () => {
    // `stage` is a descriptive tag: a mismatch must not exclude the row.
    const row = rec("Tagged", { stage: "recruitment" });
    const out = matchRecommendations([row], { stage: "evaluation" }, [stage], [q("stage", "stage")]);
    expect(out).toHaveLength(1);
  });

  it("skips a matching dimension that has no question wired to it", () => {
    // The failure mode this guards: an admin creates a matching dimension,
    // forgets to pick a question, and every recommendation vanishes.
    const row = rec("Long only", { duration: "long" });
    const out = matchRecommendations([row], {}, [duration], []);
    expect(out).toHaveLength(1);
  });

  it("skips a matching dimension whose question is unanswered", () => {
    const row = rec("Long only", { duration: "long" });
    const out = matchRecommendations([row], { participants: "small" }, [duration], [q("how-long", "duration")]);
    expect(out).toHaveLength(1);
  });

  it("applies an admin-created dimension once its question is answered", () => {
    const long = rec("Long only", { duration: "long" });
    const short = rec("Short only", { duration: "short" });
    const out = matchRecommendations([long, short], { "how-long": "long" }, [duration], [q("how-long", "duration")]);
    expect(out.map((m) => m.row.name)).toEqual(["Long only"]);
  });

  it("requires every active dimension to fit", () => {
    const row = rec("Small and long", { size: "small", duration: "long" });
    const answers = { participants: "small", "how-long": "short" };
    const qs = [q("participants", "size"), q("how-long", "duration")];
    expect(matchRecommendations([row], answers, [size, duration], qs)).toHaveLength(0);
  });

  it("attributes the match only to dimensions that narrowed it", () => {
    const out = matchRecommendations([small, anySize], { participants: "small" }, [size], [q("participants", "size")]);
    expect(out[0].matchedOn).toBe("size: small");
    expect(out[1].matchedOn).toBe("your answers");
  });

  it("skips a dimension whose question is disabled", () => {
    // Disabling a question must not silently filter on a stale answer.
    const long = rec("Long only", { duration: "long" });
    const disabled = q("how-long", "duration", false);
    const out = matchRecommendations([long], { "how-long": "short" }, [duration], [disabled]);
    expect(out).toHaveLength(1);
  });

  it("treats a missing dimension entry as 'any'", () => {
    const bare = rec("No dims set", {});
    expect(
      matchRecommendations([bare], { participants: "small" }, [size], [q("participants", "size")]),
    ).toHaveLength(1);
  });
});
