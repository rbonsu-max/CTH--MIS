export const PAGE_SIZE_OPTIONS = [20, 50, 100, 200, 400] as const;
export const DEFAULT_PAGE_SIZE = 50;

export function getTotalPages(totalItems: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function clampPage(page: number, totalItems: number, pageSize: number) {
  return Math.min(Math.max(1, page), getTotalPages(totalItems, pageSize));
}

export function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const safePage = clampPage(page, items.length, pageSize);
  const startIndex = (safePage - 1) * pageSize;
  return {
    page: safePage,
    totalPages: getTotalPages(items.length, pageSize),
    totalItems: items.length,
    items: items.slice(startIndex, startIndex + pageSize) as T[],
    startIndex,
  } as {
    page: number;
    totalPages: number;
    totalItems: number;
    items: T[];
    startIndex: number;
  };
}
