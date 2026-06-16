import { useEffect, useState } from "react";
import { loadData } from "../engine/csv";
import type { Template, TreeNode, RecommendationRow } from "../types";

interface DataState {
  templates: Template[];
  tree: TreeNode[];
  recommendations: RecommendationRow[];
  loading: boolean;
  error: string | null;
}

export function useData(): DataState {
  const [state, setState] = useState<DataState>({
    templates: [],
    tree: [],
    recommendations: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    loadData()
      .then(({ templates, tree, recommendations }) => {
        if (!cancelled) setState({ templates, tree, recommendations, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({
            templates: [],
            tree: [],
            recommendations: [],
            loading: false,
            error: err instanceof Error ? err.message : String(err),
          });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
