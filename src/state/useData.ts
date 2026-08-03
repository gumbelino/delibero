import { useCallback, useEffect, useState } from "react";
import { isAppwriteConfigured } from "../lib/appwrite";
import { listRecommendations } from "../lib/repo/recommendations";
import { listParameters } from "../lib/repo/parameters";
import { listDimensions } from "../lib/repo/dimensions";
import { listQuestions, withOptions } from "../lib/repo/questions";
import type { DimensionDef, ParameterSet, Question, RecommendationRow } from "../types";

interface DataState {
  recommendations: RecommendationRow[];
  dimensions: DimensionDef[];
  parameters: ParameterSet;
  /** The questionnaire, with each question's options resolved from parameters. */
  questions: Question[];
  loading: boolean;
  error: string | null;
}

interface UseData extends DataState {
  /** Re-fetch. The admin page calls this after writes. */
  refresh: () => Promise<void>;
}

/**
 * Loads the knowledge base from Appwrite. There is no offline fallback: the
 * bundled files under public/data are seed input for the setup scripts only, and
 * silently serving stale copies of them would hide an outage from editors who
 * had just saved a change.
 */
export function useData(): UseData {
  const [state, setState] = useState<DataState>({
    recommendations: [],
    dimensions: [],
    parameters: {},
    questions: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async (): Promise<DataState> => {
    if (!isAppwriteConfigured) {
      throw new Error(
        "Appwrite is not configured. Set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID.",
      );
    }

    const [recommendations, dimensions, questions] = await Promise.all([
      listRecommendations(),
      listDimensions(),
      listQuestions(),
    ]);
    const parameters = await listParameters(dimensions);

    return {
      recommendations,
      dimensions,
      parameters,
      questions: withOptions(questions, parameters),
      loading: false,
      error: null,
    };
  }, []);

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, error: null }));
    try {
      setState(await load());
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState((s) => ({
            ...s,
            loading: false,
            error: err instanceof Error ? err.message : String(err),
          }));
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  return { ...state, refresh };
}
