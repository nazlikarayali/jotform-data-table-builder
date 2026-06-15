import type { CSSProperties, FC } from 'react';

export type BadgeTone = 'info' | 'success' | 'warning' | 'neutral';
/**
 * A multiple-choice value. `color` is the option's chosen app color (a vivid
 * base hue). Just like the Card element derives an icon + icon-background from a
 * single picked color, the badge derives a very light tinted background and a
 * saturated foreground from `color` — so any app color produces a harmonious pair.
 */
export type ListBadge =
  | string
  | { label: string; color?: string; bg?: string; tone?: BadgeTone };

export const badgeLabel = (b: ListBadge) => (typeof b === 'string' ? b : b.label);

export const badgeClass = (b: ListBadge) => {
  const tone = typeof b === 'string' ? undefined : b.tone;
  return `jf-field-badge${tone && tone !== 'neutral' ? ` jf-field-badge--${tone}` : ''}`;
};

export const badgeStyle = (b: ListBadge): CSSProperties | undefined => {
  if (typeof b === 'string' || !b.color) return undefined;
  // Explicit pair (the design's exact bg + text token, e.g. teal #E5F6F3 / #29BCAA).
  if (b.bg) return { backgroundColor: b.bg, color: b.color };
  // Otherwise mirror the Card icon system: one chosen color → a light tinted
  // background + a saturated, slightly darkened foreground.
  return {
    backgroundColor: `color-mix(in srgb, ${b.color} 14%, white)`,
    color: `color-mix(in srgb, ${b.color}, black 12%)`,
  };
};

/**
 * Resolve a Description template (HTML authored in the builder, containing field
 * chips + literal text + formatting) against one item's field values. Each
 * `.jf-field-chip[data-field-value]` is replaced by `fields[value]`; literal
 * text and inline formatting (bold/italic/underline) are preserved. Returns an
 * HTML string for dangerouslySetInnerHTML.
 */
export function resolveDescription(
  templateHtml: string,
  fields: Record<string, string> = {},
  badges: ListBadge[] = [],
): string {
  if (typeof document === 'undefined' || !templateHtml) return templateHtml || '';
  const tmp = document.createElement('div');
  tmp.innerHTML = templateHtml;
  // Map a multiple-choice value → its badge colors (so a tag chip resolves to a
  // colored pill rather than duplicating the standalone badge as plain text).
  const colorByLabel: Record<string, { color?: string; bg?: string }> = {};
  for (const b of badges) if (typeof b !== 'string') colorByLabel[b.label] = { color: b.color, bg: b.bg };
  tmp.querySelectorAll('.jf-field-chip').forEach((chip) => {
    const key = chip.getAttribute('data-field-value') || '';
    const kind = chip.getAttribute('data-field-kind') || 'text';
    const label = chip.querySelector('.jf-field-chip__label')?.textContent || chip.textContent || '';
    const value = key && fields[key] != null ? fields[key] : label;
    if (kind === 'tag') {
      const meta = colorByLabel[value];
      const span = document.createElement('span');
      span.className = 'jf-field-badge';
      if (meta?.bg) span.style.backgroundColor = meta.bg;
      if (meta?.color) span.style.color = meta.color;
      span.textContent = value;
      chip.replaceWith(span);
    } else {
      chip.replaceWith(document.createTextNode(value));
    }
  });
  return tmp.innerHTML.replace(/​/g, '');
}

// Renders multiple-choice field values (e.g. breed) as colored badge pills.
export const FieldBadges: FC<{ badges?: ListBadge[] }> = ({ badges }) =>
  badges && badges.length ? (
    <div className="jf-field-badges">
      {badges.map((b, i) => (
        <span key={i} className={badgeClass(b)} style={badgeStyle(b)}>{badgeLabel(b)}</span>
      ))}
    </div>
  ) : null;
