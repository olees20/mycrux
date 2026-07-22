import Link from "next/link";
import { pageHref } from "@/lib/pagination";

export function PaginationNav({ pathname, search, page, hasNext }: { pathname: string; search: Record<string, string | string[] | undefined>; page: number; hasNext: boolean }) {
  if (page === 1 && !hasNext) return null;
  return <nav aria-label="Pagination" className="mt-7 flex items-center justify-between gap-4">
    {page > 1 ? <Link className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border bg-[var(--surface)] px-5 font-bold" href={pageHref(pathname, search, page - 1)} rel="prev">← Previous</Link> : <span/>}
    <span className="text-sm font-bold">Page {page}</span>
    {hasNext ? <Link className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border bg-[var(--surface)] px-5 font-bold" href={pageHref(pathname, search, page + 1)} rel="next">Next →</Link> : <span/>}
  </nav>;
}
