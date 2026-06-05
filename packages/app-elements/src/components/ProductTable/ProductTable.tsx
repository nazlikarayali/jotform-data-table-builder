import './ProductTable.scss';

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

export interface ProductRow {
  name: string;
  sales: number;
  stock: number;
  amount: string;
  status: StockStatus;
}

export interface ProductTableProps {
  title?: string;
  description?: string;
  rows?: ProductRow[];
  selected?: boolean;
}

const STATUS_LABEL: Record<StockStatus, string> = {
  'in-stock': 'In Stock',
  'low-stock': 'Low Stock',
  'out-of-stock': 'Out Of Stock',
};

const DEFAULT_ROWS: ProductRow[] = [
  { name: 'Iphone 12 pro max', sales: 540, stock: 475, amount: '$25,000', status: 'in-stock' },
  { name: 'Nike Air Shoe', sales: 145, stock: 254, amount: '$84,000', status: 'in-stock' },
  { name: '3 Seat sofa', sales: 254, stock: 57, amount: '$55,000', status: 'out-of-stock' },
  { name: 'Samsung galaxy', sales: 847, stock: 475, amount: '$15,000', status: 'in-stock' },
  { name: 'Winter collection', sales: 145, stock: 254, amount: '$26,000', status: 'in-stock' },
];

export function ProductTable({
  title = 'Product Sales',
  description,
  rows = DEFAULT_ROWS,
  selected = false,
}: ProductTableProps) {
  const classes = ['jf-product-table', selected && 'jf-product-table--selected']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <div className="jf-product-table__header">
        <div className="jf-product-table__title">{title}</div>
        {description && <div className="jf-product-table__description">{description}</div>}
      </div>

      <div className="jf-product-table__rows">
        {rows.map((row) => (
          <div key={row.name} className="jf-product-table__row">
            <div className="jf-product-table__row-top">
              <span className="jf-product-table__name">{row.name}</span>
              <span className="jf-product-table__amount">{row.amount}</span>
            </div>
            <div className="jf-product-table__row-bottom">
              <span className="jf-product-table__stat">
                <span className="jf-product-table__stat-label">Sales</span>
                <span className="jf-product-table__stat-value">{row.sales.toLocaleString()}</span>
              </span>
              <span className="jf-product-table__stat">
                <span className="jf-product-table__stat-label">Stock</span>
                <span className="jf-product-table__stat-value">{row.stock.toLocaleString()}</span>
              </span>
              <span className={`jf-product-table__badge jf-product-table__badge--${row.status}`}>
                {STATUS_LABEL[row.status]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProductTable;
