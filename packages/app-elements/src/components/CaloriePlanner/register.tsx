import { ComponentRegistry } from '../../types/registry';
import { CaloriePlanner } from './CaloriePlanner';
import type { VariantValues, PropertyValues, StateValues } from '../../types/component';
import scss from './CaloriePlanner.scss?raw';

ComponentRegistry.register({
  id: 'calorie-planner',
  name: 'Calorie Planner',
  category: 'Widgets',
  icon: 'Calculator',

  variants: {},

  properties: [
    { name: 'Selected', type: 'boolean', default: false },
    { name: 'Title', type: 'text', default: 'Daily calorie planner' },
    { name: 'Description', type: 'text', default: 'See your daily target instantly.' },
    { name: 'Initial Weight', type: 'number', default: 72 },
    { name: 'Initial Activity', type: 'number', default: 3 },
    { name: 'Initial Goal', type: 'number', default: 1 },
  ],

  states: [],

  scss,

  colorTokens: [
    { token: 'Background', variable: '--bg-fill', value: '#FFFFFF', description: 'Card background' },
    { token: 'Border', variable: '--border', value: '#DADEF3', description: 'Card border' },
    { token: 'Title', variable: '--fg-primary', value: '#091141', description: 'Card title text' },
    { token: 'Description', variable: '--fg-secondary', value: '#353C6A', description: 'Helper text' },
    { token: 'Slider Track / Result', variable: '--bg-fill-brand', value: '#7D38EF', description: 'Brand color drives slider, thumb, and result block' },
  ],

  usage: `import { CaloriePlanner } from '@/components/CaloriePlanner';

<CaloriePlanner
  initialWeight={72}
  initialActivity={3}
  initialGoal={1}
/>`,

  propDocs: [
    { name: 'title', type: 'string', default: '"Daily calorie planner"', description: 'Card title.' },
    { name: 'description', type: 'string', default: '"See your daily target instantly."', description: 'Helper text under the title.' },
    { name: 'initialWeight', type: 'number', default: '72', description: 'Starting weight in kg (slider range 40–150).' },
    { name: 'initialActivity', type: 'number', default: '3', description: 'Activity slider index (0=Sedentary, 4=Very Active).' },
    { name: 'initialGoal', type: 'number', default: '1', description: 'Goal slider index (0=Lose 1, 2=Maintain, 4=Gain 1 kg/wk).' },
    { name: 'selected', type: 'boolean', default: 'false', description: 'Selection outline.' },
  ],

  render(_variants: VariantValues, props: PropertyValues, _states: StateValues) {
    return (
      <CaloriePlanner
        title={props['Title'] as string}
        description={props['Description'] as string}
        initialWeight={props['Initial Weight'] as number}
        initialActivity={props['Initial Activity'] as number}
        initialGoal={props['Initial Goal'] as number}
        selected={props['Selected'] as boolean}
      />
    );
  },
});
