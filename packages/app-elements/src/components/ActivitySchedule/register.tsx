import { ComponentRegistry } from '../../types/registry';
import { ActivitySchedule } from './ActivitySchedule';
import type { VariantValues, PropertyValues, StateValues } from '../../types/component';
import scss from './ActivitySchedule.scss?raw';

ComponentRegistry.register({
  id: 'activity-schedule',
  name: 'Activity Schedule',
  category: 'Widgets',
  icon: 'CalendarDays',
  variants: {},
  properties: [{ name: 'Selected', type: 'boolean', default: false }],
  states: [],
  scss,
  colorTokens: [
    { token: 'Background', variable: '--bg-fill', value: '#FFFFFF', description: 'Widget background' },
    { token: 'Timeline Dot', variable: '--bg-fill-brand', value: '#7D38EF', description: 'Timeline dot color' },
    { token: 'Outdoor', variable: '--bg-surface-success', value: '#DDFBE8', description: 'Outdoor activity bg' },
    { token: 'Meal', variable: '--bg-surface-warning', value: '#FEF3C5', description: 'Meal activity bg' },
    { token: 'Creative', variable: '--bg-surface-brand', value: '#EDE8FE', description: 'Creative activity bg' },
    { token: 'Sport', variable: '--bg-surface-info', value: '#DDF3FF', description: 'Sport activity bg' },
  ],
  usage: `<ActivitySchedule />\n<ActivitySchedule selected />`,
  propDocs: [{ name: 'selected', type: 'boolean', default: 'false', description: 'Selection outline.' }],
  render(_v: VariantValues, p: PropertyValues, _s: StateValues) {
    return <ActivitySchedule selected={p['Selected'] as boolean} />;
  },
});
