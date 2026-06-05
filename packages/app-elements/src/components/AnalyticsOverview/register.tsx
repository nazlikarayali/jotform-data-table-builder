import { ComponentRegistry } from '../../types/registry';
import { AnalyticsOverview } from './AnalyticsOverview';
import type { VariantValues, PropertyValues, StateValues } from '../../types/component';
import scss from './AnalyticsOverview.scss?raw';

ComponentRegistry.register({
  id: 'analytics-overview',
  name: 'Analytics Overview',
  category: 'Widgets',
  icon: 'BarChart3',

  variants: {},

  properties: [
    { name: 'Selected', type: 'boolean', default: false },
    { name: 'Title', type: 'text', default: 'Analytics Overview' },
    {
      name: 'Cards',
      type: 'text',
      default: JSON.stringify([
        { label: 'Total Sales', value: '$48.8K', deltaPercent: 3.4, lastYear: 'Last year $32,450' },
        { label: 'Purchase', value: '$14.2K', deltaPercent: 2.8, lastYear: 'Last year $14,832' },
        { label: 'Return', value: '$345.0', deltaPercent: -1.2, lastYear: 'Last year $342' },
        { label: 'Marketing', value: '$10.2K', deltaPercent: 2.4, lastYear: 'Last year $12,832' },
      ]),
    },
  ],

  states: [],

  scss,

  colorTokens: [
    { token: 'Card Background', variable: '--bg-fill', value: '#FFFFFF', description: 'Card body' },
    { token: 'Border', variable: '--border', value: '#DADEF3', description: 'Card outline' },
    { token: 'Value', variable: '--fg-primary', value: '#091141', description: 'Large KPI number' },
    { token: 'Label', variable: '--fg-secondary', value: '#353C6A', description: 'Card label + last-year line' },
    { token: 'Positive Delta', variable: '--bg-fill-success', value: '#19A44B', description: 'Green up-arrow pill' },
    { token: 'Negative Delta', variable: '--bg-fill-error', value: '#DF2125', description: 'Red down-arrow pill' },
  ],

  usage: `import { AnalyticsOverview } from '@/components/AnalyticsOverview';

<AnalyticsOverview
  cards={[
    { label: 'Total Sales', value: '$48.8K', deltaPercent: 3.4, lastYear: 'Last year $32,450' },
    { label: 'Purchase',    value: '$14.2K', deltaPercent: 2.8, lastYear: 'Last year $14,832' },
    { label: 'Return',      value: '$345.0', deltaPercent: -1.2, lastYear: 'Last year $342' },
    { label: 'Marketing',   value: '$10.2K', deltaPercent: 2.4, lastYear: 'Last year $12,832' },
  ]}
/>`,

  propDocs: [
    { name: 'title', type: 'string', default: '"Analytics Overview"', description: 'Header above the 2×2 KPI grid.' },
    { name: 'cards', type: 'KpiCard[]', default: '4 sales KPIs', description: 'Each card: label, big value, signed deltaPercent (negative renders red), lastYear comparison.' },
    { name: 'selected', type: 'boolean', default: 'false', description: 'Selection outline.' },
  ],

  render(_variants: VariantValues, props: PropertyValues, _states: StateValues) {
    let parsed;
    try {
      parsed = JSON.parse(props['Cards'] as string);
    } catch {
      parsed = undefined;
    }
    return (
      <AnalyticsOverview
        title={props['Title'] as string}
        cards={parsed}
        selected={props['Selected'] as boolean}
      />
    );
  },
});
