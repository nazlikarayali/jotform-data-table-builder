import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, FC } from 'react';
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
  /** Column names frozen to the left; they stay put while the rest scroll. */
  pinnedColumns?: string[];
}

// Skeleton bone widths: cell-aware (column type) + per-row organic variance,
// matching the Figma loading variant. Falls back gracefully for column counts
// other than 3.
const BODY_BASE_WIDTHS = [110, 150, 70, 85, 65];
const BODY_ROW_VARIANCE = [0, 12, -8, 6, 14, -4];
const HEADER_BONE_WIDTHS = [60, 96, 50, 64, 50];

const DEFAULT_COLUMNS: string[] = ['Title', 'Description', 'Image'];

// Field "kind" inferred from a column's display name (columns are plain
// strings). Drives both width sizing and the realistic placeholder content.
type ColumnKind =
  | 'longtext' | 'name' | 'email' | 'phone' | 'number' | 'date'
  | 'file' | 'image' | 'address' | 'yesno' | 'choiceSingle' | 'choiceMultiple' | 'text';

function getColumnKind(name: string): ColumnKind {
  const n = name.toLowerCase();
  if (/(long text|paragraph|description|notes?|message|comment|bio|about)/.test(n)) return 'longtext';
  if (/(full ?name|first ?name|last ?name|\bname\b)/.test(n)) return 'name';
  if (/(email|e-mail|\bmail\b)/.test(n)) return 'email';
  if (/(phone|tel|mobile|fax)/.test(n)) return 'phone';
  if (/(number|price|amount|quantity|qty|\bage\b|count|total|score|\bnum\b)/.test(n)) return 'number';
  if (/(date|time|calendar|day|month|year)/.test(n)) return 'date';
  if (/(file|upload|attachment|document|\bdoc\b|pdf)/.test(n)) return 'file';
  if (/(image|photo|picture|avatar|logo)/.test(n)) return 'image';
  if (/(address|location|city|country|street|zip)/.test(n)) return 'address';
  if (/(yes ?\/? ?no|boolean)/.test(n)) return 'yesno';
  if (/(multiple choice|multiple|checkbox|tags)/.test(n)) return 'choiceMultiple';
  if (/(single choice|single|radio|dropdown|\bselect\b|category|status|tag|label|choice|option)/.test(n)) return 'choiceSingle';
  return 'text';
}

// Per-kind column sizing for readability. `min` is a hard floor (never squished
// below it — the table scrolls horizontally instead). `grow` distributes any
// leftover width; text-heavy kinds grow most so a few columns fill the table
// with no dead gap, while narrow kinds are capped via `max`. Mirrors the
// developer's COLUMN_WIDTH map (JotForm control types).
type ColumnWidth = { min: number; max?: number; grow: number };

const WIDTH_BY_KIND: Record<ColumnKind, ColumnWidth> = {
  longtext: { min: 180, grow: 4 }, // uncapped filler
  name: { min: 140, grow: 2 },
  email: { min: 180, grow: 3 },
  phone: { min: 140, max: 200, grow: 0 },
  number: { min: 90, max: 130, grow: 0 },
  date: { min: 130, max: 180, grow: 0 },
  file: { min: 120, max: 180, grow: 0 },
  image: { min: 100, max: 140, grow: 0 },
  address: { min: 160, grow: 2 },
  yesno: { min: 80, max: 100, grow: 0 },
  choiceSingle: { min: 130, max: 220, grow: 1 },
  choiceMultiple: { min: 160, max: 280, grow: 1 },
  text: { min: 120, max: 220, grow: 2 },
};

function getColumnWidth(name: string): ColumnWidth {
  return WIDTH_BY_KIND[getColumnKind(name)];
}

// Fallback grid template (used before the table width is measured). Capped kinds
// get a fixed `minmax(min, max)` range; uncapped kinds get `minmax(min, <grow>fr)`.
function columnTrack(w: ColumnWidth): string {
  return w.max != null
    ? `minmax(${w.min}px, ${w.max}px)`
    : `minmax(${w.min}px, ${Math.max(1, w.grow)}fr)`;
}

// Resolve exact pixel widths for the columns given the available width, applying
// each kind's min/max precisely: every column starts at its `min`, then the
// leftover space is shared among growable columns by `grow` weight, each capped
// at its `max`. If the mins already exceed the available width, columns stay at
// their mins and the table scrolls. This avoids the overflow that CSS Grid's
// own track-sizing can produce when fixed `minmax(px,px)` tracks sit next to
// flexible `fr` tracks, so the min/max values land exactly.
function resolveColumnPx(widths: ColumnWidth[], avail: number): number[] {
  const px = widths.map((w) => w.min);
  let extra = avail - px.reduce((a, b) => a + b, 0);
  if (extra <= 0) return px; // mins don't fit → scroll at min widths

  for (let guard = 0; guard < 64 && extra > 0.5; guard++) {
    const growable = widths.map((w, i) => w.grow > 0 && (w.max == null || px[i] < w.max - 0.5));
    const weight = widths.reduce((s, w, i) => s + (growable[i] ? w.grow : 0), 0);
    if (weight === 0) break;
    let used = 0;
    widths.forEach((w, i) => {
      if (!growable[i]) return;
      let add = extra * (w.grow / weight);
      if (w.max != null) add = Math.min(add, w.max - px[i]);
      px[i] += add;
      used += add;
    });
    extra -= used;
    if (used < 0.5) break;
  }

  // Any remainder (every growable column hit its max) goes to the highest-weight
  // uncapped column so the table fills its width with no trailing gap.
  if (extra > 0.5) {
    let best = -1;
    let bestGrow = -1;
    widths.forEach((w, i) => {
      if (w.max == null && w.grow > bestGrow) {
        bestGrow = w.grow;
        best = i;
      }
    });
    if (best >= 0) px[best] += extra;
  }

  const rounded = px.map(Math.round);
  // Absorb rounding drift into the last column so the tracks sum to `avail`.
  const drift = avail - rounded.reduce((a, b) => a + b, 0);
  if (rounded.length > 0) rounded[rounded.length - 1] += drift;
  return rounded;
}

// ---- Realistic placeholder content (used only when no data source is
// connected) so the preview reads like a populated table instead of repeating
// the column name. Themed as a "Pet Hotel" guest list so every column tells a
// coherent story; one record per row, deterministic by index.
interface PetRecord {
  pet: string;        // pet name      → text / title columns
  owner: string;      // owner name    → name columns
  breed: string;      // breed         → (unused field, kept for realism)
  room: number;       // room number   → number columns
  checkIn: string;    // check-in date → date columns
  status: number;     // index into PET_STATUS → single-choice columns
  services: number[]; // indexes into PET_SERVICE → multiple-choice columns
  note: string;       // care note     → long-text columns
  phone: string;      // owner phone   → phone columns
  email: string;      // owner email   → email columns
  vaccinated: boolean;// → yes/no columns
  file: string;       // → file-upload columns
}

const PET_STATUS = [
  { label: 'Checked in', bg: '#D6F0E0', fg: '#1E6B43' },
  { label: 'Boarding', bg: '#E1D4F5', fg: '#4B2E83' },
  { label: 'Daycare', bg: '#FBE6C8', fg: '#7A4F1C' },
  { label: 'Grooming', bg: '#F8D2E6', fg: '#7E2A55' },
  { label: 'Checked out', bg: '#D8E3F5', fg: '#284B85' },
];
const PET_SERVICE = [
  { label: 'Grooming', bg: '#F8D2E6', fg: '#7E2A55' },
  { label: 'Walking', bg: '#D6F0E0', fg: '#1E6B43' },
  { label: 'Training', bg: '#E1D4F5', fg: '#4B2E83' },
  { label: 'Vet check', bg: '#FBE6C8', fg: '#7A4F1C' },
];

const PET_RECORDS: PetRecord[] = [
  { pet: 'Bella', owner: 'Frank Green', breed: 'Golden Retriever', room: 101, checkIn: 'Jun 10, 2026', status: 0, services: [1, 0], note: 'Bella loves belly rubs and long morning walks. She is friendly with the other guests but barks at the vacuum. Please keep her water bowl full and give her a treat after every walk.', phone: '(323) 555-9876', email: 'frank.green@example.com', vaccinated: true, file: 'vaccination.pdf' },
  { pet: 'Max', owner: 'Alice Smith', breed: 'Siberian Husky', room: 102, checkIn: 'Jun 11, 2026', status: 1, services: [1, 2], note: 'High energy — needs two long walks a day.', phone: '(212) 555-6789', email: 'alice.smith@example.com', vaccinated: true, file: 'health-record.pdf' },
  { pet: 'Luna', owner: 'Carol Davis', breed: 'Siamese Cat', room: 103, checkIn: 'Jun 11, 2026', status: 0, services: [3], note: 'Shy at first; give her space and quiet.', phone: '(310) 555-7890', email: 'carol.davis@example.com', vaccinated: true, file: 'intake-form.pdf' },
  { pet: 'Charlie', owner: 'David Evans', breed: 'Beagle', room: 104, checkIn: 'Jun 12, 2026', status: 3, services: [0], note: 'Allergic to chicken — fish-based diet only.', phone: '(415) 555-4321', email: 'david.evans@example.com', vaccinated: false, file: 'vet-notes.pdf' },
  { pet: 'Lucy', owner: 'Grace Hill', breed: 'Persian Cat', room: 105, checkIn: 'Jun 12, 2026', status: 2, services: [3, 0], note: 'Senior pet, please handle gently and keep her routine calm. Medication is due at 8am and 6pm with food. She prefers a quiet corner away from the dogs.', phone: '(913) 555-4567', email: 'grace.hill@example.com', vaccinated: true, file: 'medication-plan.pdf' },
  { pet: 'Cooper', owner: 'John Doe', breed: 'Labrador', room: 106, checkIn: 'Jun 13, 2026', status: 2, services: [1], note: 'Very friendly with other dogs and staff.', phone: '(217) 555-1234', email: 'john.doe@example.com', vaccinated: true, file: 'vaccination.pdf' },
  { pet: 'Daisy', owner: 'Bob Brown', breed: 'Poodle', room: 107, checkIn: 'Jun 13, 2026', status: 1, services: [0, 2], note: 'Loves treats during grooming sessions.', phone: '(201) 555-2345', email: 'bob.brown@example.com', vaccinated: true, file: 'grooming-prefs.pdf' },
  { pet: 'Rocky', owner: 'Emma Foster', breed: 'Bulldog', room: 108, checkIn: 'Jun 14, 2026', status: 0, services: [1, 3], note: 'Anxious during storms — keep him indoors.', phone: '(785) 555-1234', email: 'emma.foster@example.com', vaccinated: true, file: 'health-record.pdf' },
  { pet: 'Milo', owner: 'Henry Adams', breed: 'Corgi', room: 109, checkIn: 'Jun 14, 2026', status: 2, services: [1], note: 'Playful and social; likes the window spot.', phone: '(646) 555-3344', email: 'henry.adams@example.com', vaccinated: false, file: 'intake-form.pdf' },
  { pet: 'Sadie', owner: 'Ivy Chen', breed: 'Maine Coon', room: 110, checkIn: 'Jun 15, 2026', status: 1, services: [3], note: 'Recovering from surgery — limit activity.', phone: '(702) 555-8899', email: 'ivy.chen@example.com', vaccinated: true, file: 'vet-notes.pdf' },
  { pet: 'Buddy', owner: 'Jack Wilson', breed: 'Dachshund', room: 111, checkIn: 'Jun 15, 2026', status: 0, services: [0, 1], note: 'Bring his favorite toy at bedtime.', phone: '(305) 555-2211', email: 'jack.wilson@example.com', vaccinated: true, file: 'vaccination.pdf' },
  { pet: 'Molly', owner: 'Karen Lee', breed: 'Ragdoll Cat', room: 112, checkIn: 'Jun 16, 2026', status: 4, services: [3], note: 'Calm temperament; sleeps most of the day.', phone: '(408) 555-6677', email: 'karen.lee@example.com', vaccinated: true, file: 'health-record.pdf' },
  { pet: 'Bear', owner: 'Liam Murphy', breed: 'German Shepherd', room: 113, checkIn: 'Jun 16, 2026', status: 2, services: [2, 1], note: 'In training — reward-based commands only.', phone: '(503) 555-9090', email: 'liam.murphy@example.com', vaccinated: true, file: 'training-log.pdf' },
  { pet: 'Zoe', owner: 'Mia Roberts', breed: 'Tabby Cat', room: 114, checkIn: 'Jun 17, 2026', status: 1, services: [3, 0], note: 'On a strict diet plan — no table scraps.', phone: '(617) 555-4040', email: 'mia.roberts@example.com', vaccinated: false, file: 'diet-plan.pdf' },
  { pet: 'Duke', owner: 'Noah Clark', breed: 'Boxer', room: 115, checkIn: 'Jun 17, 2026', status: 0, services: [1, 2], note: 'Energetic pup; loves the outdoor play yard.', phone: '(214) 555-1212', email: 'noah.clark@example.com', vaccinated: true, file: 'intake-form.pdf' },
];

const at = <T,>(arr: T[], i: number): T => arr[i % arr.length];

function mockText(kind: ColumnKind, colName: string, ri: number): string {
  const r = at(PET_RECORDS, ri);
  const n = colName.toLowerCase();
  switch (kind) {
    case 'name': return r.owner;
    case 'phone': return r.phone;
    case 'email': return r.email;
    case 'number': return String(/\bage\b/.test(n) ? (r.room % 12) + 1 : r.room);
    case 'date': return r.checkIn;
    case 'longtext': return r.note;
    case 'address': return `Wing ${at(['A', 'B', 'C'], ri)}, Room ${r.room}`;
    case 'file': return r.file;
    case 'yesno': return r.vaccinated ? 'Yes' : 'No';
    // text / title → pet name, unless the column clearly names another field.
    default: return /breed/.test(n) ? r.breed : r.pet;
  }
}

// Colored option pills for a mock choice cell: single-choice shows the stay
// status; multiple-choice shows the booked services.
function mockChoicePills(kind: ColumnKind, ri: number): Array<{ label: string; bg: string; fg: string }> {
  const r = at(PET_RECORDS, ri);
  if (kind === 'choiceMultiple') return r.services.map((s) => PET_SERVICE[s]);
  return [PET_STATUS[r.status]];
}

// A real pet photo for the row, deterministic via the room number so it's
// stable across renders. placedog.net serves the image directly (no redirect),
// which loads reliably in the canvas preview.
function mockImageSrc(ri: number): string {
  const r = at(PET_RECORDS, ri);
  return `https://placedog.net/96/96?id=${r.room}`;
}

const ImagePlaceholderIcon = () => (
  <span className="jf-data-table__image-placeholder" aria-hidden="true">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
      <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
);

// Renders a real image, degrading to the placeholder icon if it fails to load.
function MockImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <ImagePlaceholderIcon />;
  return (
    <img
      src={src}
      alt=""
      className="jf-data-table__image"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}


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
  pinnedColumns = [],
}) => {
  const isLoading = state === 'Loading';
  const isPagination = state === 'Pagination' || (!isLoading && showPagination);
  const isStriped = state === 'Striped' || (!isLoading && striped);

  // Pinned columns freeze to the left while the rest scroll horizontally. Keep
  // only pins that still point at an existing column, then render the pinned
  // ones first (in pin order) followed by the remaining columns in order.
  const validPinned = pinnedColumns.filter((c) => columns.includes(c));
  const pinnedCount = validPinned.length;
  const orderedColumns =
    pinnedCount > 0
      ? [...validPinned, ...columns.filter((c) => !validPinned.includes(c))]
      : columns;

  const colKinds = orderedColumns.map(getColumnKind);

  // Measure the scroll viewport so we can resolve exact min/max column widths.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [availWidth, setAvailWidth] = useState(0);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      setAvailWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Exact pixel widths once measured; null until then (we fall back to CSS
  // track strings for the grid template).
  const pxWidths =
    availWidth > 0
      ? resolveColumnPx(colKinds.map((k) => WIDTH_BY_KIND[k]), availWidth)
      : null;

  const gridStyle: CSSProperties = {
    gridTemplateColumns: pxWidths
      ? pxWidths.map((w) => `${w}px`).join(' ')
      : colKinds.map((k) => columnTrack(WIDTH_BY_KIND[k])).join(' '),
  };

  // Cumulative left offset for each pinned column so they stack flush against
  // the left edge. Uses measured widths when available, else each kind's min
  // width as a close approximation before the first measure lands.
  const offsetWidths = pxWidths ?? colKinds.map((k) => WIDTH_BY_KIND[k].min);
  const pinnedLeft: number[] = [];
  for (let i = 0, acc = 0; i < pinnedCount; i++) {
    pinnedLeft.push(acc);
    acc += offsetWidths[i];
  }

  // Class names + sticky left offset for a cell at display index `ci`.
  const cellClass = (ci: number, base: string): string =>
    ci < pinnedCount
      ? [
          base,
          'jf-data-table__cell--pinned',
          ci === pinnedCount - 1 && 'jf-data-table__cell--pinned-last',
        ]
          .filter(Boolean)
          .join(' ')
      : base;
  const cellStyle = (ci: number): CSSProperties | undefined =>
    ci < pinnedCount ? { left: `${pinnedLeft[ci]}px` } : undefined;

  // No connected data source → fill cells with realistic, type-aware placeholders.
  const isPlaceholder = dataRows == null;
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
      <div className="jf-data-table__scroll" ref={scrollRef}>
      {/* Header */}
      {showHeader && (
        <div className="jf-data-table__header" style={gridStyle}>
          {orderedColumns.map((col, i) => {
            const isSorted = !isLoading && !!sortBy && col === sortBy;
            return (
              <div
                key={i}
                className={cellClass(i, 'jf-data-table__cell jf-data-table__cell--header')}
                style={cellStyle(i)}
              >
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
          <div key={ri} className={rowClass} style={gridStyle}>
            {orderedColumns.map((col, ci) => {
              const kind = colKinds[ci];
              const realCell = dataRows && dataRows[ri] ? dataRows[ri][col] : undefined;
              const hasReal = realCell !== undefined && realCell !== null && realCell !== '';
              return (
                <div key={ci} className={cellClass(ci, 'jf-data-table__cell')} style={cellStyle(ci)}>
                  {isLoading ? (
                    <div
                      className="jf-data-table__bone"
                      style={{ width: Math.max(36, (BODY_BASE_WIDTHS[ci] ?? 80) + variance) }}
                    />
                  ) : kind === 'image' ? (
                    hasReal ? (
                      <img src={String(realCell)} alt="" className="jf-data-table__image" />
                    ) : isPlaceholder ? (
                      <MockImage src={mockImageSrc(ri)} />
                    ) : (
                      <span className="jf-data-table__row-text jf-data-table__row-text--muted">—</span>
                    )
                  ) : (kind === 'choiceSingle' || kind === 'choiceMultiple') && !hasReal && isPlaceholder ? (
                    <span className="jf-data-table__pills">
                      {mockChoicePills(kind, ri).map((p) => (
                        <span
                          key={p.label}
                          className="jf-data-table__pill"
                          style={{ background: p.bg, color: p.fg }}
                        >
                          {p.label}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span
                      className={
                        kind === 'longtext'
                          ? 'jf-data-table__row-text jf-data-table__row-text--wrap'
                          : 'jf-data-table__row-text'
                      }
                    >
                      {hasReal ? String(realCell) : isPlaceholder ? mockText(kind, col, ri) : ''}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
      </div>

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
