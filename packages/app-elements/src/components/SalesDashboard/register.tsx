import { ComponentRegistry } from '../../types/registry';
import { SalesDashboard } from './SalesDashboard';
import type { SalesDashboardLayout } from './SalesDashboard';
import type { VariantValues, PropertyValues, StateValues } from '../../types/component';
import scss from './SalesDashboard.scss?raw';

ComponentRegistry.register({
  id: 'sales-dashboard',
  name: 'Sales Dashboard',
  category: 'Widgets',
  icon: 'BarChart3',

  variants: {
    Layout: {
      options: ['standard', 'compact'],
      default: 'standard',
    },
  },

  properties: [
    { name: 'Selected', type: 'boolean', default: false },
    { name: 'Shrinked', type: 'boolean', default: false },
    { name: 'Hide Header', type: 'boolean', default: false },
  ],

  states: [],

  scss,

  colorTokens: [
    { token: 'Surface', variable: '--bg-surface', value: '#FFFFFF', description: 'Widget & card background' },
    { token: 'Card border', variable: '--border-secondary', value: '#E5E7F2', description: 'Card outline' },
    { token: 'Title', variable: '--fg-primary', value: '#091141', description: 'Headings & KPI values' },
    { token: 'Body', variable: '--fg-secondary', value: '#353C6A', description: 'Subtitles & labels' },
    { token: 'Muted', variable: '--fg-disabled', value: '#979DC6', description: 'Chart axis & meta text' },
    { token: 'Brand', variable: '--fg-brand', value: '#7D38EF', description: 'Active chip, line/bar accent, focus' },
    { token: 'Up trend bg', variable: '--bg-surface-success', value: '#DDFBE8', description: 'Positive delta chip bg' },
    { token: 'Up trend fg', variable: '--fg-success', value: '#19A44B', description: 'Positive delta chip text' },
    { token: 'Down trend fg', variable: '--fg-error', value: '#DF2124', description: 'Negative delta chip text' },
  ],

  usage: `import { SalesDashboard } from '@jf/app-elements';

<SalesDashboard />
<SalesDashboard layout="compact" />`,

  propDocs: [
    {
      name: 'layout',
      type: '"standard" | "compact"',
      default: '"standard"',
      description: 'Standard shows a 3-column grid; compact stacks filters, KPIs, and charts in a single column.',
    },
    {
      name: 'selected',
      type: 'boolean',
      default: 'false',
      description: 'When `true`, applies a 2px outline around the widget.',
    },
    {
      name: 'shrinked',
      type: 'boolean',
      default: 'false',
      description: 'When `true`, constrains max-width to 560px and stacks content for compact placement.',
    },
    {
      name: 'hideHeader',
      type: 'boolean',
      default: 'false',
      description: 'When `true`, hides the internal "Sales Overview" title + subtitle so the widget composes cleanly under a page-level heading.',
    },
  ],

  render(variants: VariantValues, props: PropertyValues, _states: StateValues): React.ReactNode {
    return (
      <SalesDashboard
        layout={variants['Layout'] as SalesDashboardLayout}
        selected={props['Selected'] as boolean}
        shrinked={props['Shrinked'] as boolean}
        hideHeader={props['Hide Header'] as boolean}
      />
    );
  },
});
