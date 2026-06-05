import './AnalyticsOverview.scss';

export interface KpiCard {
  label: string;
  value: string;
  deltaPercent: number;
  lastYear: string;
}

export interface AnalyticsOverviewProps {
  title?: string;
  cards?: KpiCard[];
  selected?: boolean;
}

const DEFAULT_CARDS: KpiCard[] = [
  { label: 'Total Sales', value: '$48.8K', deltaPercent: 3.4, lastYear: 'Last year $32,450' },
  { label: 'Purchase', value: '$14.2K', deltaPercent: 2.8, lastYear: 'Last year $14,832' },
  { label: 'Return', value: '$345.0', deltaPercent: -1.2, lastYear: 'Last year $342' },
  { label: 'Marketing', value: '$10.2K', deltaPercent: 2.4, lastYear: 'Last year $12,832' },
];

const ArrowUp = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);

const ArrowDown = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </svg>
);

export function AnalyticsOverview({
  title = 'Analytics Overview',
  cards = DEFAULT_CARDS,
  selected = false,
}: AnalyticsOverviewProps) {
  const classes = ['jf-analytics-overview', selected && 'jf-analytics-overview--selected']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      {title && (
        <div className="jf-analytics-overview__header">
          <span className="jf-analytics-overview__title">{title}</span>
        </div>
      )}
      <div className="jf-analytics-overview__grid">
        {cards.map((card) => {
          const positive = card.deltaPercent >= 0;
          return (
            <div key={card.label} className="jf-analytics-overview__card">
              <div className="jf-analytics-overview__row">
                <span className="jf-analytics-overview__label">{card.label}</span>
              </div>
              <div className="jf-analytics-overview__row jf-analytics-overview__row--value">
                <span className="jf-analytics-overview__value">{card.value}</span>
                <span
                  className={`jf-analytics-overview__delta${
                    positive
                      ? ' jf-analytics-overview__delta--up'
                      : ' jf-analytics-overview__delta--down'
                  }`}
                >
                  {positive ? <ArrowUp /> : <ArrowDown />}
                  {positive ? '+' : ''}
                  {card.deltaPercent.toFixed(1)}%
                </span>
              </div>
              <div className="jf-analytics-overview__lastyear">{card.lastYear}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AnalyticsOverview;
