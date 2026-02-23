"use client";

type NumberPaginationProps = {
  page: number;
  totalPages: number;
  onChange: (nextPage: number) => void;
  maxVisible?: number;
};

export function NumberPagination({
  page,
  totalPages,
  onChange,
  maxVisible = 10,
}: NumberPaginationProps) {
  if (totalPages <= 1) return null;

  const groupStart = Math.floor(page / maxVisible) * maxVisible;
  const groupEndExclusive = Math.min(groupStart + maxVisible, totalPages);
  const pages = Array.from(
    { length: groupEndExclusive - groupStart },
    (_, i) => groupStart + i
  );

  const canGoPrevGroup = groupStart > 0;
  const canGoNextGroup = groupEndExclusive < totalPages;

  return (
    <nav className="pager" aria-label="페이지 선택">
      {canGoPrevGroup ? (
        <button
          className="pager-btn"
          type="button"
          onClick={() => onChange(groupStart - 1)}
          aria-label="이전 페이지 그룹"
        >
          ‹
        </button>
      ) : null}

      {pages.map((item) => (
        <button
          key={item}
          className={`pager-btn ${item === page ? "is-active" : ""}`}
          type="button"
          onClick={() => onChange(item)}
          aria-current={item === page ? "page" : undefined}
          aria-label={`${item + 1}페이지`}
        >
          {item + 1}
        </button>
      ))}

      {canGoNextGroup ? (
        <button
          className="pager-btn"
          type="button"
          onClick={() => onChange(groupEndExclusive)}
          aria-label="다음 페이지 그룹"
        >
          ›
        </button>
      ) : null}
    </nav>
  );
}
