// Wizard state: which step we are on, the answers collected so far, and whether
// the user has reached the results view. No persistence — this lives only in
// the browser session, in line with the v1 "no backend" decision.

import { create } from "zustand";
import type { Answers, AnswerValue } from "../types";

interface WizardState {
  step: number; // index into the active question list
  answers: Answers;
  showResults: boolean;
  showLanding: boolean;
  /**
   * How many questions the wizard has. Questions are admin-editable data now,
   * so the store is told the count rather than importing a fixed array.
   */
  questionCount: number;

  setQuestionCount: (n: number) => void;
  setAnswer: (questionId: string, value: AnswerValue) => void;
  next: () => void;
  back: () => void;
  goTo: (step: number) => void;
  viewResults: () => void;
  reset: () => void;
  start: () => void;
  goHome: () => void;
}

export const useWizard = create<WizardState>((set) => ({
  step: 0,
  answers: {},
  showResults: false,
  showLanding: true,
  questionCount: 0,

  setQuestionCount: (n) =>
    // Clamp the current step in case a question was removed while browsing.
    set((s) => ({ questionCount: n, step: Math.min(s.step, Math.max(0, n - 1)) })),

  setAnswer: (questionId, value) =>
    set((s) => ({ answers: { ...s.answers, [questionId]: value } })),

  next: () =>
    set((s) => {
      if (s.step >= s.questionCount - 1) return { showResults: true };
      return { step: s.step + 1 };
    }),

  back: () =>
    set((s) => {
      if (s.showResults) return { showResults: false };
      return { step: Math.max(0, s.step - 1) };
    }),

  goTo: (step) =>
    set((s) => ({
      step: Math.min(Math.max(0, step), Math.max(0, s.questionCount - 1)),
      showResults: false,
    })),

  viewResults: () => set(() => ({ showResults: true })),

  reset: () => set(() => ({ step: 0, answers: {}, showResults: false, showLanding: false })),

  start: () => set(() => ({ showLanding: false, showResults: false })),

  goHome: () => set(() => ({ showLanding: true, showResults: false })),
}));
