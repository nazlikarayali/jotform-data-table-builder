import { ComponentRegistry } from '../../types/registry';
import { CalorieSummary } from './CalorieSummary';
import type { VariantValues, PropertyValues, StateValues } from '../../types/component';
import scss from './CalorieSummary.scss?raw';

ComponentRegistry.register({
  id: 'calorie-summary',
  name: 'Calorie Summary',
  category: 'Widgets',
  icon: 'Flame',

  variants: {},

  properties: [
    { name: 'Selected', type: 'boolean', default: false },
    { name: 'Label', type: 'text', default: 'TODAY' },
    { name: 'Consumed', type: 'number', default: 1247 },
    { name: 'Target', type: 'number', default: 1840 },
    {
      name: 'Macros',
      type: 'text',
      default: JSON.stringify([
        { label: 'Protein', current: 92, target: 132, unit: 'g' },
        { label: 'Carbs', current: 156, target: 210, unit: 'g' },
        { label: 'Fats', current: 38, target: 60, unit: 'g' },
      ]),
    },
  ],

  states: [],

  scss,

  colorTokens: [
    { token: 'Surface', variable: '--bg-fill-brand', value: '#7D38EF', description: 'Brand tint drives all card surfaces and progress fills' },
    { token: 'Primary Text', variable: '--fg-primary', value: '#091141', description: 'Macro value text' },
    { token: 'Secondary Text', variable: '--fg-secondary', value: '#353C6A', description: 'Macro labels' },
    { token: 'Track Background', variable: '--bg-surface', value: '#F7F8FD', description: 'Macro progress track' },
  ],

  usage: `import { CalorieSummary } from '@/components/CalorieSummary';

<CalorieSummary
  consumed={1247}
  target={1840}
  macros={[
    { label: 'Protein', current: 92, target: 132, unit: 'g' },
    { label: 'Carbs', current: 156, target: 210, unit: 'g' },
    { label: 'Fats', current: 38, target: 60, unit: 'g' },
  ]}
/>`,

  propDocs: [
    { name: 'label', type: 'string', default: '"TODAY"', description: 'Hero label above the calorie count.' },
    { name: 'consumed', type: 'number', default: '1247', description: 'Calories consumed today.' },
    { name: 'target', type: 'number', default: '1840', description: 'Daily calorie target.' },
    { name: 'macros', type: 'MacroData[]', default: 'Protein/Carbs/Fats', description: 'Macro chips with current and target grams.' },
    { name: 'selected', type: 'boolean', default: 'false', description: 'Selection outline.' },
  ],

  render(_variants: VariantValues, props: PropertyValues, _states: StateValues) {
    let parsedMacros;
    try {
      parsedMacros = JSON.parse(props['Macros'] as string);
    } catch {
      parsedMacros = undefined;
    }
    return (
      <CalorieSummary
        label={props['Label'] as string}
        consumed={props['Consumed'] as number}
        target={props['Target'] as number}
        macros={parsedMacros}
        selected={props['Selected'] as boolean}
      />
    );
  },
});
