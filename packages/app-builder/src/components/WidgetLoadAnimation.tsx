import { useEffect, useRef, useState, type CSSProperties } from 'react'
import widgetLoadAvatar from '../assets/widget-load-avatar.png'

// Inline "AI is building your widget" card. Ported from the Claude Design
// handoff (Widget Load Animation). It renders in-place on the builder canvas
// (like the old generating banner) — not as a full-screen overlay. The progress
// and checklist are time-driven for now (not wired to real build events).

type Phase = 'planning' | 'building' | 'finishing' | 'done'
type ItemStatus = 'pending' | 'active' | 'done'

interface WidgetLoadAnimationProps {
  /** Accent color for the ring, progress bar and percentage. */
  accent?: string
  /** Playback speed multiplier (1 = design timing). */
  speed?: number
  /** Replay the build cycle continuously. Defaults to true so it stays alive on the canvas. */
  loop?: boolean
  /** Fired at the end of a non-looping run, once the success state has shown. */
  onComplete?: () => void
}

const LABELS = [
  'Designing the widget layout',
  'Creating components and states',
  'Connecting data sources',
  'Adding interactions and animations',
  'Applying responsive behavior',
] as const

const CONFETTI_COLORS = [
  'var(--bg-fill-brand)',
  'var(--primary-400)',
  'var(--bg-fill-brand-hover)',
  'var(--bg-surface-brand)',
  'var(--yellow-400)',
  'var(--blue-400)',
  'var(--error-default)',
]

// Allow custom CSS vars (--accent, --tx, …) in inline style objects.
type CSSVarStyle = CSSProperties & Record<`--${string}`, string | number>

export function WidgetLoadAnimation({ accent, speed = 1, loop = true, onComplete }: WidgetLoadAnimationProps) {
  const [phase, setPhase] = useState<Phase>('planning')
  const [title, setTitle] = useState('Planning your widget')
  const [fade, setFade] = useState(1)
  const [progress, setProgress] = useState(0)
  const [items, setItems] = useState<{ id: number; status: ItemStatus }[]>([])
  const [confetti, setConfetti] = useState<CSSVarStyle[]>([])

  const timers = useRef<number[]>([])
  const raf = useRef<number | null>(null)
  const target = useRef(0)

  useEffect(() => {
    let cancelled = false
    const sp = speed || 1
    const at = (fn: () => void, delay: number) => {
      timers.current.push(window.setTimeout(fn, delay / sp))
    }

    const tick = () => {
      setProgress((prev) => {
        const t = target.current
        if (Math.abs(t - prev) > 0.4) {
          raf.current = requestAnimationFrame(tick)
          return prev + (t - prev) * 0.11
        }
        raf.current = null
        return t
      })
    }
    const setProg = (t: number) => {
      target.current = t
      if (!raf.current) raf.current = requestAnimationFrame(tick)
    }

    const swap = (next: Phase, nextTitle: string) => {
      setFade(0)
      at(() => {
        setPhase(next)
        setTitle(nextTitle)
        setFade(1)
      }, 170)
    }
    // Render all items up-front; only their status changes over time. `done` is
    // how many are completed, `active` is the index currently in progress (-1 = none).
    const steps = (done: number, active: number) =>
      setItems(LABELS.map((_, id) => ({
        id,
        status: id < done ? 'done' : id === active ? 'active' : 'pending',
      })))

    const runCycle = () => {
      // clear timers from the previous cycle, then walk the timeline
      timers.current.forEach((t) => clearTimeout(t))
      timers.current = []

      setPhase('planning')
      setTitle('Planning your widget')
      setFade(1)
      setProgress(0)
      // all five items visible from the start (pending), then checked off in place
      steps(0, -1)
      setConfetti([])
      target.current = 0
      setProg(16)

      // building — walk the active state down the (already-visible) list
      at(() => {
        swap('building', 'Building your widget')
        steps(0, 0)
        setProg(28)
      }, 1900)
      at(() => { steps(1, 1); setProg(42) }, 2950)
      at(() => { steps(2, 2); setProg(56) }, 3900)
      at(() => { steps(3, 3); setProg(68) }, 4850)

      // finishing
      at(() => {
        swap('finishing', 'Finalizing your widget')
        steps(4, 4)
        setProg(88)
      }, 5800)
      at(() => {
        steps(5, -1)
        setProg(100)
      }, 6900)

      // done — confetti + success banner
      at(() => {
        setConfetti(makeConfetti())
        swap('done', 'Widget is ready')
      }, 7900)

      if (loop) {
        at(() => { if (!cancelled) runCycle() }, 12200)
      } else {
        at(() => onComplete?.(), 9600)
      }
    }

    runCycle()

    return () => {
      cancelled = true
      timers.current.forEach((t) => clearTimeout(t))
      timers.current = []
      if (raf.current) { cancelAnimationFrame(raf.current); raf.current = null }
    }
    // re-arm the whole timeline only when these knobs change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loop, speed])

  const ac = accent || 'var(--bg-fill-brand)'
  const isWorking = phase !== 'done'
  const isDone = phase === 'done'
  const pct = Math.round(progress)

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        fontFamily: 'var(--font-family)',
        '--accent': ac,
      } as CSSVarStyle}
      role="status"
      aria-live="polite"
      aria-busy={isWorking}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          padding: 'var(--spacing-xl)',
          overflow: 'hidden',
        }}
      >
        {/* header */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 18 }}>
          <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0, animation: 'wl-bob 3s ease-in-out infinite' }}>
            {isWorking && (
              <div
                style={{
                  position: 'absolute',
                  inset: -3,
                  borderRadius: '50%',
                  background:
                    'conic-gradient(from 0deg, transparent 0deg, var(--accent) 140deg, color-mix(in srgb, var(--accent) 50%, var(--bg-surface)) 220deg, transparent 360deg)',
                  filter: 'blur(3px)',
                  opacity: 0.6,
                  animation: 'wl-glow 2.4s linear infinite',
                }}
              />
            )}
            {isDone && (
              <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: '2px solid var(--border-brand)', animation: 'wl-pulsering 1.1s ease-out infinite' }} />
            )}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                overflow: 'hidden',
                background: 'linear-gradient(160deg, var(--bg-fill-brand), var(--primary-400))',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.3), 0 4px 10px -3px rgba(121,35,221,.45)',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, background: `url(${widgetLoadAvatar}) 40% 7% / 172% no-repeat` }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0, opacity: fade, transition: 'opacity .18s ease' }}>
            <div
              style={{
                fontFamily: 'var(--font-family)',
                fontWeight: 'var(--font-weight-bold)' as CSSProperties['fontWeight'],
                fontSize: 'var(--font-size-md)',
                lineHeight: 'var(--line-height-md)',
                letterSpacing: 'var(--letter-spacing-md)',
                color: 'var(--fg-primary)',
              }}
            >
              {title}
            </div>
          </div>

          {isWorking && (
            <div
              style={{
                fontFamily: 'var(--font-family)',
                fontWeight: 'var(--font-weight-bold)' as CSSProperties['fontWeight'],
                fontSize: 'var(--font-size-sm)',
                color: 'var(--accent)',
                flexShrink: 0,
                alignSelf: 'flex-start',
                paddingTop: 3,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {pct}%
            </div>
          )}
        </div>

        {/* progress */}
        {isWorking && (
          <div style={{ position: 'relative', width: '100%', height: 8, borderRadius: 'var(--radius-rounded)', background: 'var(--bg-fill-disabled)', overflow: 'hidden', marginBottom: 'var(--spacing-md)' }}>
            <div
              style={{
                position: 'relative',
                height: '100%',
                width: `${progress.toFixed(1)}%`,
                borderRadius: 'var(--radius-rounded)',
                background: 'linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 60%, var(--bg-surface)))',
                transition: 'width .55s cubic-bezier(.4,0,.2,1)',
              }}
            />
          </div>
        )}

        {/* checklist */}
        {isWorking && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {items.map((item) => {
              const text = item.status === 'active' ? `${LABELS[item.id]}…` : LABELS[item.id]
              const color =
                item.status === 'done' ? 'var(--fg-secondary)'
                  : item.status === 'active' ? 'var(--fg-primary)'
                    : 'var(--fg-tertiary)'
              return (
                <div key={item.id} style={{ display: 'flex', flexDirection: 'row', gap: 12, alignItems: 'center', animation: 'wl-itemin .4s ease both' }}>
                  <div style={{ position: 'relative', width: 22, height: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.status === 'pending' && (
                      <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border)' }} />
                    )}
                    {item.status === 'active' && (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2.5px solid color-mix(in srgb, var(--accent) 22%, transparent)', borderTopColor: 'var(--accent)', animation: 'wl-spin .7s linear infinite' }} />
                    )}
                    {item.status === 'done' && (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg-fill-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 7px -2px color-mix(in srgb, var(--bg-fill-brand) 42%, transparent)', animation: 'wl-badgepop .5s cubic-bezier(.2,1.4,.4,1) both' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" fill="none" stroke="var(--fg-inverse)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'], color, transition: 'color .3s ease' }}>{text}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* success */}
        {isDone && (
          <>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
              {confetti.map((style, i) => (
                <span key={i} style={style} />
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, background: 'var(--bg-surface-brand)', border: '1px solid var(--border-brand)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-sm) var(--spacing-md)', animation: 'wl-bannerin .5s cubic-bezier(.2,.9,.3,1) both' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--bg-fill-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 6px 14px -4px color-mix(in srgb, var(--bg-fill-brand) 45%, transparent)', animation: 'wl-badgepop .55s cubic-bezier(.2,1.4,.4,1) both' }}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" fill="none" stroke="var(--fg-inverse)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-family)', fontWeight: 'var(--font-weight-bold)' as CSSProperties['fontWeight'], fontSize: 'var(--font-size-sm)', color: 'var(--fg-brand)' }}>All 5 steps completed</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--fg-brand)', fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'], display: 'flex', alignItems: 'center', gap: 4 }}>
                  Launching your widget
                  <span style={{ display: 'inline-flex', gap: 2, marginLeft: 1 }}>
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--fg-brand)', animation: 'wl-dots 1.2s infinite' }} />
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--fg-brand)', animation: 'wl-dots 1.2s infinite .2s' }} />
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--fg-brand)', animation: 'wl-dots 1.2s infinite .4s' }} />
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function makeConfetti(): CSSVarStyle[] {
  const n = 24
  const parts: CSSVarStyle[] = []
  for (let i = 0; i < n; i++) {
    const ang = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.4
    const dist = 70 + Math.random() * 80
    const tx = Math.cos(ang) * dist
    const ty = Math.sin(ang) * dist - 14
    const size = 5 + Math.random() * 6
    const sq = Math.random() > 0.5
    parts.push({
      position: 'absolute',
      left: '50%',
      top: '34%',
      width: size,
      height: sq ? size : size * 0.55,
      background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      borderRadius: sq ? 2 : 9,
      '--tx': `${tx}px`,
      '--ty': `${ty}px`,
      '--rot': `${Math.random() * 560 - 280}deg`,
      animation: 'wl-burst 1.05s cubic-bezier(.15,.7,.3,1) forwards',
      animationDelay: `${Math.random() * 0.14}s`,
    })
  }
  return parts
}
