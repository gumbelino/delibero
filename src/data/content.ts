// Educational content shown in the wizard: the IAP2 spectrum,
// principle definitions, goal colors, and the citation map. Editing copy here
// does not touch component code.

import type { PrincipleId } from "../types";

/** Citation map. Keys are referenced from questions, templates (CSV), and content. */
export const CITATIONS: Record<string, string> = {
  "24": "On interaction vs. size in scaling deliberation [24].",
  "25": "On diversity vs. depth in scaling deliberation [25].",
  "30": "On consequentiality vs. engagement in scaling deliberation [30].",
  "34": "On identity vs. anonymity in scaling deliberation [34].",
  iap2: "IAP2 Spectrum of Public Participation",
};

export const IAP2_URL =
  "https://www.iap2.org/page/pillars";

/** Color for each deliberative principle/goal — single source of truth used across the app. */
export const GOAL_COLORS: Record<PrincipleId, string> = {
  Inclusion: "#2563EB",
  Plurality: "#16A34A",
  Equality: "#EA580C",
  Reflection: "#7C3AED",
  Authenticity: "#DC2626",
};

/** Plain-language definitions of the five deliberative principles. */
export const PRINCIPLES: { id: PrincipleId; label: string; description: string }[] = [
  {
    id: "Inclusion",
    label: "Inclusion",
    description: "Equal access and diverse, representative participation.",
  },
  {
    id: "Equality",
    label: "Equality",
    description: "Equal standing and voice for all participants.",
  },
  {
    id: "Plurality",
    label: "Plurality",
    description: "Diversity of reasons, arguments, and perspectives.",
  },
  {
    id: "Authenticity",
    label: "Authenticity",
    description: "Sincerity, transparency, and non-coercion.",
  },
  {
    id: "Reflection",
    label: "Reflection",
    description: "Weighing arguments and reaching reasoned judgment.",
  },
];

/** The four core tensions that grow as deliberation scales. */
export const SCALE_TENSIONS: { title: string; body: string; citation: string }[] = [
  {
    title: "Interaction vs. size",
    body: "As processes expand, the conditions that sustain reciprocity, reflection, reason-giving, and sustained interaction become harder to maintain, often leading to fragmented discussion and lower deliberative quality.",
    citation: "24",
  },
  {
    title: "Identity vs. anonymity",
    body: "Scaling can erode authenticity (mutual recognition, interpersonal trust) and equality of voice, as participants become more anonymous and socially disconnected in large-scale environments.",
    citation: "34",
  },
  {
    title: "Diversity vs. depth",
    body: "Scaling formally expands plurality, inclusiveness, and representativeness, but these often remain weakly operationalised in practice, limiting sustained interaction and integration of diverse perspectives.",
    citation: "25",
  },
  {
    title: "Consequentiality vs. engagement",
    body: "As processes scale, participants often perceive their individual contribution as less consequential, which can reduce motivation, attentiveness, and reflective engagement.",
    citation: "30",
  },
];

/** The IAP2 Spectrum of Public Participation, increasing public impact. */
export const IAP2_LEVELS: { value: string; label: string; description: string }[] = [
  {
    value: "inform",
    label: "Inform",
    description: "Provide balanced, objective information to help the public understand the issue.",
  },
  {
    value: "consult",
    label: "Consult",
    description: "Obtain public feedback on analysis, alternatives, and decisions.",
  },
  {
    value: "involve",
    label: "Involve",
    description: "Work directly with the public so concerns and aspirations are consistently understood and considered.",
  },
  {
    value: "collaborate",
    label: "Collaborate",
    description: "Partner with the public in each aspect of the decision, including developing alternatives and a preferred solution.",
  },
  {
    value: "empower",
    label: "Empower",
    description: "Place final decision-making in the hands of the public.",
  },
];

/** Rich content for `info` questions, keyed by Question.infoKey. */
export const INFO_PANELS: Record<
  string,
  { intro: string; items: { title: string; body: string; citation?: string }[] }
> = {
  "scale-tradeoffs": {
    intro:
      "Before going further, consider how growing the number of participants changes what your process can sustain. These trade-offs shape which design will serve you best.",
    items: SCALE_TENSIONS.map((t) => ({
      title: t.title,
      body: t.body,
      citation: t.citation,
    })),
  },
};
