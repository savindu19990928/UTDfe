
import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount?: number;
  onPageChange: (page: number) => void;
  /** Visual style: inside a table footer (default) or standalone card */
  variant?: 'footer' | 'card';
  itemLabel?: string;
}

/**
 * Build the list of page tokens to render.
 * Always shows a window around the current page. Adds first/last page
 * shortcuts (with an ellipsis) only when the current page is far enough
 * away from that edge.
 */
function buildPages(currentPage: number, totalPages: number): (number | 'left-ellipsis' | 'right-ellipsis')[] {
  const tokens: (number | 'left-ellipsis' | 'right-ellipsis')[] = [];
  const siblingCount = 1; // pages on each side of the current page
  const boundary = 1; // how many pages pinned at each edge

  // If everything fits, just render 1..totalPages
  const totalNumbers = boundary * 2 + siblingCount * 2 + 3; // edges + window + current + 2 ellipses
  if (totalPages <= totalNumbers) {
    for (let i = 1; i <= totalPages; i++) tokens.push(i);
    return tokens;
  }

  const leftSibling = Math.max(currentPage - siblingCount, boundary + 1);
  const rightSibling = Math.min(currentPage + siblingCount, totalPages - boundary);

  // Show the left "1 …" shortcut only when we're away from the start
  const showLeftEllipsis = leftSibling > boundary + 1;
  // Show the right "… last" shortcut only when we're away from the end
  const showRightEllipsis = rightSibling < totalPages - boundary;

  // Left boundary pages (page 1)
  for (let i = 1; i <= boundary; i++) tokens.push(i);

  if (showLeftEllipsis) {
    tokens.push('left-ellipsis');
  } else {
    // fill the gap between boundary and the window with real numbers
    for (let i = boundary + 1; i < leftSibling; i++) tokens.push(i);
  }

  // Window around the current page
  for (let i = leftSibling; i <= rightSibling; i++) tokens.push(i);

  if (showRightEllipsis) {
    tokens.push('right-ellipsis');
  } else {
    for (let i = rightSibling + 1; i < totalPages - boundary + 1; i++) tokens.push(i);
  }

  // Right boundary pages (last page)
  for (let i = totalPages - boundary + 1; i <= totalPages; i++) tokens.push(i);

  return tokens;
}

export function Pagination({
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
  variant = 'footer',
  itemLabel = 'items'
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const page = Math.min(Math.max(currentPage, 1), totalPages);
  const tokens = buildPages(page, totalPages);

  const wrapperClasses =
  variant === 'card' ?
  'mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 sm:px-6 border border-gray-200 rounded-xl bg-white shadow-sm' :
  'flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-4 sm:px-6 border-t border-gray-200 bg-gray-50';

  const goTo = (p: number) => {
    const next = Math.min(Math.max(p, 1), totalPages);
    if (next !== page) onPageChange(next);
  };

  return (
    <div className={wrapperClasses}>
      <p className="text-sm text-gray-500 order-2 sm:order-1">
        Page <span className="font-bold text-[#1a1a2e]">{page}</span> of{' '}
        <span className="font-bold text-[#1a1a2e]">{totalPages}</span>
        {totalCount != null &&
        <span className="ml-2 text-gray-400">
            ({totalCount} {itemLabel})
          </span>
        }
      </p>

      <div className="flex items-center gap-1 order-1 sm:order-2">
        {/* First page shortcut */}
        <button
          onClick={() => goTo(1)}
          disabled={page === 1}
          aria-label="First page"
          title="First page"
          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous */}
        <button
          onClick={() => goTo(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          
          <ChevronLeft className="w-4 h-4" />
        </button>

        {tokens.map((token, idx) =>
        token === 'left-ellipsis' || token === 'right-ellipsis' ?
        <span
          key={`${token}-${idx}`}
          className="w-8 h-9 flex items-center justify-center text-gray-400 text-sm select-none">
          
              …
            </span> :

        <button
          key={token}
          onClick={() => goTo(token)}
          aria-current={token === page ? 'page' : undefined}
          className={`min-w-[2rem] h-9 px-2 rounded-lg text-sm font-bold transition-colors ${
          token === page ?
          'bg-[#1a1a2e] text-white shadow-sm' :
          'text-gray-600 hover:bg-white hover:text-[#1a1a2e] border border-transparent hover:border-gray-200'}`
          }>
          
              {token}
            </button>

        )}

        {/* Next */}
        <button
          onClick={() => goTo(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last page shortcut */}
        <button
          onClick={() => goTo(totalPages)}
          disabled={page === totalPages}
          aria-label="Last page"
          title="Last page"
          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>);

}