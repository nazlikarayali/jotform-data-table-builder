import { useCallback, useEffect, useRef, useState } from 'react'
import podoAvatar from '../assets/podo-chat-avatar.png'
import './VisibleAIOverlay.scss'

type Rect = { x: number; y: number; w: number; h: number }
type Stage =
  | 'idle'
  | 'greeting'
  | 'suggesting'
  | 'cursor-traveling'
  | 'halo-target'
  | 'clicking'
  | 'caption-after-place'
  | 'data-source'
  | 'connecting'
  | 'done-chip'
  | 'closing'
  | 'paused'
  | 'finished'

type Suggestion = { label: string; accept?: boolean }

// Anchored, user-paced tour card. `left`/`top` position the card; `arrowTop`
// is the vertical offset of the pointer arrow within the card so it lines up
// with the target it describes.
type CoachAction = 'continue' | 'back' | 'close' | 'add'
type CoachButton = { label: string; action: CoachAction; primary?: boolean }

type Coach = {
  // When step/total are omitted the "Step x/y" eyebrow is hidden (used for
  // continuation modals like the data-source highlight).
  step?: number
  total?: number
  title: string
  body: string
  left: number
  top: number
  arrowTop: number
  arrowSide?: 'left' | 'right'
  // Custom footer buttons. When omitted, the default Back + Continue pair is
  // shown. Step 3 uses [Add a list] + [Continue tour].
  actions?: CoachButton[]
}

const findByLabel = (labels: string[]): HTMLElement | null => {
  const items = Array.from(document.querySelectorAll<HTMLElement>('.build-page__element-item'))
  for (const item of items) {
    const name = item.querySelector('.build-page__element-name')?.textContent?.trim() ?? ''
    if (labels.includes(name)) return item
  }
  return null
}

const rectOf = (el: HTMLElement): Rect => {
  const r = el.getBoundingClientRect()
  return { x: r.left, y: r.top, w: r.width, h: r.height }
}

const OFFSCREEN_CURSOR: Rect = { x: -80, y: window.innerHeight - 80, w: 18, h: 24 }

type TourOption = {
  id: string
  kind: 'elements' | 'design' | 'ai'
  label: string
  description: string
  pageName?: string
  pageIcon?: string
}

const TOUR_OPTIONS: TourOption[] = [
  { id: 'elements', kind: 'elements', label: 'Explore the element panel', description: 'Browse the building blocks you can drop onto any page' },
  { id: 'design',   kind: 'design',   label: 'Design your app',           description: 'Open the designer to tweak theme, colors, and fonts' },
  { id: 'ai',       kind: 'ai',       label: 'Continue with AI suggestion', description: 'Let me add a Schedule page and wire up real data', pageName: 'Schedule', pageIcon: 'Calendar' },
]

// The Lotus Yoga schedule with full-colour studio photos. Loaded as soon as
// the skeleton resolves so the list shows proper images right away.
const LOTUS_YOGA_CLASS_ITEMS = [
  { title: 'Vinyasa Flow',        description: 'Mon · 7:00 am · Maya Levin',   image: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=200&q=80' },
  { title: 'Yin & Restore',       description: 'Mon · 6:30 pm · Selin Aksoy',  image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=200&q=80' },
  { title: 'Power Vinyasa',       description: 'Tue · 7:00 am · Naomi Park',   image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=200&q=80' },
  { title: 'Breath & Meditation', description: 'Tue · 8:00 pm · Jonas Weiss',  image: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=200&q=80' },
  { title: 'Ashtanga Primary',    description: 'Wed · 6:30 am · Daniel Roque', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&q=80' },
  { title: 'Prenatal Flow',       description: 'Wed · 11:00 am · Priya Chen',  image: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=200&q=80' },
  { title: 'Slow Flow',           description: 'Sun · 9:30 am · Selin Aksoy',  image: 'https://images.unsplash.com/photo-1593810450967-f9c42742e326?w=200&q=80' },
]

const SparkleIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M18.5148 2.35852C18.3379 1.88049 17.6618 1.88049 17.4849 2.35852L17.2246 3.06208C16.8538 4.06401 16.0639 4.85397 15.062 5.22472L14.3584 5.48506C13.8804 5.66194 13.8804 6.33806 14.3584 6.51494L15.062 6.77528C16.0639 7.14603 16.8538 7.93599 17.2246 8.93792L17.4849 9.64148C17.6618 10.1195 18.3379 10.1195 18.5148 9.64148L18.7752 8.93792C19.1459 7.93599 19.9359 7.14603 20.9378 6.77528L21.6414 6.51494C22.1194 6.33806 22.1194 5.66194 21.6414 5.48506L20.9378 5.22472C19.9359 4.85397 19.1459 4.06401 18.7752 3.06208L18.5148 2.35852ZM7.73111 7.61379C8.08963 7.74646 8.08963 8.25354 7.73111 8.38621L7.20344 8.58146C6.45199 8.85952 5.85952 9.45199 5.58146 10.2034L5.38621 10.7311C5.25354 11.0896 4.74646 11.0896 4.61379 10.7311L4.41854 10.2034C4.14048 9.45199 3.54801 8.85952 2.79656 8.58146L2.26889 8.38621C1.91037 8.25354 1.91037 7.74646 2.26889 7.61379L2.79656 7.41854C3.54801 7.14048 4.14048 6.54801 4.41854 5.79656L4.61379 5.26889C4.74646 4.91037 5.25354 4.91037 5.38621 5.26889L5.58146 5.79656C5.85952 6.54801 6.45199 7.14048 7.20344 7.41854L7.73111 7.61379ZM17.4622 15.2276C18.1793 15.4929 18.1793 16.5071 17.4622 16.7724L16.4069 17.1629C14.904 17.719 13.719 18.904 13.1629 20.4069L12.7724 21.4622C12.5071 22.1793 11.4929 22.1793 11.2276 21.4622L10.8371 20.4069C10.281 18.904 9.09602 17.719 7.59312 17.1629L6.53778 16.7724C5.82074 16.5071 5.82074 15.4929 6.53778 15.2276L7.59312 14.8371C9.09602 14.281 10.281 13.096 10.8371 11.5931L11.2276 10.5378C11.4929 9.82074 12.5071 9.82074 12.7724 10.5378L13.1629 11.5931C13.719 13.096 14.904 14.281 16.4069 14.8371L17.4622 15.2276Z" fill="currentColor"/>
  </svg>
)

const ChevronRightIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const CloseIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export function VisibleAIOverlay() {
  const [stage, setStage] = useState<Stage>('idle')
  const [cursor, setCursor] = useState<Rect>(OFFSCREEN_CURSOR)
  const [halo, setHalo] = useState<Rect | null>(null)
  const [caption, setCaption] = useState<{ text: string; rect: Rect } | null>(null)
  const [greeting, setGreeting] = useState<string>('')
  const [suggestion, setSuggestion] = useState<{ step?: string; title?: string; text: string; actions: Suggestion[] } | null>(null)
  const [dataSourceOpen, setDataSourceOpen] = useState(false)
  const [tourPickerOpen, setTourPickerOpen] = useState(false)
  const [doneChip, setDoneChip] = useState<string | null>(null)
  const [glow, setGlow] = useState<Rect | null>(null)
  // Spotlight — dims the whole app except this rect (a "hole" cut out via a
  // huge box-shadow), so a tour step's target stays bright while the rest
  // recedes. Used behind step 1 of the element-panel tour.
  const [spotlight, setSpotlight] = useState<Rect | null>(null)
  // User-paced coachmark card — anchored beside the highlighted target, with
  // a step counter and Skip/Next so the user controls the pace (replaces the
  // auto-advancing caption pill on the element-panel tour).
  const [coach, setCoach] = useState<Coach | null>(null)
  // Clickable pulse beacon — a radar "ping" the user taps to open an area. It
  // sits BESIDE the target control (not over it), so the control stays fully
  // visible. Clicking it performs the action and advances the step.
  const [pointer, setPointer] = useState<{ x: number; y: number; hint?: string } | null>(null)
  // Paused tour — set when the user closes (✕) a step mid-tour. Instead of
  // ending, the tour collapses to a corner "resume" pill that remembers the
  // step so the user can pick the tour back up where they left off.
  const [paused, setPaused] = useState<{ step: number; total: number } | null>(null)
  // Track which suggestion is currently shown so onSuggestionPick knows what
  // to do on accept (Reserve / Continue / etc.).
  const suggestionModeRef = useRef<'continue-action' | 'explore-add' | null>(null)
  const stageRef = useRef<Stage>('idle')
  stageRef.current = stage
  // Resolver for the currently-shown coachmark — fulfilled when the user
  // clicks Continue / Back / closes (X).
  const coachResolveRef = useRef<((v: CoachAction) => void) | null>(null)
  // Resolver for the data-source picker — fulfilled with the chosen label.
  const dataPickResolveRef = useRef<((label: string) => void) | null>(null)
  // Resolver for the pointer hotspot — fulfilled when the user clicks it.
  const pointerResolveRef = useRef<(() => void) | null>(null)
  // Guards the list drop so the tour can never add the List more than once,
  // no matter how many times the Add step is re-entered (Back/Continue, Strict
  // Mode re-invocation, etc.).
  const listAddedRef = useRef(false)

  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

  // Shows a coachmark and resolves once the user advances, goes back, or
  // closes it, so the flow `await`s the user instead of a timer.
  const showCoach = (c: Coach) =>
    new Promise<CoachAction>((resolve) => {
      coachResolveRef.current = resolve
      setCoach(c)
    })

  const resolveCoach = (v: CoachAction) => {
    const r = coachResolveRef.current
    coachResolveRef.current = null
    setCoach(null)
    r?.(v)
  }

  // Places the pulse beacon at a point and resolves once the user clicks it —
  // the tour then performs the action it implies.
  const showPointer = (x: number, y: number, hint?: string) =>
    new Promise<void>((resolve) => {
      pointerResolveRef.current = resolve
      setPointer({ x, y, hint })
    })

  const resolvePointer = () => {
    const r = pointerResolveRef.current
    pointerResolveRef.current = null
    setPointer(null)
    r?.()
  }

  // A pointer-driven step: shows a step card plus a clickable pointer on the
  // target. Resolves 'go' when the user clicks the pointer, or the coach
  // action ('back' / 'close') if they use the card. Caller then performs the
  // open action implied by the pointer.
  const showPointerStep = async (
    rect: Rect,
    c: Omit<Coach, 'left' | 'top' | 'arrowTop' | 'arrowSide'>,
  ): Promise<'go' | CoachAction> => {
    // The beacon sits just to the RIGHT of the target, in open space, so the
    // control itself is never covered. The coach card anchors beside the
    // beacon and its arrow points back at it.
    const bx = rect.x + rect.w + 32
    const by = rect.y + rect.h / 2
    const beaconBox: Rect = { x: bx - 18, y: by - 18, w: 36, h: 36 }
    const pos = placeCoach(beaconBox, by)
    const result = await Promise.race<'go' | CoachAction>([
      showPointer(bx, by).then(() => 'go' as const),
      showCoach({ ...c, ...pos }),
    ])
    setPointer(null)
    pointerResolveRef.current = null
    setCoach(null)
    coachResolveRef.current = null
    return result
  }

  // Anchors the card to the right of the target (flips left if it would clip
  // the viewport), keeping the arrow pointed at `anchorY` on the target. The
  // arrow flips side to keep pointing at the target after a flip.
  const COACH_W = 360
  const placeCoach = (
    rect: Rect,
    anchorY: number,
  ): { left: number; top: number; arrowTop: number; arrowSide: 'left' | 'right' } => {
    const margin = 16
    const estH = 196
    let left = rect.x + rect.w + 14
    let arrowSide: 'left' | 'right' = 'left'
    if (left + COACH_W > window.innerWidth - margin) {
      left = Math.max(margin, rect.x - COACH_W - 14)
      arrowSide = 'right'
    }
    let top = anchorY - 28
    top = Math.max(margin, Math.min(top, window.innerHeight - estH - margin))
    const arrowTop = Math.max(18, Math.min(anchorY - top, estH - 28))
    return { left, top, arrowTop, arrowSide }
  }

  // Drops an already-targeted List element onto the canvas, plays the
  // skeleton → data beat, explains the loaded data, then opens the data-source
  // picker. Shared by the AI suggestion flow and the "Explore the element
  // panel" tour option.
  const runDropAndConnectList = useCallback(async (target: HTMLElement) => {
    // Click — drops the List on canvas through the real handler.
    setStage('clicking')
    await wait(280)
    target.click()
    setHalo(null)
    setCaption(null)
    await wait(450)

    // Immediately put the new list into skeleton state so it reads as
    // "loading" rather than fake placeholder rows.
    window.dispatchEvent(new CustomEvent('vai:configure-last-widget', {
      detail: {
        componentId: 'list',
        properties: { Skeleton: true, 'Skeleton Animation': 'Shimmer' },
      },
    }))

    // Cursor follows the new (skeleton) list onto the canvas.
    const canvas = document.querySelector<HTMLElement>('.build-page__canvas')
    if (canvas) {
      const placed = canvas.querySelectorAll<HTMLElement>('[data-component-id="list"]')
      const last = placed[placed.length - 1]
      if (last) {
        last.scrollIntoView({ behavior: 'smooth', block: 'center' })
        await wait(550)
        const r = last.getBoundingClientRect()
        setCursor({ x: r.left + 24, y: r.top + 24, w: 18, h: 24 })
      }
    }
    // Let the skeleton shimmer run briefly, then resolve it straight to the
    // real, full-colour class schedule — no grayscale placeholder pass.
    await wait(1500)
    setDoneChip('Loading classes…')
    window.dispatchEvent(new CustomEvent('vai:configure-last-widget', {
      detail: {
        componentId: 'list',
        items: LOTUS_YOGA_CLASS_ITEMS,
        properties: { Skeleton: false },
      },
    }))
    await wait(900)
    setDoneChip(null)
    await wait(250)

    // Step 1 — keep the cursor on the list and explain the data that just
    // loaded, instead of darting over to the right panel.
    setStage('cursor-traveling')
    let listEl: HTMLElement | null = null
    if (canvas) {
      const placedNow = canvas.querySelectorAll<HTMLElement>('[data-component-id="list"]')
      listEl = placedNow[placedNow.length - 1] ?? null
    }
    if (listEl) {
      listEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      await wait(450)
      const r = listEl.getBoundingClientRect()
      setCursor({ x: r.left + 24, y: r.top + 28, w: 18, h: 24 })
      setHalo({ x: r.x, y: r.y, w: r.width, h: r.height })
      setCaption({
        text: 'Each row is a class — with its title, time, and photo.',
        rect: { x: r.x, y: r.y, w: r.width, h: Math.min(r.height, 140) },
      })
      setStage('halo-target')
      await wait(2600)
      setCaption(null)
      setHalo(null)
      await wait(350)
    }

    // Step 2 — now offer the data-source picker.
    setStage('data-source')
    setDataSourceOpen(true)
    await wait(200)
    const firstOpt = document.querySelector<HTMLElement>('.vai-datasource__opt')
    if (firstOpt) {
      const r = firstOpt.getBoundingClientRect()
      setCursor({ x: r.left + 16, y: r.top + 20, w: 18, h: 24 })
    }
  }, [])

  const runAddListFlow = useCallback(async (pageName = 'Schedule', pageIcon = 'Calendar') => {
    // The AI cursor is the user's constant companion — never lift it off-screen
    // until the whole flow ends.

    // 0. Bring the cursor on-screen near canvas center so it's visible
    //    immediately when the copilot closes.
    const canvasEl0 = document.querySelector<HTMLElement>('.build-page__canvas')
    if (canvasEl0) {
      const cRect = canvasEl0.getBoundingClientRect()
      setCursor({
        x: cRect.left + cRect.width / 2 - 10,
        y: cRect.top + cRect.height * 0.55,
        w: 18,
        h: 24,
      })
    }
    setStage('cursor-traveling')

    // 1. Glide cursor to the bottom-nav "+ Add Page" button, hold a caption
    //    so the user understands the first move, then click.
    const addPageBtn = document.querySelector<HTMLElement>('.page-nav__add-page')
    if (addPageBtn) {
      const r = addPageBtn.getBoundingClientRect()
      setCursor({
        x: r.left + r.width / 2 - 2,
        y: r.top + r.height / 2 - 2,
        w: 18, h: 24,
      })
      setCaption({
        text: `First, I'll add a new page for the ${pageName}.`,
        rect: { x: r.left, y: r.top, w: r.width, h: r.height },
      })
      await wait(1700)
      setStage('clicking')
      await wait(280)
      window.dispatchEvent(new CustomEvent('vai:add-page', { detail: { name: pageName, icon: pageIcon } }))
      setCaption(null)
      await wait(700)
    }
    setStage('cursor-traveling')
    await wait(300)

    // 1b. Focus the freshly added (empty) page so the user reads where the
    //     content will land before the element panel slides open. BuildPage
    //     scrolls the new page into view ~120ms after vai:add-page, so wait
    //     long enough for that scroll to settle before measuring.
    await wait(450)
    const allPages = document.querySelectorAll<HTMLElement>('[data-page-id]')
    const newPageEl = allPages[allPages.length - 1]
    if (newPageEl) {
      newPageEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      await wait(450)
      const r = newPageEl.getBoundingClientRect()
      setCursor({
        x: r.left + r.width / 2 - 2,
        y: r.top + r.height * 0.45,
        w: 18, h: 24,
      })
      setHalo({ x: r.left, y: r.top, w: r.width, h: r.height })
      setCaption({
        text: `To show the weekly ${pageName} here, I'll add a list element.`,
        rect: { x: r.left, y: r.top, w: r.width, h: 120 },
      })
      setStage('halo-target')
      await wait(2000)
      setCaption(null)
      setHalo(null)
      await wait(300)
      setStage('cursor-traveling')
    }

    // 2. Open the element panel (the widget library on the left). Position
    //    the cursor so its pointer tip lands on the center of the + button.
    const addBtn = document.querySelector<HTMLElement>('.build-page__add-element-btn')
    if (addBtn && !document.querySelector('.build-page__left:not(.build-page__left--hidden)')) {
      const r = addBtn.getBoundingClientRect()
      // Pointer tip sits at (2, 2) inside the cursor SVG, so subtract that
      // from the target so the tip lands on the button's centre.
      setCursor({
        x: r.left + r.width / 2 - 2,
        y: r.top + r.height / 2 - 2,
        w: 18, h: 24,
      })
      await wait(1050)
      setStage('clicking')
      await wait(280)
      addBtn.click()
      await wait(550)
    }
    setStage('cursor-traveling')

    // 3. Locate the List item in the sidebar; cursor glides to it, halo + caption.
    const target =
      findByLabel(['List']) ??
      findByLabel(['Activity Schedule']) ??
      document.querySelector<HTMLElement>('.build-page__element-item')
    if (!target) {
      setStage('idle')
      return
    }
    const tRect = rectOf(target)
    setCursor({ x: tRect.x + 28, y: tRect.y + 18, w: 18, h: 24 })
    setCaption({ text: 'Perfect for showing classes', rect: tRect })
    setHalo(tRect)
    setStage('halo-target')
    // Wait for cursor glide + halo settling.
    await wait(1300)

    // 4–7. Drop the List, play the loading beat, and open the data picker.
    await runDropAndConnectList(target)
  }, [runDropAndConnectList])

  const runShowActionField = useCallback(async () => {
    setStage('cursor-traveling')

    // Tell BuildPage to flip the right-panel property tab to "Action".
    window.dispatchEvent(new CustomEvent('vai:set-property-tab', { detail: { tab: 'action' } }))
    await wait(450)

    // Locate the Action segmented control in the right panel.
    const propPanel = document.querySelector<HTMLElement>('.build-page__properties')
    let actionField: HTMLElement | null = null
    if (propPanel) {
      const fields = propPanel.querySelectorAll<HTMLElement>('.property-panel__field')
      fields.forEach((f) => {
        if (actionField) return
        const titles = f.querySelectorAll<HTMLElement>('*')
        for (const t of titles) {
          if (t.textContent?.trim() === 'Action' && t.children.length === 0) {
            actionField = f
            return
          }
        }
      })
      if (!actionField) actionField = (propPanel.querySelector<HTMLElement>('.property-panel__field'))
    }

    if (actionField) {
      ;(actionField as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' })
      await wait(450)
      const r = (actionField as HTMLElement).getBoundingClientRect()
      // Pointer tip rests on the field's left edge so the user reads the label.
      setCursor({ x: r.left + 18, y: r.top + 14, w: 18, h: 24 })
      setHalo({ x: r.x, y: r.y, w: r.width, h: r.height })
      await wait(2200)
      setHalo(null)
    }

    setStage('finished')
  }, [])

  // Helpers shared by the linear tour.
  const findListItem = () =>
    findByLabel(['List']) ?? document.querySelector<HTMLElement>('.build-page__element-item')
  const findCanvasList = () => {
    const canvas = document.querySelector<HTMLElement>('.build-page__canvas')
    const lists = canvas?.querySelectorAll<HTMLElement>('[data-component-id="list"]')
    return lists && lists.length ? lists[lists.length - 1] ?? null : null
  }

  // Step 3 "Add" branch — drops the List exactly once (guarded), plays the
  // skeleton → sample-data beat, lets the user pick a data source, then
  // highlights the connected data. Returns when done so the tour resumes.
  const runAddBranch = useCallback(async (listItem: HTMLElement | null) => {
    // 1. Add the List exactly once.
    const item = listItem ?? findListItem()
    if (item && !listAddedRef.current) {
      listAddedRef.current = true
      setHalo(null)
      setSpotlight(null)
      item.click()
      await wait(550)
    }

    // 2. Skeleton shimmer → resolve straight to the colour sample schedule.
    let listEl = findCanvasList()
    if (listEl) { listEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); await wait(500) }
    window.dispatchEvent(new CustomEvent('vai:configure-last-widget', {
      detail: { componentId: 'list', properties: { Skeleton: true, 'Skeleton Animation': 'Shimmer' } },
    }))
    await wait(1200)
    window.dispatchEvent(new CustomEvent('vai:configure-last-widget', {
      detail: { componentId: 'list', items: LOTUS_YOGA_CLASS_ITEMS, properties: { Skeleton: false } },
    }))
    await wait(500)

    // 3. Explain the sample data, then send the user to pick a real source.
    listEl = findCanvasList()
    if (listEl) {
      const r = listEl.getBoundingClientRect()
      setHalo({ x: r.x, y: r.y, w: r.width, h: r.height })
      setSpotlight({ x: r.x, y: r.y, w: r.width, h: r.height })
      const res = await showCoach({
        step: 3, total: 5,
        title: 'Your list is filled with sample data',
        body: 'It’s pre-filled so you can see the layout. Connect a data source to show your own classes.',
        actions: [{ label: 'Choose data', action: 'continue', primary: true }],
        ...placeCoach({ x: r.x, y: r.y, w: r.width, h: r.height }, r.y + 36),
      })
      setHalo(null); setSpotlight(null)
      if (res === 'close') return
    }

    // 4. Highlight the Data Source field in the right panel — no picker modal.
    //    The list is already selected, so its properties show; flip to General
    //    so the "Data Source" field is on screen.
    window.dispatchEvent(new CustomEvent('vai:set-property-tab', { detail: { tab: 'general' } }))
    await wait(500)
    const propPanel = document.querySelector<HTMLElement>('.build-page__properties')
    let dsField: HTMLElement | null = null
    if (propPanel) {
      const fields = Array.from(propPanel.querySelectorAll<HTMLElement>('.property-panel__field'))
      dsField =
        fields.find((f) =>
          Array.from(f.querySelectorAll<HTMLElement>('*')).some(
            (t) => t.children.length === 0 && t.textContent?.trim() === 'Data Source',
          ),
        ) ?? fields[0] ?? null
    }
    if (dsField) {
      dsField.scrollIntoView({ behavior: 'smooth', block: 'center' })
      await wait(450)
      const r = dsField.getBoundingClientRect()
      setHalo({ x: r.x, y: r.y, w: r.width, h: r.height })
      setSpotlight({ x: r.x, y: r.y, w: r.width, h: r.height })
      // No step counter — this is a continuation of the Add step.
      await showCoach({
        title: 'Choose your data source',
        body: 'Swap the sample data for a real table here — your list updates automatically.',
        actions: [{ label: 'Continue tour', action: 'continue', primary: true }],
        ...placeCoach({ x: r.x, y: r.y, w: r.width, h: r.height }, r.y + Math.min(r.height / 2, 40)),
      })
      setHalo(null); setSpotlight(null)
    }
  }, [])

  // The linear "Show me around" tour — stepped modals, no auto-opening. The
  // user clicks a pointer to open panels; the step advances on click.
  // `startStep` lets the resume pill re-enter the tour where the user left off.
  const runTour = useCallback(async (startStep = 1) => {
    setStage('halo-target')
    setSuggestion(null)
    setHalo(null)
    setCaption(null)
    setDoneChip(null)
    setGlow(null)
    setSpotlight(null)
    setPointer(null)
    setTourPickerOpen(false)
    setPaused(null)

    const clear = () => { setHalo(null); setSpotlight(null) }
    const TOTAL = 6
    // Closing (✕) any step pauses the tour at that step instead of ending it,
    // so the corner resume pill can offer to continue from here.
    const pauseAt = (s: number) => {
      clear(); setCaption(null); setPointer(null)
      setPaused({ step: s, total: TOTAL })
      setStage('paused')
    }
    let step = startStep

    while (step >= 1 && step <= TOTAL) {
      // ---- Step 1: you can add elements from here (pointer → open panel) ----
      if (step === 1) {
        window.dispatchEvent(new CustomEvent('vai:close-element-panel'))
        await wait(300)
        const addBtn = document.querySelector<HTMLElement>('.build-page__add-element-btn')
        if (!addBtn) { step = 2; continue }
        const r = rectOf(addBtn)
        const res = await showPointerStep(r, {
          step: 1, total: TOTAL,
          title: 'You can add elements from here',
          body: 'Click the pointer to open the element panel when you need app building blocks.',
          actions: [],
        })
        if (res === 'close') { pauseAt(1); return }
        // 'go' — open the panel and advance.
        window.dispatchEvent(new CustomEvent('vai:open-element-panel'))
        await wait(450)
        step = 2
        continue
      }

      // ---- Step 2: explore the element panel ----
      if (step === 2) {
        window.dispatchEvent(new CustomEvent('vai:open-element-panel'))
        await wait(250)
        const panel = document.querySelector<HTMLElement>('.build-page__left:not(.build-page__left--hidden)')
          ?? document.querySelector<HTMLElement>('.build-page__left')
        if (!panel) { step = 3; continue }
        const r = panel.getBoundingClientRect()
        setHalo({ x: r.x + 6, y: r.y + 6, w: r.width - 12, h: r.height - 12 })
        setSpotlight({ x: r.x, y: r.y, w: r.width, h: r.height })
        const res = await showCoach({
          step: 2, total: TOTAL,
          title: 'Explore the element panel',
          body: 'This panel contains the core building blocks for your app.',
          ...placeCoach({ x: r.x, y: r.y, w: r.width, h: r.height }, r.top + 96),
        })
        clear()
        if (res === 'close') { pauseAt(2); return }
        if (res === 'back') { step = 1; continue }
        step = 3
        continue
      }

      // ---- Step 3: choose the list element ----
      if (step === 3) {
        window.dispatchEvent(new CustomEvent('vai:open-element-panel'))
        await wait(200)
        const target = findListItem()
        if (!target) { setStage('finished'); return }
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        await wait(350)
        const tRect = rectOf(target)
        setHalo(tRect)
        setSpotlight(tRect)
        const res = await showCoach({
          step: 3, total: TOTAL,
          title: 'Choose the list element',
          body: 'A List shows a scrollable set of items — perfect for your classes, teachers, or events.',
          ...placeCoach(tRect, tRect.y + tRect.h / 2),
        })
        clear()
        if (res === 'close') { pauseAt(3); return }
        if (res === 'back') { step = 2; continue }
        step = 4
        continue
      }

      // ---- Step 4: add a list element? (question) ----
      if (step === 4) {
        window.dispatchEvent(new CustomEvent('vai:open-element-panel'))
        await wait(200)
        const target = findListItem()
        const tRect = target ? rectOf(target) : { x: 80, y: 160, w: 240, h: 56 }
        if (target) { setHalo(tRect); setSpotlight(tRect) }
        const res = await showCoach({
          step: 4, total: TOTAL,
          title: 'Add a list element?',
          body: 'Add it now to see real data in action, or keep the tour going and add it later.',
          actions: [
            { label: 'Add a list', action: 'add' },
            { label: 'Continue tour', action: 'continue', primary: true },
          ],
          ...placeCoach(tRect, tRect.y + tRect.h / 2),
        })
        if (res === 'close') { pauseAt(4); return }
        if (res === 'back') { clear(); step = 3; continue }
        if (res === 'continue') { clear(); step = 5; continue }
        // res === 'add' → run the add branch, then resume at step 5.
        clear()
        await runAddBranch(target)
        step = 5
        continue
      }

      // ---- Step 5: customize the app design (pointer → open designer) ----
      if (step === 5) {
        window.dispatchEvent(new CustomEvent('vai:close-element-panel'))
        await wait(300)
        const designBtn = document.querySelector<HTMLElement>('.build-page__design-btn')
        if (!designBtn) {
          window.dispatchEvent(new CustomEvent('vai:open-design-panel'))
          await wait(500)
          step = 6
          continue
        }
        const r = rectOf(designBtn)
        const res = await showPointerStep(r, {
          step: 5, total: TOTAL,
          title: 'Customize the app design',
          body: 'Click the pointer to open the designer and tune your theme, colors, and fonts.',
          actions: [{ label: 'Back', action: 'back' }],
        })
        if (res === 'close') { pauseAt(5); return }
        if (res === 'back') { step = 4; continue }
        // 'go' — open the designer and advance.
        window.dispatchEvent(new CustomEvent('vai:open-design-panel'))
        await wait(600)
        step = 6
        continue
      }

      // ---- Step 6: create widgets with Podo AI (Widgets tab) ----
      window.dispatchEvent(new CustomEvent('vai:open-element-panel', { detail: { tab: 'widgets' } }))
      await wait(400)
      const aiCard = document.querySelector<HTMLElement>('.build-page__element-item--ai')
      if (aiCard) { aiCard.scrollIntoView({ behavior: 'smooth', block: 'center' }); await wait(350) }
      const aiRect = aiCard ? rectOf(aiCard) : { x: 80, y: 120, w: 240, h: 56 }
      if (aiCard) { setHalo(aiRect); setSpotlight(aiRect) }
      const res6 = await showCoach({
        step: 6, total: TOTAL,
        title: 'Create widgets with Podo AI',
        body: 'Describe what you need and Podo builds a custom widget for you — no setup required.',
        actions: [
          { label: 'Back', action: 'back' },
          { label: 'Finish', action: 'continue', primary: true },
        ],
        ...placeCoach(aiRect, aiRect.y + aiRect.h / 2),
      })
      clear()
      if (res6 === 'back') { step = 5; continue }
      if (res6 === 'close') { pauseAt(6); return }
      // Finish — the tour is complete; drop any paused state.
      setPaused(null)
      setStage('finished')
      return
    }
  }, [runAddBranch])

  // Tour option 2 — "Design your app". Opens the App Designer panel and
  // halos it so the user sees where theme, colors, and fonts are tuned.
  const runOpenDesignPanel = useCallback(async () => {
    setStage('cursor-traveling')
    setSuggestion(null)
    setHalo(null)
    setCaption(null)
    setDoneChip(null)
    setGlow(null)

    const designBtn = document.querySelector<HTMLElement>('.build-page__design-btn')
    if (designBtn) {
      const r = designBtn.getBoundingClientRect()
      setCursor({ x: r.left + r.width / 2 - 2, y: r.top + r.height / 2 - 2, w: 18, h: 24 })
      await wait(950)
      setStage('clicking')
      await wait(280)
    }
    window.dispatchEvent(new CustomEvent('vai:open-design-panel'))
    setStage('cursor-traveling')
    await wait(650)

    const designPanel = document.querySelector<HTMLElement>('.build-page__right')
    if (designPanel) {
      const r = designPanel.getBoundingClientRect()
      setCursor({ x: r.left + 28, y: r.top + 90, w: 18, h: 24 })
      setHalo({ x: r.x + 8, y: r.y + 8, w: r.width - 16, h: 180 })
      setCaption({ text: 'Tune your theme, colors, and fonts here', rect: { x: r.x, y: r.y, w: r.width, h: 180 } })
      setStage('halo-target')
      await wait(2600)
      setHalo(null)
      setCaption(null)
    }
    setStage('finished')
  }, [])

  // Close (X) on the tour picker — user opts out of the walkthrough entirely.
  const onTourPickerClose = () => {
    setTourPickerOpen(false)
    setHalo(null)
    setCaption(null)
    setGlow(null)
    setSpotlight(null)
    setStage('finished')
    setCursor(OFFSCREEN_CURSOR)
  }

  const onTourPick = (opt: TourOption) => {
    setTourPickerOpen(false)
    if (opt.kind === 'elements') {
      void runTour()
    } else if (opt.kind === 'design') {
      void runOpenDesignPanel()
    } else {
      void runAddListFlow(opt.pageName, opt.pageIcon)
    }
  }

  const onSuggestionPick = (accept: boolean) => {
    const mode = suggestionModeRef.current
    setSuggestion(null)

    if (mode === 'explore-add') {
      suggestionModeRef.current = null
      if (accept) {
        // "Add" — drop the highlighted List and continue into the data flow.
        const target = findByLabel(['List']) ?? document.querySelector<HTMLElement>('.build-page__element-item')
        if (target) {
          void runDropAndConnectList(target)
        } else {
          setHalo(null)
          setStage('finished')
        }
      } else {
        // "Next" — back to the tour menu so the user can try another path.
        setHalo(null)
        setCaption(null)
        setStage('cursor-traveling')
        setTourPickerOpen(true)
      }
      return
    }

    if (!accept) {
      suggestionModeRef.current = null
      setStage('finished')
      return
    }
    if (mode === 'continue-action') {
      suggestionModeRef.current = null
      // Clear the glow before moving to the action tab.
      setGlow(null)
      void runShowActionField()
      return
    }
    void runShowActionField()
  }

  // Close (X) on the Podo suggestion card — dismiss and end the flow.
  const onSuggestionClose = () => {
    suggestionModeRef.current = null
    setSuggestion(null)
    setHalo(null)
    setCaption(null)
    setGlow(null)
    setStage('finished')
  }

  // The user picked a data source — resolve the awaiting tour step. The
  // connect animation + data highlight live in the tour's Add branch.
  const onDataSourcePick = (label: string) => {
    setDataSourceOpen(false)
    const r = dataPickResolveRef.current
    dataPickResolveRef.current = null
    r?.(label)
  }

  // Explainer that runs after a Dynamic Page is auto-created.
  const runExplainDynamicPage = useCallback(async () => {
    setStage('cursor-traveling')
    setSuggestion(null)
    setHalo(null)
    setCaption(null)
    setDoneChip(null)
    setDataSourceOpen(false)

    // Wait for the new page to render and scroll position to settle.
    await wait(550)
    const canvas = document.querySelector<HTMLElement>('.build-page__canvas')
    const heading = canvas?.querySelector<HTMLElement>('[data-component-id="heading"]') ?? null
    const image = canvas?.querySelector<HTMLElement>('[data-component-id="image"]') ?? null

    // Don't re-scroll — the BuildPage just landed us on this page. Just glide
    // the cursor around to point at things.
    if (heading) {
      const r = heading.getBoundingClientRect()
      setCursor({ x: r.left + 22, y: r.top + 8, w: 18, h: 24 })
      setHalo({ x: r.x, y: r.y, w: r.width, h: r.height })
      setCaption({
        text: 'Title is auto-mapped from each row',
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      })
      setStage('halo-target')
      await wait(2200)
      setCaption(null)
      setHalo(null)
    }

    if (image) {
      const r = image.getBoundingClientRect()
      setCursor({ x: r.left + 22, y: r.top + 8, w: 18, h: 24 })
      setHalo({ x: r.x, y: r.y, w: r.width, h: r.height })
      setCaption({
        text: 'Image pulls from the row\u2019s photo',
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      })
      await wait(2200)
      setCaption(null)
      setHalo(null)
    }

    setStage('suggesting')
    setSuggestion({
      title: 'Your dynamic page is ready',
      text: 'This Dynamic Page is bound to your class list — every class students tap opens here with the right title, image, and description. No need to build a page per class.',
      actions: [{ label: 'Got it' }],
    })
  }, [])

  // External trigger — Copilot suggestion card dispatches this event
  useEffect(() => {
    const onStart = () => {
      setGreeting('')
      setSuggestion(null)
      setHalo(null)
      setGlow(null)
      setCaption(null)
      setDoneChip(null)
      setDataSourceOpen(false)
      setSpotlight(null)
      setPointer(null)
      setCursor(OFFSCREEN_CURSOR)
      // Reset the once-only list guard for a fresh run, then go straight into
      // the linear stepped tour (no picker).
      listAddedRef.current = false
      void runTour()
    }
    const onOpenDataPicker = () => {
      setGreeting('')
      setStage('data-source')
      setDataSourceOpen(true)
    }
    const onExplainDynamic = () => {
      void runExplainDynamicPage()
    }
    window.addEventListener('vai:start-list-flow', onStart)
    window.addEventListener('vai:open-data-picker', onOpenDataPicker)
    window.addEventListener('vai:explain-dynamic-page', onExplainDynamic)
    return () => {
      window.removeEventListener('vai:start-list-flow', onStart)
      window.removeEventListener('vai:open-data-picker', onOpenDataPicker)
      window.removeEventListener('vai:explain-dynamic-page', onExplainDynamic)
    }
  }, [runTour, runExplainDynamicPage])

  // Reset on Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setStage('idle')
        setGreeting('')
        setSuggestion(null)
        setHalo(null)
        setGlow(null)
        setCaption(null)
        setDoneChip(null)
        setDataSourceOpen(false)
        setTourPickerOpen(false)
        setSpotlight(null)
        setPointer(null)
        setPaused(null)
        setCursor(OFFSCREEN_CURSOR)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <div className="vai-overlay" aria-hidden={stage === 'idle'}>
        {/* Very light scrim behind the "What would you like to do next?"
            picker so it reads as a focused choice while the app stays visible. */}
        {tourPickerOpen && <div className="vai-scrim" />}

        {/* Spotlight — dims everything except the target rect (step 1) */}
        {spotlight && (
          <div
            className="vai-spotlight"
            style={{
              left: spotlight.x - 4,
              top: spotlight.y - 4,
              width: spotlight.w + 8,
              height: spotlight.h + 8,
            }}
          />
        )}

        {/* Halo over target element */}
        {halo && (
          <div
            className="vai-halo"
            style={{
              left: halo.x - 8,
              top: halo.y - 8,
              width: halo.w + 16,
              height: halo.h + 16,
            }}
          />
        )}

        {/* Solid glow pulse around the connected list — no dashed border. */}
        {glow && (
          <div
            className="vai-glow"
            style={{
              left: glow.x - 4,
              top: glow.y - 4,
              width: glow.w + 8,
              height: glow.h + 8,
            }}
          />
        )}

        {/* Caption bubble — anchored above halo */}
        {caption && (
          <div
            className="vai-caption"
            style={{
              left: caption.rect.x + caption.rect.w / 2,
              top: caption.rect.y - 14,
            }}
          >
            <span className="vai-caption__spark" />
            <span>{caption.text}</span>
            <span className="vai-caption__tail" />
          </div>
        )}

        {/* Coachmark — stepped tour modal anchored beside the halo'd target */}
        {coach && (
          <div className="vai-coach" style={{ left: coach.left, top: coach.top }}>
            <span className={`vai-coach__arrow vai-coach__arrow--${coach.arrowSide ?? 'left'}`} style={{ top: coach.arrowTop }} />
            <div className="vai-coach__head">
              <img className="vai-coach__avatar" src={podoAvatar} alt="" />
              <div className="vai-coach__heading">
                {coach.step != null && coach.total != null && (
                  <span className="vai-coach__eyebrow">Step {coach.step}/{coach.total}</span>
                )}
                <p className="vai-coach__title">{coach.title}</p>
              </div>
              <button
                type="button"
                className="vai-coach__close"
                aria-label="Close tour"
                onClick={() => resolveCoach('close')}
              >
                <CloseIcon size={20} />
              </button>
            </div>
            <p className="vai-coach__body">{coach.body}</p>
            {(() => {
              const btns = coach.actions ?? [
                { label: 'Back', action: 'back' as const },
                { label: 'Continue', action: 'continue' as const, primary: true },
              ]
              // No buttons (e.g. pointer-driven steps) → no divider/footer.
              if (btns.length === 0) return null
              return (
                <>
                  <div className="vai-coach__divider" />
                  <div className="vai-coach__footer">
                    {btns.map((b) => (
                      <button
                        key={b.action + b.label}
                        type="button"
                        className={b.primary ? 'vai-coach__continue' : 'vai-coach__back'}
                        onClick={() => resolveCoach(b.action)}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </>
              )
            })()}
          </div>
        )}

        {/* Clickable pulse beacon — radar "ping" sitting beside the target; the
            user taps it to open the area + advance. It never sits over the
            control, so the control's icon/label stays fully visible. */}
        {pointer && (
          <button
            type="button"
            className="vai-pointer"
            style={{ left: pointer.x, top: pointer.y }}
            onClick={resolvePointer}
            aria-label={pointer.hint ?? 'Open'}
          >
            <span className="vai-pointer__ping" />
            <span className="vai-pointer__ping vai-pointer__ping--2" />
            <span className="vai-pointer__dot" />
          </button>
        )}

        {/* Greeting / status banner — center top */}
        {greeting && (
          <div className="vai-greeting">
            <span className="vai-greeting__avatar" />
            <span>{greeting}</span>
          </div>
        )}

        {/* Suggestion popover with action buttons */}
        {suggestion && (
          <div className="vai-suggestion">
            <div className="vai-suggestion__header">
              <span className="vai-suggestion__brand">
                <img className="vai-suggestion__avatar" src={podoAvatar} alt="" />
                <span className="vai-suggestion__eyebrow">Podo suggests</span>
              </span>
              <span className="vai-suggestion__head-right">
                {suggestion.step && <span className="vai-suggestion__step">{suggestion.step}</span>}
                <button
                  type="button"
                  className="vai-suggestion__close"
                  aria-label="Dismiss"
                  onClick={onSuggestionClose}
                >
                  <CloseIcon />
                </button>
              </span>
            </div>
            {suggestion.title && <p className="vai-suggestion__title">{suggestion.title}</p>}
            <p className="vai-suggestion__text">{suggestion.text}</p>
            <div className="vai-suggestion__actions">
              {suggestion.actions.map((a) => (
                <button
                  key={a.label}
                  className={`vai-suggestion__btn${a.accept ? ' vai-suggestion__btn--primary' : ''}`}
                  onClick={() => onSuggestionPick(Boolean(a.accept))}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Data source picker — user choice moment */}
        {tourPickerOpen && (
          <div className="vai-datasource">
            <div className="vai-datasource__header">
              <span className="vai-datasource__avatar" aria-hidden="true"><img src={podoAvatar} alt="" /></span>
              <div>
                <div className="vai-datasource__title">What would you like to do next?</div>
                <div className="vai-datasource__sub">Pick a path and I&rsquo;ll walk you through it.</div>
              </div>
              <button
                type="button"
                className="vai-datasource__close"
                aria-label="Close tour"
                onClick={onTourPickerClose}
              >
                <CloseIcon />
              </button>
            </div>
            <div className="vai-datasource__list">
              {TOUR_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  className="vai-datasource__opt"
                  onClick={() => onTourPick(opt)}
                >
                  <div>
                    <div className="vai-datasource__opt-name">
                      {opt.label}
                      {opt.kind === 'ai' && <span className="vai-datasource__badge">AI pick</span>}
                    </div>
                    <div className="vai-datasource__opt-sub">{opt.description}</div>
                  </div>
                  <span className="vai-datasource__arrow" aria-hidden="true"><ChevronRightIcon /></span>
                </button>
              ))}
            </div>
          </div>
        )}

        {dataSourceOpen && (
          <div className="vai-datasource">
            <div className="vai-datasource__header">
              <span className="vai-datasource__avatar" aria-hidden="true"><img src={podoAvatar} alt="" /></span>
              <div>
                <div className="vai-datasource__title">Pick a data source</div>
                <div className="vai-datasource__sub">You decide which classes show up here.</div>
              </div>
              <span className="vai-datasource__step">Step 3/5</span>
            </div>
            <div className="vai-datasource__list">
              {[
                { name: 'Lotus Yoga · Class Schedule', sub: '7 classes · synced from your studio calendar', recommended: true },
                { name: 'New empty table', sub: 'Start fresh and add rows manually' },
              ].map((opt) => (
                <button
                  key={opt.name}
                  className="vai-datasource__opt"
                  onClick={() => onDataSourcePick(opt.name)}
                >
                  <div>
                    <div className="vai-datasource__opt-name">
                      {opt.name}
                      {opt.recommended && <span className="vai-datasource__badge">AI pick</span>}
                    </div>
                    <div className="vai-datasource__opt-sub">{opt.sub}</div>
                  </div>
                  <span className="vai-datasource__arrow" aria-hidden="true"><ChevronRightIcon /></span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action chip — floats near cursor */}
        {doneChip && (
          <div
            className={`vai-chip${doneChip.includes('✓') ? ' vai-chip--done' : ''}`}
            style={{ transform: `translate(${cursor.x + 24}px, ${cursor.y - 24}px)` }}
          >
            <span className="vai-chip__dot" />
            <span>{doneChip}</span>
          </div>
        )}

        {/* Resume pill — shown after the user closes a step mid-tour. Collapses
            the tour to the corner and lets them continue where they left off. */}
        {paused && (
          <div className="vai-resume" role="status">
            <button
              type="button"
              className="vai-resume__card"
              onClick={() => { void runTour(paused.step) }}
            >
              <div className="vai-resume__row">
                <img className="vai-resume__avatar" src={podoAvatar} alt="" />
                <span className="vai-resume__text">
                  <span className="vai-resume__title">Tour paused</span>
                  <span className="vai-resume__step">Step {paused.step} of {paused.total}</span>
                </span>
                <span className="vai-resume__cta">Resume<ChevronRightIcon size={15} /></span>
              </div>
              <span className="vai-resume__bar" aria-hidden="true">
                <span
                  className="vai-resume__bar-fill"
                  style={{ width: `${Math.round((paused.step / paused.total) * 100)}%` }}
                />
              </span>
            </button>
          </div>
        )}
      </div>
    </>
  )
}
