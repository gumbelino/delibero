// The questionnaire, defined as data. The wizard renders this array in order,
// so reordering, adding, or removing a question is a one-line edit here — no
// component changes required.

import type { Question } from "../types";
import { PRINCIPLES, IAP2_LEVELS } from "./content";

export const QUESTIONS: Question[] = [
  {
    id: "priorities",
    type: "rank",
    title: "Rank the deliberative principles by priority",
    help: "Drag to order them from most to least important for your process. This ranking — and nothing else — determines how recommendations are weighted.",
    options: PRINCIPLES.map((p) => ({
      value: p.id,
      label: p.label,
      description: p.description,
    })),
  },
  {
    id: "participants",
    type: "scale",
    title: "How many people will participate?",
    help: "Pick the closest order of magnitude.",
    options: [
      { value: "20", label: "20" },
      { value: "100", label: "100" },
      { value: "500", label: "500" },
      { value: "1000", label: "1,000" },
      { value: "10000", label: "10,000" },
      { value: "50000", label: "50,000" },
      { value: "100000", label: "100,000" },
    ],
  },
  {
    id: "scale-tradeoffs",
    type: "info",
    title: "Trade-offs as you scale",
    infoKey: "scale-tradeoffs",
  },
  {
    id: "engagement-depth",
    type: "single",
    title: "What level of public participation are you aiming for?",
    help: "Based on the IAP2 Spectrum of Public Participation.",
    citation: "iap2",
    options: IAP2_LEVELS.map((l) => ({
      value: l.value,
      label: l.label,
      description: l.description,
    })),
  },
  {
    id: "diversity",
    type: "multi",
    title: "Which groups must be well represented?",
    help: "Select all that you specifically need to reach.",
    options: [
      { value: "youth", label: "Youth" },
      { value: "elder", label: "Older adults" },
      { value: "linguistic", label: "Linguistic minorities" },
      { value: "low-digital", label: "Low digital-literacy groups" },
      { value: "other", label: "Other under-represented groups" },
    ],
  },
  {
    id: "stages-focus",
    type: "multi",
    title: "Which stages of the process do you most want to strengthen?",
    help: "Select the stages where you need the most support.",
    options: [
      { value: "recruitment", label: "Recruitment", description: "How participants are selected and invited." },
      { value: "orientation", label: "Orientation", description: "Introducing the process, objectives, rules, and expectations." },
      { value: "group-building", label: "Group-building", description: "Fostering trust, cohesion, and communicative readiness." },
      { value: "information-learning", label: "Information & learning", description: "Providing and exchanging relevant knowledge and evidence." },
      { value: "problem-definition", label: "Problem definition", description: "Framing and clarifying the issue under discussion." },
      { value: "discussion", label: "Discussion", description: "Exchanging and evaluating arguments and perspectives." },
      { value: "solution", label: "Solution", description: "Developing and refining proposals or recommendations." },
      { value: "output-generation", label: "Output generation", description: "Synthesising and formalising collective outputs." },
      { value: "review-communication", label: "Review & communication", description: "Feedback, evaluation, and dissemination of outcomes." },
    ],
  },
  {
    id: "modes",
    type: "single",
    title: "How will participants take part?",
    options: [
      { value: "face-to-face", label: "Face-to-face" },
      { value: "online", label: "Online only" },
      { value: "hybrid", label: "Hybrid (face-to-face + online)" },
    ],
  },
  {
    id: "engagement-calc",
    type: "numberPair",
    title: "Engagement calculator",
    help: "Estimate your reach and expected participation. We use the ratio to gauge conversion.",
    fields: [
      { key: "reached", label: "People reached" },
      { key: "participating", label: "People who participate" },
    ],
  },
  {
    id: "criteria",
    type: "single",
    title: "Who is allowed to participate?",
    options: [
      { value: "self-selection", label: "Self-selection", description: "Anyone who wishes to can take part." },
      { value: "sortition", label: "Sortition", description: "Only randomly selected participants take part." },
    ],
  },
  {
    id: "resources",
    type: "multi",
    title: "Which resources do you have available?",
    help: "Select all that apply.",
    options: [
      { value: "budget", label: "Budget" },
      { value: "staff", label: "Dedicated staff" },
      { value: "online-tool", label: "An online deliberation tool" },
    ],
  },
];
