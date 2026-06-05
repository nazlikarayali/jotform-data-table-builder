import { ComponentRegistry } from '../../types/registry';
import { YogaStudio, type YogaColumns } from './YogaStudio';
import type { VariantValues, PropertyValues, StateValues } from '../../types/component';
import scss from './YogaStudio.scss?raw';

ComponentRegistry.register({
  id: 'yoga-studio',
  name: 'Yoga Studio',
  category: 'Widgets',
  icon: 'Flower2',

  variants: {
    Columns: {
      options: ['1', '2'],
      default: '1',
    },
  },

  properties: [
    { name: 'Title', type: 'text', default: 'Browse classes' },
    { name: 'Selected', type: 'boolean', default: false },
  ],

  states: [],

  scss,

  colorTokens: [
    { token: 'Surface', variable: '--bg-surface', value: '#FFFFFF', description: 'Widget and card background' },
    { token: 'Border', variable: '--border', value: '#DADEF3', description: 'Search input + card outline' },
    { token: 'Title', variable: '--fg-primary', value: '#091141', description: 'Widget title and card titles' },
    { token: 'Body', variable: '--fg-secondary', value: '#353C6A', description: 'Filter labels, instructor, meta' },
    { token: 'Muted', variable: '--fg-disabled', value: '#979DC6', description: 'Empty state and placeholder' },
    { token: 'Brand', variable: '--fg-brand', value: '#7D38EF', description: 'Search/meta icons, active chips, style tag' },
    { token: 'Brand surface', variable: '--bg-surface-brand', value: '#EDE8FE', description: 'Active chip + style tag background' },
    { token: 'Brand fill', variable: '--bg-fill-brand', value: '#7D38EF', description: 'Filter button + Book button' },
    { token: 'Success', variable: '--fg-success', value: '#19A44B', description: '"Spots open" availability' },
    { token: 'Warning', variable: '--fg-warning', value: '#DC7801', description: '"Almost full" + star color' },
  ],

  usage: `import { YogaStudio } from '@/components/YogaStudio';

// Default single-column with built-in search + filter
<YogaStudio title="Browse classes" />

// Two-column grid for wider canvases
<YogaStudio columns="2" />`,

  propDocs: [
    {
      name: 'columns',
      type: '"1" | "2"',
      default: '"1"',
      description: 'Class card grid layout — single column for phone, two columns for tablet/desktop preview.',
    },
    {
      name: 'title',
      type: 'string',
      default: '"Browse classes"',
      description: 'Heading shown above the search bar. Pass an empty string to hide.',
    },
    {
      name: 'selected',
      type: 'boolean',
      default: 'false',
      description: 'When `true`, applies a 2px `border-info` outline around the widget.',
    },
  ],

  render(variants: VariantValues, props: PropertyValues, _states: StateValues): React.ReactNode {
    return (
      <YogaStudio
        columns={variants['Columns'] as YogaColumns}
        title={props['Title'] as string}
        selected={props['Selected'] as boolean}
      />
    );
  },
});
