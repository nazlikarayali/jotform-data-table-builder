import { ComponentRegistry } from '../../types/registry';
import { DailyTaskManager } from './DailyTaskManager';
import type { VariantValues, PropertyValues, StateValues } from '../../types/component';
import scss from './DailyTaskManager.scss?raw';

ComponentRegistry.register({
  id: 'daily-task-manager',
  name: 'Daily Task Manager',
  category: 'Widgets',
  icon: 'CheckSquare',

  variants: {},

  properties: [
    { name: 'Selected', type: 'boolean', default: false },
  ],

  states: [],

  scss,

  colorTokens: [
    { token: 'Background', variable: '--bg-surface', value: '#FFFFFF', description: 'Widget background' },
    { token: 'Title', variable: '--fg-primary', value: '#091141', description: 'Title text (neutral-900)' },
    { token: 'Subtitle', variable: '--fg-secondary', value: '#353C6A', description: 'Subtitle text (neutral-600)' },
    { token: 'Count', variable: '--fg-tertiary', value: '#6C73A8', description: 'Count badge (neutral-400)' },
    { token: 'Progress Track', variable: '--bg-fill-active', value: '#DADEF3', description: 'Progress track bg (neutral-100)' },
    { token: 'Progress Fill', variable: '--bg-fill-brand', value: '#7D38EF', description: 'Progress fill (primary-600)' },
    { token: 'Checkbox Border', variable: '--border-secondary', value: '#C8CEED', description: 'Checkbox border (neutral-200)' },
    { token: 'Checkbox Active', variable: '--bg-fill-brand', value: '#7D38EF', description: 'Checked state (primary-600)' },
    { token: 'Task Text', variable: '--fg-primary', value: '#091141', description: 'Task text (neutral-900)' },
    { token: 'Completed Text', variable: '--fg-disabled', value: '#979DC6', description: 'Completed task (neutral-300)' },
    { token: 'Input Border', variable: '--border', value: '#DADEF3', description: 'Input border (neutral-100)' },
    { token: 'Add Button', variable: '--bg-fill-brand', value: '#7D38EF', description: 'Add button bg (primary-600)' },
  ],

  usage: `import { DailyTaskManager } from '@/components/DailyTaskManager';

// Default with preset tasks
<DailyTaskManager />

// With custom tasks
<DailyTaskManager tasks={[
  { id: '1', text: 'Buy groceries', completed: false },
  { id: '2', text: 'Clean house', completed: true },
]} />

// Selected state
<DailyTaskManager selected />`,

  propDocs: [
    {
      name: 'tasks',
      type: 'TaskItem[]',
      default: '5 preset tasks',
      description: 'Array of task objects with id, text, and completed status. If not provided, shows default tasks.',
    },
    {
      name: 'selected',
      type: 'boolean',
      default: 'false',
      description: 'When true, shows a blue selection outline around the widget.',
    },
  ],

  render(_variants: VariantValues, props: PropertyValues, _states: StateValues) {
    return (
      <DailyTaskManager
        selected={props['Selected'] as boolean}
      />
    );
  },
});
