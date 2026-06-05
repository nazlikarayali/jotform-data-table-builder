import { useMemo, useState, type FC } from 'react';
import './SalesDashboard.scss';

export type SalesDashboardLayout = 'standard' | 'compact';

export interface SalesDashboardProps {
  layout?: SalesDashboardLayout;
  selected?: boolean;
  shrinked?: boolean;
  hideHeader?: boolean;
}

type BreakdownMode = 'region' | 'category';

const TREND_POINTS = [
  { label: 'Apr 1', value: 12400 },
  { label: 'Apr 6', value: 14800 },
  { label: 'Apr 11', value: 17200 },
  { label: 'Apr 16', value: 21500 },
  { label: 'Apr 21', value: 24500 },
  { label: 'Apr 26', value: 22100 },
];

const REGION_VALUES: Record<string, number> = {
  'North America': 11200,
  'Europe': 7800,
  'Asia-Pacific': 5500,
};

const CATEGORY_VALUES: Record<string, number> = {
  Software: 12400,
  Hardware: 7600,
  Services: 4500,
};

const ArrowUp = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);

const ArrowDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </svg>
);

const formatCurrency = (n: number) =>
  '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });

interface LineChartProps {
  points: { label: string; value: number }[];
}

const LineChart: FC<LineChartProps> = ({ points }) => {
  const W = 480;
  const H = 200;
  const padX = 32;
  const padTop = 16;
  const padBottom = 32;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;

  const max = Math.max(...points.map((p) => p.value));
  const min = Math.min(...points.map((p) => p.value));
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = padX + (i / (points.length - 1)) * innerW;
    const y = padTop + innerH - ((p.value - min) / range) * innerH;
    return { x, y, ...p };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`)
    .join(' ');

  const areaPath =
    `${linePath} L ${coords[coords.length - 1].x} ${padTop + innerH} L ${coords[0].x} ${padTop + innerH} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(
    (t) => padTop + innerH - t * innerH,
  );

  return (
    <svg
      className="jf-sales__chart-svg"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Revenue trend over time"
    >
      <defs>
        <linearGradient id="jf-sales-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--fg-brand, #7D38EF)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--fg-brand, #7D38EF)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {gridLines.map((y, i) => (
        <line
          key={i}
          x1={padX}
          x2={W - padX}
          y1={y}
          y2={y}
          stroke="var(--border-secondary, #E5E7F2)"
          strokeWidth="1"
          strokeDasharray="2 4"
        />
      ))}

      <path d={areaPath} fill="url(#jf-sales-area)" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--fg-brand, #7D38EF)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {coords.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r="4" fill="var(--bg-surface, #FFFFFF)" stroke="var(--fg-brand, #7D38EF)" strokeWidth="2" />
        </g>
      ))}

      {coords.map((c, i) => (
        <text
          key={i}
          x={c.x}
          y={H - 8}
          textAnchor="middle"
          fontSize="10"
          fill="var(--fg-disabled, #979DC6)"
          fontFamily="var(--font-family)"
        >
          {c.label}
        </text>
      ))}
    </svg>
  );
};

interface BarChartProps {
  data: { label: string; value: number }[];
}

const BarChart: FC<BarChartProps> = ({ data }) => {
  const W = 420;
  const H = 200;
  const padX = 24;
  const padTop = 16;
  const padBottom = 36;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;
  const max = Math.max(...data.map((d) => d.value)) || 1;
  const slot = innerW / data.length;
  const barW = Math.min(56, slot * 0.55);

  return (
    <svg
      className="jf-sales__chart-svg"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Revenue breakdown bars"
    >
      <line
        x1={padX}
        x2={W - padX}
        y1={padTop + innerH}
        y2={padTop + innerH}
        stroke="var(--border-secondary, #E5E7F2)"
        strokeWidth="1"
      />
      {data.map((d, i) => {
        const h = (d.value / max) * innerH;
        const x = padX + slot * i + (slot - barW) / 2;
        const y = padTop + innerH - h;
        return (
          <g key={d.label}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx="6"
              fill="var(--fg-brand, #7D38EF)"
            />
            <text
              x={x + barW / 2}
              y={y - 6}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="var(--fg-primary, #091141)"
              fontFamily="var(--font-family)"
            >
              {formatCurrency(d.value)}
            </text>
            <text
              x={x + barW / 2}
              y={H - 12}
              textAnchor="middle"
              fontSize="11"
              fill="var(--fg-secondary, #353C6A)"
              fontFamily="var(--font-family)"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const KPI_CARDS = [
  { id: 'revenue', label: 'Total Revenue', value: '$24,500', delta: 12.4 },
  { id: 'sales', label: 'Number of Sales', value: '184', delta: 8.2 },
  { id: 'conv', label: 'Conversion Rate', value: '3.2%', delta: -1.4 },
];

export const SalesDashboard: FC<SalesDashboardProps> = ({
  layout = 'standard',
  selected = false,
  shrinked = false,
  hideHeader = false,
}) => {
  const [breakdown, setBreakdown] = useState<BreakdownMode>('region');

  const breakdownData = useMemo(() => {
    const source = breakdown === 'region' ? REGION_VALUES : CATEGORY_VALUES;
    return Object.entries(source)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [breakdown]);

  const rootClasses = [
    'jf-sales',
    `jf-sales--${layout}`,
    selected && 'jf-sales--selected',
    shrinked && 'jf-sales--shrinked',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClasses}>
      {!hideHeader && (
        <header className="jf-sales__header">
          <h2 className="jf-sales__title">Sales Overview</h2>
          <p className="jf-sales__subtitle">
            Monitor key KPIs, trends, and performance at a glance.
          </p>
        </header>
      )}

      <section className="jf-sales__kpis">
        {KPI_CARDS.map((kpi) => {
          const positive = kpi.delta >= 0;
          return (
            <article key={kpi.id} className="jf-sales__kpi">
              <span className="jf-sales__kpi-label">{kpi.label}</span>
              <span className="jf-sales__kpi-value">{kpi.value}</span>
              <span className={`jf-sales__delta jf-sales__delta--${positive ? 'up' : 'down'}`}>
                {positive ? <ArrowUp /> : <ArrowDown />}
                {Math.abs(kpi.delta).toFixed(1)}%
              </span>
            </article>
          );
        })}
      </section>

      <section className="jf-sales__charts">
        <article className="jf-sales__chart">
          <header className="jf-sales__chart-head">
            <div>
              <h3 className="jf-sales__chart-title">Revenue trend</h3>
              <p className="jf-sales__chart-meta">Last 30 days</p>
            </div>
          </header>
          <div className="jf-sales__chart-body">
            <LineChart points={TREND_POINTS} />
          </div>
        </article>

        <article className="jf-sales__chart">
          <header className="jf-sales__chart-head">
            <div>
              <h3 className="jf-sales__chart-title">Revenue breakdown</h3>
              <p className="jf-sales__chart-meta">
                Grouped by {breakdown}
              </p>
            </div>
            <div className="jf-sales__toggle" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={breakdown === 'region'}
                className={`jf-sales__toggle-btn ${breakdown === 'region' ? 'jf-sales__toggle-btn--active' : ''}`}
                onClick={() => setBreakdown('region')}
              >
                Region
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={breakdown === 'category'}
                className={`jf-sales__toggle-btn ${breakdown === 'category' ? 'jf-sales__toggle-btn--active' : ''}`}
                onClick={() => setBreakdown('category')}
              >
                Category
              </button>
            </div>
          </header>
          <div className="jf-sales__chart-body">
            {breakdownData.length > 0 ? (
              <BarChart data={breakdownData} />
            ) : (
              <div className="jf-sales__empty">No data available.</div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
};

export default SalesDashboard;
