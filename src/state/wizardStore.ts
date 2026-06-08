// Wizard state: which step we are on, the answers collected so far, and whether
// the user has reached the results view. No persistence — this lives only in
// the browser session, in line with the v1 "no backend" decision.

import { create } from "zustand";
import type { Answers, AnswerValue } from "../types";
import { QUESTIONS } from "../data/questions";

interface WizardState {
  step: number; // index into QUESTIONS
  answers: Answers;
  showResults: boolean;

  setAnswer: (questionId: string, value: AnswerValue) => void;
  next: () => void;
  back: () => void;
  goTo: (step: number) => void;
  viewResults: () => void;
  reset: () => void;
}

export const useWizard = create<WizardState>((set) => ({
  step: 0,
  answers: {},
  showResults: false,

  setAnswer: (questionId, value) =>
    set((s) => ({ answers: { ...s.answers, [questionId]: value } })),

  next: () =>
    set((s) => {
      if (s.step >= QUESTIONS.length - 1) return { showResults: true };
      return { step: s.step + 1 };
    }),

  back: () =>
    set((s) => {
      if (s.showResults) return { showResults: false };
      return { step: Math.max(0, s.step - 1) };
    }),

  goTo: (step) =>
    set(() => ({
      step: Math.min(Math.max(0, step), QUESTIONS.length - 1),
      showResults: false,
    })),

  viewResults: () => set(() => ({ showResults: true })),

  reset: () => set(() => ({ step: 0, answers: {}, showResults: false })),
}));
