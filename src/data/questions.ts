// The questionnaire, defined as data. The wizard renders this array in order,
// so reordering, adding, or removing a question is a one-line edit here — no
// component changes required.

import type { Question } from "../types";
import { IAP2_LEVELS, GOAL_COLORS } from "./content";

export const QUESTIONS: Question[] = [
  {
    id: "participants",
    type: "scale",
    title: "How many people will participate?",
    help: "The number of participants shapes which designs are feasible. Pick the closest order of magnitude.",
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
    id: "engagement-depth",
    type: "single",
    title: "What level of public participation are you aiming for?",
    help: "Choose how much influence participants will have over the final decision — from receiving information to holding decision-making power themselves.",
    citation: "iap2",
    options: IAP2_LEVELS.map((l) => ({
      value: l.value,
      label: l.label,
      description: l.description,
    })),
  },
  {
    id: "modes",
    type: "single",
    title: "How can participants take part?",
    help: "The format affects who can join, what the process costs, and the quality of discussion.",
    options: [
      { value: "online", label: "Online only", description: "All participation happens through digital channels." },
      { value: "face-to-face", label: "Face-to-face only", description: "All participation happens in person." },
      { value: "hybrid", label: "Both online and face-to-face", description: "A mix of in-person and digital participation." },
    ],
  },
  {
    id: "criteria",
    type: "single",
    title: "Who is allowed to participate?",
    help: "This choice affects how representative and inclusive your process is, and how much control you have over who takes part.",
    options: [
      { value: "self-selection", label: "Anyone can participate", description: "Self-selection — lower barrier, broader reach." },
      { value: "sortition", label: "Invited people only", description: "Sortition — more representative, but higher cost." },
    ],
  },
  {
    id: "diversity",
    type: "multi",
    title: "What demographics do you want to focus on?",
    help: "Select the demographic groups you specifically need to reach. This helps tailor the design to ensure those voices are included.",
    options: [
      // Gender
      { value: "gender-male", label: "Male", group: "Gender" },
      { value: "gender-female", label: "Female", group: "Gender" },
      { value: "gender-nonbinary", label: "Non-binary or other", group: "Gender" },
      // Age
      { value: "age-18-24", label: "18–24", group: "Age" },
      { value: "age-25-34", label: "25–34", group: "Age" },
      { value: "age-35-44", label: "35–44", group: "Age" },
      { value: "age-45-54", label: "45–54", group: "Age" },
      { value: "age-55-64", label: "55–64", group: "Age" },
      { value: "age-65plus", label: "65 and over", group: "Age" },
      // Ethnic background
      { value: "eth-white-european", label: "White / European", group: "Ethnic background" },
      { value: "eth-black-african", label: "Black / African descent", group: "Ethnic background" },
      { value: "eth-asian-east", label: "Asian / East Asian", group: "Ethnic background" },
      { value: "eth-asian-south", label: "South Asian", group: "Ethnic background" },
      { value: "eth-latin-american", label: "Latin American / Hispanic", group: "Ethnic background" },
      { value: "eth-mena", label: "Middle Eastern / North African", group: "Ethnic background" },
      { value: "eth-mixed", label: "Mixed heritage", group: "Ethnic background" },
      { value: "eth-other", label: "Other", group: "Ethnic background" },
    ],
  },
  {
    id: "resources",
    type: "multi",
    title: "What does your budget allow?",
    help: "Select the resources you can realistically commit to. Optionally enter your total budget in CHF.",
    budgetInput: true,
    options: [
      { value: "online-platform", label: "Host online deliberation platform", description: "Use or license a digital platform for online deliberation." },
      { value: "dedicated-staff", label: "Hire dedicated staff", description: "Employ people specifically for this process." },
      { value: "consultants", label: "Hire consultants", description: "Bring in external expertise and facilitation." },
    ],
  },
  {
    id: "priorities",
    type: "rank",
    title: "What are your goals?",
    help: "Rank from most to least important. This ranking determines which process designs are recommended to you.",
    options: [
      { value: "Inclusion", label: "I want more people to participate", color: GOAL_COLORS.Inclusion },
      { value: "Plurality", label: "I want a wide variety of ideas", color: GOAL_COLORS.Plurality },
      { value: "Equality", label: "I want a wide variety of people", color: GOAL_COLORS.Equality },
      { value: "Reflection", label: "I want deeper discussions", color: GOAL_COLORS.Reflection },
      { value: "Authenticity", label: "I want honest ideas", color: GOAL_COLORS.Authenticity },
    ],
  },
];
