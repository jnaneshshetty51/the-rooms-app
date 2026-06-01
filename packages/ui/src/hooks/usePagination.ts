"use client";

import { useState, useCallback } from "react";

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export function usePagination(defaultPageSize = 10) {
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });

  const previousPage = useCallback(() => {
    setPagination((prev) => ({ ...prev, pageIndex: Math.max(0, prev.pageIndex - 1) }));
  }, []);

  const nextPage = useCallback((totalPages: number) => {
    setPagination((prev) => ({ ...prev, pageIndex: Math.min(totalPages - 1, prev.pageIndex + 1) }));
  }, []);

  const goToPage = useCallback((index: number) => {
    setPagination((prev) => ({ ...prev, pageIndex: index }));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPagination({ pageIndex: 0, pageSize: size });
  }, []);

  return {
    pageIndex,
    pageSize,
    previousPage,
    nextPage,
    goToPage,
    setPageSize,
  };
}
