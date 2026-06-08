import { describe, it, expect } from "vitest";
import { evalMatch, findCandidates } from "./tree";
import { rankTemplates, principleWeights } from "./rank";
import { recommend } from "./recommend";
import { parseTemplates, parseTree } from "./csv";
import type { Template, TreeNode } from "../types";

const TEMPLATES_CSV = `id,name,description,supports_principles,citations
AsyncStructured,Asynchronous Structured Deliberation,desc,Plurality;Inclusion,24
DistributedSmallGroup,Distributed Small-Group Deliberation,desc,Reflection;Authenticity,25
LayeredMeta,Layered Meta-Deliberation,desc,Reflection;Plurality,30
MultimodalInclusive,Multimodal Inclusive Deliberation,desc,Inclusion;Equality,34
GamifiedEngagement,Gamified Engagement,desc,Authenticity;Reflection,`;

const TREE_CSV = `node_id,parent_id,question_id,match,recommend
n1,,participants,>=10000,
n2,n1,modes,online,AsyncStructured
n3,n1,modes,hybrid,DistributedSmallGroup
n5,,participants,>=1000,DistributedSmallGroup
n6,,stages-focus,output-generation,LayeredMeta
n9,,diversity,any,MultimodalInclusive
n11,,engagement-calc,ratio<0.1,GamifiedEngagement`;

const templates: Template[] = parseTemplates(TEMPLATES_CSV);
const tree: TreeNode[] = parseTree(TREE_CSV);

describe("CSV parsing", () => {
  it("parses templates with principle lists and citations", () => {
    expect(templates).toHaveLength(5);
    const async = templates.find((t) => t.id === "AsyncStructured")!;
    expect(async.supportsPrinciples).toEqual(["Plurality", "Inclusion"]);
    expect(async.citations).toEqual(["24"]);
  });

  it("parses tree nodes", () => {
    expect(tree).toHaveLength(7);
    expect(tree[0]).toMatchObject({ nodeId: "n1", parentId: "", match: ">=10000" });
  });
});

describe("evalMatch", () => {
  it("handles numeric thresholds on scale answers", () => {
    expect(evalMatch(">=10000", "50000")).toBe(true);
    expect(evalMatch(">=10000", "1000")).toBe(false);
    expect(evalMatch("<1000", "500")).toBe(true);
  });

  it("handles exact single-select and membership", () => {
    expect(evalMatch("online", "online")).toBe(true);
    expect(evalMatch("online", "hybrid")).toBe(false);
    expect(evalMatch("youth", ["youth", "elder"])).toBe(true);
    expect(evalMatch("low-digital", ["youth"])).toBe(false);
  });

  it("handles 'any' as presence", () => {
    expect(evalMatch("any", ["youth"])).toBe(true);
    expect(evalMatch("any", [])).toBe(false);
    expect(evalMatch("any", undefined)).toBe(false);
  });

  it("handles ratio comparisons on numberPair answers", () => {
    expect(evalMatch("ratio<0.1", { reached: 1000, participating: 50 })).toBe(true);
    expect(evalMatch("ratio<0.1", { reached: 1000, participating: 500 })).toBe(false);
    expect(evalMatch("ratio<0.1", { reached: 0, participating: 0 })).toBe(true);
  });
});

describe("findCandidates", () => {
  it("requires parent nodes to be reached", () => {
    // 50k online -> n1 reached, n2 (online) reached -> AsyncStructured.
    const found = findCandidates(tree, { participants: "50000", modes: "online" });
    expect(found).not.toBeNull();
    expect([...found!.keys()]).toContain("AsyncStructured");
  });

  it("does not nominate a child when its parent gate fails", () => {
    // 500 participants -> n1 (>=10000) fails, so n2 cannot be reached.
    const found = findCandidates(tree, { participants: "500", modes: "online" });
    const keys = found ? [...found.keys()] : [];
    expect(keys).not.toContain("AsyncStructured");
  });

  it("returns null when nothing matches (caller falls back to all)", () => {
    const found = findCandidates(tree, {});
    expect(found).toBeNull();
  });
});

describe("principleWeights", () => {
  it("assigns inverse-rank weights from the user's ranking", () => {
    const w = principleWeights(["Reflection", "Plurality", "Inclusion", "Equality", "Authenticity"]);
    expect(w.get("Reflection")).toEqual({ rank: 1, weight: 5 });
    expect(w.get("Authenticity")).toEqual({ rank: 5, weight: 1 });
  });
});

describe("rankTemplates", () => {
  it("orders candidates by alignment with the ranking", () => {
    // Reflection #1: LayeredMeta (Reflection+Plurality) should beat MultimodalInclusive.
    const ranking = ["Reflection", "Plurality", "Inclusion", "Equality", "Authenticity"];
    const ranked = rankTemplates(templates, ranking);
    expect(ranked[0].template.id).toBe("LayeredMeta");
    expect(ranked[0].score).toBe(5 + 4); // Reflection(5) + Plurality(4)
  });

  it("falls back to breadth-of-support when no ranking is given", () => {
    const ranked = rankTemplates(templates, undefined);
    // Every template supports exactly two principles -> all score 2.
    expect(ranked.every((r) => r.score === 2)).toBe(true);
  });
});

describe("recommend (end-to-end)", () => {
  it("large-scale online + Plurality-first surfaces Asynchronous Structured", () => {
    const recs = recommend(templates, tree, {
      participants: "50000",
      modes: "online",
      priorities: ["Plurality", "Inclusion", "Reflection", "Equality", "Authenticity"],
    });
    expect(recs[0].template.id).toBe("AsyncStructured");
    expect(recs[0].nominatedBy.length).toBeGreaterThan(0);
    expect(recs[0].contributions[0].principle).toBe("Plurality");
  });

  it("diversity targets surface Multimodal Inclusive", () => {
    const recs = recommend(templates, tree, {
      participants: "500",
      diversity: ["youth", "elder"],
      priorities: ["Inclusion", "Equality", "Plurality", "Reflection", "Authenticity"],
    });
    expect(recs.map((r) => r.template.id)).toContain("MultimodalInclusive");
  });

  it("falls back to ranking all templates when the tree matches nothing", () => {
    const recs = recommend(templates, tree, {
      priorities: ["Reflection", "Plurality", "Inclusion", "Equality", "Authenticity"],
    });
    expect(recs).toHaveLength(5);
    expect(recs[0].template.id).toBe("LayeredMeta");
  });
});
