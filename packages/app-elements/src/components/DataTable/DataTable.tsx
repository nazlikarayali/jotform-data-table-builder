import type { FC } from 'react';
import './DataTable.scss';

// State variants — mirrors the Figma component set "Table" (file
// cA6sGNSqdI7H5LPfZUvnvC, node 29:5424). Each value maps to a row of
// 4-variant state matrix discussed in design.
export type DataTableState = 'Default' | 'Loading' | 'Pagination' | 'Striped';
export type DataTableSize = 'Small' | 'Medium' | 'Large';

export interface DataTableProps {
  state?: DataTableState;
  columns?: string[];
  /** Number of body rows to render. Loading uses this many skeleton rows. */
  rows?: number;
  /** Footer copy: total rows across all pages. */
  totalRows?: number;
  /** Footer copy: rows-per-page for the counter ("Showing 1 to {rowsPerPage}…"). */
  rowsPerPage?: number;
  /** Optional real data rows keyed by column name. */
  dataRows?: Array<Record<string, unknown>> | null;
  /** Independent toggle for pagination footer (works on top of state). */
  showPagination?: boolean;
  /** Independent toggle for zebra rows (works on top of state). */
  striped?: boolean;
  /** Row size. Small 40h · Medium 48h (default) · Large 56h. */
  size?: DataTableSize;
  /** Render the column header row. Default true. */
  showHeader?: boolean;
  /** Header stays pinned at the top while the body scrolls. Default false. */
  stickyHeader?: boolean;
  /** Column name currently driving the sort. Empty/undefined → no sort. */
  sortBy?: string;
  /** Sort direction. Default Ascending. */
  sortOrder?: 'Ascending' | 'Descending';
}

// Skeleton bone widths: cell-aware (column type) + per-row organic variance,
// matching the Figma loading variant. Falls back gracefully for column counts
// other than 3.
const BODY_BASE_WIDTHS = [110, 150, 70, 85, 65];
const BODY_ROW_VARIANCE = [0, 12, -8, 6, 14, -4];
const HEADER_BONE_WIDTHS = [60, 96, 50, 64, 50];

const DEFAULT_COLUMNS: string[] = ['Title', 'Description', 'Image'];

export const DataTable: FC<DataTableProps> = ({
  state = 'Default',
  columns = DEFAULT_COLUMNS,
  rows = 5,
  totalRows = 11,
  rowsPerPage = 10,
  dataRows = null,
  showPagination = false,
  striped = false,
  size = 'Medium',
  showHeader = true,
  stickyHeader = false,
  sortBy,
  sortOrder = 'Ascending',
}) => {
  const isLoading = state === 'Loading';
  const isPagination = state === 'Pagination' || (!isLoading && showPagination);
  const isStriped = state === 'Striped' || (!isLoading && striped);

  const hasOverflow = columns.length > 5;
  const sizeClass = `jf-data-table--size-${size.toLowerCase()}`;
  const rootClass = [
    'jf-data-table',
    sizeClass,
    isStriped && 'jf-data-table--striped',
    hasOverflow && 'jf-data-table--overflow',
    stickyHeader && showHeader && 'jf-data-table--sticky-header',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass}>
      {/* Header */}
      {showHeader && (
        <div className="jf-data-table__header">
          {columns.map((col, i) => {
            const isSorted = !isLoading && !!sortBy && col === sortBy;
            return (
              <div key={i} className="jf-data-table__cell jf-data-table__cell--header">
                {isLoading ? (
                  <div
                    className="jf-data-table__bone jf-data-table__bone--header"
                    style={{ width: HEADER_BONE_WIDTHS[i] ?? 60 }}
                  />
                ) : (
                  <>
                    <span className="jf-data-table__header-label">{col}</span>
                    {isSorted && (
                      <svg
                        className="jf-data-table__sort-indicator"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d={sortOrder === 'Descending' ? 'M6 9l6 6 6-6' : 'M6 15l6-6 6 6'}
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Body */}
      {Array.from({ length: rows }).map((_, ri) => {
        const stripedRow = isStriped && ri % 2 === 1;
        const rowClass = [
          'jf-data-table__row',
          stripedRow && 'jf-data-table__row--striped',
          ri === rows - 1 && 'jf-data-table__row--last',
        ]
          .filter(Boolean)
          .join(' ');
        const variance = BODY_ROW_VARIANCE[ri % BODY_ROW_VARIANCE.length];
        return (
          <div key={ri} className={rowClass}>
            {columns.map((col, ci) => {
              const realCell = dataRows && dataRows[ri] ? dataRows[ri][col] : undefined;
              return (
                <div key={ci} className="jf-data-table__cell">
                  {isLoading ? (
                    <div
                      className="jf-data-table__bone"
                      style={{ width: Math.max(36, (BODY_BASE_WIDTHS[ci] ?? 80) + variance) }}
                    />
                  ) : col === 'Image' ? (
                    realCell ? (
                      <img
                        src={String(realCell)}
                        alt=""
                        className="jf-data-table__image"
                      />
                    ) : (
                      <span className="jf-data-table__row-text jf-data-table__row-text--muted">—</span>
                    )
                  ) : (
                    <span className="jf-data-table__row-text">
                      {realCell !== undefined && realCell !== null ? String(realCell) : col}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {hasOverflow && (
        <div className="jf-data-table__overflow-fade" aria-hidden="true" />
      )}

      {/* Footer — only for Pagination */}
      {isPagination && (
        <div className="jf-data-table__footer">
          <span className="jf-data-table__footer-counter">
            {`Showing 1 to ${rowsPerPage} of ${totalRows}`}
          </span>
          <div className="jf-data-table__pagination">
            <button
              type="button"
              className="jf-data-table__nav"
              aria-label="Previous page"
              disabled
            >
              ‹
            </button>
            <button
              type="button"
              className="jf-data-table__page jf-data-table__page--selected"
              aria-current="page"
            >
              1
            </button>
            <button type="button" className="jf-data-table__page">
              2
            </button>
            <button type="button" className="jf-data-table__nav" aria-label="Next page">
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
