import type { ComponentProps, ReactNode } from 'react';
import { ComponentRegistry } from '../../types/registry';
import { DataTable } from './DataTable';
import type { DataTableState, DataTableSize } from './DataTable';
import type { VariantValues, PropertyValues, StateValues } from '../../types/component';
import dataTableScss from './DataTable.scss?raw';
import { useCollections } from '../../runtime/CollectionsContext';

interface DataTableWithSourceProps extends ComponentProps<typeof DataTable> {
  source?: string;
  titleField?: string;
  descriptionField?: string;
  imageField?: string;
}

// Fallback total used when there's no real data source connected — keeps
// the placeholder/preview render looking like a populated table.
const MOCK_TOTAL_ROWS = 15;

function DataTableWithSource({
  source,
  titleField,
  descriptionField,
  imageField,
  rowsPerPage,
  showPagination,
  sortBy,
  sortOrder,
  size,
  ...rest
}: DataTableWithSourceProps) {
  const ctx = useCollections();
  const sourceItems = source && ctx ? ctx.get(source) : null;

  let dataRows: Array<Record<string, unknown>> | null = null;
  if (sourceItems && sourceItems.length > 0) {
    dataRows = sourceItems.map((row) => ({
      Title: titleField ? row[titleField] : row['title'] || row['name'] || '',
      Description: descriptionField ? row[descriptionField] : row['description'] || '',
      Image: imageField ? row[imageField] : null,
    }));
  }

  // Apply sort to real data. Mock placeholder rows have nothing to reorder.
  if (dataRows && sortBy) {
    const dir = sortOrder === 'Descending' ? -1 : 1;
    dataRows = [...dataRows].sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  // Total is whatever the (filtered) data source produced; mock count when
  // disconnected. The admin never types this — it follows the data.
  const totalRows = dataRows ? dataRows.length : MOCK_TOTAL_ROWS;

  // Render row count: paginated → page size; otherwise → the whole set.
  const limit = showPagination ? (rowsPerPage ?? 5) : totalRows;
  const resolvedRows = Math.min(totalRows, limit);

  return (
    <DataTable
      {...rest}
      rows={resolvedRows}
      totalRows={totalRows}
      rowsPerPage={rowsPerPage}
      showPagination={showPagination}
      dataRows={dataRows}
      size={size}
      sortBy={sortBy}
      sortOrder={sortOrder}
    />
  );
}

ComponentRegistry.register({
  id: 'data-table',
  name: 'Table',
  category: 'Data Display',
  icon: 'Table',

  variants: {
    State: {
      options: ['Default', 'Loading', 'Pagination', 'Striped'],
      default: 'Default',
    },
  },

  properties: [
    { name: 'Source', type: 'text', default: '' },
    { name: 'Title Field', type: 'text', default: '' },
    { name: 'Description Field', type: 'text', default: '' },
    { name: 'Image Field', type: 'text', default: '' },
    { name: 'Columns', type: 'text', default: '["Title","Description","Image"]' },
    { name: 'PinnedColumns', type: 'text', default: '[]' },
    { name: 'Layout', type: 'select', options: ['Basic', 'Card', 'Table'], default: 'Table' },
    { name: 'Default Sort', type: 'text', default: '' },
    { name: 'Sort Order', type: 'select', options: ['Ascending', 'Descending'], default: 'Ascending' },
    { name: 'Size', type: 'select', options: ['Small', 'Medium', 'Large'], default: 'Medium' },
    { name: 'Items per page', type: 'number', default: 5 },
    { name: 'Show Pagination', type: 'boolean', default: true },
    { name: 'Striped Rows', type: 'boolean', default: false },
    { name: 'Show Header', type: 'boolean', default: true },
    { name: 'Sticky Header', type: 'boolean', default: false },
  ],

  states: [],

  scss: dataTableScss,

  colorTokens: [
    { token: 'Card BG',     variable: '--bg-surface',     value: '#FFFFFF', description: 'Container + body row fill' },
    { token: 'Header BG',   variable: '--bg-fill-hover',  value: '#E3E5F5', description: 'Header row + footer + striped row' },
    { token: 'Border',      variable: '--border',         value: '#DADEF3', description: 'Card border + row divider + page button border' },
    { token: 'Header Text', variable: '--fg-primary',     value: '#0A1551', description: 'Header label + selected page' },
    { token: 'Body Text',   variable: '--fg-secondary',   value: '#343C6A', description: 'Body cell text + unselected page' },
    { token: 'Counter',     variable: '--fg-tertiary',    value: '#6C73A8', description: 'Footer counter' },
    { token: 'Skeleton',    variable: '--bg-fill-active', value: '#C8CEED', description: 'Loading state bone fill' },
  ],

  usage: `import { DataTable } from '@/components/DataTable';

// Default — minimal style
<DataTable state="Default" />

// Loading — skeleton header + bones
<DataTable state="Loading" />

// With pagination footer
<DataTable state="Pagination" totalRows={120} rowsPerPage={10} />

// Striped — alternating rows
<DataTable state="Striped" />`,

  propDocs: [
    {
      name: 'state',
      type: '"Default" | "Loading" | "Pagination" | "Striped"',
      default: '"Default"',
      description:
        'Visual state. **Default** is the minimal style with placeholder cells. **Loading** swaps text for skeleton bones in both header and body. **Pagination** keeps default rows and adds a footer with counter + page navigation. **Striped** alternates row backgrounds with `--bg-fill-hover`.',
    },
    {
      name: 'columns',
      type: 'string[]',
      default: '["Title", "Description", "Status"]',
      description: 'Column header labels. The body renders one cell per column per row.',
    },
    {
      name: 'rows',
      type: 'number',
      default: '4',
      description: 'Number of body rows. Loading uses this many skeleton rows.',
    },
    {
      name: 'totalRows',
      type: 'number',
      default: '11',
      description: 'Footer counter total — only shown when `state="Pagination"`.',
    },
    {
      name: 'rowsPerPage',
      type: 'number',
      default: '10',
      description: 'Footer counter range — only shown when `state="Pagination"`.',
    },
  ],

  render(variants: VariantValues, props: PropertyValues, _states: StateValues): ReactNode {
    const itemsPerPage = Number(props['Items per page']) || 5;
    const showPagination = Boolean(props['Show Pagination']);
    let columns: string[] | undefined = undefined;
    const colsRaw = props['Columns'] as string;
    if (colsRaw) {
      try {
        const parsed = JSON.parse(colsRaw);
        if (Array.isArray(parsed)) columns = parsed.map(String);
      } catch { /* fall through to default */ }
    }
    let pinnedColumns: string[] | undefined = undefined;
    const pinnedRaw = props['PinnedColumns'] as string;
    if (pinnedRaw) {
      try {
        const parsed = JSON.parse(pinnedRaw);
        if (Array.isArray(parsed)) pinnedColumns = parsed.map(String);
      } catch { /* no pins */ }
    }
    return (
      <DataTableWithSource
        state={variants['State'] as DataTableState}
        columns={columns}
        pinnedColumns={pinnedColumns}
        source={(props['Source'] as string) || undefined}
        titleField={(props['Title Field'] as string) || undefined}
        descriptionField={(props['Description Field'] as string) || undefined}
        imageField={(props['Image Field'] as string) || undefined}
        // Total count is derived from the connected data source (or a mock
        // fallback when none is connected) inside DataTableWithSource.
        rowsPerPage={itemsPerPage}
        showPagination={showPagination}
        striped={Boolean(props['Striped Rows'])}
        showHeader={props['Show Header'] !== false}
        stickyHeader={Boolean(props['Sticky Header'])}
        sortBy={(props['Default Sort'] as string) || undefined}
        sortOrder={(props['Sort Order'] as 'Ascending' | 'Descending') || 'Ascending'}
        size={(props['Size'] as DataTableSize) || 'Medium'}
      />
    );
  },
});
