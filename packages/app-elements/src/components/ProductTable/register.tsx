import { ComponentRegistry } from '../../types/registry';
import { ProductTable } from './ProductTable';
import type { VariantValues, PropertyValues, StateValues } from '../../types/component';
import scss from './ProductTable.scss?raw';

ComponentRegistry.register({
  id: 'product-table',
  name: 'Product Table',
  category: 'Widgets',
  icon: 'Package',

  variants: {},

  properties: [
    { name: 'Selected', type: 'boolean', default: false },
    { name: 'Title', type: 'text', default: 'Product Sales' },
    { name: 'Description', type: 'text', default: 'Inventory & sales by SKU.' },
    {
      name: 'Rows',
      type: 'text',
      default: JSON.stringify([
        { name: 'Iphone 12 pro max', sales: 540, stock: 475, amount: '$25,000', status: 'in-stock' },
        { name: 'Nike Air Shoe', sales: 145, stock: 254, amount: '$84,000', status: 'in-stock' },
        { name: '3 Seat sofa', sales: 254, stock: 57, amount: '$55,000', status: 'out-of-stock' },
        { name: 'Samsung galaxy', sales: 847, stock: 475, amount: '$15,000', status: 'in-stock' },
        { name: 'Winter collection', sales: 145, stock: 254, amount: '$26,000', status: 'in-stock' },
      ]),
    },
  ],

  states: [],

  scss,

  colorTokens: [
    { token: 'Background', variable: '--bg-fill', value: '#FFFFFF', description: 'Card body' },
    { token: 'Row Surface', variable: '--bg-surface', value: '#F7F8FD', description: 'Row background' },
    { token: 'Border', variable: '--border', value: '#DADEF3', description: 'Card outline' },
    { token: 'Text', variable: '--fg-primary', value: '#091141', description: 'Row text' },
    { token: 'Column Head', variable: '--fg-secondary', value: '#353C6A', description: 'Header labels' },
    { token: 'In Stock', variable: '--bg-fill-success', value: '#19A44B', description: 'Green badge' },
    { token: 'Out Of Stock', variable: '--bg-fill-error', value: '#DF2125', description: 'Red badge' },
    { token: 'Low Stock', variable: '--bg-fill-warning', value: '#E8AB19', description: 'Yellow badge' },
  ],

  usage: `import { ProductTable } from '@/components/ProductTable';

<ProductTable
  rows={[
    { name: 'Iphone 12 pro max', sales: 540, stock: 475, amount: '$25,000', status: 'in-stock' },
    { name: '3 Seat sofa',       sales: 254, stock: 57,  amount: '$55,000', status: 'out-of-stock' },
  ]}
/>`,

  propDocs: [
    { name: 'title', type: 'string', default: '"Product Sales"', description: 'Header title.' },
    { name: 'description', type: 'string', default: '"Inventory & sales by SKU."', description: 'Sub-line under the title.' },
    { name: 'rows', type: 'ProductRow[]', default: '5 demo rows', description: 'Each row: { name, sales, stock, amount, status: "in-stock" | "low-stock" | "out-of-stock" }.' },
    { name: 'selected', type: 'boolean', default: 'false', description: 'Selection outline.' },
  ],

  render(_variants: VariantValues, props: PropertyValues, _states: StateValues) {
    let parsed;
    try {
      parsed = JSON.parse(props['Rows'] as string);
    } catch {
      parsed = undefined;
    }
    return (
      <ProductTable
        title={props['Title'] as string}
        description={props['Description'] as string}
        rows={parsed}
        selected={props['Selected'] as boolean}
      />
    );
  },
});
