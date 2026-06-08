// Loads the researcher-editable CSV data once on mount.

import { useEffect, useState } from "react";
import { loadData } from "../engine/csv";
import type { Template, TreeNode } from "../types";

interface DataState {
  templates: Template[];
  tree: TreeNode[];
  loading: boolean;
  error: string | null;
}

export function useData(): DataState {
  const [state, setState] = useState<DataState>({
    templates: [],
    tree: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    loadData()
      .then(({ templates, tree }) => {
        if (!cancelled) setState({ templates, tree, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({
            templates: [],
            tree: [],
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
