import { useCallback, useEffect, useState } from "react";
import { extractErrorMessage } from "@/api/client";
import type { PagedResponse } from "@/types";
import apiConfig from "@/config/apiConfig";

/**
 * Hook reusable para listados páginados.
 * Centraliza loading, error, pÃ¡gina actual y recarga para que los mÃ³dulos
 * mantengan el mismo comportamiento en tablas.
 */
export function usePagedQuery<T>(
  fetcher: (page: { pageNumber: number; pageSize: number }) => Promise<PagedResponse<T>>,
  deps: unknown[] = [],
) {
  const [data, setData] = useState<PagedResponse<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(apiConfig.DEFAULT_PAGE_SIZE);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher({ pageNumber, pageSize });
      setData(res);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, pageSize, ...deps]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    loading,
    error,
    pageNumber,
    pageSize,
    setPageNumber,
    setPageSize,
    reload: load,
  };
}
