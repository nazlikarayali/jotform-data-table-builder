import { useState } from 'react';
import './ActivitySchedule.scss';

export interface ActivityScheduleProps {
  selected?: boolean;
}

interface Activity {
  time: string;
  name: string;
  location: string;
  emoji: string;
  category: 'outdoor' | 'meal' | 'creative' | 'sport' | 'rest';
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const SCHEDULES: Record<string, Activity[]> = {
  Mon: [
    { time: '7:00 AM', name: 'Breakfast', location: 'Main Hall', emoji: '🥞', category: 'meal' },
    { time: '8:30 AM', name: 'Nature Hike', location: 'Pine Trail', emoji: '🥾', category: 'outdoor' },
    { time: '11:00 AM', name: 'Swimming', location: 'Lake Area', emoji: '🏊', category: 'sport' },
    { time: '12:30 PM', name: 'Lunch', location: 'Main Hall', emoji: '🍕', category: 'meal' },
    { time: '2:00 PM', name: 'Arts & Crafts', location: 'Craft Cabin', emoji: '🎨', category: 'creative' },
    { time: '4:00 PM', name: 'Free Time', location: 'Camp Grounds', emoji: '⚽', category: 'rest' },
    { time: '6:00 PM', name: 'Dinner', location: 'Main Hall', emoji: '🍽️', category: 'meal' },
    { time: '8:00 PM', name: 'Campfire', location: 'Fire Pit', emoji: '🔥', category: 'outdoor' },
  ],
  Tue: [
    { time: '7:00 AM', name: 'Breakfast', location: 'Main Hall', emoji: '🥞', category: 'meal' },
    { time: '8:30 AM', name: 'Archery', location: 'Range Field', emoji: '🏹', category: 'sport' },
    { time: '11:00 AM', name: 'Canoeing', location: 'Lake Dock', emoji: '🛶', category: 'sport' },
    { time: '12:30 PM', name: 'Lunch', location: 'Main Hall', emoji: '🌮', category: 'meal' },
    { time: '2:00 PM', name: 'Music Workshop', location: 'Amphitheater', emoji: '🎵', category: 'creative' },
    { time: '4:00 PM', name: 'Volleyball', location: 'Beach Court', emoji: '🏐', category: 'sport' },
    { time: '6:00 PM', name: 'Dinner', location: 'Main Hall', emoji: '🍔', category: 'meal' },
    { time: '8:00 PM', name: 'Stargazing', location: 'Hilltop', emoji: '⭐', category: 'outdoor' },
  ],
  Wed: [
    { time: '7:00 AM', name: 'Breakfast', location: 'Main Hall', emoji: '🥞', category: 'meal' },
    { time: '8:30 AM', name: 'Rock Climbing', location: 'Boulder Wall', emoji: '🧗', category: 'sport' },
    { time: '11:00 AM', name: 'Fishing', location: 'Lake Dock', emoji: '🎣', category: 'outdoor' },
    { time: '12:30 PM', name: 'Lunch', location: 'Main Hall', emoji: '🥗', category: 'meal' },
    { time: '2:00 PM', name: 'Drama Class', location: 'Amphitheater', emoji: '🎭', category: 'creative' },
    { time: '4:00 PM', name: 'Free Time', location: 'Camp Grounds', emoji: '🎮', category: 'rest' },
    { time: '6:00 PM', name: 'BBQ Night', location: 'Picnic Area', emoji: '🥩', category: 'meal' },
    { time: '8:00 PM', name: 'Movie Night', location: 'Main Hall', emoji: '🎬', category: 'rest' },
  ],
  Thu: [
    { time: '7:00 AM', name: 'Breakfast', location: 'Main Hall', emoji: '🥞', category: 'meal' },
    { time: '8:30 AM', name: 'Orienteering', location: 'Forest Trail', emoji: '🧭', category: 'outdoor' },
    { time: '11:00 AM', name: 'Tie-Dye', location: 'Craft Cabin', emoji: '👕', category: 'creative' },
    { time: '12:30 PM', name: 'Lunch', location: 'Main Hall', emoji: '🍝', category: 'meal' },
    { time: '2:00 PM', name: 'Soccer', location: 'Sports Field', emoji: '⚽', category: 'sport' },
    { time: '4:00 PM', name: 'Photography', location: 'Nature Walk', emoji: '📷', category: 'creative' },
    { time: '6:00 PM', name: 'Dinner', location: 'Main Hall', emoji: '🍗', category: 'meal' },
    { time: '8:00 PM', name: 'Talent Show', location: 'Amphitheater', emoji: '🎤', category: 'creative' },
  ],
  Fri: [
    { time: '7:00 AM', name: 'Breakfast', location: 'Main Hall', emoji: '🥞', category: 'meal' },
    { time: '8:30 AM', name: 'Zip Line', location: 'Adventure Park', emoji: '🤸', category: 'sport' },
    { time: '11:00 AM', name: 'Scavenger Hunt', location: 'All Camp', emoji: '🔍', category: 'outdoor' },
    { time: '12:30 PM', name: 'Pizza Party', location: 'Main Hall', emoji: '🍕', category: 'meal' },
    { time: '2:00 PM', name: 'Awards Ceremony', location: 'Amphitheater', emoji: '🏆', category: 'rest' },
    { time: '4:00 PM', name: 'Packing', location: 'Cabins', emoji: '🎒', category: 'rest' },
    { time: '5:30 PM', name: 'Farewell Dinner', location: 'Main Hall', emoji: '🎉', category: 'meal' },
    { time: '7:00 PM', name: 'Departure', location: 'Main Gate', emoji: '🚌', category: 'rest' },
  ],
};

const CATEGORY_COLORS: Record<string, { bg: string; label: string }> = {
  outdoor: { bg: 'var(--bg-surface-success)', label: 'var(--fg-success)' },
  meal: { bg: 'var(--bg-surface-warning)', label: 'var(--fg-warning)' },
  creative: { bg: 'var(--bg-surface-brand)', label: 'var(--fg-brand)' },
  sport: { bg: 'var(--bg-surface-info)', label: 'var(--fg-info)' },
  rest: { bg: 'var(--bg-fill-active)', label: 'var(--fg-secondary)' },
};

export function ActivitySchedule({ selected = false }: ActivityScheduleProps) {
  const [activeDay, setActiveDay] = useState('Wed');

  const schedule = SCHEDULES[activeDay] || [];
  const classes = ['jf-schedule', selected && 'jf-schedule--selected'].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <div className="jf-schedule__header">
        <div className="jf-schedule__icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v4" /><path d="M16 2v4" />
            <rect width="18" height="18" x="3" y="4" rx="2" />
            <path d="M3 10h18" />
          </svg>
        </div>
        <div className="jf-schedule__header-text">
          <h3 className="jf-schedule__title">Weekly Schedule</h3>
          <p className="jf-schedule__subtitle">July 14 – July 18, 2026</p>
        </div>
      </div>

      <div className="jf-schedule__days">
        {DAYS.map(day => (
          <button
            key={day}
            className={`jf-schedule__day ${activeDay === day ? 'jf-schedule__day--active' : ''}`}
            onClick={() => setActiveDay(day)}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="jf-schedule__timeline">
        {schedule.map((activity, i) => {
          const colors = CATEGORY_COLORS[activity.category];
          return (
            <div key={i} className="jf-schedule__activity">
              <div className="jf-schedule__time">{activity.time}</div>
              <div className="jf-schedule__dot" />
              <div className="jf-schedule__activity-card">
                <div className="jf-schedule__activity-emoji" style={{ background: colors.bg }}>
                  {activity.emoji}
                </div>
                <div className="jf-schedule__activity-info">
                  <span className="jf-schedule__activity-name">{activity.name}</span>
                  <span className="jf-schedule__activity-location">{activity.location}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ActivitySchedule;
