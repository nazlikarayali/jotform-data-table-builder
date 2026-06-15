import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@jf/design-system'

export type FieldKind = 'text' | 'tag' | 'date'

export interface RichTextFieldOption {
  value: string
  label: string
  /** Drives which icon the chip and menu show. Defaults to 'text'. */
  kind?: FieldKind
}

interface RichTextFieldProps {
  /** Stored HTML string (may contain inline field chips). */
  value: string
  onChange: (html: string) => void
  maxLength?: number
  placeholder?: string
  /** Insertable data fields, shown in the "Add field" menu. */
  fields?: RichTextFieldOption[]
  /** When the value is empty, seed the editor with these fields joined by " · ". */
  seedFields?: RichTextFieldOption[]
}

type Cmd = 'bold' | 'italic' | 'underline'

// Zero-width space — placed around chips so the caret can land before/after a
// contenteditable="false" element even when no real text neighbours it.
const ZWSP = '​'

// Per-kind chip icon: text → type-square ("T"), tag → tags, date → calendar.
// SVGs embedded as raw markup because the chip lives inside a contenteditable
// (an async <Icon /> would jitter on every edit).
const FIELD_ICONS: Record<FieldKind, { name: string; category: string; svg: string }> = {
  text: {
    name: 'type-square-filled',
    category: 'editor',
    svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5 2C3.34315 2 2 3.34315 2 5V19C2 20.6569 3.34315 22 5 22H19C20.6569 22 22 20.6569 22 19V5C22 3.34315 20.6569 2 19 2H5ZM17 8C17.5523 8 18 7.55228 18 7C18 6.44772 17.5523 6 17 6H12H7C6.44771 6 6 6.44772 6 7C6 7.55228 6.44771 8 7 8H11V17C11 17.5523 11.4477 18 12 18C12.5523 18 13 17.5523 13 17V8H17Z" fill="currentColor"/></svg>',
  },
  tag: {
    name: 'tags-filled',
    category: 'finance',
    svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M4.25 2C4.25 1.44772 4.69772 1 5.25 1H11.1716C11.9672 1 12.7303 1.31607 13.2929 1.87868L22.7071 11.2929C23.0976 11.6834 23.0976 12.3166 22.7071 12.7071C22.3166 13.0976 21.6834 13.0976 21.2929 12.7071L11.8787 3.29289C11.6911 3.10536 11.4368 3 11.1716 3H5.25C4.69772 3 4.25 2.55228 4.25 2ZM5 4.5C3.34315 4.5 2 5.84315 2 7.5V11.1713C2 11.967 2.31606 12.73 2.87866 13.2926L11.4116 21.8257C12.9737 23.3879 15.5063 23.3879 17.0684 21.8258L19.8258 19.0684C21.3879 17.5063 21.3879 14.9737 19.8258 13.4116L11.7929 5.37868C11.2303 4.81607 10.4672 4.5 9.67157 4.5H5Z" fill="currentColor"/></svg>',
  },
  date: {
    name: 'calendar-filled',
    category: 'time-date',
    svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M8 1C8.55229 1 9 1.44772 9 2V3H15V2C15 1.44772 15.4477 1 16 1C16.5523 1 17 1.44772 17 2V3H19C20.6569 3 22 4.34315 22 6V20C22 21.6569 20.6569 23 19 23H5C3.34315 23 2 21.6569 2 20V6C2 4.34315 3.34315 3 5 3H7V2C7 1.44772 7.44772 1 8 1ZM20 9V6C20 5.44772 19.5523 5 19 5H17V6C17 6.55228 16.5523 7 16 7C15.4477 7 15 6.55228 15 6V5H9V6C9 6.55228 8.55229 7 8 7C7.44772 7 7 6.55228 7 6V5H5C4.44772 5 4 5.44772 4 6V9H20Z" fill="currentColor"/></svg>',
  },
}

function chipIconSvg(kind: FieldKind = 'text'): string {
  return FIELD_ICONS[kind].svg
}

// Small curated emoji set for the inline picker.
const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😎', '🤩',
  '👍', '🙏', '🔥', '✨', '🎉', '🎊', '💡', '⭐',
  '❤️', '💜', '💚', '💙', '👾', '🪀', '🙆', '🚀',
]

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function chipHtml(field: RichTextFieldOption): string {
  return (
    `<span class="jf-field-chip jf-field-chip--inline" contenteditable="false"` +
    ` data-field-value="${escapeHtml(field.value)}" data-field-kind="${field.kind ?? 'text'}">` +
    `<span class="jf-field-chip__icon">${chipIconSvg(field.kind)}</span>` +
    `<span class="jf-field-chip__label">${escapeHtml(field.label)}</span>` +
    `</span>${ZWSP}`
  )
}

/**
 * Visible characters that count against maxLength — free text only. Field chips
 * are excluded (the reference shows chips present while the counter stays at 0).
 */
function textLength(html: string): number {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  tmp.querySelectorAll('.jf-field-chip').forEach((el) => el.remove())
  return (tmp.textContent || '').replace(/​/g, '').length
}

/**
 * This field previously stored FieldComposer token JSON (e.g. `[{"type":"field",…}]`).
 * Rendering that as innerHTML dumps raw JSON into the editor — treat it as empty.
 */
function sanitize(value: string): string {
  const trimmed = value.trim()
  if (trimmed.startsWith('[') && trimmed.includes('"type"')) return ''
  return value
}

function seedHtml(fields: RichTextFieldOption[]): string {
  return ZWSP + fields.map(chipHtml).join('<span class="rich-text-field__sep"> · </span>')
}

export function RichTextField({
  value,
  onChange,
  maxLength = 240,
  placeholder = '',
  fields = [],
  seedFields,
}: RichTextFieldProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const addBtnRef = useRef<HTMLButtonElement>(null)
  const emojiBtnRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const seededRef = useRef(false)
  // The HTML we last sent up via onChange. The value-sync effect skips its DOM
  // write when the incoming value matches this — otherwise re-writing innerHTML
  // on our own edits resets the caret and drops in-flight typing (e.g. new lines).
  const lastEmittedRef = useRef<string | null>(null)
  const [active, setActive] = useState<Record<Cmd, boolean>>({ bold: false, italic: false, underline: false })
  const [count, setCount] = useState(() => textLength(sanitize(value)))
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [fieldsOpen, setFieldsOpen] = useState(false)
  const [pos, setPos] = useState<CSSProperties>({})
  const [fieldsPos, setFieldsPos] = useState<CSSProperties>({})

  // Sync the editor DOM only for EXTERNAL value changes (e.g. switching the
  // selected element). When the incoming value is the one we just emitted, the
  // DOM is already correct — touching innerHTML would reset the caret and lose
  // in-flight typing. On first mount with an empty value, seed the field chips.
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    if (value === lastEmittedRef.current) return // our own edit — leave the DOM/caret alone

    let next = sanitize(value)
    // Already seeded but the incoming value is still empty (stale prop before our
    // seed emit propagated, incl. React StrictMode's double effect run) — keep the
    // seeded chips in the DOM instead of wiping them.
    if (!next && seededRef.current) return
    let seeded = false
    if (!next && !seededRef.current && seedFields && seedFields.length) {
      next = seedHtml(seedFields)
      seededRef.current = true
      seeded = true
    }
    if (el.innerHTML !== next) {
      el.innerHTML = next
      setCount(textLength(next))
    }
    if (seeded) {
      lastEmittedRef.current = next
      onChange(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const refreshActive = () => {
    setActive({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
    })
  }

  const emit = () => {
    const el = editorRef.current
    if (!el) return
    const html = el.innerHTML
    lastEmittedRef.current = html
    setCount(textLength(html))
    onChange(html)
  }

  const exec = (cmd: Cmd) => {
    editorRef.current?.focus()
    document.execCommand(cmd)
    refreshActive()
    emit()
  }

  const handleInput = () => {
    const el = editorRef.current
    if (!el) return
    if (textLength(el.innerHTML) > maxLength) document.execCommand('undo')
    emit()
  }

  const insertEmoji = (emoji: string) => {
    const el = editorRef.current
    if (!el) return
    el.focus()
    if (textLength(el.innerHTML) + emoji.length > maxLength) return
    document.execCommand('insertText', false, emoji)
    setEmojiOpen(false)
    emit()
  }

  const insertField = (field: RichTextFieldOption) => {
    const el = editorRef.current
    if (!el) return
    el.focus()
    // Chips don't count toward maxLength, so no budget check needed.
    document.execCommand('insertHTML', false, chipHtml(field))
    setFieldsOpen(false)
    emit()
  }

  // Position a popover above its trigger button.
  function usePopoverPos(open: boolean, btnRef: React.RefObject<HTMLButtonElement | null>, set: (p: CSSProperties) => void) {
    useEffect(() => {
      if (!open) return
      const btn = btnRef.current
      if (!btn) return
      const update = () => {
        const r = btn.getBoundingClientRect()
        set({ position: 'fixed', top: r.top - 8, left: r.left, transform: 'translateY(-100%)', zIndex: 1000 })
      }
      update()
      window.addEventListener('resize', update)
      window.addEventListener('scroll', update, true)
      return () => {
        window.removeEventListener('resize', update)
        window.removeEventListener('scroll', update, true)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])
  }
  usePopoverPos(emojiOpen, emojiBtnRef, setPos)
  usePopoverPos(fieldsOpen, addBtnRef, setFieldsPos)

  // Close popovers on outside click.
  useEffect(() => {
    if (!emojiOpen && !fieldsOpen) return
    const handle = (e: MouseEvent) => {
      const t = e.target as Node
      if (popoverRef.current?.contains(t) || emojiBtnRef.current?.contains(t) || addBtnRef.current?.contains(t)) return
      setEmojiOpen(false)
      setFieldsOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [emojiOpen, fieldsOpen])

  const overLimit = count > maxLength

  return (
    <div className="rich-text-field">
      <div
        ref={editorRef}
        className={`rich-text-field__editor${count === 0 ? ' is-empty' : ''}`}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={handleInput}
        onKeyUp={refreshActive}
        onMouseUp={refreshActive}
        onFocus={refreshActive}
      />
      <div className={`rich-text-field__count${overLimit ? ' is-over' : ''}`}>
        {count}/{maxLength}
      </div>
      <div className="rich-text-field__toolbar">
        <button
          type="button"
          className={`rich-text-field__btn${active.bold ? ' is-active' : ''}`}
          aria-label="Bold"
          aria-pressed={active.bold}
          onMouseDown={(e) => { e.preventDefault(); exec('bold') }}
        >
          <Icon name="bold" category="editor" size={18} />
        </button>
        <button
          type="button"
          className={`rich-text-field__btn${active.italic ? ' is-active' : ''}`}
          aria-label="Italic"
          aria-pressed={active.italic}
          onMouseDown={(e) => { e.preventDefault(); exec('italic') }}
        >
          <Icon name="italic" category="editor" size={18} />
        </button>
        <button
          type="button"
          className={`rich-text-field__btn${active.underline ? ' is-active' : ''}`}
          aria-label="Underline"
          aria-pressed={active.underline}
          onMouseDown={(e) => { e.preventDefault(); exec('underline') }}
        >
          <Icon name="underline" category="editor" size={18} />
        </button>

        <span className="rich-text-field__divider" />

        <button
          type="button"
          ref={emojiBtnRef}
          className={`rich-text-field__btn${emojiOpen ? ' is-active' : ''}`}
          aria-label="Insert emoji"
          aria-expanded={emojiOpen}
          onMouseDown={(e) => { e.preventDefault(); setFieldsOpen(false); setEmojiOpen((v) => !v) }}
        >
          <Icon name="shapes-filled" category="general" size={18} />
        </button>

        {fields.length > 0 && (
          <button
            type="button"
            ref={addBtnRef}
            className={`rich-text-field__add${fieldsOpen ? ' is-active' : ''}`}
            aria-label="Add field"
            aria-expanded={fieldsOpen}
            onMouseDown={(e) => { e.preventDefault(); setEmojiOpen(false); setFieldsOpen((v) => !v) }}
          >
            <Icon name="plus-circle" category="general" size={20} />
          </button>
        )}
      </div>

      {emojiOpen && createPortal(
        <div ref={popoverRef} className="rich-text-field__emoji-popover" style={pos}>
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="rich-text-field__emoji"
              onMouseDown={(e) => { e.preventDefault(); insertEmoji(emoji) }}
            >
              {emoji}
            </button>
          ))}
        </div>,
        document.body,
      )}

      {fieldsOpen && createPortal(
        <div ref={popoverRef} className="rich-text-field__field-menu" style={fieldsPos}>
          {fields.map((f) => (
            <button
              key={f.value}
              type="button"
              className="rich-text-field__field-item"
              onMouseDown={(e) => { e.preventDefault(); insertField(f) }}
            >
              <Icon name={FIELD_ICONS[f.kind ?? 'text'].name} category={FIELD_ICONS[f.kind ?? 'text'].category} size={18} />
              <span>{f.label}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  )
}
