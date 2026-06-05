import { useMemo, useState } from 'react';
import './CaloriePlanner.scss';

export interface CaloriePlannerProps {
  title?: string;
  description?: string;
  initialWeight?: number;
  initialActivity?: number;
  initialGoal?: number;
  selected?: boolean;
}

const ACTIVITY_LEVELS = [
  { label: 'Sedentary', multiplier: 1.2 },
  { label: 'Light', multiplier: 1.375 },
  { label: 'Moderate', multiplier: 1.55 },
  { label: 'Active', multiplier: 1.725 },
  { label: 'Very Active', multiplier: 1.9 },
];

const GOAL_OPTIONS = [
  { label: 'Lose 1 kg/wk', adjustKcal: -1000, kgPerWeek: -1 },
  { label: 'Lose 0.5 kg/wk', adjustKcal: -500, kgPerWeek: -0.5 },
  { label: 'Maintain', adjustKcal: 0, kgPerWeek: 0 },
  { label: 'Gain 0.5 kg/wk', adjustKcal: 500, kgPerWeek: 0.5 },
  { label: 'Gain 1 kg/wk', adjustKcal: 1000, kgPerWeek: 1 },
];

export function CaloriePlanner({
  title = 'Daily calorie planner',
  description = 'See your daily target instantly.',
  initialWeight = 72,
  initialActivity = 3,
  initialGoal = 1,
  selected = false,
}: CaloriePlannerProps) {
  const [weight, setWeight] = useState(initialWeight);
  const [activityIdx, setActivityIdx] = useState(initialActivity);
  const [goalIdx, setGoalIdx] = useState(initialGoal);

  const { dailyTarget, proteinGrams, weeksToGoal } = useMemo(() => {
    const activity = ACTIVITY_LEVELS[activityIdx];
    const goal = GOAL_OPTIONS[goalIdx];
    const bmr = weight * 22;
    const tdee = bmr * activity.multiplier;
    const target = Math.max(1200, Math.round((tdee + goal.adjustKcal) / 10) * 10);
    const protein = Math.round(weight * 1.8);
    const weeks = goal.kgPerWeek === 0
      ? null
      : Math.max(1, Math.round((weight * 0.1) / Math.abs(goal.kgPerWeek)));
    return { dailyTarget: target, proteinGrams: protein, weeksToGoal: weeks };
  }, [weight, activityIdx, goalIdx]);

  const classes = ['jf-calorie-planner', selected && 'jf-calorie-planner--selected']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <div className="jf-calorie-planner__header">
        <div className="jf-calorie-planner__title">{title}</div>
        <div className="jf-calorie-planner__description">{description}</div>
      </div>

      <div className="jf-calorie-planner__fields">
        <div className="jf-calorie-planner__field">
          <div className="jf-calorie-planner__field-head">
            <span className="jf-calorie-planner__field-label">Current weight</span>
            <span className="jf-calorie-planner__field-value">{weight} kg</span>
          </div>
          <input
            className="jf-calorie-planner__slider"
            type="range"
            min={40}
            max={150}
            step={1}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            aria-label="Current weight in kilograms"
          />
        </div>

        <div className="jf-calorie-planner__field">
          <div className="jf-calorie-planner__field-head">
            <span className="jf-calorie-planner__field-label">Activity level</span>
            <span className="jf-calorie-planner__field-value">
              {ACTIVITY_LEVELS[activityIdx].label}
            </span>
          </div>
          <input
            className="jf-calorie-planner__slider"
            type="range"
            min={0}
            max={ACTIVITY_LEVELS.length - 1}
            step={1}
            value={activityIdx}
            onChange={(e) => setActivityIdx(Number(e.target.value))}
            aria-label="Activity level"
          />
        </div>

        <div className="jf-calorie-planner__field">
          <div className="jf-calorie-planner__field-head">
            <span className="jf-calorie-planner__field-label">Goal</span>
            <span className="jf-calorie-planner__field-value">
              {GOAL_OPTIONS[goalIdx].label}
            </span>
          </div>
          <input
            className="jf-calorie-planner__slider"
            type="range"
            min={0}
            max={GOAL_OPTIONS.length - 1}
            step={1}
            value={goalIdx}
            onChange={(e) => setGoalIdx(Number(e.target.value))}
            aria-label="Weight goal"
          />
        </div>
      </div>

      <div className="jf-calorie-planner__result">
        <div className="jf-calorie-planner__result-label">DAILY TARGET</div>
        <div className="jf-calorie-planner__result-value">
          {dailyTarget.toLocaleString()} kcal
        </div>
      </div>

      <div className="jf-calorie-planner__stats">
        <div className="jf-calorie-planner__stat">
          <div className="jf-calorie-planner__stat-label">Protein</div>
          <div className="jf-calorie-planner__stat-value">{proteinGrams} g</div>
        </div>
        <div className="jf-calorie-planner__stat">
          <div className="jf-calorie-planner__stat-label">Weeks to goal</div>
          <div className="jf-calorie-planner__stat-value">
            {weeksToGoal === null ? '—' : `${weeksToGoal} weeks`}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CaloriePlanner;
