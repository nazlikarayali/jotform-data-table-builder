import './CalorieSummary.scss';

export interface MacroData {
  label: string;
  current: number;
  target: number;
  unit?: string;
}

export interface CalorieSummaryProps {
  label?: string;
  consumed?: number;
  target?: number;
  macros?: MacroData[];
  selected?: boolean;
}

const DEFAULT_MACROS: MacroData[] = [
  { label: 'Protein', current: 92, target: 132, unit: 'g' },
  { label: 'Carbs', current: 156, target: 210, unit: 'g' },
  { label: 'Fats', current: 38, target: 60, unit: 'g' },
];

export function CalorieSummary({
  label = 'TODAY',
  consumed = 1247,
  target = 1840,
  macros = DEFAULT_MACROS,
  selected = false,
}: CalorieSummaryProps) {
  const percent = Math.min(100, Math.round((consumed / Math.max(1, target)) * 100));
  const remaining = Math.max(0, target - consumed);

  const classes = ['jf-calorie-summary', selected && 'jf-calorie-summary--selected']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <div className="jf-calorie-summary__hero">
        <div className="jf-calorie-summary__hero-row">
          <span className="jf-calorie-summary__label">{label}</span>
          <span className="jf-calorie-summary__percent">{percent}%</span>
        </div>
        <div className="jf-calorie-summary__big-row">
          <span className="jf-calorie-summary__consumed">{consumed.toLocaleString()}</span>
          <span className="jf-calorie-summary__target">/ {target.toLocaleString()} kcal</span>
        </div>
        <div className="jf-calorie-summary__track">
          <div className="jf-calorie-summary__fill" style={{ width: `${percent}%` }} />
        </div>
        <div className="jf-calorie-summary__remaining">
          {remaining.toLocaleString()} kcal remaining today
        </div>
      </div>

      <div className="jf-calorie-summary__macros">
        {macros.map((macro) => {
          const macroPct = Math.min(100, Math.round((macro.current / Math.max(1, macro.target)) * 100));
          const unit = macro.unit ?? 'g';
          return (
            <div key={macro.label} className="jf-calorie-summary__macro">
              <div className="jf-calorie-summary__macro-label">{macro.label}</div>
              <div className="jf-calorie-summary__macro-value">{macro.current}{unit}</div>
              <div className="jf-calorie-summary__macro-of">of {macro.target}{unit}</div>
              <div className="jf-calorie-summary__macro-track">
                <div
                  className="jf-calorie-summary__macro-fill"
                  style={{ width: `${macroPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CalorieSummary;
