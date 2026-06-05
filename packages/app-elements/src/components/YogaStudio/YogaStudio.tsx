import { useMemo, useState, type FC } from 'react';
import { Icon } from '../Icon/Icon';
import './YogaStudio.scss';

export type YogaColumns = '1' | '2';

export interface YogaStudioProps {
  columns?: YogaColumns;
  title?: string;
  selected?: boolean;
}

type ClassStyle = 'Vinyasa' | 'Hatha' | 'Yin' | 'Power' | 'Restorative' | 'Hot';
type ClassLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
type Availability = 'Spots open' | 'Almost full' | 'Full';

interface YogaClass {
  id: string;
  title: string;
  style: ClassStyle;
  level: ClassLevel;
  duration: number;
  schedule: string;
  instructor: string;
  availability: Availability;
  rating: number;
  image: string;
}

const CLASSES: YogaClass[] = [
  {
    id: 'morning-flow',
    title: 'Morning Flow Vinyasa',
    style: 'Vinyasa',
    level: 'Beginner',
    duration: 60,
    schedule: 'Mon · Wed · Fri  ·  7:00 AM',
    instructor: 'Sarah Lee',
    availability: 'Spots open',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=900&h=560&fit=crop',
  },
  {
    id: 'sunset-vinyasa',
    title: 'Sunset Vinyasa',
    style: 'Vinyasa',
    level: 'Intermediate',
    duration: 60,
    schedule: 'Mon · Fri  ·  6:30 PM',
    instructor: 'Emma Chen',
    availability: 'Almost full',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=900&h=560&fit=crop',
  },
  {
    id: 'hatha-basics',
    title: 'Hatha Basics',
    style: 'Hatha',
    level: 'Beginner',
    duration: 45,
    schedule: 'Daily  ·  9:00 AM',
    instructor: 'Tom Wright',
    availability: 'Spots open',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=900&h=560&fit=crop',
  },
  {
    id: 'yin-meditation',
    title: 'Yin & Meditation',
    style: 'Yin',
    level: 'All Levels',
    duration: 90,
    schedule: 'Wed  ·  8:00 PM',
    instructor: 'Priya Patel',
    availability: 'Spots open',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1593810450967-f9c42742e326?w=900&h=560&fit=crop',
  },
  {
    id: 'power-hour',
    title: 'Power Hour',
    style: 'Power',
    level: 'Advanced',
    duration: 60,
    schedule: 'Tue · Thu  ·  12:00 PM',
    instructor: 'Marco Reyes',
    availability: 'Full',
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?w=900&h=560&fit=crop',
  },
  {
    id: 'restorative-sunday',
    title: 'Restorative Sunday',
    style: 'Restorative',
    level: 'All Levels',
    duration: 75,
    schedule: 'Sun  ·  6:00 PM',
    instructor: 'Anna Martin',
    availability: 'Spots open',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=900&h=560&fit=crop',
  },
  {
    id: 'hot-power',
    title: 'Hot Power Yoga',
    style: 'Hot',
    level: 'Intermediate',
    duration: 75,
    schedule: 'Sat  ·  10:00 AM',
    instructor: 'James Cole',
    availability: 'Almost full',
    rating: 4.4,
    image: 'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=900&h=560&fit=crop',
  },
  {
    id: 'prenatal-hatha',
    title: 'Prenatal Hatha',
    style: 'Hatha',
    level: 'All Levels',
    duration: 60,
    schedule: 'Thu  ·  11:00 AM',
    instructor: 'Lila Marsh',
    availability: 'Spots open',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1593164842264-854604db2260?w=900&h=560&fit=crop',
  },
];

const STYLE_OPTIONS: ClassStyle[] = ['Vinyasa', 'Hatha', 'Yin', 'Power', 'Restorative', 'Hot'];
const LEVEL_OPTIONS: ClassLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];

function availabilityTone(a: Availability): 'success' | 'warning' | 'neutral' {
  if (a === 'Full') return 'neutral';
  if (a === 'Almost full') return 'warning';
  return 'success';
}

export const YogaStudio: FC<YogaStudioProps> = ({
  columns = '2',
  title = 'Browse classes',
  selected = false,
}) => {
  const [query, setQuery] = useState('');
  const [activeStyles, setActiveStyles] = useState<ClassStyle[]>([]);
  const [activeLevels, setActiveLevels] = useState<ClassLevel[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CLASSES.filter((c) => {
      const matchesQuery =
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.instructor.toLowerCase().includes(q) ||
        c.style.toLowerCase().includes(q);
      const matchesStyle = activeStyles.length === 0 || activeStyles.includes(c.style);
      const matchesLevel = activeLevels.length === 0 || activeLevels.includes(c.level);
      return matchesQuery && matchesStyle && matchesLevel;
    });
  }, [query, activeStyles, activeLevels]);

  const toggleStyle = (s: ClassStyle) =>
    setActiveStyles((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const toggleLevel = (l: ClassLevel) =>
    setActiveLevels((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));

  const clearAll = () => {
    setQuery('');
    setActiveStyles([]);
    setActiveLevels([]);
  };

  const activeChips: { key: string; label: string; remove: () => void }[] = [
    ...activeStyles.map((s) => ({ key: `style-${s}`, label: s, remove: () => toggleStyle(s) })),
    ...activeLevels.map((l) => ({ key: `level-${l}`, label: l, remove: () => toggleLevel(l) })),
  ];

  const hasActive = activeChips.length > 0 || query.trim().length > 0;

  const rootClasses = [
    'jf-yoga',
    `jf-yoga--cols-${columns}`,
    selected && 'jf-yoga--selected',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClasses}>
      {title && <h3 className="jf-yoga__title">{title}</h3>}

      <div className="jf-yoga__search-row">
        <div className="jf-yoga__search">
          <Icon
            name="Search"
            size={18}
            className="jf-yoga__search-icon"
            forceStyle="outline"
          />
          <input
            type="text"
            className="jf-yoga__search-input"
            placeholder="Search classes, teachers, styles"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="jf-yoga__search-clear"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <Icon name="X" size={14} forceStyle="outline" />
            </button>
          )}
        </div>
        <button
          type="button"
          className={`jf-yoga__filter-btn ${showFilters ? 'jf-yoga__filter-btn--open' : ''}`}
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
        >
          <Icon name="SlidersHorizontal" size={16} forceStyle="outline" />
          <span>Filter</span>
          {activeChips.length > 0 && (
            <span className="jf-yoga__filter-count">{activeChips.length}</span>
          )}
        </button>
      </div>

      {(activeChips.length > 0 || hasActive) && (
        <div className="jf-yoga__chip-row">
          <div className="jf-yoga__active-chips">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className="jf-yoga__active-chip"
                onClick={chip.remove}
              >
                <span>{chip.label}</span>
                <Icon name="X" size={12} forceStyle="outline" />
              </button>
            ))}
          </div>
          <button
            type="button"
            className="jf-yoga__clear-btn"
            onClick={clearAll}
            disabled={!hasActive}
          >
            Clear all
          </button>
        </div>
      )}

      {showFilters && (
        <div className="jf-yoga__filters">
          <div className="jf-yoga__filter-group">
            <span className="jf-yoga__filter-label">Style</span>
            <div className="jf-yoga__chips">
              {STYLE_OPTIONS.map((opt) => {
                const active = activeStyles.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`jf-yoga__chip ${active ? 'jf-yoga__chip--active' : ''}`}
                    onClick={() => toggleStyle(opt)}
                    aria-pressed={active}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="jf-yoga__filter-group">
            <span className="jf-yoga__filter-label">Level</span>
            <div className="jf-yoga__chips">
              {LEVEL_OPTIONS.map((opt) => {
                const active = activeLevels.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`jf-yoga__chip ${active ? 'jf-yoga__chip--active' : ''}`}
                    onClick={() => toggleLevel(opt)}
                    aria-pressed={active}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="jf-yoga__count-row">
        <span className="jf-yoga__count">
          {filtered.length} {filtered.length === 1 ? 'class' : 'classes'}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="jf-yoga__empty">
          No classes match your search. Try clearing filters.
        </div>
      ) : (
        <div className="jf-yoga__grid">
          {filtered.map((c) => {
            const tone = availabilityTone(c.availability);
            return (
              <article key={c.id} className="jf-yoga__card">
                <div className="jf-yoga__card-image-wrap">
                  <img
                    className="jf-yoga__card-image"
                    src={c.image}
                    alt={c.title}
                    loading="lazy"
                  />
                  <span className={`jf-yoga__avail jf-yoga__avail--${tone}`}>{c.availability}</span>
                </div>
                <div className="jf-yoga__card-body">
                  <h4 className="jf-yoga__card-title">{c.title}</h4>
                  <div className="jf-yoga__tag-row">
                    <span className="jf-yoga__tag jf-yoga__tag--brand">{c.style}</span>
                    <span className="jf-yoga__tag jf-yoga__tag--neutral">{c.level}</span>
                  </div>
                  <div className="jf-yoga__meta-row">
                    <span className="jf-yoga__meta">
                      <Icon name="Clock" size={14} forceStyle="outline" />
                      {c.duration} min
                    </span>
                    <span className="jf-yoga__meta">
                      <Icon name="User" size={14} forceStyle="outline" />
                      {c.instructor}
                    </span>
                  </div>
                  <div className="jf-yoga__schedule">{c.schedule}</div>
                  <div className="jf-yoga__card-footer">
                    <span className="jf-yoga__rating">
                      <Icon name="Star" size={13} forceStyle="fill" />
                      <span className="jf-yoga__rating-value">{c.rating.toFixed(1)}</span>
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default YogaStudio;
