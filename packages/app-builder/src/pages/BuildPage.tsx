import { useState, useEffect, useLayoutEffect, useCallback, useRef, useContext, createContext, memo, Fragment, type CSSProperties, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'
import {
  ComponentRegistry,
  AppHeader,
  AppDesigner,
  applyStoredOrDefaultTheme,
  BottomNavigation,
  AttributionBar,
  Button as AppButton,
  EmptyState,
  BottomSheet,
  AppIcon,
  CollectionsProvider,
  CartProvider,
  FavoritesProvider,
  FormSheet,
  compressImageFile,
  compressImageFiles,
  type RegisteredComponent,
  type VariantValues,
  type PropertyValues,
  type StateValues,
  HsvColorPicker,
} from '@jf/app-elements'
import { Icon, Button as DSButton, SearchInput, Tabs as DSTabs, Segmented, Input as DSInput, Toggle as DSToggle, NumberInput as DSNumberInput, FormField as DSFormField, TextArea as DSTextArea, DropdownSingle as DSDropdownSingle, FieldMapper as DSFieldMapper, FieldComposer as DSFieldComposer, type FieldToken, Link as DSLink, Modal as DSModal, SearchInput as DSSearchInput, ColorInput as DSColorInput, Checkbox as DSCheckbox } from '@jf/design-system'
import phoneHomeIndicator from '@jf/design-system/src/assets/phone-home-indicator.svg'
import previewUserAvatar from '../assets/preview-user-avatar.jpg'
import { PhoneStatusBar } from '../components/PhoneStatusBar'
import { PageNavigationBar, getPageIconName } from '../components/PageNavigationBar'
import { LivePreviewMenuDrawer } from '../components/LivePreviewMenuDrawer'
import { LivePreviewMorePagesView } from '../components/LivePreviewMorePagesView'
import { LivePreviewCartButton } from '../components/LivePreviewCartButton'
import { LivePreviewCartPage } from '../components/LivePreviewCartPage'
import { LivePreviewCheckoutPage } from '../components/LivePreviewCheckoutPage'
import { LivePreviewOrderBar } from '../components/LivePreviewOrderBar'
import { LivePreviewAvatarPopover } from '../components/LivePreviewAvatarPopover'
import { LivePreviewLoginPopover } from '../components/LivePreviewLoginPopover'
import { QrPopover } from '../components/QrPopover'
import { MobileBottomBar } from '../components/MobileBottomBar'
import { WidgetLoadAnimation } from '../components/WidgetLoadAnimation'
import podoAvatar from '../assets/podo-chat-avatar.png'
import { AppPreviewScreen } from '../components/AppPreviewScreen'
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import {
  attachClosestEdge,
  extractClosestEdge,
  type Edge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview'
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview'
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element'
import type { AppPreset, PresetElement } from '../presets/appPresets'
import { IconPropertyField } from '../components/IconPropertyField'
import { ColorInputWithPicker } from '../components/ColorInputWithPicker'
import { loadSnapshot, saveSnapshot } from '../presets/storage'

interface CanvasElement {
  id: string
  componentId: string
  variants: VariantValues
  properties: PropertyValues
  states: StateValues
}

interface AppPage {
  id: string
  name: string
  icon?: string
  elements: CanvasElement[]
}

function nextNumericId(prefix: string, existingIds: string[]): string {
  const re = new RegExp(`^${prefix}-(\\d+)$`)
  const max = existingIds.reduce((m, id) => {
    const match = id.match(re)
    const n = match ? parseInt(match[1], 10) : 0
    return n > m ? n : m
  }, 0)
  return `${prefix}-${max + 1}`
}

const ELEMENT_ICON_MAP: Record<string, { icon: string; iconCategory: string }> = {
  'form': { icon: 'form-filled', iconCategory: 'forms-files' },
  'heading': { icon: 'heading-square-filled', iconCategory: 'editor' },
  'list': { icon: 'list-bullet', iconCategory: 'editor' },
  'paragraph': { icon: 'text-image', iconCategory: 'general' },
  'card': { icon: 'grid-2-filled', iconCategory: 'layout' },
  'sign-document': { icon: 'document-jf-sign-filled', iconCategory: 'documents' },
  'document': { icon: 'file-filled', iconCategory: 'forms-files' },
  'button': { icon: 'label-button-filled', iconCategory: 'general' },
  'social-follow': { icon: 'share-nodes-filled', iconCategory: 'general' },
  'product-list': { icon: 'cart-shopping-filled', iconCategory: 'finance' },
  'donation-box': { icon: 'heart-filled', iconCategory: 'general' },
  'image': { icon: 'image-line-filled', iconCategory: 'general' },
  'image-gallery': { icon: 'images-filled', iconCategory: 'media' },
  'table': { icon: 'table', iconCategory: 'general' },
  'testimonial': { icon: 'message-star-filled', iconCategory: 'communication' },
  'login-signup': { icon: 'form-filled', iconCategory: 'forms-files' },
  'chart': { icon: 'form-report-filled', iconCategory: 'forms-files' },
  'daily-task-manager': { icon: 'table', iconCategory: 'general' },
  'progress-indicator': { icon: 'list-check-square-filled', iconCategory: 'general' },
  'spacer': { icon: 'spacer-vertical-filled', iconCategory: 'layout' },
}

interface PanelGroup {
  label?: string
  elementIds: string[]
}

const BASIC_GROUPS: PanelGroup[] = [
  { elementIds: ['form', 'heading', 'list', 'paragraph', 'card', 'sign-document', 'document', 'image', 'image-gallery', 'button', 'spacer'] },
  { label: 'PAYMENT ELEMENTS', elementIds: ['product-list', 'donation-box'] },
  { label: 'FEATURED WIDGETS', elementIds: ['social-follow', 'testimonial'] },
  { label: 'DATA ELEMENTS', elementIds: ['table'] },
]

const WIDGETS_GROUPS: PanelGroup[] = [
  { elementIds: ['sales-dashboard', 'chart', 'daily-task-manager', 'login-signup', 'progress-indicator'] },
]

interface MockWidget {
  id: string
  name: string
  bg: string
  render: () => React.ReactNode
}

const MOCK_WIDGETS: MockWidget[] = [
  {
    id: 'data-grid',
    name: 'Data Grid',
    bg: 'transparent',
    render: () => (
      <img
        src="/widgets/data-grid.png"
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    ),
  },
  {
    id: 'pdf-embedder',
    name: 'PDF Embedder',
    bg: 'transparent',
    render: () => (
      <img
        src="/widgets/pdf-embedder.png"
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    ),
  },
  {
    id: 'fit-text',
    name: 'Fit Text',
    bg: 'transparent',
    render: () => (
      <img
        src="/widgets/fit-text.png"
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    ),
  },
  {
    id: 'iframe-embed',
    name: 'Iframe Embed',
    bg: '#F5C947',
    render: () => (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="22" height="18" rx="1.5" fill="#fff" stroke="#2B2B2B" strokeWidth="0.8"/>
        <rect x="3" y="5" width="22" height="4" fill="#2B2B2B" rx="1.5"/>
        <circle cx="5.5" cy="7" r="0.7" fill="#FF5F57"/>
        <circle cx="7.5" cy="7" r="0.7" fill="#FEBC2E"/>
        <circle cx="9.5" cy="7" r="0.7" fill="#28C840"/>
        <text x="14" y="19" textAnchor="middle" fontFamily="monospace" fontSize="9" fontWeight="700" fill="#E4392F">{'</>'}</text>
      </svg>
    ),
  },
  {
    id: 'facebook-follow',
    name: 'Facebook Follow Box (Formerly Like Box)',
    bg: '#E8E9EB',
    render: () => (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundImage: "url('/widgets/facebook-follow.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
    ),
  },
  {
    id: 'instagram',
    name: 'Instagram',
    bg: 'radial-gradient(circle at 30% 107%, #FDD34B 0%, #FDD34B 5%, #FA7E1E 25%, #D62976 55%, #962FBF 80%, #4F5BD5 100%)',
    render: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5"/>
        <circle cx="12" cy="12" r="4"/>
        <circle cx="17.5" cy="6.5" r="1.2" fill="#fff"/>
      </svg>
    ),
  },
  {
    id: 'show-map',
    name: 'Show Map Location',
    bg: '#E8DFC7',
    render: () => (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect width="28" height="28" fill="#E8DFC7"/>
        <path d="M0 9 L28 12" stroke="#CFC29D" strokeWidth="1.2"/>
        <path d="M0 20 L28 17" stroke="#CFC29D" strokeWidth="1.2"/>
        <path d="M10 0 L12 28" stroke="#CFC29D" strokeWidth="1.2"/>
        <path d="M14 3C10.5 3 8 5.5 8 9c0 4 6 10 6 10s6-6 6-10c0-3.5-2.5-6-6-6z" fill="#2B5FA3"/>
        <circle cx="14" cy="9" r="2.2" fill="#fff"/>
      </svg>
    ),
  },
  {
    id: 'qr-code',
    name: 'QR Code',
    bg: '#F78754',
    render: () => (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect width="28" height="28" fill="#F78754"/>
        <g fill="#111">
          <rect x="3" y="3" width="8" height="8"/><rect x="5" y="5" width="4" height="4" fill="#F78754"/>
          <rect x="17" y="3" width="8" height="8"/><rect x="19" y="5" width="4" height="4" fill="#F78754"/>
          <rect x="3" y="17" width="8" height="8"/><rect x="5" y="19" width="4" height="4" fill="#F78754"/>
          <rect x="14" y="14" width="3" height="3"/><rect x="19" y="14" width="3" height="3"/>
          <rect x="14" y="19" width="3" height="3"/><rect x="22" y="22" width="3" height="3"/>
          <rect x="19" y="19" width="2" height="2"/>
        </g>
      </svg>
    ),
  },
  {
    id: 'animated-heading',
    name: 'Animated Heading',
    bg: '#F5B8C4',
    render: () => (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" fontFamily="sans-serif" fontSize="10" fontWeight="900" aria-hidden="true">
        <text x="3" y="18" fill="#E8536E">a</text>
        <text x="10" y="18" fill="#F5D547">b</text>
        <text x="17" y="18" fill="#1F4F8F">C</text>
      </svg>
    ),
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Button',
    bg: '#C8EAD5',
    render: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true">
        <path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.9-1.4A10 10 0 1 0 12 2zm5.6 14.2c-.2.6-1.2 1.2-1.7 1.3-.5.1-1.1.1-3.5-.8-2.9-1.1-4.7-4-4.9-4.2-.1-.2-1.1-1.5-1.1-2.8 0-1.3.7-2 1-2.3.2-.2.5-.3.7-.3h.5c.2 0 .5-.1.7.5.2.6.8 2 .9 2.1.1.1.1.3 0 .5-.1.2-.1.3-.3.4l-.4.5c-.1.2-.3.3-.1.6.1.3.7 1.1 1.4 1.7.9.8 1.7 1.1 2 1.2.3.1.5.1.6-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.6-.1l2 1c.3.1.4.2.5.4 0 .1 0 .7-.1 1.3z"/>
      </svg>
    ),
  },
  {
    id: 'soundcloud',
    name: 'SoundCloud',
    bg: '#F78754',
    render: () => (
      <svg width="28" height="22" viewBox="0 0 28 22" fill="#fff" aria-hidden="true">
        <rect x="1" y="10" width="2" height="8" rx="1"/>
        <rect x="4" y="7" width="2" height="11" rx="1"/>
        <rect x="7" y="4" width="2" height="14" rx="1"/>
        <rect x="10" y="2" width="2" height="16" rx="1"/>
        <path d="M13 2h10a4 4 0 0 1 0 16H13V2z"/>
      </svg>
    ),
  },
]

const HIDDEN_ELEMENTS = ['empty-state', 'app-header', 'bottom-navigation', 'color-picker', 'camper-card', 'activity-schedule', 'sales-dashboard', 'chart', 'daily-task-manager', 'login-signup', 'progress-indicator']

function createCanvasElement(comp: RegisteredComponent, id: string): CanvasElement {
  const variants: VariantValues = {}
  for (const [group, config] of Object.entries(comp.variants)) {
    variants[group] = config.default || config.options[0]
  }

  const properties: PropertyValues = {}
  for (const prop of comp.properties) {
    properties[prop.name] = prop.default
  }

  const states: StateValues = {}
  for (const state of comp.states) {
    states[state.name] = state.default || false
  }

  return {
    id,
    componentId: comp.id,
    variants,
    properties,
    states,
  }
}

function buildCanvasElementsFromPreset(presetElements: PresetElement[], startId: number): { elements: CanvasElement[]; nextId: number } {
  const elements: CanvasElement[] = []
  let id = startId
  for (const pe of presetElements) {
    const comp = ComponentRegistry.get(pe.componentId)
    if (!comp) continue
    const el = createCanvasElement(comp, `element-${id++}`)
    if (pe.variants) Object.assign(el.variants, pe.variants)
    if (pe.properties) Object.assign(el.properties, pe.properties)
    elements.push(el)
  }
  return { elements, nextId: id }
}

function buildInitialStateFromPreset(preset: AppPreset | undefined): {
  pages: AppPage[]
  headerActions: CanvasElement[]
  activePageId: string
  appSubtitle: string
  appHeader: AppHeaderState
} {
  if (!preset || preset.pages.length === 0) {
    return {
      pages: [{ id: 'page-1', name: 'Home', icon: 'House', elements: [] }],
      headerActions: [],
      activePageId: 'page-1',
      appSubtitle: preset?.appSubtitle ?? '',
      appHeader: { ...APP_HEADER_DEFAULTS },
    }
  }
  // Empty App always starts from defaults — skip stored snapshot.
  const stored = preset.id === 'empty' ? null : loadSnapshot(preset.id)
  if (stored) {
    const pages = stored.pages as AppPage[]
    const storedHeader = (stored.appHeader ?? {}) as Partial<AppHeaderState>
    return {
      pages,
      headerActions: stored.headerActions as CanvasElement[],
      activePageId: pages[0]?.id ?? 'page-1',
      appSubtitle: stored.appSubtitle,
      appHeader: {
        layout: storedHeader.layout ?? APP_HEADER_DEFAULTS.layout,
        icon: storedHeader.icon ?? APP_HEADER_DEFAULTS.icon,
        skeleton: storedHeader.skeleton ?? APP_HEADER_DEFAULTS.skeleton,
        show: typeof storedHeader.show === 'boolean' ? storedHeader.show : APP_HEADER_DEFAULTS.show,
        imageStyle: (storedHeader.imageStyle as AppHeaderImageStyle | undefined) ?? APP_HEADER_DEFAULTS.imageStyle,
        imageUrl: storedHeader.imageUrl ?? APP_HEADER_DEFAULTS.imageUrl,
        imageName: storedHeader.imageName ?? APP_HEADER_DEFAULTS.imageName,
        textColor: storedHeader.textColor ?? APP_HEADER_DEFAULTS.textColor,
        backgroundImageUrl: storedHeader.backgroundImageUrl ?? APP_HEADER_DEFAULTS.backgroundImageUrl,
        backgroundImageName: storedHeader.backgroundImageName ?? APP_HEADER_DEFAULTS.backgroundImageName,
        title: storedHeader.title,
        subtitle: storedHeader.subtitle,
      },
    }
  }
  let nextId = 1
  const pages: AppPage[] = preset.pages.map((p) => {
    const built = buildCanvasElementsFromPreset(p.elements, nextId)
    nextId = built.nextId
    return { id: p.id, name: p.name, icon: p.icon, elements: built.elements }
  })
  const headerBuilt = buildCanvasElementsFromPreset(preset.headerActions, nextId)
  return {
    pages,
    headerActions: headerBuilt.elements,
    activePageId: pages[0].id,
    appSubtitle: preset.appSubtitle,
    appHeader: { ...APP_HEADER_DEFAULTS, ...(preset.appHeader ?? {}) },
  }
}

function nextElementId(pages: AppPage[], headerActions: CanvasElement[] = []): string {
  return nextNumericId('element', [
    ...pages.flatMap((p) => p.elements.map((el) => el.id)),
    ...headerActions.map((el) => el.id),
  ])
}

const APP_HEADER_ID = 'app-header'
type AppHeaderImageStyle = 'Image' | 'Icon' | 'None'
interface AppHeaderState {
  layout: string
  icon: string
  skeleton: boolean
  show: boolean
  imageStyle: AppHeaderImageStyle
  imageUrl: string | null
  imageName: string | null
  textColor: string
  backgroundImageUrl: string | null
  backgroundImageName: string | null
  // Optional overrides — when set (including empty string), they take precedence
  // over appTitle/appSubtitle so users can hide the header text without clearing
  // the chrome-level app name.
  title?: string
  subtitle?: string
}
const APP_HEADER_DEFAULTS: AppHeaderState = {
  layout: 'Center',
  icon: 'Leaf',
  skeleton: false,
  show: true,
  imageStyle: 'Icon',
  imageUrl: null,
  imageName: null,
  textColor: '#FFFFFF',
  backgroundImageUrl: null,
  backgroundImageName: null,
}

const HEADER_ACTION_ALLOWED = ['button', 'social-follow']
const HEADER_ACTIONS_MAX = 3
// In header context only Button can be shrinked (Social Follow stays full-width)
const isHeaderShrinkable = (componentId: string): boolean => componentId === 'button'

const INLINE_EDITABLE_MAP: Record<string, { selector: string; property: string }[]> = {
  card: [
    { selector: '.jf-card__title', property: 'Title' },
    { selector: '.jf-card__description', property: 'Description' },
  ],
  button: [
    { selector: '.jf-btn__label', property: 'Label' },
  ],
  heading: [
    { selector: '.jf-heading__title', property: 'Heading' },
    { selector: '.jf-heading__subtitle', property: 'Subheading' },
  ],
  form: [
    { selector: '.jf-form__title', property: 'Label' },
    { selector: '.jf-form__desc', property: 'Description' },
  ],
  table: [
    { selector: '.jf-table__title', property: 'Label' },
    { selector: '.jf-table__desc', property: 'Description' },
  ],
  document: [
    { selector: '.jf-doc__title', property: 'File Name' },
    { selector: '.jf-doc__desc', property: 'Description' },
  ],
  'sign-document': [
    { selector: '.jf-sign-doc__title', property: 'Label' },
    { selector: '.jf-sign-doc__desc', property: 'Description' },
  ],
  list: [
    { selector: '.jf-list__title', property: 'Title' },
    { selector: '.jf-list__subtitle', property: 'Subtitle' },
  ],
  'product-list': [
    { selector: '.jf-product-list__title', property: 'Title' },
    { selector: '.jf-product-list__subtitle', property: 'Subtitle' },
  ],
  'donation-box': [
    { selector: '.jf-donation__title', property: 'Title' },
    { selector: '.jf-donation__description', property: 'Description' },
  ],
}

type DragSourceData =
  | { type: 'panel'; componentId: string }
  | { type: 'canvas'; elementId: string; componentId: string }

type DropEdgeChange = (elementId: string, edge: Edge | null) => void
const DropEdgeContext = createContext<DropEdgeChange | null>(null)

type DropTarget = { elementId: string; edge: Edge }

function CanvasDropLine({
  target,
  containerRef,
}: {
  target: DropTarget | null
  containerRef: RefObject<HTMLDivElement | null>
}) {
  const [style, setStyle] = useState<CSSProperties | null>(null)

  useLayoutEffect(() => {
    if (!target) {
      setStyle(null)
      return
    }
    const container = containerRef.current
    if (!container) return
    const el = container.querySelector(
      `[data-element-id="${target.elementId}"]`
    ) as HTMLElement | null
    if (!el) {
      setStyle(null)
      return
    }

    const cRect = container.getBoundingClientRect()
    const eRect = el.getBoundingClientRect()
    const cs = getComputedStyle(container)
    const padLeft = parseFloat(cs.paddingLeft) || 0
    const padRight = parseFloat(cs.paddingRight) || 0
    const gap = parseFloat(cs.rowGap || cs.gap || '0') || 16
    const thickness = 4
    const contentWidth = container.clientWidth - padLeft - padRight
    const top = eRect.top - cRect.top + container.scrollTop
    const left = eRect.left - cRect.left + container.scrollLeft

    if (target.edge === 'top') {
      setStyle({
        top: top - gap / 2 - thickness / 2,
        left: padLeft,
        width: contentWidth,
        height: thickness,
      })
    } else if (target.edge === 'bottom') {
      setStyle({
        top: top + eRect.height + gap / 2 - thickness / 2,
        left: padLeft,
        width: contentWidth,
        height: thickness,
      })
    } else if (target.edge === 'left') {
      setStyle({
        top,
        left: left - gap / 2 - thickness / 2,
        width: thickness,
        height: eRect.height,
      })
    } else if (target.edge === 'right') {
      setStyle({
        top,
        left: left + eRect.width + gap / 2 - thickness / 2,
        width: thickness,
        height: eRect.height,
      })
    }
  }, [target, containerRef])

  if (!style) return null
  return <div className="build-page__drop-line" style={style} />
}

function HeaderActionItem({
  element,
  isSelected,
  hideDuringDrag,
  isPaired,
  pairPartnerId,
  partnerSwapEdge,
  onSelect,
  onPropertyChange,
}: {
  element: CanvasElement
  isSelected: boolean
  hideDuringDrag: boolean
  isPaired: boolean
  pairPartnerId: string | null
  partnerSwapEdge: Edge | null
  onSelect: (id: string) => void
  onPropertyChange: (elementId: string, property: string, value: string | boolean | number) => void
}) {
  const comp = ComponentRegistry.get(element.componentId)
  const isShrinked = element.properties['Shrinked'] === true
  const ref = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const onDropEdgeChange = useContext(DropEdgeContext)
  const isPairedRef = useRef(isPaired)
  const pairPartnerIdRef = useRef(pairPartnerId)
  const partnerSwapEdgeRef = useRef(partnerSwapEdge)
  useEffect(() => { isPairedRef.current = isPaired }, [isPaired])
  useEffect(() => { pairPartnerIdRef.current = pairPartnerId }, [pairPartnerId])
  useEffect(() => { partnerSwapEdgeRef.current = partnerSwapEdge }, [partnerSwapEdge])
  const selfShrinkable = isHeaderShrinkable(element.componentId)

  useEffect(() => {
    const el = ref.current
    const handle = handleRef.current
    if (!el) return
    const reportEdge = (edge: Edge | null) => onDropEdgeChange?.(element.id, edge)
    return combine(
      draggable({
        element: el,
        dragHandle: handle ?? undefined,
        getInitialData: (): Record<string, unknown> => ({
          type: 'canvas',
          elementId: element.id,
          componentId: element.componentId,
        }),
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: pointerOutsideOfPreview({ x: '16px', y: '16px' }),
            render: ({ container }) => {
              const root = createRoot(container)
              root.render(<PanelDragOverlay componentId={element.componentId} />)
              return () => root.unmount()
            },
          })
        },
      }),
      dropTargetForElements({
        element: el,
        canDrop: ({ source }) => {
          const data = source.data as DragSourceData
          if (data.type === 'canvas' && data.elementId === element.id) return false
          return HEADER_ACTION_ALLOWED.includes(data.componentId)
        },
        getData: ({ input, source, element: target }) => {
          const data = source.data as DragSourceData
          const sourceIsMyPartner =
            data.type === 'canvas' && data.elementId === pairPartnerIdRef.current
          let allowedEdges: Edge[]
          if (sourceIsMyPartner) {
            allowedEdges = partnerSwapEdgeRef.current
              ? ['top', 'bottom', partnerSwapEdgeRef.current]
              : ['top', 'bottom']
          } else {
            const sourceShrinkable = isHeaderShrinkable(data.componentId)
            const allowHorizontal =
              sourceShrinkable && selfShrinkable && !isPairedRef.current
            allowedEdges = allowHorizontal
              ? ['top', 'bottom', 'left', 'right']
              : ['top', 'bottom']
          }
          return attachClosestEdge(
            { type: 'header-action', elementId: element.id },
            { input, element: target, allowedEdges }
          )
        },
        onDrag: ({ self, source }) => {
          const data = source.data as DragSourceData
          if (data.type === 'canvas' && data.elementId === element.id) {
            reportEdge(null)
            return
          }
          reportEdge(extractClosestEdge(self.data))
        },
        onDragLeave: () => reportEdge(null),
        onDrop: () => reportEdge(null),
      })
    )
  }, [element.id, element.componentId, selfShrinkable, onDropEdgeChange])

  if (!comp) return null

  return (
    <div
      ref={ref}
      className={`build-page__header-action${isSelected ? ' build-page__header-action--selected' : ''}${isShrinked ? ' build-page__header-action--shrinked' : ''}`}
      data-element-id={element.id}
      data-component-id={element.componentId}
      style={hideDuringDrag ? { display: 'none' } : undefined}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(element.id)
      }}
    >
      <div ref={handleRef} className="build-page__drag-handle">
        <Icon name="grid-dots-vertical" category="general" size={24} />
      </div>
      <div className="build-page__header-action-content">
        {comp.render(element.variants, element.properties, element.states, (name, value) => onPropertyChange(element.id, name, value))}
      </div>
    </div>
  )
}

function isComponentShrinkable(componentId: string): boolean {
  const comp = ComponentRegistry.get(componentId)
  return !!comp?.properties.some((p) => p.name === 'Shrinked')
}

function isElementShrinked(el: CanvasElement): boolean {
  return el.properties['Shrinked'] === true
}

// Returns the pair partner's index within page.elements, or -1 if unpaired.
// Pairing: consecutive shrinked elements group into 2-column rows; element at column 0
// pairs with column 1 if present. Column-1 is always paired with column-0.
function pairPartnerIndex(elements: CanvasElement[], index: number): number {
  const el = elements[index]
  if (!el || !isElementShrinked(el)) return -1
  let start = index
  while (start > 0 && isElementShrinked(elements[start - 1])) start--
  const k = index - start
  if (k % 2 === 0) {
    const next = elements[index + 1]
    return next && isElementShrinked(next) ? index + 1 : -1
  }
  return index - 1
}

// Header-only variant: only Button elements can pair (SocialFollow stays full-width).
function headerPairPartnerIndex(elements: CanvasElement[], index: number): number {
  const el = elements[index]
  if (!el || el.componentId !== 'button' || !isElementShrinked(el)) return -1
  const qualifies = (e: CanvasElement | undefined) =>
    !!e && e.componentId === 'button' && isElementShrinked(e)
  let start = index
  while (start > 0 && qualifies(elements[start - 1])) start--
  const k = index - start
  if (k % 2 === 0) {
    return qualifies(elements[index + 1]) ? index + 1 : -1
  }
  return index - 1
}

function PanelDragOverlay({ componentId }: { componentId: string }) {
  const iconInfo = ELEMENT_ICON_MAP[componentId]
  const comp = ComponentRegistry.get(componentId)
  if (!comp) return null

  return (
    <div className="build-page__element-item build-page__panel-overlay">
      <div className="build-page__element-icon">
        {iconInfo ? (
          <Icon name={iconInfo.icon} category={iconInfo.iconCategory} size={24} />
        ) : (
          <Icon name="grid-2-filled" category="layout" size={24} />
        )}
      </div>
      <div className="build-page__element-content">
        <span className="build-page__element-name">{comp.name}</span>
      </div>
    </div>
  )
}

const SortableElement = memo(function SortableElement({
  element,
  pageId,
  isSelected,
  hideDuringDrag,
  isPaired,
  pairPartnerId,
  partnerSwapEdge,
  onSelect,
  onPropertyChange,
  onOpenProperties,
  onRemove,
  onEditWidget,
}: {
  element: CanvasElement
  pageId: string
  isSelected: boolean
  hideDuringDrag: boolean
  isPaired: boolean
  pairPartnerId: string | null
  partnerSwapEdge: Edge | null
  onSelect: (id: string) => void
  onPropertyChange: (elementId: string, property: string, value: string | boolean | number) => void
  onOpenProperties: (id: string) => void
  onRemove: (id: string) => void
  onEditWidget: () => void
}) {
  const comp = ComponentRegistry.get(element.componentId)
  const isShrinked = element.properties['Shrinked'] === true
  const sectionRef = useRef<HTMLElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const onDropEdgeChange = useContext(DropEdgeContext)
  const isPairedRef = useRef(isPaired)
  const pairPartnerIdRef = useRef(pairPartnerId)
  const partnerSwapEdgeRef = useRef(partnerSwapEdge)
  useEffect(() => { isPairedRef.current = isPaired }, [isPaired])
  useEffect(() => { pairPartnerIdRef.current = pairPartnerId }, [pairPartnerId])
  useEffect(() => { partnerSwapEdgeRef.current = partnerSwapEdge }, [partnerSwapEdge])
  const selfShrinkable = isComponentShrinkable(element.componentId)

  useEffect(() => {
    const section = sectionRef.current
    const handle = handleRef.current
    if (!section) return
    const reportEdge = (edge: Edge | null) => onDropEdgeChange?.(element.id, edge)
    return combine(
      draggable({
        element: section,
        dragHandle: handle ?? undefined,
        getInitialData: (): Record<string, unknown> => ({
          type: 'canvas',
          elementId: element.id,
          pageId,
          componentId: element.componentId,
        }),
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: pointerOutsideOfPreview({ x: '16px', y: '16px' }),
            render: ({ container }) => {
              const root = createRoot(container)
              root.render(<PanelDragOverlay componentId={element.componentId} />)
              return () => root.unmount()
            },
          })
        },
      }),
      dropTargetForElements({
        element: section,
        canDrop: ({ source }) => {
          const data = source.data as DragSourceData
          if (data.type === 'canvas' && data.elementId === element.id) return false
          return true
        },
        getData: ({ input, source, element: target }) => {
          const data = source.data as DragSourceData
          const sourceIsMyPartner =
            data.type === 'canvas' && data.elementId === pairPartnerIdRef.current
          let allowedEdges: Edge[]
          if (sourceIsMyPartner) {
            // In-pair swap: only allow dropping on the opposite side of the partner.
            // Vertical edges still work so the user can break the pair.
            allowedEdges = partnerSwapEdgeRef.current
              ? ['top', 'bottom', partnerSwapEdgeRef.current]
              : ['top', 'bottom']
          } else {
            const sourceShrinkable = isComponentShrinkable(data.componentId)
            const allowHorizontal =
              sourceShrinkable && selfShrinkable && !isPairedRef.current
            allowedEdges = allowHorizontal
              ? ['top', 'bottom', 'left', 'right']
              : ['top', 'bottom']
          }
          return attachClosestEdge(
            { type: 'element', elementId: element.id, pageId },
            { input, element: target, allowedEdges }
          )
        },
        onDrag: ({ self, source }) => {
          const data = source.data as DragSourceData
          if (data.type === 'canvas' && data.elementId === element.id) {
            reportEdge(null)
            return
          }
          reportEdge(extractClosestEdge(self.data))
        },
        onDragLeave: () => reportEdge(null),
        onDrop: () => reportEdge(null),
      })
    )
  }, [element.id, element.componentId, pageId, selfShrinkable, onDropEdgeChange])

  useEffect(() => {
    const container = contentRef.current
    if (!container || !comp) return

    const editableFields = INLINE_EDITABLE_MAP[element.componentId] || []
    const cleanups: (() => void)[] = []

    for (const field of editableFields) {
      const el = container.querySelector(field.selector) as HTMLElement | null
      if (!el) continue

      if (isSelected) {
        el.contentEditable = 'true'
        el.style.outline = 'none'
        el.style.cursor = 'text'
        const propDef = ComponentRegistry.get(element.componentId)?.properties.find((p) => p.name === field.property)
        const defaultValue = String(propDef?.default || '')
        const placeholderText = defaultValue || field.property
        el.dataset.placeholder = placeholderText

        if (!el.textContent) {
          el.classList.add('build-page__inline-placeholder')
        }

        const handleFocus = () => {
          if (defaultValue && el.textContent === defaultValue) {
            el.textContent = ''
            el.classList.add('build-page__inline-placeholder')
          }
          if (!el.textContent) {
            el.classList.add('build-page__inline-placeholder')
          }
        }

        const handleInput = () => {
          if (el.textContent) {
            el.classList.remove('build-page__inline-placeholder')
          } else {
            el.classList.add('build-page__inline-placeholder')
          }
        }

        const handleBlur = () => {
          const newText = el.textContent || ''
          el.classList.remove('build-page__inline-placeholder')
          if (newText) {
            onPropertyChange(element.id, field.property, newText)
          } else {
            onPropertyChange(element.id, field.property, defaultValue)
            el.textContent = defaultValue
          }
        }

        const handleMouseDown = (e: MouseEvent) => {
          if (isSelected) e.stopPropagation()
        }

        el.addEventListener('focus', handleFocus)
        el.addEventListener('input', handleInput)
        el.addEventListener('blur', handleBlur)
        el.addEventListener('mousedown', handleMouseDown)
        cleanups.push(() => {
          el.contentEditable = 'false'
          el.style.cursor = ''
          el.classList.remove('build-page__inline-placeholder')
          delete el.dataset.placeholder
          el.removeEventListener('focus', handleFocus)
          el.removeEventListener('input', handleInput)
          el.removeEventListener('blur', handleBlur)
          el.removeEventListener('mousedown', handleMouseDown)
        })
      } else {
        el.contentEditable = 'false'
        el.style.cursor = ''
      }
    }

    if (isSelected && element.componentId === 'paragraph') {
      const editor = container.querySelector('.jf-paragraph__editor') as HTMLElement | null
      if (editor) {
        requestAnimationFrame(() => editor.click())
      }
    }

    return () => cleanups.forEach((fn) => fn())
  }, [isSelected, element.componentId, element.id, comp, onPropertyChange])

  if (!comp) return null

  return (
    <section
      ref={sectionRef}
      className={`themes-view__section build-page__canvas-element ${isSelected ? 'build-page__canvas-element--selected' : ''} ${isShrinked ? 'build-page__canvas-element--shrinked' : ''}`}
      data-element-id={element.id}
      data-component-id={element.componentId}
      style={hideDuringDrag ? { display: 'none' } : undefined}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(element.id)
      }}
    >
      <div ref={handleRef} className="build-page__drag-handle">
        <Icon name="grid-dots-vertical" category="general" size={24} />
      </div>
      <div ref={contentRef} className="build-page__canvas-element-content">
        {comp.render(element.variants, element.properties, element.states, (name, value) => onPropertyChange(element.id, name, value))}
      </div>
      {isSelected && (element.componentId === 'camper-card' || element.componentId === 'activity-schedule') && (
        <div className="widget-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="widget-actions__btn widget-actions__btn--ai"
            aria-label="Edit Widget"
            onClick={onEditWidget}
          >
            <Icon name="ai-pencil-filled" category="ai" size={20} />
            <span className="widget-actions__label">Edit Widget</span>
          </button>
          <button
            type="button"
            className="widget-actions__btn widget-actions__btn--settings"
            onClick={() => onOpenProperties(element.id)}
            aria-label="Open properties"
          >
            <Icon name="gear-filled" category="general" size={20} />
          </button>
          <button
            type="button"
            className="widget-actions__btn widget-actions__btn--delete"
            onClick={() => onRemove(element.id)}
            aria-label="Delete widget"
          >
            <Icon name="trash-filled" category="general" size={20} />
          </button>
        </div>
      )}
    </section>
  )
})

function DraggablePanelItem({
  comp,
  children,
}: {
  comp: RegisteredComponent
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    return draggable({
      element: el,
      getInitialData: (): Record<string, unknown> => ({
        type: 'panel',
        componentId: comp.id,
      }),
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        setCustomNativeDragPreview({
          nativeSetDragImage,
          getOffset: pointerOutsideOfPreview({ x: '16px', y: '16px' }),
          render: ({ container }) => {
            const root = createRoot(container)
            root.render(<PanelDragOverlay componentId={comp.id} />)
            return () => root.unmount()
          },
        })
      },
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    })
  }, [comp.id])

  return (
    <div
      ref={ref}
      className={isDragging ? 'build-page__element-item--dragging' : ''}
    >
      {children}
    </div>
  )
}

function DroppablePage({
  pageId,
  showEmptyState,
  onEmptyStateClick,
  children,
}: {
  pageId: string
  showEmptyState: boolean
  onEmptyStateClick: (e: React.MouseEvent) => void
  children?: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isOverEmpty, setIsOverEmpty] = useState(false)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)

  const handleDropEdgeChange = useCallback<DropEdgeChange>((elementId, edge) => {
    setDropTarget((prev) => {
      if (edge === null) {
        return prev?.elementId === elementId ? null : prev
      }
      if (prev?.elementId === elementId && prev.edge === edge) return prev
      return { elementId, edge }
    })
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    return dropTargetForElements({
      element: el,
      getData: () => ({ type: 'page', pageId }),
      getIsSticky: () => false,
      onDragEnter: () => setIsOverEmpty(true),
      onDragLeave: () => {
        setIsOverEmpty(false)
        setDropTarget(null)
      },
      onDrop: () => {
        setIsOverEmpty(false)
        setDropTarget(null)
      },
    })
  }, [pageId])

  return (
    <DropEdgeContext.Provider value={handleDropEdgeChange}>
      <div
        ref={ref}
        data-page-id={pageId}
        className={`themes-view__app ${showEmptyState && isOverEmpty ? 'build-page__droppable--over' : ''}`}
      >
        {showEmptyState && (
          <section
            className="themes-view__section themes-view__section--center build-page__empty-state"
            onClick={onEmptyStateClick}
          >
            <EmptyState mobile={window.matchMedia('(max-width: 768px)').matches} />
          </section>
        )}
        {children}
        <CanvasDropLine target={dropTarget} containerRef={ref} />
      </div>
    </DropEdgeContext.Provider>
  )
}

function useResolvedCssVar(varName: string, selectors: string[], fallback: string): string {
  const [resolved, setResolved] = useState(fallback)
  useEffect(() => {
    let root: HTMLElement | null = null
    for (const sel of selectors) {
      const el = document.querySelector(sel) as HTMLElement | null
      if (el) { root = el; break }
    }
    const target = root ?? document.documentElement
    const update = () => {
      const value = getComputedStyle(target).getPropertyValue(varName).trim()
      if (value) setResolved(toHex(value) || fallback)
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(target, { attributes: true, attributeFilter: ['style', 'class'] })
    return () => observer.disconnect()
  }, [varName, fallback, selectors.join('|')])
  return resolved
}

function toHex(input: string): string {
  const v = input.trim()
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return v.toUpperCase()
  const m = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (!m) return ''
  const r = Number(m[1]).toString(16).padStart(2, '0')
  const g = Number(m[2]).toString(16).padStart(2, '0')
  const b = Number(m[3]).toString(16).padStart(2, '0')
  return `#${r}${g}${b}`.toUpperCase()
}

function ColorPropertyField({
  value,
  onChange,
  placeholder,
  fallback = '#7D38EF',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  fallback?: string
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const openPicker = useCallback(() => {
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (rect) setPos({ top: rect.bottom + 8, left: Math.max(8, rect.right - 272) })
    setOpen(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (popupRef.current?.contains(t) || wrapperRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pickerColor = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : fallback
  const displayColor = value || fallback

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <DSColorInput
        color={displayColor}
        onColorChange={onChange}
        onSwatchClick={openPicker}
        placeholder={placeholder}
      />
      {open && createPortal(
        <div
          ref={popupRef}
          className="color-theme-grid__picker-popup"
          data-theme="dark"
          style={{ top: pos.top, left: pos.left }}
        >
          <HsvColorPicker
            color={pickerColor}
            onChange={onChange}
            tint={0}
            onTintChange={() => {}}
            hideTint
          />
        </div>,
        document.body,
      )}
    </div>
  )
}

function AiWidgetCard({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      className="build-page__element-item build-page__element-item--ai build-page__element-item--ai-solid"
      onClick={onClick}
    >
      <div className="build-page__element-icon build-page__element-icon--ai">
        <img src="/widgets/podo-ai-card.png" alt="" className="build-page__element-icon-img" />
      </div>
      <div className="build-page__element-content">
        <span className="build-page__element-name">
          Create widget with <span className="build-page__ai-widget-badge">AI</span>
        </span>
        <span className="build-page__ai-new-pill">New</span>
      </div>
    </button>
  )
}

type AiWidgetTab = 'general' | 'data' | 'condition'

interface AiWidgetConnectedTable {
  id: string
  label: string
  tableName: string
}

const CAMPER_CARD_TABLES: AiWidgetConnectedTable[] = [
  { id: 't1', label: 'Registered Children', tableName: 'Registered Children' },
  { id: 't2', label: 'Camper Registration', tableName: 'Camper Registration' },
  { id: 't3', label: 'Camper Registration', tableName: 'Camper Immunization Record' },
  { id: 't4', label: 'Camper Healthcare Information', tableName: 'Camper Healthcare Information' },
]

function AiWidgetPropertiesPanel({
  element,
  component,
  displayName,
  displayDescription,
  onClose,
  onPropertyChange,
  onDuplicate,
  onEditDetails,
}: {
  element: CanvasElement
  component: RegisteredComponent
  displayName: string
  displayDescription: string
  onClose: () => void
  onPropertyChange: (elementId: string, property: string, value: string | boolean | number) => void
  onDuplicate: () => void
  onEditDetails: () => void
}) {
  const isYogaWidget = component.id === 'yoga-studio'
  const [activeTab, setActiveTab] = useState<AiWidgetTab>(isYogaWidget ? 'data' : 'general')
  const shrinked = element.properties['Shrinked'] === true
  const canShrink = component.properties.some((p) => p.name === 'Shrinked')
  const isWidgetConnected = isYogaWidget && element.properties['Title'] !== 'Browse classes' && Boolean(element.properties['Title'])

  return (
    <div className="ai-props">
      <div className="ai-props__header">
        <h2 className="ai-props__title">AI Widget Properties</h2>
        <button type="button" className="ai-props__close" onClick={onClose} aria-label="Close">
          <Icon name="xmark" category="general" size={20} />
        </button>
      </div>

      <div className="ai-props__widget-info">
        <div className="ai-props__widget-icon">
          <div className="ai-props__widget-icon-bg">
            {isYogaWidget ? (
              <span className="ai-props__widget-icon-glyph" aria-hidden="true">
                <Icon name="calendar-filled" category="general" size={22} />
              </span>
            ) : (
              <img
                src="/widgets/activity-schedule-icon.png"
                alt=""
                className="ai-props__widget-icon-image"
              />
            )}
          </div>
          <button
            type="button"
            className="ai-props__widget-icon-gear"
            onClick={onEditDetails}
            aria-label="Edit widget details"
          >
            <Icon name="gear-filled" category="general" size={14} />
          </button>
        </div>
        <div className="ai-props__widget-meta">
          <div className="ai-props__widget-name">{displayName}</div>
          <div className="ai-props__widget-subtitle">{displayDescription}</div>
        </div>
      </div>

      <div className="ai-props__tabs" role="tablist">
        {(['general', 'data', 'condition'] as AiWidgetTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            className={`ai-props__tab${activeTab === tab ? ' ai-props__tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
            aria-selected={activeTab === tab}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="ai-props__body">
        {activeTab === 'general' && (
          <>
            {canShrink && (
              <div className="ai-props__row">
                <div className="ai-props__row-text">
                  <div className="ai-props__row-title">Shrink</div>
                  <div className="ai-props__row-desc">Make element smaller.</div>
                </div>
                <button
                  type="button"
                  className={`ai-props__toggle${shrinked ? ' ai-props__toggle--on' : ''}`}
                  onClick={() => onPropertyChange(element.id, 'Shrinked', !shrinked)}
                  aria-pressed={shrinked}
                >
                  <span className="ai-props__toggle-handle" />
                  <span className="ai-props__toggle-label">{shrinked ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            )}
            <div className="ai-props__row ai-props__row--block">
              <div className="ai-props__row-text">
                <div className="ai-props__row-title">Duplicate Element</div>
                <div className="ai-props__row-desc">Clone selected elements with all saved properties.</div>
              </div>
              <button type="button" className="ai-props__duplicate-btn" onClick={onDuplicate}>
                <Icon name="copy-filled" category="general" size={16} />
                <span>Duplicate</span>
              </button>
            </div>
          </>
        )}

        {activeTab === 'data' && (
          <div className="ai-props__data">
            <div className="ai-props__row-text">
              <div className="ai-props__section-title">Connected Tables</div>
              <div className="ai-props__row-desc">This widget shows data from Tables</div>
            </div>
            {isYogaWidget && !isWidgetConnected && (
              <div className="ai-props__table-group">
                <div className="ai-props__table-label">Class Schedule</div>
                <div className="ai-props__table-empty">
                  <div className="ai-props__table-empty-icon">
                    <Icon name="table" category="general" size={20} />
                  </div>
                  <p className="ai-props__table-empty-text">
                    <span className="ai-props__table-empty-strong">Select table</span>
                    {' or '}
                    <span className="ai-props__table-empty-strong">create a new</span>
                    {' one to use data on widget'}
                  </p>
                  <button
                    type="button"
                    className="ai-props__btn ai-props__btn--soft ai-props__table-empty-btn"
                    onClick={() => window.dispatchEvent(new CustomEvent('vai:open-data-picker'))}
                  >
                    Select Table
                  </button>
                </div>
              </div>
            )}
            {isYogaWidget && isWidgetConnected && (
              <div className="ai-props__table-group">
                <div className="ai-props__table-label">Available Sessions</div>
                <div className="ai-props__table-card">
                  <div className="ai-props__table-card-top">
                    <div className="ai-props__table-icon">
                      <Icon name="table" category="general" size={18} />
                    </div>
                    <div className="ai-props__table-name">Available Sessions</div>
                  </div>
                  <div className="ai-props__table-actions">
                    <button type="button" className="ai-props__btn ai-props__btn--primary">Match Field</button>
                    <button type="button" className="ai-props__btn ai-props__btn--ghost">Change Table</button>
                  </div>
                </div>
              </div>
            )}
            {!isYogaWidget && CAMPER_CARD_TABLES.map((t) => (
              <div key={t.id} className="ai-props__table-group">
                <div className="ai-props__table-label">{t.label}</div>
                <div className="ai-props__table-card">
                  <div className="ai-props__table-card-top">
                    <div className="ai-props__table-icon">
                      <Icon name="table" category="general" size={18} />
                    </div>
                    <div className="ai-props__table-name">{t.tableName}</div>
                    <button type="button" className="ai-props__table-open" aria-label="Open table">
                      <Icon name="arrow-up-right-from-square-sm" category="arrows" size={14} />
                    </button>
                  </div>
                  <div className="ai-props__table-actions">
                    <button type="button" className="ai-props__btn ai-props__btn--primary">Match Fields</button>
                    <button type="button" className="ai-props__btn ai-props__btn--ghost">Change Table</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'condition' && (
          <div className="ai-props__empty">
            <div className="ai-props__row-desc">No conditions set.</div>
          </div>
        )}
      </div>
    </div>
  )
}

const AI_TASK_STEPS: readonly { running: string; done: string }[] = [
  { running: 'Analyzing your prompt', done: 'Analyzed your prompt' },
  { running: 'Designing widget structure', done: 'Designed widget structure' },
  { running: 'Generating ActivitySchedule component', done: 'Generated ActivitySchedule component' },
  { running: 'Adding to canvas', done: 'Added to canvas' },
  { running: 'Finalizing widget', done: 'Finalized widget' },
] as const

const AI_STEP_DURATION_MS = 1400

function GeneratingWidgetBanner() {
  return (
    <div className="generating-widget-banner" role="status" aria-live="polite" aria-busy="true">
      <img src={podoAvatar} alt="" className="generating-widget-banner__avatar" />
      <span className="generating-widget-banner__text">Generating widget with AI...</span>
    </div>
  )
}

function BuildWithPodoChip({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="build-with-podo" onClick={onClick} aria-label="Build with Podo">
      <span className="build-with-podo__avatar">
        <img src={podoAvatar} alt="" />
      </span>
      <span className="build-with-podo__text-wrap">
        <span className="build-with-podo__text">Build with Podo</span>
      </span>
      <span className="build-with-podo__talk" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1.5" y="6" width="1.6" height="4" rx="0.8" fill="currentColor" />
          <rect x="4.8" y="3" width="1.6" height="10" rx="0.8" fill="currentColor" />
          <rect x="8.1" y="4.5" width="1.6" height="7" rx="0.8" fill="currentColor" />
          <rect x="11.4" y="6" width="1.6" height="4" rx="0.8" fill="currentColor" />
        </svg>
        <span className="build-with-podo__talk-label">Talk</span>
      </span>
    </button>
  )
}

function AiSparkleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M10.83 2.5 12 6.67 16.17 7.83 12 9 10.83 13.17 9.67 9 5.5 7.83 9.67 6.67z" fill="currentColor"/>
      <path d="M4.58 12.5 5.17 14.42 7.08 15 5.17 15.58 4.58 17.5 4 15.58 2.08 15 4 14.42z" fill="currentColor"/>
      <path d="M15.42 12.08 15.83 13.33 17.08 13.75 15.83 14.17 15.42 15.42 15 14.17 13.75 13.75 15 13.33z" fill="currentColor"/>
    </svg>
  )
}

function PlusIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3.33v9.34M3.33 8h9.34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function MicIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.33a2.33 2.33 0 0 0-2.33 2.34v4.66a2.33 2.33 0 1 0 4.66 0V3.67A2.33 2.33 0 0 0 8 1.33Z" fill="currentColor"/>
      <path d="M3.33 7.33a4.67 4.67 0 0 0 9.34 0M8 12v2.67" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}

function AiWidgetModal({ open, onClose, onGenerate }: { open: boolean; onClose: () => void; onGenerate: (prompt: string) => void }) {
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) setDescription('')
  }, [open])

  if (!open) return null

  const canGenerate = description.trim().length > 0

  const handleGenerate = () => {
    if (!canGenerate) return
    onGenerate(description.trim())
  }

  return (
    <div className="ai-widget-modal__overlay" onClick={onClose}>
      <div className="ai-widget-modal" role="dialog" aria-modal="true" aria-label="Create widget with AI" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="ai-widget-modal__close" onClick={onClose} aria-label="Close">
          <Icon name="xmark" category="general" size={20} />
        </button>
        <div className="ai-widget-modal__body">
          <div className="ai-widget-modal__avatar">
            <img src="/widgets/podo-modal.png" alt="" />
          </div>
          <div className="ai-widget-modal__header-text">
            <div className="ai-widget-modal__title-row">
              <span className="ai-widget-modal__title">Create widget with</span>
              <span className="build-page__ai-widget-badge">AI</span>
            </div>
            <span className="ai-widget-modal__subtitle">Tell your need, get it instantly</span>
          </div>
          <div className="ai-widget-modal__field">
            <textarea
              id="ai-widget-description"
              className="ai-widget-modal__textarea"
              placeholder="e.g A widget with a checkbox list that tracks completion progress automatically"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="ai-widget-modal__toolbar">
              <button type="button" className="ai-widget-modal__plus" aria-label="Add attachment">
                <PlusIcon size={16} />
              </button>
              <div className="ai-widget-modal__actions">
                <button type="button" className="ai-widget-modal__mic" aria-label="Voice input">
                  <MicIcon size={16} />
                </button>
                <button
                  type="button"
                  className="ai-widget-modal__generate"
                  disabled={!canGenerate}
                  onClick={handleGenerate}
                >
                  <AiSparkleIcon size={16} />
                  <span>Generate</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function EditAiWidgetModal({
  open,
  initialName,
  initialDescription,
  onClose,
  onSave,
}: {
  open: boolean
  initialName: string
  initialDescription: string
  onClose: () => void
  onSave: (next: { name: string; description: string }) => void
}) {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)

  useEffect(() => {
    if (!open) return
    setName(initialName)
    setDescription(initialDescription)
  }, [open, initialName, initialDescription])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const trimmedName = name.trim()
  const canSave = trimmedName.length > 0

  const handleSave = () => {
    if (!canSave) return
    onSave({ name: trimmedName, description: description.trim() })
  }

  return (
    <div className="edit-ai-modal__overlay" onClick={onClose}>
      <div
        className="edit-ai-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-ai-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="edit-ai-modal__header">
          <span className="edit-ai-modal__header-icon" aria-hidden="true">
            <Icon name="gear-filled" category="general" size={24} />
          </span>
          <div className="edit-ai-modal__header-text">
            <h2 id="edit-ai-modal-title" className="edit-ai-modal__title">AI Widget Settings</h2>
            <p className="edit-ai-modal__subtitle">Set icon, name, and description.</p>
          </div>
          <button type="button" className="edit-ai-modal__close" onClick={onClose} aria-label="Close">
            <Icon name="xmark" category="general" size={20} />
          </button>
        </div>
        <div className="edit-ai-modal__body">
          <div className="edit-ai-modal__icon-wrap">
            <div className="edit-ai-modal__icon-bg" aria-hidden="true">
              <img
                src="/widgets/activity-schedule-icon.png"
                alt=""
                className="edit-ai-modal__icon-image"
              />
            </div>
            <button
              type="button"
              className="edit-ai-modal__upload"
              aria-label="Upload icon"
            >
              <svg
                className="edit-ai-modal__upload-glyph"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M8 11V3M8 3L4.5 6.5M8 3L11.5 6.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3 13H13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <label className="edit-ai-modal__field">
            <span className="edit-ai-modal__label">Name</span>
            <input
              type="text"
              className="edit-ai-modal__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>
          <label className="edit-ai-modal__field">
            <span className="edit-ai-modal__label">Description</span>
            <input
              type="text"
              className="edit-ai-modal__input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this widget does"
            />
          </label>
        </div>
        <div className="edit-ai-modal__footer">
          <button
            type="button"
            className="edit-ai-modal__btn edit-ai-modal__btn--secondary"
            onClick={onClose}
          >
            Back
          </button>
          <button
            type="button"
            className="edit-ai-modal__btn edit-ai-modal__btn--primary"
            onClick={handleSave}
            disabled={!canSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function ListBulletIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="4" cy="5" r="1" fill="#353C6A"/>
      <circle cx="4" cy="10" r="1" fill="#353C6A"/>
      <circle cx="4" cy="15" r="1" fill="#353C6A"/>
      <rect x="7.5" y="4" width="10" height="2" rx="1" fill="#353C6A"/>
      <rect x="7.5" y="9" width="10" height="2" rx="1" fill="#353C6A"/>
      <rect x="7.5" y="14" width="10" height="2" rx="1" fill="#353C6A"/>
    </svg>
  )
}

function CheckCircleFilledIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="8.25" fill="#18BC30"/>
      <path d="M5.25 9 7.875 11.625 12.75 6.75" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function TaskSpinnerIcon() {
  return (
    <svg className="copilot-panel__task-spinner" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="7.5" stroke="#EDE8FE" strokeWidth="2"/>
      <path d="M9 1.5 A 7.5 7.5 0 0 1 16.5 9" stroke="#7D38EF" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function DashedCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="7.5" stroke="#979DC6" strokeWidth="1.5" strokeDasharray="3 3"/>
    </svg>
  )
}

function WritingConnectorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 0 L10 10 Q10 14 14 14 L20 14" stroke="#C8CEED" strokeWidth="1" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

function AiPencilIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M11.25 3.45 L14.55 6.75 L6.3 15 L3 15 L3 11.7 Z" fill="#7D38EF"/>
      <path d="M12.45 2.25 L13.65 1.05 Q14.4 0.3 15.15 1.05 L16.95 2.85 Q17.7 3.6 16.95 4.35 L15.75 5.55 Z" fill="#7D38EF"/>
      <circle cx="3.5" cy="3.5" r="0.7" fill="#7D38EF"/>
      <circle cx="16" cy="14" r="0.6" fill="#7D38EF"/>
    </svg>
  )
}

function TaskProgressCard({ currentStep }: { currentStep: number }) {
  const total = AI_TASK_STEPS.length
  const completed = Math.min(currentStep, total)
  const progressPercent = (completed / total) * 100

  return (
    <div className="copilot-panel__task-card" role="status" aria-live="polite">
      <div className="copilot-panel__task-card-header">
        <ListBulletIcon />
        <span className="copilot-panel__task-card-title">Task progress</span>
        <span className="copilot-panel__task-card-count">{completed}/{total} completed</span>
      </div>
      <div className="copilot-panel__task-card-bar">
        <div className="copilot-panel__task-card-bar-fill" style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="copilot-panel__task-card-list">
        {AI_TASK_STEPS.map((step, idx) => {
          const state: 'done' | 'active' | 'pending' =
            idx < completed ? 'done' : idx === completed ? 'active' : 'pending'
          return (
            <div key={idx}>
              <div className={`copilot-panel__task-row copilot-panel__task-row--${state}`}>
                <span className="copilot-panel__task-row-icon">
                  {state === 'done' && <CheckCircleFilledIcon />}
                  {state === 'active' && <TaskSpinnerIcon />}
                  {state === 'pending' && <DashedCircleIcon />}
                </span>
                <span className="copilot-panel__task-row-text">
                  {state === 'done' ? step.done : step.running}
                </span>
              </div>
              {state === 'active' && (
                <div className="copilot-panel__task-row copilot-panel__task-row--writing">
                  <span className="copilot-panel__task-row-icon copilot-panel__task-row-icon--connector">
                    <WritingConnectorIcon />
                  </span>
                  <span className="copilot-panel__task-row-icon">
                    <AiPencilIcon />
                  </span>
                  <span className="copilot-panel__task-row-text copilot-panel__task-row-text--shimmer">
                    Writing details...
                  </span>
                  <span className="copilot-panel__task-pill">ActivitySchedule</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TaskCompletedSummary() {
  return (
    <button type="button" className="copilot-panel__task-progress">
      <div className="copilot-panel__task-title">
        <ListBulletIcon />
        <span className="copilot-panel__task-title-text">{AI_TASK_STEPS.length} task completed</span>
      </div>
      <span className="copilot-panel__task-action">Show All</span>
    </button>
  )
}

// Columns picker for the Data Table property panel — drag-and-drop reorder
// with neighbouring rows shifting to open a slot at the drop target.
// Small wrapper so the user can clear the input and type freely. Without an
// internal draft string, a controlled "number" input snaps back to the last
// committed value the moment its raw value becomes invalid (empty, partial,
// leading zero, etc.), which made it feel like the value couldn't be edited.
function ItemsPerPageInput({
  value,
  onCommit,
}: {
  value: number
  onCommit: (next: number) => void
}) {
  const [draft, setDraft] = useState<string>(String(value))
  useEffect(() => {
    setDraft(String(value))
  }, [value])
  const commit = (raw: string) => {
    const n = parseInt(raw, 10)
    if (Number.isNaN(n)) {
      setDraft(String(value))
      return
    }
    const clamped = Math.max(1, Math.min(9999, n))
    setDraft(String(clamped))
    if (clamped !== value) onCommit(clamped)
  }
  return (
    <DSInput
      type="number"
      min={1}
      max={9999}
      value={draft}
      onChange={(e) => {
        const raw = (e.target as HTMLInputElement).value
        setDraft(raw)
        if (raw === '') return
        const n = parseInt(raw, 10)
        if (!Number.isNaN(n) && n >= 1 && n <= 9999 && n !== value) onCommit(n)
      }}
      onBlur={(e) => commit((e.target as HTMLInputElement).value)}
    />
  )
}

const COMMON_COLUMN_FIELDS = [
  'Title', 'Description', 'Image', 'Date', 'Status',
  'Category', 'Price', 'Quantity', 'Email', 'Phone',
  'Address', 'Notes',
] as const

// Maps a column (by its field name) to a leading type icon. Icon names + the
// matching field types mirror the "columns-section" Figma (node 334:3078).
// Heuristic on the name since columns are plain strings.
type ColumnTypeIcon = { name: string; category: string }

function getColumnTypeIcon(name: string): ColumnTypeIcon {
  const n = name.toLowerCase()
  if (/(long text|paragraph|description|notes?|message|comment|bio|about)/.test(n)) return { name: 'text', category: 'general' }
  if (/(number|price|amount|quantity|qty|\bage\b|count|total|score|\bnum\b)/.test(n)) return { name: 'number-square-filled', category: 'general' }
  if (/(phone|tel|mobile|fax)/.test(n)) return { name: 'phone-filled', category: 'communication' }
  if (/(date|time|calendar|day|month|year)/.test(n)) return { name: 'calendar-filled', category: 'time-date' }
  if (/(email|e-mail|\bmail\b)/.test(n)) return { name: 'at', category: 'general' }
  if (/(file|upload|attachment|document|\bdoc\b|pdf)/.test(n)) return { name: 'paperclip-diagonal', category: 'forms-files' }
  if (/(image|photo|picture|avatar|logo)/.test(n)) return { name: 'image-filled', category: 'media' }
  if (/(address|location|city|country|street|zip)/.test(n)) return { name: 'location-pin-filled', category: 'general' }
  if (/(multiple choice|multiple|checkbox|category|status|tags)/.test(n)) return { name: 'tags-filled', category: 'finance' }
  if (/(single choice|single|radio|dropdown|\bselect\b|tag|label|choice|option)/.test(n)) return { name: 'tag-filled', category: 'finance' }
  // Short text / name / title / everything else.
  return { name: 'type-square-filled', category: 'editor' }
}

// At most this many columns may be pinned at once.
const MAX_PINNED_COLUMNS = 2

function DataTableColumnsPicker({
  cols,
  onChange,
  pinned,
  onPinnedChange,
}: {
  cols: string[]
  onChange: (next: string[]) => void
  pinned: string[]
  onPinnedChange: (next: string[]) => void
}) {
  // Minimal state: just track which row is being dragged for the visual cue.
  // Drop math is done locally using the dataTransfer payload + the target row
  // index — no live `insertAt` state that can desync from the DOM.
  const [dragSrc, setDragSrc] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pendingPicks, setPendingPicks] = useState<Set<string>>(() => new Set())
  const [pickerQuery, setPickerQuery] = useState('')
  const pickerWrapRef = useRef<HTMLDivElement | null>(null)

  const pinnedSet = new Set(pinned)
  const pinLimitReached = pinned.length >= MAX_PINNED_COLUMNS

  const removeAt = (idx: number) => {
    const removed = cols[idx]
    onChange(cols.filter((_, i) => i !== idx))
    // Keep pinned state in sync — a removed column can't stay pinned.
    if (pinnedSet.has(removed)) onPinnedChange(pinned.filter((c) => c !== removed))
  }

  const togglePin = (col: string) => {
    if (pinnedSet.has(col)) {
      onPinnedChange(pinned.filter((c) => c !== col))
    } else if (!pinLimitReached) {
      onPinnedChange([...pinned, col])
    }
  }

  const colsSet = new Set(cols)
  const availableFields = COMMON_COLUMN_FIELDS.filter((f) => !colsSet.has(f))
  const filteredAvailable = pickerQuery.trim()
    ? availableFields.filter((f) => f.toLowerCase().includes(pickerQuery.trim().toLowerCase()))
    : availableFields

  const togglePick = (field: string) => {
    setPendingPicks((prev) => {
      const next = new Set(prev)
      if (next.has(field)) next.delete(field)
      else next.add(field)
      return next
    })
  }

  const closePicker = () => {
    setPickerOpen(false)
    setPendingPicks(new Set())
    setPickerQuery('')
  }

  const applyPicks = () => {
    if (pendingPicks.size === 0) return
    onChange([...cols, ...Array.from(pendingPicks)])
    closePicker()
  }

  useEffect(() => {
    if (!pickerOpen) return
    const handleClick = (e: MouseEvent) => {
      if (!pickerWrapRef.current) return
      if (!pickerWrapRef.current.contains(e.target as Node)) closePicker()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [pickerOpen])

  const moveRow = (from: number, to: number) => {
    if (from === to || from < 0 || from >= cols.length || to < 0 || to >= cols.length) return
    const next = [...cols]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }

  return (
    <div className="data-table-columns">
      {cols.map((col, i) => {
        const isSrc = dragSrc === i
        const isOver = dragOver === i && dragSrc !== null && dragSrc !== i
        const rowClass = [
          'data-table-columns__row',
          isSrc && 'is-dragging',
          isOver && 'is-drag-over',
        ]
          .filter(Boolean)
          .join(' ')
        return (
          <div
            key={`${col}-${i}`}
            className={rowClass}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', String(i))
              e.dataTransfer.effectAllowed = 'move'
              // Defer state update so the browser captures the drag image of the
              // un-styled row (otherwise the opacity gets baked into the ghost).
              setTimeout(() => setDragSrc(i), 0)
            }}
            onDragEnd={() => {
              setDragSrc(null)
              setDragOver(null)
            }}
            onDragEnter={() => setDragOver(i)}
            onDragOver={(e) => {
              // Required to allow drop.
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
            }}
            onDragLeave={(e) => {
              // Only clear if we actually left this row (not entered a child).
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOver((prev) => (prev === i ? null : prev))
              }
            }}
            onDrop={(e) => {
              e.preventDefault()
              const raw = e.dataTransfer.getData('text/plain')
              const from = Number(raw)
              if (raw === '' || Number.isNaN(from)) return
              moveRow(from, i)
              setDragSrc(null)
              setDragOver(null)
            }}
          >
            <span className="data-table-columns__drag" aria-hidden="true">
              <Icon name="grid-dots-vertical" category="general" size={20} />
            </span>
            <div className="data-table-columns__item">
              {(() => {
                const typeIcon = getColumnTypeIcon(col)
                return (
                  <span className="data-table-columns__type-icon" aria-hidden="true">
                    <Icon name={typeIcon.name} category={typeIcon.category} size={20} />
                  </span>
                )
              })()}
              <span className="data-table-columns__name">{col}</span>
              {(() => {
                const isPinned = pinnedSet.has(col)
                const disabled = !isPinned && pinLimitReached
                const tip = isPinned
                  ? 'Unpin column'
                  : disabled
                    ? `Max ${MAX_PINNED_COLUMNS} pinned columns`
                    : 'Pin column'
                const pinClass = [
                  'data-table-columns__pin',
                  isPinned && 'is-pinned',
                  disabled && 'is-disabled',
                ]
                  .filter(Boolean)
                  .join(' ')
                return (
                  <button
                    type="button"
                    className={pinClass}
                    aria-label={tip}
                    aria-pressed={isPinned}
                    disabled={disabled}
                    onClick={() => togglePin(col)}
                  >
                    <Icon name={isPinned ? 'thumbtack-vertical-filled' : 'thumbtack-vertical'} size={18} />
                  </button>
                )
              })()}
              <button
                type="button"
                className="data-table-columns__remove"
                aria-label="Remove column"
                onClick={() => removeAt(i)}
              >
                <Icon name="xmark" size={18} />
              </button>
            </div>
          </div>
        )
      })}
      <div className="data-table-columns__add-wrap" ref={pickerWrapRef}>
        <button
          type="button"
          className={`data-table-columns__add${pickerOpen ? ' is-open' : ''}`}
          onClick={() => (pickerOpen ? closePicker() : setPickerOpen(true))}
          aria-expanded={pickerOpen}
          aria-haspopup="listbox"
        >
          <Icon name="plus-circle" category="general" size={20} />
          <span>Add Column</span>
        </button>
        {pickerOpen && (
          <div className="data-table-columns__picker" role="listbox" aria-label="Choose fields to add">
            <div className="data-table-columns__picker-search">
              <Icon name="magnifying-glass" category="general" size={16} />
              <input
                type="text"
                className="data-table-columns__picker-search-input"
                placeholder="Search fields"
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div className="data-table-columns__picker-divider" />
            <div className="data-table-columns__picker-list">
              {filteredAvailable.map((field) => {
                const typeIcon = getColumnTypeIcon(field)
                const checked = pendingPicks.has(field)
                return (
                  <div
                    key={field}
                    className="data-table-columns__picker-row"
                    role="option"
                    aria-selected={checked}
                    onClick={() => togglePick(field)}
                  >
                    <span className="data-table-columns__picker-type-icon" aria-hidden="true">
                      <Icon name={typeIcon.name} category={typeIcon.category} size={20} />
                    </span>
                    <span className="data-table-columns__picker-name">{field}</span>
                    <DSCheckbox
                      label=""
                      checked={checked}
                      readOnly
                      tabIndex={-1}
                      className="data-table-columns__picker-check"
                    />
                  </div>
                )
              })}
            </div>
            <div className="data-table-columns__picker-divider" />
            <div className="data-table-columns__picker-footer">
              <button
                type="button"
                className="data-table-columns__picker-btn"
                onClick={applyPicks}
                disabled={pendingPicks.size === 0}
              >
                {pendingPicks.size > 0 ? `Add (${pendingPicks.size})` : 'Add'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function VisibleAiSuggestionCard({
  title,
  body,
  onAccept,
  onDismiss,
}: {
  title: string
  body: string
  onAccept: () => void
  onDismiss: () => void
}) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) {
    return (
      <div className="vai-suggestion-card vai-suggestion-card--mini">
        <img src={podoAvatar} alt="" className="vai-suggestion-card__avatar" aria-hidden="true" />
        <span className="vai-suggestion-card__mini-text">Tour available when you&rsquo;re ready</span>
        <button type="button" className="vai-suggestion-card__mini-link" onClick={onAccept}>
          Show me around
        </button>
      </div>
    )
  }

  return (
    <div className="vai-suggestion-card">
      <div className="vai-suggestion-card__header">
        <span className="vai-suggestion-card__brand">
          <img src={podoAvatar} alt="" className="vai-suggestion-card__avatar" aria-hidden="true" />
          <span className="vai-suggestion-card__eyebrow">Podo suggests</span>
        </span>
        <button
          type="button"
          className="vai-suggestion-card__close"
          aria-label="Dismiss"
          onClick={() => { setDismissed(true); onDismiss() }}
        >
          <Icon name="xmark" size={16} />
        </button>
      </div>
      <p className="vai-suggestion-card__title">{title}</p>
      <p className="vai-suggestion-card__body">{body}</p>
      <div className="vai-suggestion-card__actions">
        <button type="button" className="vai-suggestion-card__btn vai-suggestion-card__btn--primary" onClick={onAccept}>
          Show me around
        </button>
        <button
          type="button"
          className="vai-suggestion-card__btn"
          onClick={() => { setDismissed(true); onDismiss() }}
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}

function CopilotPanel({
  open,
  onClose,
  attentionTick,
  phase,
  prompt,
  currentStep,
  widgetScoped,
  widgetScopedName,
}: {
  open: boolean
  onClose: () => void
  attentionTick?: number
  phase: 'idle' | 'generating' | 'done'
  prompt: string
  currentStep: number
  widgetScoped: boolean
  widgetScopedName: string
}) {
  const panelRef = useRef<HTMLElement>(null)
  const streamRef = useRef<HTMLDivElement>(null)

  // Auto-scroll the chat stream to the bottom whenever the panel opens in a
  // "done" state — the Visible AI suggestion card lives at the very end and
  // we want it visible on load.
  useEffect(() => {
    if (!open || phase !== 'done') return
    const el = streamRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
  }, [open, phase])

  useEffect(() => {
    if (!attentionTick) return
    const el = panelRef.current
    if (!el) return
    el.classList.remove('copilot-panel--attention')
    // Force reflow so re-adding the class restarts the CSS animation
    void el.offsetWidth
    el.classList.add('copilot-panel--attention')
    const t = window.setTimeout(() => {
      panelRef.current?.classList.remove('copilot-panel--attention')
    }, 1000)
    return () => window.clearTimeout(t)
  }, [attentionTick])

  const isGenerating = phase === 'generating'
  const isDone = phase === 'done'
  const totalDurationSec = Math.round((AI_TASK_STEPS.length * AI_STEP_DURATION_MS) / 1000)

  return (
    <aside ref={panelRef} className={`copilot-panel${open ? ' copilot-panel--open' : ''}`} aria-hidden={!open}>
      <header className="copilot-panel__header">
        <div className="copilot-panel__avatar">
          <img src="/widgets/podo-header.png" alt="" />
        </div>
        <div className="copilot-panel__agent">
          <span className="copilot-panel__agent-name">Podo</span>
          <span className="copilot-panel__ai-badge">AI</span>
        </div>
        <button type="button" className="copilot-panel__close" onClick={onClose} aria-label="Close">
          <Icon name="xmark" category="general" size={20} />
        </button>
      </header>
      <div ref={streamRef} className="copilot-panel__stream">
        {prompt && (
          <div className="copilot-panel__user-message">
            <div className="copilot-panel__user-bubble">{prompt}</div>
          </div>
        )}
        {(isGenerating || isDone) && (
          <div className="copilot-panel__agent-message">
            {isDone && (
              <div className="copilot-panel__thinking">
                <div className="copilot-panel__thinking-avatar">
                  <img src="/widgets/podo-thinking.png" alt="" />
                </div>
                <span className="copilot-panel__thinking-text">Thought for {totalDurationSec}s</span>
              </div>
            )}
            {isGenerating ? (
              <TaskProgressCard currentStep={currentStep} />
            ) : (
              <>
                <p className="copilot-panel__planning-text">
                  I&rsquo;ll build a beautiful mobile app for <strong>Lotus Yoga</strong> with a calming, organic design. Let me start building this.
                </p>
                <button type="button" className="copilot-panel__tasks-summary">
                  <span className="copilot-panel__tasks-summary-left">
                    <Icon name="list-bullets" category="general" size={20} />
                    <span className="copilot-panel__tasks-summary-title">5 tasks completed</span>
                  </span>
                  <span className="copilot-panel__tasks-summary-link">Show All</span>
                </button>
                <p className="copilot-panel__done-text">
                  Your <strong>Lotus Yoga</strong> app is complete! I&rsquo;ve built a beautiful, calming mobile app.
                </p>
                {/* Podo suggest tour gizlendi 2026-06-03
                <VisibleAiSuggestionCard
                  title="Want a quick tour of what you can do next?"
                  body="Your app is ready — now explore how to customize pages, connect real data, create dynamic detail views, and unlock features Copilot doesn't surface automatically."
                  onAccept={() => {
                    onClose()
                    window.dispatchEvent(new CustomEvent('vai:start-list-flow'))
                  }}
                  onDismiss={() => {}}
                />
                */}
              </>
            )}
          </div>
        )}
      </div>
      <div className="copilot-panel__input">
        <div className="copilot-panel__input-container">
          <div className="copilot-panel__input-row">
            {widgetScoped && (
              <span className="copilot-panel__widget-pill" title={widgetScopedName}>
                {widgetScopedName}
              </span>
            )}
            <span className="copilot-panel__input-placeholder">
              <span className="copilot-panel__cursor" aria-hidden="true" />
              {widgetScoped ? 'Modify your widget with Podo...' : 'Ask Podo anything...'}
            </span>
          </div>
          <div className="copilot-panel__input-buttons">
            <button type="button" className="copilot-panel__icon-btn copilot-panel__icon-btn--plus" aria-label="Add attachment">
              <Icon name="plus" category="general" size={16} />
            </button>
            <button type="button" className="copilot-panel__icon-btn copilot-panel__icon-btn--voice" aria-label="Voice">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="3" y="5" width="1.5" height="6" rx="0.75" fill="#fff"/>
                <rect x="6" y="3" width="1.5" height="10" rx="0.75" fill="#fff"/>
                <rect x="9" y="5" width="1.5" height="6" rx="0.75" fill="#fff"/>
                <rect x="12" y="6" width="1.5" height="4" rx="0.75" fill="#fff"/>
              </svg>
            </button>
          </div>
        </div>
        <p className="copilot-panel__disclaimer">
          This chat is recorded. By chatting, you agree to the <a href="https://www.jotform.com/ai-terms/" target="_blank" rel="noreferrer">AI Terms</a>
        </p>
      </div>
    </aside>
  )
}

const SOCIAL_BG_SELECTORS = ['.themes-view__device', '.app-scope']
function SocialIconColorField({
  value,
  onChange,
  tokenVariable = '--bg-fill-brand',
}: {
  value: string
  onChange: (v: string) => void
  tokenVariable?: string
}) {
  const fallback = useResolvedCssVar(tokenVariable, SOCIAL_BG_SELECTORS, '#7D38EF')
  return (
    <ColorPropertyField
      value={value}
      onChange={onChange}
      fallback={fallback}
      placeholder={fallback}
    />
  )
}

function TabMenu({ activeTab, onTabChange }: { activeTab: 'basic' | 'widgets'; onTabChange: (tab: 'basic' | 'widgets') => void }) {
  return (
    <div className="build-page__tab-menu" data-theme="dark">
      <DSTabs
        accent="apps"
        value={activeTab}
        onChange={(v) => onTabChange(v as 'basic' | 'widgets')}
        items={[
          { value: 'basic', label: 'Basic' },
          { value: 'widgets', label: 'Widgets' },
        ]}
      />
    </div>
  )
}

function AddPageDivider({ onClick }: { onClick: () => void }) {
  return (
    <div className="add-page-divider" onClick={(e) => e.stopPropagation()}>
      <div className="add-page-divider__line" />
      <button className="add-page-divider__btn" onClick={onClick}>
        <Icon name="plus-sm" category="general" size={24} />
        <span>Add a Page</span>
      </button>
      <div className="add-page-divider__line" />
    </div>
  )
}

type RightPanelMode = 'preview' | 'designer' | 'properties'

export function BuildPage({ appTitle: appTitleProp = 'App Title', onAppTitleChange, preset, initialPageId, chromeless = false, previewMode = false, onPreviewClose }: { appTitle?: string; onAppTitleChange?: (title: string) => void; preset?: AppPreset; initialPageId?: string; chromeless?: boolean; previewMode?: boolean; onPreviewClose?: () => void }) {
  const [rightPanel, setRightPanel] = useState<RightPanelMode>('preview')
  const [propertyTab, setPropertyTab] = useState<string>('general')
  const appHeaderImageInputRef = useRef<HTMLInputElement>(null)
  const appHeaderBgImageInputRef = useRef<HTMLInputElement>(null)
  const [editItemsOpen, setEditItemsOpen] = useState(false)
  const [selectedElementId, _setSelectedElementId] = useState<string | null>(null)
  const setSelectedElementId = useCallback((next: React.SetStateAction<string | null>) => {
    _setSelectedElementId(next)
    setPropertyTab('general')
  }, [])
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null)
  const [productSearch, setProductSearch] = useState('')
  useEffect(() => { setEditingProductIndex(null); setProductSearch('') }, [selectedElementId, propertyTab])

  const migratedSocialFollowIds = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!selectedElementId) return
    if (migratedSocialFollowIds.current.has(selectedElementId)) return
    const all = [...pagesRef.current.flatMap((p) => p.elements), ...headerActionsRef.current]
    const el = all.find((e) => e.id === selectedElementId)
    if (!el || el.componentId !== 'social-follow') return
    const comp = ComponentRegistry.get('social-follow')
    if (!comp) return
    const updates: Record<string, string | boolean | number> = {}
    for (const prop of comp.properties) {
      const current = el.properties[prop.name]
      if ((current === undefined || current === '') && prop.default !== undefined && prop.default !== '') {
        updates[prop.name] = prop.default as string | boolean | number
      }
    }
    migratedSocialFollowIds.current.add(selectedElementId)
    if (Object.keys(updates).length === 0) return
    setPages((prev) =>
      prev.map((page) => ({
        ...page,
        elements: page.elements.map((e) =>
          e.id === selectedElementId
            ? { ...e, properties: { ...e.properties, ...updates } }
            : e,
        ),
      })),
    )
  }, [selectedElementId])
  const [canvasElementWidth, setCanvasElementWidth] = useState<number | null>(null)
  useEffect(() => {
    if (!selectedElementId) { setCanvasElementWidth(null); return }
    const node = document.querySelector(`[data-element-id="${selectedElementId}"]`) as HTMLElement | null
    if (!node) { setCanvasElementWidth(null); return }
    const measure = () => setCanvasElementWidth(Math.round(node.getBoundingClientRect().width))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(node)
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [selectedElementId])
  const [components, setComponents] = useState<RegisteredComponent[]>(ComponentRegistry.getAll())
  const initial = useRef(buildInitialStateFromPreset(preset)).current
  const [pages, setPages] = useState<AppPage[]>(initial.pages)
  const [headerActions, setHeaderActions] = useState<CanvasElement[]>(initial.headerActions)
  const headerActionsRef = useRef<CanvasElement[]>([])
  useEffect(() => { headerActionsRef.current = headerActions }, [headerActions])
  const [activePageId, setActivePageId] = useState(() => {
    // Resolve initialPageId against the user's actual stored pages. Accepts:
    //   1. an exact page ID match (e.g. "page-3")
    //   2. a 1-based index ("3" → pages[2]) — robust when stored page IDs
    //      drift from the preset (custom IDs after add/delete) so capture
    //      URLs stay stable.
    if (initialPageId) {
      if (initial.pages.some((p: AppPage) => p.id === initialPageId)) return initialPageId
      const idx = Number.parseInt(initialPageId, 10) - 1
      if (Number.isFinite(idx) && idx >= 0 && idx < initial.pages.length) {
        return initial.pages[idx].id
      }
    }
    return initial.activePageId
  })
  const [dragSession, setDragSession] = useState<DragSourceData | null>(null)
  const isDragging = dragSession !== null
  const draggedCanvasId = dragSession?.type === 'canvas' ? dragSession.elementId : null
  const headerActionsSlotRef = useRef<HTMLDivElement>(null)
  const [headerSlotDropState, setHeaderSlotDropState] = useState<'idle' | 'accept' | 'reject'>('idle')
  const [headerDropTarget, setHeaderDropTarget] = useState<DropTarget | null>(null)
  const handleHeaderDropEdgeChange = useCallback<DropEdgeChange>((elementId, edge) => {
    setHeaderDropTarget((prev) => {
      if (edge === null) {
        return prev?.elementId === elementId ? null : prev
      }
      if (prev?.elementId === elementId && prev.edge === edge) return prev
      return { elementId, edge }
    })
  }, [])
  const [leftPanelOpen, setLeftPanelOpen] = useState(false)
  const isYogaPreset = preset?.id === 'yoga-studio'
  const [copilotPanelOpen, setCopilotPanelOpen] = useState(isYogaPreset)
  const [copilotAttentionTick, setCopilotAttentionTick] = useState(0)
  const [copilotWidgetScoped, setCopilotWidgetScoped] = useState(false)
  const [copilotWidgetScopedName, setCopilotWidgetScopedName] = useState('')
  const [mobileElementsSheet, setMobileElementsSheet] = useState(false)
  const [forceTargetPageId, setForceTargetPageId] = useState<string | null>(null)
  const [isMobileView, setIsMobileView] = useState(() => window.matchMedia('(max-width: 768px)').matches)
  const canvasRef = useRef<HTMLElement>(null)

  const pagesRef = useRef<AppPage[]>([])
  useEffect(() => { pagesRef.current = pages }, [pages])
  const activePageIdRef = useRef<string>('page-1')
  useEffect(() => { activePageIdRef.current = activePageId }, [activePageId])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsMobileView(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Visible AI hooks — let the demo overlay navigate pages and populate the
  // most-recently-added List with class data after the user picks a source.
  useEffect(() => {
    const onNavigate = (e: Event) => {
      const detail = (e as CustomEvent).detail as { pageId?: string } | undefined
      if (detail?.pageId) setActivePageId(detail.pageId)
    }
    const onConfigureLastWidget = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        componentId?: string
        items?: Array<{ title: string; description: string; image?: string }>
        title?: string
        variants?: Record<string, string>
        properties?: Record<string, string | number | boolean>
      } | undefined
      const targetCid = detail?.componentId || 'list'
      if (
        !detail ||
        (!detail.items?.length && !detail.title && !detail.variants && !detail.properties)
      ) return
      const pageId = activePageIdRef.current
      setPages((prev) => prev.map((page) => {
        if (page.id !== pageId) return page
        let targetIdx = -1
        for (let i = page.elements.length - 1; i >= 0; i--) {
          if (page.elements[i].componentId === targetCid) { targetIdx = i; break }
        }
        if (targetIdx === -1) return page
        return {
          ...page,
          elements: page.elements.map((el, idx) => {
            if (idx !== targetIdx) return el
            const propUpdates: Record<string, string | number | boolean> = {}
            if (detail.items?.length) {
              propUpdates.Items = JSON.stringify(detail.items)
              propUpdates['Show Header'] = false
            }
            if (detail.title) propUpdates.Title = detail.title
            if (detail.properties) Object.assign(propUpdates, detail.properties)
            const newProps = { ...el.properties, ...propUpdates }
            const newVariants = detail.variants
              ? { ...el.variants, ...detail.variants }
              : el.variants
            return { ...el, properties: newProps, variants: newVariants }
          }),
        }
      }))
    }
    const onAddWidget = (e: Event) => {
      const detail = (e as CustomEvent).detail as { componentId?: string } | undefined
      if (!detail?.componentId) return
      const comp = ComponentRegistry.get(detail.componentId)
      if (!comp) return
      setPages((prev) => {
        const newId = nextElementId(prev, headerActionsRef.current)
        const element = createCanvasElement(comp, newId)
        const pageId = activePageIdRef.current
        return prev.map((page) => {
          if (page.id !== pageId) return page
          return { ...page, elements: [...page.elements, element] }
        })
      })
    }
    const onGenerateWidget = (e: Event) => {
      const detail = (e as CustomEvent).detail as { componentId?: string } | undefined
      if (!detail?.componentId) return
      const comp = ComponentRegistry.get(detail.componentId)
      if (!comp) return
      // Replicates handleAiGenerate's animation: shows GeneratingWidgetBanner
      // on the active page during the AI_TASK_STEPS countdown, then drops the
      // real widget when the last step completes.
      setAiPrompt('Add the Yoga Studio widget to my Classes page')
      setAiPhase('generating')
      setAiCurrentStep(0)
      for (let i = 1; i < AI_TASK_STEPS.length; i++) {
        window.setTimeout(() => setAiCurrentStep(i), AI_STEP_DURATION_MS * i)
      }
      window.setTimeout(() => {
        setAiCurrentStep(AI_TASK_STEPS.length)
        setAiPhase('done')
        const element = createCanvasElement(comp, nextElementId(pagesRef.current))
        setPages((prev) => prev.map((page) =>
          page.id === activePageIdRef.current
            ? { ...page, elements: [...page.elements, element] }
            : page
        ))
        setSelectedElementId(element.id)
        setRightPanel('properties')
      }, AI_STEP_DURATION_MS * AI_TASK_STEPS.length)
    }
    const onSetPropertyTab = (e: Event) => {
      const detail = (e as CustomEvent).detail as { tab?: string } | undefined
      if (!detail?.tab) return
      setPropertyTab(detail.tab as 'general' | 'layout' | 'action' | 'condition' | 'style')
    }
    const onAddPage = (e: Event) => {
      const detail = (e as CustomEvent).detail as { name?: string; icon?: string } | undefined
      const name = detail?.name ?? 'Schedule'
      const icon = detail?.icon ?? 'Calendar'
      const pageId = nextNumericId('page', pagesRef.current.map((p) => p.id))
      const newPage: AppPage = { id: pageId, name, icon, elements: [] }
      setPages((prev) => [...prev, newPage])
      setActivePageId(pageId)
      // Smoothly scroll the canvas down to the freshly-added page so the user
      // sees it land below the existing ones.
      requestAnimationFrame(() => {
        window.setTimeout(() => {
          const el = document.querySelector<HTMLElement>(`[data-page-id="${pageId}"]`)
          const scrollContainer = (isMobileView
            ? document.querySelector('.builder')
            : document.querySelector('.build-page__canvas')) as HTMLElement | null
          if (el && scrollContainer) {
            const rect = el.getBoundingClientRect()
            const containerRect = scrollContainer.getBoundingClientRect()
            scrollContainer.scrollTo({
              top: scrollContainer.scrollTop + rect.top - containerRect.top - 40,
              behavior: 'smooth',
            })
          }
        }, 120)
      })
    }
    // Tour option 1 — open the left element library. Defaults to the Basic tab
    // (so List shows); pass detail.tab='widgets' to surface the AI widget card.
    const onOpenElementPanel = (e: Event) => {
      const detail = (e as CustomEvent).detail as { tab?: 'basic' | 'widgets' } | undefined
      setCopilotPanelOpen(false)
      setSelectedElementId(null)
      setRightPanel('preview')
      setActiveTab(detail?.tab ?? 'basic')
      setLeftPanelOpen(true)
    }
    // Close the left element panel — used by the tour so a step can start with
    // the panel shut and let the user open it via a pointer.
    const onCloseElementPanel = () => {
      setLeftPanelOpen(false)
    }
    // Tour option 2 — open the App Designer panel.
    const onOpenDesignPanel = () => {
      setCopilotPanelOpen(false)
      setLeftPanelOpen(false)
      setSelectedElementId(null)
      setRightPanel('designer')
    }
    window.addEventListener('vai:navigate-to-page', onNavigate as EventListener)
    window.addEventListener('vai:configure-last-widget', onConfigureLastWidget as EventListener)
    window.addEventListener('vai:add-widget', onAddWidget as EventListener)
    window.addEventListener('vai:generate-widget', onGenerateWidget as EventListener)
    window.addEventListener('vai:set-property-tab', onSetPropertyTab as EventListener)
    window.addEventListener('vai:add-page', onAddPage as EventListener)
    window.addEventListener('vai:open-element-panel', onOpenElementPanel as EventListener)
    window.addEventListener('vai:close-element-panel', onCloseElementPanel as EventListener)
    window.addEventListener('vai:open-design-panel', onOpenDesignPanel as EventListener)
    return () => {
      window.removeEventListener('vai:navigate-to-page', onNavigate as EventListener)
      window.removeEventListener('vai:configure-last-widget', onConfigureLastWidget as EventListener)
      window.removeEventListener('vai:add-widget', onAddWidget as EventListener)
      window.removeEventListener('vai:generate-widget', onGenerateWidget as EventListener)
      window.removeEventListener('vai:set-property-tab', onSetPropertyTab as EventListener)
      window.removeEventListener('vai:add-page', onAddPage as EventListener)
      window.removeEventListener('vai:open-element-panel', onOpenElementPanel as EventListener)
      window.removeEventListener('vai:close-element-panel', onCloseElementPanel as EventListener)
      window.removeEventListener('vai:open-design-panel', onOpenDesignPanel as EventListener)
    }
  }, [])

  // Auto-create a Dynamic Page when a List's Card Action becomes "Navigate
  // to Page" — mapped to the first row of the list so the user sees a real
  // mocked detail screen. Then trigger the Visible AI explainer.
  const dynamicPageCreatedRef = useRef(false)
  useEffect(() => {
    if (dynamicPageCreatedRef.current) return
    if (selectedElementId == null) return
    let listEl: CanvasElement | undefined
    for (const page of pages) {
      const el = page.elements.find((e) => e.id === selectedElementId && e.componentId === 'list')
      if (el) { listEl = el; break }
    }
    if (!listEl) return
    if (listEl.properties['Card Action'] !== 'Navigate to Page') return

    // Parse the list's mapped items.
    const raw = listEl.properties['Items']
    let firstItem: { title?: string; description?: string; image?: string } | null = null
    if (typeof raw === 'string' && raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) firstItem = parsed[0]
      } catch {/* fall through */}
    }
    if (!firstItem?.title) return

    dynamicPageCreatedRef.current = true

    const newPageId = 'dynamic-page-1'
    const imageId = `${newPageId}-image`
    const headingId = `${newPageId}-heading`
    const newPage: AppPage = {
      id: newPageId,
      name: 'Dynamic Page',
      icon: 'GitBranch',
      // Match Figma 103:8350 — centered avatar-style image then centered
      // heading + subheading, mapped from the row that triggered navigation.
      elements: [
        {
          id: imageId,
          componentId: 'image',
          variants: { 'Has Image': 'Yes', Alignment: 'Center', Size: 'Large' },
          properties: {
            'Image URL': firstItem.image ?? '',
            'Alt Text': firstItem.title ?? '',
          },
          states: {},
        },
        {
          id: `${newPageId}-spacer`,
          componentId: 'spacer',
          variants: {},
          properties: { Height: 16 },
          states: {},
        },
        {
          id: headingId,
          componentId: 'heading',
          variants: { Size: 'Large', Alignment: 'Center' },
          properties: {
            Heading: firstItem.title,
            Subheading: firstItem.description ?? '',
          },
          states: {},
        },
      ],
    }
    setPages((prev) => {
      if (prev.some((p) => p.id === newPageId)) return prev
      // Insert the dynamic page directly after the page that owns the list,
      // not at the end of the whole app.
      const listPageIdx = prev.findIndex((p) =>
        p.elements.some((e) => e.id === selectedElementId && e.componentId === 'list'),
      )
      if (listPageIdx < 0) return [...prev, newPage]
      return [
        ...prev.slice(0, listPageIdx + 1),
        newPage,
        ...prev.slice(listPageIdx + 1),
      ]
    })
    setActivePageId(newPageId)
    // Smoothly scroll the canvas to the new dynamic page so it lands centered
    // in view, and stay there.
    const scrollToDynamicPage = () => {
      const el = document.querySelector<HTMLElement>(`[data-page-id="${newPageId}"]`)
      const scrollContainer = (isMobileView
        ? document.querySelector('.builder')
        : document.querySelector('.build-page__canvas')) as HTMLElement | null
      if (!el || !scrollContainer) return false
      const rect = el.getBoundingClientRect()
      const containerRect = scrollContainer.getBoundingClientRect()
      const target = scrollContainer.scrollTop + rect.top - containerRect.top - 32
      scrollContainer.scrollTo({ top: target, behavior: 'smooth' })
      return true
    }
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        if (!scrollToDynamicPage()) {
          // Retry once if React hasn't rendered the page yet.
          window.setTimeout(scrollToDynamicPage, 200)
        }
        // Re-anchor after the smooth scroll finishes so nothing yanks us
        // back up if React schedules a render mid-scroll.
        window.setTimeout(scrollToDynamicPage, 750)
        // Trigger the explainer after we've settled on the new page.
        window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent('vai:explain-dynamic-page'))
        }, 950)
      }, 120)
    })
  }, [pages, selectedElementId, isMobileView])

  const appTitle = appTitleProp
  const setAppTitle = (title: string) => onAppTitleChange?.(title)
  const [appSubtitle, setAppSubtitle] = useState(initial.appSubtitle)
  const [appHeaderState, setAppHeaderState] = useState<AppHeaderState>(initial.appHeader)
  const [isPreviewMenuOpen, setIsPreviewMenuOpen] = useState(false)
  const [isMorePageOpen, setIsMorePageOpen] = useState(false)
  const [isPreviewCartOpen, setIsPreviewCartOpen] = useState(false)
  const [isPreviewCheckoutOpen, setIsPreviewCheckoutOpen] = useState(false)
  const [isAvatarPopoverOpen, setIsAvatarPopoverOpen] = useState(false)
  const [isLoginPopoverOpen, setIsLoginPopoverOpen] = useState(false)
  const [loginPopoverView, setLoginPopoverView] = useState<'login' | 'signup'>('login')
  const [isPreviewLoggedIn, setIsPreviewLoggedIn] = useState(false)
  const [viewingAsRole, setViewingAsRole] = useState<'anyone' | 'admin' | 'user'>('admin')
  const [previewDevice, setPreviewDevice] = useState<'phone' | 'tablet' | 'desktop'>('phone')
  const [isLivePreviewVisible, setIsLivePreviewVisible] = useState(true)
  // Slider position is "sticky": only updated when its target slot is visible.
  // Prevents preview content from flashing when designer closes while preview
  // is hidden (slider stays at designer until aside finishes sliding out).
  const [sliderMode, setSliderMode] = useState<'preview' | 'designer'>('preview')
  // When aside visibility flips, snap the slider to its new slot without
  // animation so the user sees a clean aside slide-in/out without the inner
  // slide also transitioning across.
  const [skipSliderTransition, setSkipSliderTransition] = useState(false)
  const prevAsideVisibleRef = useRef(true)
  useLayoutEffect(() => {
    const isAsideVisible = isLivePreviewVisible || rightPanel === 'designer'
    if (prevAsideVisibleRef.current !== isAsideVisible) {
      setSkipSliderTransition(true)
      prevAsideVisibleRef.current = isAsideVisible
    }
    if (rightPanel === 'designer') setSliderMode('designer')
    else if (isLivePreviewVisible) setSliderMode('preview')
  }, [rightPanel, isLivePreviewVisible])
  useEffect(() => {
    if (!skipSliderTransition) return
    const t = setTimeout(() => setSkipSliderTransition(false), 350)
    return () => clearTimeout(t)
  }, [skipSliderTransition])
  const [isQrPopoverOpen, setIsQrPopoverOpen] = useState(false)
  const qrPopoverWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isQrPopoverOpen) return
    const onDocMouseDown = (e: MouseEvent) => {
      if (qrPopoverWrapperRef.current && !qrPopoverWrapperRef.current.contains(e.target as Node)) {
        setIsQrPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [isQrPopoverOpen])

  useEffect(() => {
    if (!preset) return
    // Empty App is a sandbox — never persist its state.
    if (preset.id === 'empty') return
    saveSnapshot(preset.id, {
      appTitle, appSubtitle, pages, headerActions, appHeader: appHeaderState,
    })
  }, [preset, appTitle, appSubtitle, pages, headerActions, appHeaderState])
  const appHeaderRef = useRef<HTMLDivElement>(null)
  const designBtnRef = useRef<HTMLButtonElement>(null)
  const [designBtnOnHeader, setDesignBtnOnHeader] = useState(true)

  // Live preview: track scroll so the top-header chrome can collapse to show
  // its icon + title (iOS large-title pattern) the moment the first page
  // starts scrolling.
  const [previewContentScalerEl, setPreviewContentScalerEl] = useState<HTMLDivElement | null>(null)
  const [isPreviewContentScrolled, setIsPreviewContentScrolled] = useState(false)

  useEffect(() => {
    if (!previewContentScalerEl) {
      setIsPreviewContentScrolled(false)
      return
    }
    const onScroll = () => {
      setIsPreviewContentScrolled(previewContentScalerEl.scrollTop > 0)
    }
    onScroll()
    previewContentScalerEl.addEventListener('scroll', onScroll, { passive: true })
    return () => previewContentScalerEl.removeEventListener('scroll', onScroll)
  }, [previewContentScalerEl])

  // Bottom-nav overflow: when 5+ pages exist, show the first 4 and replace the
  // 5th slot with a "More" tab. Tapping More opens a full-screen list of all
  // pages; tapping a page from that list navigates and dismisses More.
  const hasNavOverflow = pages.length >= 5
  const visibleNavPages = hasNavOverflow ? pages.slice(0, 4) : pages
  const isActiveInOverflow = hasNavOverflow && pages.slice(4).some((p) => p.id === activePageId)
  const bottomNavItems = hasNavOverflow
    ? [...visibleNavPages.map((p, i) => ({ icon: getPageIconName(p, i), label: p.name })), { icon: 'Ellipsis', label: 'More' }]
    : visibleNavPages.map((p, i) => ({ icon: getPageIconName(p, i), label: p.name }))
  const bottomNavActiveIndex = (() => {
    if (hasNavOverflow && (isMorePageOpen || isActiveInOverflow)) return visibleNavPages.length
    const idx = visibleNavPages.findIndex((p) => p.id === activePageId)
    return idx === -1 ? 0 : idx
  })()
  const handleBottomNavClick = (index: number) => {
    if (hasNavOverflow && index === visibleNavPages.length) {
      setIsMorePageOpen(true)
      return
    }
    setIsMorePageOpen(false)
    setActivePageId(visibleNavPages[index].id)
  }
  const handleMorePageSelect = (pageId: string) => {
    setActivePageId(pageId)
    setIsMorePageOpen(false)
  }

  // Top-header compact (app icon + title) shown the moment scrolling starts.
  // On mobile/tablet it's first-page only (AppHeader lives there). Desktop
  // preview promotes every page so the chrome reads "app branding" consistently
  // across pages once you scroll.
  // Keep the element in the DOM 250ms after dismissal so the exit animation runs.
  const previewIsFirstPage = activePageId === pages[0]?.id
  const isDesktopFullPreview = previewMode && previewDevice === 'desktop'
  const showCompactTitle = appHeaderState.show && isPreviewContentScrolled && (previewIsFirstPage || isDesktopFullPreview)
  const [compactTitleInDom, setCompactTitleInDom] = useState(false)
  useEffect(() => {
    if (showCompactTitle) {
      setCompactTitleInDom(true)
      return
    }
    if (!compactTitleInDom) return
    const t = setTimeout(() => setCompactTitleInDom(false), 250)
    return () => clearTimeout(t)
  }, [showCompactTitle, compactTitleInDom])

  useEffect(() => {
    return ComponentRegistry.subscribe(() => {
      setComponents(ComponentRegistry.getAll())
    })
  }, [])

  const isReorderingInHeader =
    dragSession?.type === 'canvas' &&
    headerActions.some((a) => a.id === dragSession.elementId)

  const canDropInHeader = (() => {
    if (!dragSession) return false
    if (!HEADER_ACTION_ALLOWED.includes(dragSession.componentId)) return false
    if (dragSession.type === 'canvas') {
      return isReorderingInHeader || headerActions.length < HEADER_ACTIONS_MAX
    }
    return headerActions.length < HEADER_ACTIONS_MAX
  })()

  const showHeaderDropzone = canDropInHeader && !isReorderingInHeader

  useEffect(() => {
    const el = headerActionsSlotRef.current
    if (!el) return
    if (canDropInHeader) el.classList.add('jf-app-header__actions--drag-active')
    else el.classList.remove('jf-app-header__actions--drag-active')
  }, [canDropInHeader])

  useEffect(() => {
    const el = headerActionsSlotRef.current
    if (!el) return
    return dropTargetForElements({
      element: el,
      canDrop: ({ source }) => {
        const data = source.data as DragSourceData
        if (!HEADER_ACTION_ALLOWED.includes(data.componentId)) return false
        const currentCount = headerActionsRef.current.length
        if (data.type === 'panel') return currentCount < HEADER_ACTIONS_MAX
        if (data.type === 'canvas') {
          const alreadyInSlot = headerActionsRef.current.some((a) => a.id === data.elementId)
          return alreadyInSlot || currentCount < HEADER_ACTIONS_MAX
        }
        return false
      },
      getData: () => ({ type: 'header-actions' }),
      onDragEnter: ({ source }) => {
        const data = source.data as DragSourceData
        const currentCount = headerActionsRef.current.length
        const alreadyInSlot = data.type === 'canvas' && headerActionsRef.current.some((a) => a.id === data.elementId)
        const typeOk = HEADER_ACTION_ALLOWED.includes(data.componentId)
        const countOk = alreadyInSlot || currentCount < HEADER_ACTIONS_MAX
        setHeaderSlotDropState(typeOk && countOk ? 'accept' : 'reject')
      },
      onDragLeave: () => {
        setHeaderSlotDropState('idle')
        setHeaderDropTarget(null)
      },
      onDrop: () => {
        setHeaderSlotDropState('idle')
        setHeaderDropTarget(null)
      },
    })
  }, [])

  const handleCloseDesigner = useCallback(() => {
    setRightPanel('preview')
  }, [])

  useEffect(() => {
    applyStoredOrDefaultTheme(preset?.id === 'empty' ? undefined : preset?.id)
  }, [preset?.id])

  useEffect(() => {
    const builder = document.querySelector('.builder')
    if (!builder) return
    if (rightPanel === 'designer' && isMobileView) {
      builder.classList.add('builder--design-mode')
    } else {
      builder.classList.remove('builder--design-mode')
    }
  }, [rightPanel, isMobileView])

  useEffect(() => {
    const canvas = document.querySelector('.build-page__canvas')
    if (!canvas || !appHeaderRef.current || !designBtnRef.current) return
    const check = () => {
      const headerRect = appHeaderRef.current!.getBoundingClientRect()
      const btnRect = designBtnRef.current!.getBoundingClientRect()
      setDesignBtnOnHeader(btnRect.top + btnRect.height / 2 < headerRect.bottom)
    }
    check()
    canvas.addEventListener('scroll', check, { passive: true })
    return () => canvas.removeEventListener('scroll', check)
  }, [])

  useEffect(() => {
    const builder = document.querySelector('.builder')
    if (!builder) return
    if (mobileElementsSheet && isMobileView) {
      builder.classList.add('builder--elements-sheet')
    } else {
      builder.classList.remove('builder--elements-sheet')
    }
  }, [mobileElementsSheet, isMobileView])

  useEffect(() => {
    const container = appHeaderRef.current
    if (!container) return

    const titleEl = container.querySelector('.jf-app-header__title') as HTMLElement | null
    const subtitleEl = container.querySelector('.jf-app-header__subtitle') as HTMLElement | null

    const fields = [
      { el: titleEl, defaultValue: 'App Title', setter: setAppTitle },
      { el: subtitleEl, defaultValue: '', setter: setAppSubtitle },
    ]

    const cleanups: (() => void)[] = []

    for (const { el, defaultValue, setter } of fields) {
      if (!el) continue

      el.contentEditable = 'true'
      el.style.outline = 'none'
      el.style.cursor = 'text'
      const placeholderText = defaultValue || (el.className.includes('subtitle') ? 'Subtitle' : 'Title')
      el.dataset.placeholder = placeholderText


      const handleFocus = () => {
        if (!el.className.includes('subtitle')) {
          const sub = container.querySelector('.jf-app-header__subtitle') as HTMLElement | null
          if (sub && sub.classList.contains('jf-app-header__subtitle--empty')) {
            sub.classList.remove('jf-app-header__subtitle--empty')
            sub.classList.add('build-page__inline-placeholder')
          }
        }
        if (el.className.includes('subtitle--empty')) {
          el.classList.remove('jf-app-header__subtitle--empty')
        }
        if (defaultValue && el.textContent === defaultValue) {
          el.textContent = ''
          el.classList.add('build-page__inline-placeholder')
        }
        if (!el.textContent) {
          el.classList.add('build-page__inline-placeholder')
        }
      }

      const handleInput = () => {
        if (el.textContent) {
          el.classList.remove('build-page__inline-placeholder')
        } else {
          el.classList.add('build-page__inline-placeholder')
        }
      }

      const handleBlur = () => {
        const newText = el.textContent || ''
        el.classList.remove('build-page__inline-placeholder')
        if (newText) {
          setter(newText)
        } else {
          setter(defaultValue)
          if (defaultValue) {
            el.textContent = defaultValue
          } else if (el.className.includes('subtitle')) {
            el.classList.add('jf-app-header__subtitle--empty')
          }
        }
        if (!el.className.includes('subtitle')) {
          const sub = container.querySelector('.jf-app-header__subtitle') as HTMLElement | null
          if (sub && !sub.textContent) {
            sub.classList.remove('build-page__inline-placeholder')
            sub.classList.add('jf-app-header__subtitle--empty')
          }
        }
      }

      el.addEventListener('focus', handleFocus)
      el.addEventListener('input', handleInput)
      el.addEventListener('blur', handleBlur)
      cleanups.push(() => {
        el.removeEventListener('focus', handleFocus)
        el.removeEventListener('input', handleInput)
        el.removeEventListener('blur', handleBlur)
      })
    }

    return () => cleanups.forEach((fn) => fn())
  }, [appTitle, appSubtitle])

  const [activeTab, setActiveTab] = useState<'basic' | 'widgets'>('basic')
  const [aiWidgetModalOpen, setAiWidgetModalOpen] = useState(false)
  const [aiPhase, setAiPhase] = useState<'idle' | 'generating' | 'done'>(isYogaPreset ? 'done' : 'idle')
  const [aiPrompt, setAiPrompt] = useState(isYogaPreset
    ? 'I want to design a mobile app for Lotus Yoga, a wellness studio that hosts yoga classes and meditation sessions.'
    : '')
  const [aiCurrentStep, setAiCurrentStep] = useState(0)
  const [widgetSearch, setWidgetSearch] = useState('')
  const [editAiOpen, setEditAiOpen] = useState(false)
  const [widgetOverrides, setWidgetOverrides] = useState<Record<string, { name?: string; description?: string }>>({})

  const widgetSearchQuery = widgetSearch.trim().toLowerCase()
  const matchesWidgetSearch = (name: string) =>
    activeTab !== 'widgets' || !widgetSearchQuery || name.toLowerCase().includes(widgetSearchQuery)

  const handleAiGenerate = useCallback((prompt: string) => {
    setAiWidgetModalOpen(false)
    setAiPrompt(prompt)
    setAiPhase('generating')
    setAiCurrentStep(0)
    setSelectedElementId(null)
    setRightPanel('preview')
    setLeftPanelOpen(false)
    setCopilotPanelOpen(true)
    setCopilotWidgetScoped(false)

    const timeouts: number[] = []
    for (let i = 1; i < AI_TASK_STEPS.length; i++) {
      timeouts.push(window.setTimeout(() => setAiCurrentStep(i), AI_STEP_DURATION_MS * i))
    }
    timeouts.push(window.setTimeout(() => {
      setAiCurrentStep(AI_TASK_STEPS.length)
      setAiPhase('done')
      const comp = ComponentRegistry.get('activity-schedule')
      if (!comp) return
      const element = createCanvasElement(comp, nextElementId(pagesRef.current))
      setPages((prev) => prev.map((page) =>
        page.id === activePageId
          ? { ...page, elements: [...page.elements, element] }
          : page
      ))
    }, AI_STEP_DURATION_MS * AI_TASK_STEPS.length))
  }, [activePageId])
  useEffect(() => { setWidgetSearch('') }, [activeTab])

  const componentMap = components.reduce<Record<string, RegisteredComponent>>((acc, comp) => {
    if (!HIDDEN_ELEMENTS.includes(comp.id)) acc[comp.id] = comp
    return acc
  }, {})

  const baseGroups = activeTab === 'basic' ? BASIC_GROUPS : WIDGETS_GROUPS
  const widgetSearchTerm = widgetSearch.trim().toLowerCase()
  const activeGroups = activeTab === 'widgets' && widgetSearchTerm
    ? baseGroups
        .map((g) => ({
          ...g,
          elementIds: g.elementIds.filter((id) => componentMap[id]?.name.toLowerCase().includes(widgetSearchTerm)),
        }))
        .filter((g) => g.elementIds.length > 0)
    : baseGroups

  const handleAddElement = useCallback((comp: RegisteredComponent) => {
    const element = createCanvasElement(comp, nextElementId(pagesRef.current, headerActionsRef.current))
    setPages((prev) => {
      let targetPageId = activePageId
      if (forceTargetPageId) {
        targetPageId = forceTargetPageId
      } else if (selectedElementId) {
        const selectedPage = prev.find((p) => p.elements.some((el) => el.id === selectedElementId))
        if (selectedPage) targetPageId = selectedPage.id
      }
      return prev.map((page) => {
        if (page.id !== targetPageId) return page
        const selectedIdx = selectedElementId && !forceTargetPageId
          ? page.elements.findIndex((el) => el.id === selectedElementId)
          : -1
        if (selectedIdx !== -1) {
          const newElements = [...page.elements]
          newElements.splice(selectedIdx + 1, 0, element)
          return { ...page, elements: newElements }
        }
        return { ...page, elements: [...page.elements, element] }
      })
    })
    setForceTargetPageId(null)
    setSelectedElementId(element.id)
    if (!mobileElementsSheet) {
      setRightPanel('properties')
    }
    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = document.querySelector(`[data-element-id="${element.id}"]`)
        if (!el) return
        const rect = el.getBoundingClientRect()
        const scrollContainer = isMobileView
          ? document.querySelector('.builder')
          : document.querySelector('.build-page__canvas')
        if (!scrollContainer) return
        const containerRect = scrollContainer.getBoundingClientRect()
        const targetY = scrollContainer.scrollTop + rect.top - containerRect.top - containerRect.height / 2 + rect.height / 2
        const start = scrollContainer.scrollTop
        const distance = targetY - start
        const duration = 500
        let startTime: number | null = null
        const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        const step = (timestamp: number) => {
          if (!startTime) startTime = timestamp
          const progress = Math.min((timestamp - startTime) / duration, 1)
          scrollContainer.scrollTop = start + distance * ease(progress)
          if (progress < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      }, 100)
    })
  }, [activePageId, isMobileView, mobileElementsSheet, selectedElementId, forceTargetPageId])

  const handleSelectElement = useCallback((elementId: string) => {
    setSelectedElementId(elementId)
    setMobileElementsSheet(false)
    const page = pagesRef.current.find((p) => p.elements.some((el) => el.id === elementId))
    const el = page?.elements.find((e) => e.id === elementId)
    if (el?.componentId !== 'camper-card' && el?.componentId !== 'activity-schedule') {
      setRightPanel('properties')
    }
  }, [])

  const handleOpenProperties = useCallback((elementId: string) => {
    setSelectedElementId(elementId)
    setRightPanel('properties')
  }, [])

  const handleRemoveElement = useCallback((elementId: string) => {
    setPages((prev) =>
      prev.map((page) => ({
        ...page,
        elements: page.elements.filter((el) => el.id !== elementId),
      }))
    )
    setHeaderActions((prev) => prev.filter((el) => el.id !== elementId))
    setSelectedElementId((prev) => (prev === elementId ? null : prev))
    setRightPanel('preview')
  }, [])

  const handleAddPage = useCallback((afterPageId: string) => {
    const pageId = nextNumericId('page', pagesRef.current.map((p) => p.id))
    const pageNum = pageId.replace(/^page-/, '')
    const newPage: AppPage = {
      id: pageId,
      name: `Page ${pageNum}`,
      elements: [],
    }
    setPages((prev) => {
      const idx = prev.findIndex((p) => p.id === afterPageId)
      const next = [...prev]
      next.splice(idx + 1, 0, newPage)
      return next
    })
    setActivePageId(newPage.id)
    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = document.querySelector(`[data-page-id="${newPage.id}"]`)
        if (!el) return
        const rect = el.getBoundingClientRect()
        const scrollContainer = isMobileView
          ? document.querySelector('.builder')
          : document.querySelector('.build-page__canvas')
        if (!scrollContainer) return
        const containerRect = scrollContainer.getBoundingClientRect()
        const targetY = scrollContainer.scrollTop + rect.top - containerRect.top - containerRect.height / 2 + rect.height / 2
        const start = scrollContainer.scrollTop
        const distance = targetY - start
        const duration = 500
        let startTime: number | null = null
        const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        const step = (timestamp: number) => {
          if (!startTime) startTime = timestamp
          const progress = Math.min((timestamp - startTime) / duration, 1)
          scrollContainer.scrollTop = start + distance * ease(progress)
          if (progress < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      }, 200)
    })
  }, [isMobileView])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedElementId) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        handleRemoveElement(selectedElementId)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedElementId, handleRemoveElement])

  const handleDuplicateElement = useCallback((elementId: string) => {
    setPages((prev) => prev.map((page) => {
      const idx = page.elements.findIndex((el) => el.id === elementId)
      if (idx === -1) return page
      const orig = page.elements[idx]
      const dup: CanvasElement = {
        ...orig,
        id: nextElementId(prev),
        properties: { ...orig.properties },
        variants: { ...orig.variants },
        states: { ...orig.states },
      }
      const elements = [...page.elements]
      elements.splice(idx + 1, 0, dup)
      return { ...page, elements }
    }))
  }, [])

  const handlePropertyChange = useCallback((elementId: string, name: string, value: string | boolean | number) => {
    if (elementId === APP_HEADER_ID) {
      if (name === 'Title') setAppHeaderState((s) => ({ ...s, title: String(value) }))
      else if (name === 'Subtitle') setAppHeaderState((s) => ({ ...s, subtitle: String(value) }))
      else if (name === 'Icon') setAppHeaderState((s) => ({ ...s, icon: String(value) }))
      else if (name === 'Skeleton') setAppHeaderState((s) => ({ ...s, skeleton: Boolean(value) }))
      return
    }
    setPages((prev) =>
      prev.map((page) => ({
        ...page,
        elements: page.elements.map((el) =>
          el.id === elementId
            ? { ...el, properties: { ...el.properties, [name]: value } }
            : el
        ),
      }))
    )
    setHeaderActions((prev) =>
      prev.map((el) =>
        el.id === elementId
          ? { ...el, properties: { ...el.properties, [name]: value } }
          : el
      )
    )
  }, [onAppTitleChange])

  const handleVariantChange = useCallback((elementId: string, group: string, value: string) => {
    if (elementId === APP_HEADER_ID) {
      if (group === 'Layout') setAppHeaderState((s) => ({ ...s, layout: value }))
      return
    }
    setPages((prev) =>
      prev.map((page) => ({
        ...page,
        elements: page.elements.map((el) =>
          el.id === elementId
            ? { ...el, variants: { ...el.variants, [group]: value } }
            : el
        ),
      }))
    )
    setHeaderActions((prev) =>
      prev.map((el) =>
        el.id === elementId
          ? { ...el, variants: { ...el.variants, [group]: value } }
          : el
      )
    )
  }, [])

  useEffect(() => {
    return monitorForElements({
      onDragStart: ({ source }) => {
        const data = source.data as DragSourceData
        setDragSession(data)
        if (data.type === 'panel') {
          setSelectedElementId(null)
          setRightPanel('preview')
        }
      },
      onDrop: ({ source, location }) => {
        setDragSession(null)
        const data = source.data as DragSourceData
        const innerTarget = location.current.dropTargets[0]
        if (!innerTarget) return

        const targetData = innerTarget.data as
          | { type: 'element'; elementId: string; pageId: string }
          | { type: 'page'; pageId: string }
          | { type: 'header-actions' }
          | { type: 'header-action'; elementId: string }

        const edge =
          targetData.type === 'element' || targetData.type === 'header-action'
            ? extractClosestEdge(innerTarget.data)
            : null
        const isHorizontal = edge === 'left' || edge === 'right'

        const withShrinked = (el: CanvasElement, shrinked: boolean): CanvasElement => ({
          ...el,
          properties: { ...el.properties, Shrinked: shrinked },
        })

        // --- Drop onto a specific header action (reorder / insert at position) ---
        if (targetData.type === 'header-action') {
          if (!HEADER_ACTION_ALLOWED.includes(data.componentId)) return
          const targetId = targetData.elementId
          const currentActions = headerActionsRef.current

          // Horizontal drop only valid when source is a Button (SocialFollow is full-width in header)
          const horizontalAllowed = isHorizontal && isHeaderShrinkable(data.componentId)
          const useHorizontal = horizontalAllowed

          if (data.type === 'panel') {
            if (currentActions.length >= HEADER_ACTIONS_MAX) return
            const comp = ComponentRegistry.get(data.componentId)
            if (!comp) return
            const newEl = createCanvasElement(
              comp,
              nextElementId(pagesRef.current, currentActions)
            )
            setHeaderActions((prev) => {
              const idx = prev.findIndex((a) => a.id === targetId)
              if (idx === -1) return [...prev, newEl]
              const next = [...prev]
              if (useHorizontal) {
                next[idx] = withShrinked(next[idx], true)
                const insertAt = edge === 'right' ? idx + 1 : idx
                next.splice(insertAt, 0, withShrinked(newEl, true))
              } else {
                const insertAt = edge === 'bottom' ? idx + 1 : idx
                next.splice(insertAt, 0, newEl)
              }
              return next
            })
            setSelectedElementId(newEl.id)
            setRightPanel('properties')
            return
          }

          if (data.type === 'canvas') {
            const sourceId = data.elementId
            if (sourceId === targetId) return
            const alreadyInSlot = currentActions.some((a) => a.id === sourceId)

            if (alreadyInSlot) {
              // Reorder within header (with optional pairing)
              setHeaderActions((prev) => {
                const srcIdx = prev.findIndex((a) => a.id === sourceId)
                if (srcIdx === -1) return prev
                const partnerIdx = headerPairPartnerIndex(prev, srcIdx)
                // Break existing pair when moving
                let arr = prev.map((el, i) => (i === partnerIdx ? withShrinked(el, false) : el))
                const sourceEl = arr[srcIdx]
                arr = arr.filter((_, i) => i !== srcIdx)
                const tgtIdx = arr.findIndex((a) => a.id === targetId)
                if (tgtIdx === -1) return prev
                if (useHorizontal) {
                  arr[tgtIdx] = withShrinked(arr[tgtIdx], true)
                  const insertAt = edge === 'right' ? tgtIdx + 1 : tgtIdx
                  arr.splice(insertAt, 0, withShrinked(sourceEl, true))
                } else {
                  const insertAt = edge === 'bottom' ? tgtIdx + 1 : tgtIdx
                  arr.splice(insertAt, 0, withShrinked(sourceEl, false))
                }
                return arr
              })
              return
            }

            // Moving from page into header at a specific position
            if (currentActions.length >= HEADER_ACTIONS_MAX) return
            let movingEl: CanvasElement | null = null
            for (const page of pagesRef.current) {
              const found = page.elements.find((el) => el.id === sourceId)
              if (found) { movingEl = found; break }
            }
            if (!movingEl) return
            setPages((prev) =>
              prev.map((page) => ({
                ...page,
                elements: page.elements.filter((el) => el.id !== sourceId),
              }))
            )
            setHeaderActions((prev) => {
              const idx = prev.findIndex((a) => a.id === targetId)
              if (idx === -1) return [...prev, withShrinked(movingEl!, false)]
              const next = [...prev]
              if (useHorizontal) {
                next[idx] = withShrinked(next[idx], true)
                const insertAt = edge === 'right' ? idx + 1 : idx
                next.splice(insertAt, 0, withShrinked(movingEl!, true))
              } else {
                const insertAt = edge === 'bottom' ? idx + 1 : idx
                next.splice(insertAt, 0, withShrinked(movingEl!, false))
              }
              return next
            })
            return
          }
          return
        }

        // --- Header actions slot handling (empty-slot / append) ---
        if (targetData.type === 'header-actions') {
          if (!HEADER_ACTION_ALLOWED.includes(data.componentId)) return
          if (data.type === 'panel') {
            if (headerActionsRef.current.length >= HEADER_ACTIONS_MAX) return
            const comp = ComponentRegistry.get(data.componentId)
            if (!comp) return
            const newEl = createCanvasElement(
              comp,
              nextElementId(pagesRef.current, headerActionsRef.current)
            )
            setHeaderActions((prev) => [...prev, newEl])
            setSelectedElementId(newEl.id)
            setRightPanel('properties')
            return
          }
          if (data.type === 'canvas') {
            const sourceId = data.elementId
            const alreadyInSlot = headerActionsRef.current.some((a) => a.id === sourceId)
            if (!alreadyInSlot && headerActionsRef.current.length >= HEADER_ACTIONS_MAX) return

            if (alreadyInSlot) {
              // Dropping on slot gap (not a specific item) → break any existing
              // pair and move to end of list as non-shrinked.
              setHeaderActions((prev) => {
                const srcIdx = prev.findIndex((a) => a.id === sourceId)
                if (srcIdx === -1) return prev
                const partnerIdx = headerPairPartnerIndex(prev, srcIdx)
                const sourceEl = prev[srcIdx]
                const arr = prev
                  .map((el, i) => (i === partnerIdx ? withShrinked(el, false) : el))
                  .filter((_, i) => i !== srcIdx)
                arr.push(withShrinked(sourceEl, false))
                return arr
              })
              return
            }

            // Pull from pages
            let movingEl: CanvasElement | null = null
            for (const page of pagesRef.current) {
              const found = page.elements.find((el) => el.id === sourceId)
              if (found) { movingEl = found; break }
            }
            if (!movingEl) return
            setPages((prev) =>
              prev.map((page) => ({
                ...page,
                elements: page.elements.filter((el) => el.id !== sourceId),
              }))
            )
            const el = withShrinked(movingEl, false)
            setHeaderActions((prev) => [...prev, el])
            return
          }
          return
        }

        // --- Moving OUT of header slot into page / element ---
        if (data.type === 'canvas' && headerActionsRef.current.some((a) => a.id === data.elementId)) {
          const sourceId = data.elementId
          const movingEl = headerActionsRef.current.find((a) => a.id === sourceId)
          if (!movingEl) return
          setHeaderActions((prev) => prev.filter((a) => a.id !== sourceId))
          const targetPageId = (targetData as { pageId?: string }).pageId
          if (!targetPageId) return
          const sourceEl = withShrinked(movingEl, isHorizontal)
          setPages((prev) =>
            prev.map((page) => {
              if (page.id !== targetPageId) return page
              if (targetData.type === 'page') {
                return { ...page, elements: [...page.elements, sourceEl] }
              }
              const idx = page.elements.findIndex((el) => el.id === (targetData as { elementId: string }).elementId)
              if (idx === -1) return { ...page, elements: [...page.elements, sourceEl] }
              const elements = [...page.elements]
              if (isHorizontal) {
                elements[idx] = withShrinked(elements[idx], true)
                const insertAt = edge === 'right' ? idx + 1 : idx
                elements.splice(insertAt, 0, sourceEl)
              } else {
                const insertAt = edge === 'bottom' ? idx + 1 : idx
                elements.splice(insertAt, 0, sourceEl)
              }
              return { ...page, elements }
            })
          )
          return
        }

        if (data.type === 'panel') {
          const comp = ComponentRegistry.get(data.componentId)
          if (!comp) return
          const newEl = createCanvasElement(comp, nextElementId(pagesRef.current, headerActionsRef.current))
          const targetPageId = (targetData as { pageId: string }).pageId

          setPages((prev) =>
            prev.map((page) => {
              if (page.id !== targetPageId) return page
              if (targetData.type === 'page') {
                return { ...page, elements: [...page.elements, newEl] }
              }
              const idx = page.elements.findIndex((el) => el.id === targetData.elementId)
              if (idx === -1) return { ...page, elements: [...page.elements, newEl] }
              const elements = [...page.elements]
              if (isHorizontal) {
                elements[idx] = withShrinked(elements[idx], true)
                const insertAt = edge === 'right' ? idx + 1 : idx
                elements.splice(insertAt, 0, withShrinked(newEl, true))
              } else {
                const insertAt = edge === 'bottom' ? idx + 1 : idx
                elements.splice(insertAt, 0, newEl)
              }
              return { ...page, elements }
            })
          )
          setSelectedElementId(newEl.id)
          setActivePageId(targetPageId)
          setRightPanel('properties')
          return
        }

        // canvas drag
        if (data.type !== 'canvas') return
        const sourceId = data.elementId
        const currentPages = pagesRef.current
        const sourcePage = currentPages.find((p) =>
          p.elements.some((el) => el.id === sourceId)
        )
        if (!sourcePage) return
        const movingEl = sourcePage.elements.find((el) => el.id === sourceId)
        if (!movingEl) return
        const targetPageId = targetData.pageId

        if (targetData.type === 'element' && targetData.elementId === sourceId) return

        const sourceEl = withShrinked(movingEl, isHorizontal)

        setPages((prev) => {
          let insertIdx: number | null = null
          const withoutSource = prev.map((page) => {
            if (page.id !== sourcePage.id) return page
            const srcIdx = page.elements.findIndex((el) => el.id === sourceId)
            const partnerIdx = pairPartnerIndex(page.elements, srcIdx)
            const elements = page.elements
              .map((el, i) => (i === partnerIdx ? withShrinked(el, false) : el))
              .filter((el) => el.id !== sourceId)
            return { ...page, elements }
          })
          const next = withoutSource.map((page) => {
            if (page.id !== targetPageId) return page
            if (targetData.type === 'page') {
              insertIdx = page.elements.length
              return { ...page, elements: [...page.elements, sourceEl] }
            }
            const idx = page.elements.findIndex((el) => el.id === targetData.elementId)
            if (idx === -1) {
              insertIdx = page.elements.length
              return { ...page, elements: [...page.elements, sourceEl] }
            }
            const elements = [...page.elements]
            if (isHorizontal) {
              elements[idx] = withShrinked(elements[idx], true)
              const insertAt = edge === 'right' ? idx + 1 : idx
              elements.splice(insertAt, 0, sourceEl)
              insertIdx = insertAt
            } else {
              const insertAt = edge === 'bottom' ? idx + 1 : idx
              elements.splice(insertAt, 0, sourceEl)
              insertIdx = insertAt
            }
            return { ...page, elements }
          })
          if (insertIdx === null) return prev
          if (next.length > 1 && next[0].elements.length === 0) {
            const filtered = next.slice(1)
            setActivePageId((cur) => (cur === next[0].id ? filtered[0].id : cur))
            return filtered
          }
          return next
        })
      },
    })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    return autoScrollForElements({ element: canvas })
  }, [])

  let selectedElement: CanvasElement | null = null
  let selectedComponent: RegisteredComponent | null = null
  if (selectedElementId === APP_HEADER_ID) {
    selectedComponent = ComponentRegistry.get('app-header') || null
    if (selectedComponent) {
      selectedElement = {
        id: APP_HEADER_ID,
        componentId: 'app-header',
        variants: { Layout: appHeaderState.layout },
        properties: {
          Icon: appHeaderState.icon,
          Title: appHeaderState.title ?? appTitle,
          Subtitle: appHeaderState.subtitle ?? appSubtitle,
          Skeleton: appHeaderState.skeleton,
        },
        states: {},
      }
    }
  }
  for (const page of pages) {
    if (selectedElement) break
    const found = page.elements.find((el) => el.id === selectedElementId)
    if (found) {
      selectedElement = found
      selectedComponent = ComponentRegistry.get(found.componentId) || null
      break
    }
  }
  if (!selectedElement) {
    const found = headerActions.find((el) => el.id === selectedElementId)
    if (found) {
      selectedElement = found
      selectedComponent = ComponentRegistry.get(found.componentId) || null
    }
  }
  const phoneScreenContent = (
    <>
      <div className="live-preview__status-bar-bg app-scope" />
      <PhoneStatusBar className="live-preview__status-bar app-scope" style={{ color: 'var(--fg-primary, #000)' }} />
      {(isLoginPopoverOpen || isAvatarPopoverOpen) && (
        <div
          className="live-preview__popover-scrim"
          onClick={() => {
            setIsLoginPopoverOpen(false)
            setIsAvatarPopoverOpen(false)
          }}
        />
      )}
      <div className={`live-preview__top-header app-scope${isPreviewContentScrolled ? ' live-preview__top-header--scrolled' : ''}`}>
        {(() => {
          const compactPersistent = previewDevice === 'desktop'
          const compactDomReady = compactTitleInDom || compactPersistent
          const compactExiting = !compactPersistent && compactTitleInDom && !showCompactTitle
          const titleCollapsed = compactPersistent && !showCompactTitle
          if (compactDomReady) {
            const compactClass = [
              'live-preview__top-header-compact',
              compactExiting && 'live-preview__top-header-compact--exiting',
              compactPersistent && 'live-preview__top-header-compact--persistent',
              titleCollapsed && 'live-preview__top-header-compact--icon-only',
            ].filter(Boolean).join(' ')
            return (
              <div className={compactClass}>
                {appHeaderState.imageStyle !== 'None' && (
                  <div className={`live-preview__top-header-compact-icon${appHeaderState.imageStyle === 'Image' && appHeaderState.imageUrl ? ' live-preview__top-header-compact-icon--image' : ''}`}>
                    {appHeaderState.imageStyle === 'Image' && appHeaderState.imageUrl ? (
                      <img src={appHeaderState.imageUrl} alt="" />
                    ) : (
                      <AppIcon name={appHeaderState.icon} size={24} />
                    )}
                  </div>
                )}
                <span className="live-preview__top-header-compact-title">{appTitle}</span>
              </div>
            )
          }
          const activePage = pages.find((p) => p.id === activePageId)
          return isMorePageOpen ? (
            <div className="live-preview__top-header-page">
              <span className="live-preview__top-header-page-name">Menu</span>
            </div>
          ) : activePage ? (
            <div className="live-preview__top-header-page">
              <span className="live-preview__top-header-page-name">{activePage.name}</span>
            </div>
          ) : (
            <span className="live-preview__top-header-btn" aria-hidden="true" />
          )
        })()}
        <nav className="live-preview__top-header-nav">
          {pages.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`live-preview__top-header-nav-link${p.id === activePageId ? ' live-preview__top-header-nav-link--active' : ''}`}
              onClick={() => setActivePageId(p.id)}
            >
              {p.name}
            </button>
          ))}
        </nav>
        <div className="live-preview__top-header-right">
          {pages.some((p) => p.elements.some((el) => el.componentId === 'product-list')) && (
            <LivePreviewCartButton onClick={() => setIsPreviewCartOpen(true)} />
          )}
          {isPreviewLoggedIn ? (
            <>
              <button
                type="button"
                className="live-preview__top-header-avatar-btn"
                aria-label="Account menu"
                onClick={() => setIsAvatarPopoverOpen((v) => !v)}
              >
                <img
                  className="live-preview__top-header-avatar"
                  src={previewUserAvatar}
                  alt=""
                  aria-hidden="true"
                />
              </button>
              <LivePreviewAvatarPopover
                open={isAvatarPopoverOpen}
                onClose={() => setIsAvatarPopoverOpen(false)}
              />
            </>
          ) : (
            <>
              <button
                type="button"
                className="live-preview__top-header-login-btn"
                aria-label="Login"
                onClick={() => setIsLoginPopoverOpen((v) => !v)}
              >
                <Icon name="circle-user-filled" category="users" size={20} />
              </button>
              <div className="live-preview__top-header-auth">
                <AppButton variant="Outlined" size="Small" leftIcon="none" rightIcon="none" label="Login" onClick={() => { setLoginPopoverView('login'); setIsLoginPopoverOpen(true) }} />
                <AppButton variant="Default" size="Small" leftIcon="none" rightIcon="none" label="Sign up" onClick={() => { setLoginPopoverView('signup'); setIsLoginPopoverOpen(true) }} />
              </div>
            </>
          )}
        </div>
      </div>
      {!isPreviewLoggedIn && (
        <LivePreviewLoginPopover
          open={isLoginPopoverOpen}
          onClose={() => setIsLoginPopoverOpen(false)}
          onLoggedIn={() => setIsPreviewLoggedIn(true)}
          initialView={loginPopoverView}
        />
      )}
      <div ref={setPreviewContentScalerEl} className="live-preview__content-scaler app-scope">
        <div className="live-preview__content app-scope">
          {isMorePageOpen ? (
            <LivePreviewMorePagesView
              pages={pages}
              onPageSelect={handleMorePageSelect}
              isLoggedIn={isPreviewLoggedIn}
              onLoginClick={() => { setLoginPopoverView('login'); setIsLoginPopoverOpen(true) }}
              onSignUpClick={() => { setLoginPopoverView('signup'); setIsLoginPopoverOpen(true) }}
            />
          ) : (() => {
            const activePage = pages.find((p) => p.id === activePageId) || pages[0]
            const isFirstPage = activePage?.id === pages[0]?.id
            return activePage ? (
              <>
              {isFirstPage && appHeaderState.show && (
                <div>
                <AppHeader
                  layout={appHeaderState.layout as 'Center' | 'Left' | 'Right'}
                  icon={appHeaderState.icon}
                  imageStyle={appHeaderState.imageStyle}
                  imageUrl={appHeaderState.imageUrl}
                  textColor={appHeaderState.textColor}
                  backgroundImageUrl={appHeaderState.backgroundImageUrl}
                  skeleton={appHeaderState.skeleton}
                  title={appTitle}
                  subtitle={appSubtitle}
                  actions={headerActions.map((el) => {
                    const comp = ComponentRegistry.get(el.componentId)
                    if (!comp) return null
                    const isShrinked = el.componentId === 'button' && el.properties['Shrinked'] === true
                    return (
                      <div
                        key={el.id}
                        className={`live-preview__header-action${isShrinked ? ' live-preview__header-action--shrinked' : ''}`}
                      >
                        {comp.render(el.variants, el.properties, el.states)}
                      </div>
                    )
                  })}
                />
                </div>
              )}
              <div className={`themes-view__canvas${isFirstPage ? ' themes-view__canvas--first' : ''}`}>
                <div className="themes-view__app">
                  {activePage.elements.map((element) => {
                    const comp = ComponentRegistry.get(element.componentId)
                    if (!comp) return null
                    const previewProps = {
                      ...element.properties,
                      'Add New Card': false,
                      // Strip Shrinked in mobile preview so elements stretch full-width.
                      // Button keeps its shrinked state — a full-width button is worse than a compact one.
                      Shrinked: element.componentId === 'button' ? element.properties['Shrinked'] : false,
                    }
                    const isButtonShrinked = element.componentId === 'button' && element.properties['Shrinked'] === true
                    return (
                      <section key={element.id} className={`themes-view__section${isButtonShrinked ? ' themes-view__section--shrinked' : ''}`}>
                        {comp.render(element.variants, previewProps, element.states)}
                      </section>
                    )
                  })}
                </div>
              </div>
              {isFirstPage && !isPreviewCartOpen && !isPreviewCheckoutOpen && (
                <div className="themes-view__attribution-footer">
                  <AttributionBar />
                </div>
              )}
              </>
            ) : null
          })()}
        </div>
      </div>
      {pages.length > 1 && !isPreviewCartOpen && !isPreviewCheckoutOpen && (
        <div className="live-preview__bottom-nav app-scope">
          <BottomNavigation
            items={bottomNavItems}
            activeIndex={bottomNavActiveIndex}
            onItemClick={handleBottomNavClick}
          />
        </div>
      )}
      <img src={phoneHomeIndicator} alt="" className="live-preview__home-indicator" />
      <FormSheet />
      <LivePreviewMenuDrawer
        open={isPreviewMenuOpen}
        onClose={() => setIsPreviewMenuOpen(false)}
        pages={pages}
        activePageId={activePageId}
        onPageSelect={setActivePageId}
        appTitle={appTitle}
        appHeader={appHeaderState}
      />
      <LivePreviewCartPage
        open={isPreviewCartOpen}
        onClose={() => setIsPreviewCartOpen(false)}
        onContinue={() => setIsPreviewCheckoutOpen(true)}
        avatarUrl={previewUserAvatar}
      />
      <LivePreviewCheckoutPage
        open={isPreviewCheckoutOpen}
        onClose={() => setIsPreviewCheckoutOpen(false)}
        avatarUrl={previewUserAvatar}
      />
      <LivePreviewOrderBar
        hidden={isPreviewCartOpen || isPreviewCheckoutOpen}
        hasBottomNav={pages.length > 1}
        onClick={() => setIsPreviewCheckoutOpen(true)}
      />
    </>
  )

  return (
    <>
    {previewMode && (
      <AppPreviewScreen
        device={previewDevice}
        onDeviceChange={setPreviewDevice}
        onBack={() => onPreviewClose?.()}
        appScreen={phoneScreenContent}
        role={viewingAsRole}
        onRoleChange={setViewingAsRole}
      />
    )}
    <div className="build-page">
      {/* Left Panel - Copilot (opens over/in place of app elements) */}
      <CopilotPanel
        open={copilotPanelOpen}
        onClose={() => setCopilotPanelOpen(false)}
        attentionTick={copilotAttentionTick}
        phase={aiPhase}
        prompt={aiPrompt}
        currentStep={aiCurrentStep}
        widgetScoped={copilotWidgetScoped}
        widgetScopedName={copilotWidgetScopedName}
      />
      {/* Left Panel - App Elements */}
      {!chromeless && (
      <aside className={`build-page__left${leftPanelOpen && !copilotPanelOpen ? '' : ' build-page__left--hidden'}`}>

        <div className="build-page__left-header">
          <h2>App Elements</h2>
          <button className="build-page__left-close" onClick={() => setLeftPanelOpen(false)}>
            <Icon name="xmark" size={24} />
          </button>
        </div>
        <TabMenu activeTab={activeTab} onTabChange={setActiveTab} />
        <hr className="build-page__element-divider" />
        <div className="build-page__elements">
          {activeTab === 'widgets' && (
            <div className="build-page__elements-sticky" data-theme="dark">
              <div className="build-page__widget-search-wrapper">
                <SearchInput
                  size="md"
                  placeholder="Search"
                  value={widgetSearch}
                  onChange={(e) => setWidgetSearch(e.target.value)}
                  onClear={() => setWidgetSearch('')}
                />
              </div>
              <AiWidgetCard onClick={() => setAiWidgetModalOpen(true)} />
            </div>
          )}
          {activeGroups.map((group, groupIndex) => {
            const validItems = group.elementIds
              .map((id) => componentMap[id])
              .filter((c): c is RegisteredComponent => Boolean(c))
              .filter((c) => matchesWidgetSearch(c.name))
            if (validItems.length === 0) return null

            return (
              <div key={group.label || groupIndex}>
                {groupIndex > 0 && <hr className="build-page__element-divider" />}
                {group.label && (
                  <div className="build-page__separator">{group.label}</div>
                )}
                {group.label && <hr className="build-page__element-divider" />}
                {validItems.map((comp, itemIndex) => {
                  const iconInfo = ELEMENT_ICON_MAP[comp.id]
                  return (
                    <div key={comp.id}>
                      <DraggablePanelItem comp={comp}>
                        <div
                          className="build-page__element-item"
                          onClick={() => handleAddElement(comp)}
                        >
                          <div className="build-page__element-icon">
                            {iconInfo ? (
                              <Icon name={iconInfo.icon} category={iconInfo.iconCategory} size={24} />
                            ) : (
                              <Icon name="grid-2-filled" category="layout" size={24} />
                            )}
                          </div>
                          <div className="build-page__element-content">
                            <span className="build-page__element-name">{comp.name}</span>
                          </div>
                        </div>
                      </DraggablePanelItem>
                      {itemIndex < validItems.length - 1 && (
                        <hr className="build-page__element-divider" />
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
          {activeTab === 'widgets' && (() => {
            const filteredWidgets = MOCK_WIDGETS.filter((w) => matchesWidgetSearch(w.name))
            if (filteredWidgets.length === 0) return null
            return (
              <>
                <div className="build-page__separator">WIDGETS</div>
                <hr className="build-page__element-divider" />
                {filteredWidgets.map((w, i) => (
                  <div key={w.id}>
                    <div className="build-page__element-item build-page__element-item--widget">
                      <div className="build-page__element-icon build-page__element-icon--color" style={{ background: w.bg }}>
                        {w.render()}
                      </div>
                      <div className="build-page__element-content">
                        <span className="build-page__element-name">{w.name}</span>
                      </div>
                    </div>
                    {i < filteredWidgets.length - 1 && <hr className="build-page__element-divider" />}
                  </div>
                ))}
              </>
            )
          })()}
        </div>
      </aside>
      )}

      {/* Canvas - App Preview (skipped in chromeless mode for capture flows) */}
      {!chromeless && (
      <div className={`build-page__canvas-wrapper${isDragging ? ' build-page__canvas--dragging' : ''}`}>
      <main ref={canvasRef} className="build-page__canvas" onClick={() => {
        setSelectedElementId(null)
        setRightPanel('preview')
      }}>
          {/* Floating Buttons */}
          <div className="build-page__floating-buttons">
            <button className={`build-page__add-element-btn${leftPanelOpen ? ' build-page__add-element-btn--hidden' : ''}`} onClick={(e) => { e.stopPropagation(); if (isMobileView) { setMobileElementsSheet(true); } else { setLeftPanelOpen(true); } }}>
              <Icon name="plus" category="general" size={24} />
              <span className="build-page__add-element-btn-tooltip">Add Element</span>
            </button>
            <button ref={designBtnRef} className={`build-page__design-btn${rightPanel === 'designer' ? ' build-page__design-btn--hidden' : ''}${!designBtnOnHeader ? ' build-page__design-btn--brand' : ''}`} onClick={(e) => {
              e.stopPropagation()
              setSelectedElementId(null)
              setRightPanel('designer')
            }}>
              <Icon name="paint-roller-vertical-filled" category="editor" size={32} />
              <span className="build-page__design-btn-tooltip">App Designer</span>
            </button>
            <button
              className={`build-page__preview-btn${isLivePreviewVisible || rightPanel === 'designer' ? ' build-page__preview-btn--hidden' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                setIsLivePreviewVisible(true)
              }}
            >
              <Icon name="mobile" category="technology" size={32} />
              <span className="build-page__preview-btn-tooltip">Live Preview</span>
            </button>
          </div>
          <div className="app-scope">
            <div className="themes-view__device">
              <div ref={appHeaderRef}>
                {appHeaderState.show && <AppHeader
                  layout={appHeaderState.layout as 'Center' | 'Left' | 'Right'}
                  icon={appHeaderState.icon}
                  imageStyle={appHeaderState.imageStyle}
                  imageUrl={appHeaderState.imageUrl}
                  textColor={appHeaderState.textColor}
                  backgroundImageUrl={appHeaderState.backgroundImageUrl}
                  skeleton={appHeaderState.skeleton}
                  title={appHeaderState.title ?? appTitle}
                  subtitle={appHeaderState.subtitle ?? appSubtitle}
                  iconSelected={selectedElementId === APP_HEADER_ID}
                  onIconClick={(e) => {
                    e.stopPropagation()
                    setSelectedElementId(APP_HEADER_ID)
                    setRightPanel('properties')
                  }}
                  actionsSlotRef={headerActionsSlotRef}
                  actions={
                    <DropEdgeContext.Provider value={handleHeaderDropEdgeChange}>
                      {headerActions.map((element, idx) => {
                        const partnerIdx = headerPairPartnerIndex(headerActions, idx)
                        const partnerId = partnerIdx !== -1 ? headerActions[partnerIdx].id : null
                        const swapEdge: Edge | null = partnerIdx === -1
                          ? null
                          : partnerIdx < idx
                            ? 'right'
                            : 'left'
                        return (
                          <HeaderActionItem
                            key={element.id}
                            element={element}
                            isSelected={selectedElementId === element.id}
                            hideDuringDrag={element.id === draggedCanvasId}
                            isPaired={partnerIdx !== -1}
                            pairPartnerId={partnerId}
                            partnerSwapEdge={swapEdge}
                            onSelect={handleSelectElement}
                            onPropertyChange={handlePropertyChange}
                          />
                        )
                      })}
                      {showHeaderDropzone && (() => {
                        const draggedComp = dragSession ? ComponentRegistry.get(dragSession.componentId) : null
                        return (
                          <div
                            className={`build-page__header-slot-dropzone${
                              headerSlotDropState === 'accept' ? ' build-page__header-slot-dropzone--active' : ''
                            }`}
                          >
                            <Icon name="plus" category="general" size={20} />
                            <span>Drop {draggedComp?.name ?? 'element'} here</span>
                          </div>
                        )
                      })()}
                      <CanvasDropLine target={headerDropTarget} containerRef={headerActionsSlotRef} />
                    </DropEdgeContext.Provider>
                  }
                />}
              </div>

              {pages.map((page, pageIndex) => (
                <div key={page.id}>
                  {page.id === 'dynamic-page-1' && (
                    <div className="dynamic-page-bar" data-page-id={page.id}>
                      <div className="dynamic-page-bar__left">
                        <Icon name="link-horizontal" category="general" size={16} />
                        <span>Dynamic Page</span>
                      </div>
                      <div className="dynamic-page-bar__right">
                        <div className="dynamic-page-bar__source">
                          <Icon name="table" category="general" size={16} />
                          <span>Class Schedule</span>
                        </div>
                        <Icon name="chevron-right" category="arrows" size={14} />
                        <div className="dynamic-page-bar__row">
                          <span>vinyasa-flow-1</span>
                          <Icon name="chevron-down" category="arrows" size={14} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div
                    className={`themes-view__canvas ${pageIndex === 0 ? 'themes-view__canvas--first' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setActivePageId(page.id)
                      if (e.target === e.currentTarget) {
                        setSelectedElementId(null)
                        setRightPanel('preview')
                      }
                    }}
                  >
                    {(() => {
                      const visibleCount = draggedCanvasId
                        ? page.elements.filter((el) => el.id !== draggedCanvasId).length
                        : page.elements.length
                      // The widget-load animation lives on the active page like a
                      // placed widget — it stays put whether or not a generation
                      // was triggered, so the empty drop-state yields to it.
                      const showWidgetLoadHere = page.id === activePageId
                      const virtuallyEmpty = visibleCount === 0 && !showWidgetLoadHere
                      return (
                        <DroppablePage
                          pageId={page.id}
                          showEmptyState={virtuallyEmpty}
                          onEmptyStateClick={(e) => {
                            e.stopPropagation()
                            setActivePageId(page.id)
                            setForceTargetPageId(page.id)
                            setSelectedElementId(null)
                            if (isMobileView) {
                              if (rightPanel === 'designer') setRightPanel('preview')
                              setMobileElementsSheet(true)
                            } else {
                              setLeftPanelOpen(true)
                            }
                          }}
                        >
                          {page.elements.map((element, idx) => {
                            const partnerIdx = pairPartnerIndex(page.elements, idx)
                            const partnerId = partnerIdx !== -1 ? page.elements[partnerIdx].id : null
                            const swapEdge: Edge | null = partnerIdx === -1
                              ? null
                              : partnerIdx < idx
                                ? 'right'
                                : 'left'
                            return (
                              <SortableElement
                                key={element.id}
                                element={element}
                                pageId={page.id}
                                isSelected={selectedElementId === element.id}
                                hideDuringDrag={element.id === draggedCanvasId}
                                isPaired={partnerIdx !== -1}
                                pairPartnerId={partnerId}
                                partnerSwapEdge={swapEdge}
                                onSelect={handleSelectElement}
                                onPropertyChange={handlePropertyChange}
                                onOpenProperties={handleOpenProperties}
                                onRemove={handleRemoveElement}
                                onEditWidget={() => {
                                  const comp = componentMap[element.componentId] ?? ComponentRegistry.get(element.componentId)
                                  const name = widgetOverrides[element.id]?.name ?? comp?.name ?? 'Widget'
                                  setCopilotWidgetScoped(true)
                                  setCopilotWidgetScopedName(name)
                                  if (copilotPanelOpen) {
                                    setCopilotAttentionTick((n) => n + 1)
                                  } else {
                                    setLeftPanelOpen(false)
                                    setCopilotPanelOpen(true)
                                  }
                                }}
                              />
                            )
                          })}
                          {showWidgetLoadHere && (
                            <section className="themes-view__section themes-view__section--center build-page__generating-slot">
                              <WidgetLoadAnimation />
                            </section>
                          )}
                        </DroppablePage>
                      )
                    })()}
                  </div>

                  {(pageIndex > 0 || page.elements.length > 0 || isDragging) && (
                    <AddPageDivider onClick={() => handleAddPage(page.id)} />
                  )}
                </div>
              ))}
              <div className="build-page__attribution">
                <AttributionBar />
              </div>
            </div>
          </div>

      </main>

      {!copilotPanelOpen && (
        <BuildWithPodoChip onClick={() => setCopilotPanelOpen(true)} />
      )}

      {/* Page Navigation Bar */}
      {!isMobileView && pages.length > 1 && (
        <PageNavigationBar
          pages={pages}
          activePageId={activePageId}
          onPageSelect={(pageId) => {
            setActivePageId(pageId)
            requestAnimationFrame(() => {
              const el = document.querySelector(`[data-page-id="${pageId}"]`)
              const scrollContainer = document.querySelector('.build-page__canvas')
              if (!el || !scrollContainer) return
              const containerRect = scrollContainer.getBoundingClientRect()
              const elRect = el.getBoundingClientRect()
              const targetY = scrollContainer.scrollTop + elRect.top - containerRect.top - containerRect.height / 2 + elRect.height / 2
              scrollContainer.scrollTo({ top: targetY, behavior: 'smooth' })
            })
          }}
          onPageReorder={(reordered) => setPages(reordered as AppPage[])}
          onPageRename={(pageId, name) => setPages((prev) => prev.map((p) => p.id === pageId ? { ...p, name } : p))}
          onChangeIcon={(pageId, icon) => setPages((prev) => prev.map((p) => p.id === pageId ? { ...p, icon } : p))}
          onDeletePage={(pageId) => {
            setPages((prev) => {
              const filtered = prev.filter((p) => p.id !== pageId)
              if (filtered.length === 0) return prev
              return filtered
            })
            if (activePageId === pageId) {
              const idx = pages.findIndex((p) => p.id === pageId)
              const next = pages[idx - 1] || pages[idx + 1]
              if (next) setActivePageId(next.id)
            }
          }}
          onAddPage={() => handleAddPage(pages[pages.length - 1].id)}
        />
      )}
      </div>
      )}

      {/* Right Panel - Designer/Properties or Live Preview */}
      <aside className={`build-page__right ${isLivePreviewVisible || rightPanel === 'designer' ? '' : 'build-page__right--hidden'}`}>

        {/* Sliding content wrapper */}
        <div className={`build-page__right-slider${sliderMode === 'designer' ? ' build-page__right-slider--designer' : ''}${skipSliderTransition ? ' build-page__right-slider--no-transition' : ''}`}>

          {/* Slide 1: Live Preview / Properties */}
          <div className="build-page__right-slide">
            {/* Properties Panel — AI widget variant (camper-card / activity-schedule) */}
            {rightPanel === 'properties' && selectedElement && selectedComponent && (selectedComponent.id === 'camper-card' || selectedComponent.id === 'activity-schedule') ? (
              <div className="build-page__properties-layer">
                <AiWidgetPropertiesPanel
                  element={selectedElement}
                  component={selectedComponent}
                  displayName={widgetOverrides[selectedElement.id]?.name ?? selectedComponent.name}
                  displayDescription={widgetOverrides[selectedElement.id]?.description ?? "Track each camper's registration progress and forms."}
                  onClose={() => {
                    setRightPanel('preview')
                    setSelectedElementId(null)
                  }}
                  onPropertyChange={handlePropertyChange}
                  onDuplicate={() => handleDuplicateElement(selectedElement.id)}
                  onEditDetails={() => setEditAiOpen(true)}
                />
              </div>
            ) : rightPanel === 'properties' && selectedElement && selectedComponent ? (
              <div className="build-page__properties" data-theme="dark">
                <div className="property-panel__header">
                  <span className="property-panel__title">{selectedComponent.name} properties</span>
                  <div className="property-panel__header-actions">
                    {selectedElement.id !== APP_HEADER_ID && (
                      <button
                        className="property-panel__close"
                        onClick={() => handleRemoveElement(selectedElement.id)}
                        aria-label="Delete element"
                        title="Delete element"
                      >
                        <Icon name="trash-filled" category="general" size={18} />
                      </button>
                    )}
                    <button
                      className="property-panel__close"
                      onClick={() => {
                        setRightPanel('preview')
                        setSelectedElementId(null)
                      }}
                      aria-label="Close"
                    >
                      <Icon name="xmark" size={20} />
                    </button>
                  </div>
                </div>

                <div className="property-panel__tabs">
                  <DSTabs
                    accent="apps"
                    value={propertyTab}
                    onChange={setPropertyTab}
                    items={
                      selectedComponent.id === 'app-header'
                        ? [
                            { value: 'general', label: 'General' },
                            { value: 'style', label: 'Style' },
                          ]
                        : selectedComponent.id === 'card'
                          ? [
                              { value: 'general', label: 'General' },
                              { value: 'layout', label: 'Layout' },
                              { value: 'action', label: 'Action' },
                              { value: 'condition', label: 'Condition' },
                            ]
                          : selectedComponent.id === 'list'
                            ? [
                                { value: 'general', label: 'General' },
                                { value: 'layout', label: 'Layout' },
                                { value: 'action', label: 'Action' },
                                { value: 'condition', label: 'Condition' },
                              ]
                          : selectedComponent.id === 'data-table'
                            ? [
                                { value: 'general', label: 'General' },
                                { value: 'layout', label: 'Layout' },
                                { value: 'condition', label: 'Condition' },
                              ]
                            : (selectedComponent.id === 'button' || selectedComponent.id === 'image')
                              ? [
                                  { value: 'general', label: 'General' },
                                  { value: 'action', label: 'Action' },
                                  { value: 'condition', label: 'Condition' },
                                ]
                              : selectedComponent.id === 'product-list'
                                ? [
                                    { value: 'general', label: 'General' },
                                    { value: 'products', label: 'Products' },
                                    { value: 'condition', label: 'Condition' },
                                  ]
                                : selectedComponent.id === 'social-follow'
                                  ? [
                                      { value: 'general', label: 'General' },
                                      { value: 'style', label: 'Style' },
                                      { value: 'condition', label: 'Condition' },
                                    ]
                                  : [
                                      { value: 'general', label: 'General' },
                                      { value: 'condition', label: 'Condition' },
                                    ]
                    }
                  />
                </div>

                {(() => {
                  const isAppHeader = selectedComponent.id === 'app-header'

                  // AppHeader's General tab is bespoke (Show toggle + App Title + App Description).
                  if (isAppHeader && propertyTab === 'general') {
                    return (
                      <div className="property-panel__body">
                        <div className="property-panel__field property-panel__field--inline">
                          <DSFormField
                            title="Show App Header"
                            description="Display the header banner on the first page."
                            size="md"
                            showDescription
                            showHelpText={false}
                          >
                            <DSToggle
                              size="md"
                              checked={appHeaderState.show}
                              onChange={(e) => setAppHeaderState((s) => ({ ...s, show: e.target.checked }))}
                            />
                          </DSFormField>
                        </div>
                        <div className="property-panel__field">
                          <DSFormField title="App Title" size="md" showDescription={false} showHelpText={false}>
                            <DSInput
                              value={appTitle}
                              onChange={(e) => setAppTitle(e.target.value)}
                            />
                          </DSFormField>
                        </div>
                        <div className="property-panel__field">
                          <DSFormField title="App Description" size="md" showDescription={false} showHelpText={false}>
                            <DSTextArea
                              size="md"
                              maxLength={240}
                              showCount
                              showDrag={false}
                              placeholder="Add description"
                              value={appSubtitle}
                              onChange={(e) => setAppSubtitle(e.target.value)}
                            />
                          </DSFormField>
                        </div>
                      </div>
                    )
                  }

                  const isCard = selectedComponent.id === 'card'
                  const CARD_LAYOUT_VARIANTS = ['Layout', 'Image Style']
                  const CARD_LAYOUT_PROPS = ['Icon']
                  const CARD_ACTION_PROPS = ['Button Label']

                  const isButton = selectedComponent.id === 'button'
                  const isImage = selectedComponent.id === 'image'
                  const isList = selectedComponent.id === 'list'
                  const isDataTable = selectedComponent.id === 'data-table'
                  const isImageGallery = selectedComponent.id === 'image-gallery'
                  const isProductList = selectedComponent.id === 'product-list'
                  const isSocialFollow = selectedComponent.id === 'social-follow'
                  const socialPlatforms = [
                    { key: 'Facebook', icon: <Icon name="facebook-square-filled" category="brands" size={20} />, placeholder: 'Enter your Facebook username' },
                    { key: 'Youtube', icon: <Icon name="youtube-filled" category="brands" size={20} />, placeholder: 'Enter your YouTube channel URL' },
                    { key: 'Instagram', icon: <Icon name="instagram" category="brands" size={20} />, placeholder: 'Enter your Instagram username' },
                    { key: 'TikTok', icon: <Icon name="tiktok" category="brands" size={20} />, placeholder: 'Enter your TikTok username' },
                    { key: 'X (Twitter)', icon: <Icon name="twitter" category="brands" size={20} />, placeholder: 'Enter your X handle' },
                    { key: 'LinkedIn', icon: <Icon name="linkedin-square-filled" category="brands" size={20} />, placeholder: 'Enter your LinkedIn profile URL' },
                    { key: 'Pinterest', icon: <Icon name="pinterest-circle-filled" category="brands" size={20} />, placeholder: 'Enter your Pinterest username' },
                    { key: 'Tumblr', icon: <Icon name="tumblr-circle-filled" category="brands" size={20} />, placeholder: 'Enter your Tumblr blog name' },
                    { key: 'Vimeo', icon: <Icon name="vimeo-circle-filled" category="brands" size={20} />, placeholder: 'Enter your Vimeo username' },
                    { key: 'Flickr', icon: <Icon name="flickr-circle-filled" category="brands" size={20} />, placeholder: 'Enter your Flickr username' },
                  ]
                  const cardActionOptions = [
                    { value: 'Do Nothing', label: 'Do Nothing', icon: 'minus-sm', iconCategory: 'general' },
                    { value: 'Navigate to Page', label: 'Navigate to Page', icon: 'form-title-filled', iconCategory: 'general' },
                    { value: 'Open Form', label: 'Open Form', icon: 'form-filled', iconCategory: 'forms-files' },
                    { value: 'Open URL', label: 'Open URL', icon: 'link-horizontal', iconCategory: 'general' },
                    { value: 'Send Email', label: 'Send Email', icon: 'envelope-closed-filled', iconCategory: 'communication' },
                    { value: 'Make Call', label: 'Make Call', icon: 'phone-filled', iconCategory: 'communication' },
                  ]
                  const renderCardActionsDropdown = (id: string) => (
                    <div className="property-panel__field">
                      <DSFormField title="Card Actions" size="md" showDescription={false} showHelpText={false}>
                        <DSDropdownSingle
                          value={String(selectedElement.properties['Card Action'] ?? 'Do Nothing')}
                          onChange={(val) => handlePropertyChange(id, 'Card Action', val)}
                          options={cardActionOptions.map((o) => ({
                            value: o.value,
                            label: o.label,
                            leading: <Icon name={o.icon} category={o.iconCategory} size={20} />,
                          }))}
                        />
                      </DSFormField>
                    </div>
                  )

                  // Button & Image: just the Card Actions dropdown.
                  if ((isButton || isImage) && propertyTab === 'action') {
                    return (
                      <div className="property-panel__body">
                        {renderCardActionsDropdown(selectedElement.id)}
                      </div>
                    )
                  }

                  // Image Gallery General tab — bespoke 3x3 layout thumbnail grid.
                  if (isImageGallery && propertyTab === 'general') {
                    const currentLayout = String(selectedElement.variants['Layout'] ?? '2')
                    const GALLERY_LAYOUTS: { id: string; cols: number; rows: number; cells: { col: string; row: string }[] }[] = [
                      { id: '1', cols: 1, rows: 2, cells: [{ col: '1', row: '1' }, { col: '1', row: '2' }] },
                      { id: '2', cols: 2, rows: 2, cells: [{ col: '1', row: '1' }, { col: '2', row: '1' }, { col: '1', row: '2' }, { col: '2', row: '2' }] },
                      { id: '3', cols: 3, rows: 2, cells: [{ col: '1', row: '1' }, { col: '2', row: '1' }, { col: '3', row: '1' }, { col: '1', row: '2' }, { col: '2', row: '2' }, { col: '3', row: '2' }] },
                      { id: '4', cols: 2, rows: 2, cells: [{ col: '1', row: '1 / span 2' }, { col: '2', row: '1' }, { col: '2', row: '2' }] },
                      { id: '5', cols: 2, rows: 2, cells: [{ col: '1', row: '1' }, { col: '2', row: '1 / span 2' }, { col: '1', row: '2' }] },
                      { id: '6', cols: 2, rows: 2, cells: [{ col: '1 / span 2', row: '1' }, { col: '1', row: '2' }, { col: '2', row: '2' }] },
                      { id: '7', cols: 2, rows: 2, cells: [{ col: '1', row: '1' }, { col: '2', row: '1' }, { col: '1 / span 2', row: '2' }] },
                      { id: '8', cols: 4, rows: 4, cells: [{ col: '1 / span 2', row: '1' }, { col: '1 / span 2', row: '2 / span 3' }, { col: '3 / span 2', row: '1 / span 3' }, { col: '3 / span 2', row: '4' }] },
                      { id: '9', cols: 4, rows: 4, cells: [{ col: '1 / span 3', row: '1 / span 2' }, { col: '1', row: '3 / span 2' }, { col: '4', row: '1 / span 2' }, { col: '2 / span 3', row: '3 / span 2' }] },
                    ]
                    return (
                      <div className="property-panel__body">
                        <div className="property-panel__field">
                          <DSFormField title="Layout" size="md" showDescription={false} showHelpText={false}>
                            <div className="gallery-layout-grid">
                              {GALLERY_LAYOUTS.map((l) => {
                                const isActive = currentLayout === l.id
                                const maxDim = Math.max(l.cols, l.rows)
                                const cellSize = maxDim >= 4 ? 7 : maxDim === 3 ? 9 : 11
                                const gap = maxDim >= 4 ? 2 : 3
                                return (
                                  <button
                                    key={l.id}
                                    type="button"
                                    aria-pressed={isActive}
                                    className={`gallery-layout-grid__item${isActive ? ' gallery-layout-grid__item--active' : ''}`}
                                    onClick={() => handleVariantChange(selectedElement.id, 'Layout', l.id)}
                                  >
                                    <div
                                      className="gallery-layout-grid__preview"
                                      style={{
                                        gridTemplateColumns: `repeat(${l.cols}, ${cellSize}px)`,
                                        gridTemplateRows: `repeat(${l.rows}, ${cellSize}px)`,
                                        gap: `${gap}px`,
                                      }}
                                    >
                                      {l.cells.map((c, i) => (
                                        <span
                                          key={i}
                                          className="gallery-layout-grid__cell"
                                          style={{ gridColumn: c.col, gridRow: c.row }}
                                        />
                                      ))}
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          </DSFormField>
                        </div>
                        {(() => {
                          let galleryImages: string[] = []
                          try {
                            const raw = selectedElement.properties['Images']
                            if (typeof raw === 'string' && raw.trim().length > 0) {
                              const parsed = JSON.parse(raw)
                              if (Array.isArray(parsed)) galleryImages = parsed.filter((v) => typeof v === 'string')
                            }
                          } catch (_e) {
                            galleryImages = []
                          }
                          const writeImages = (next: string[]) => handlePropertyChange(selectedElement.id, 'Images', JSON.stringify(next))
                          const inputId = `gallery-input-${selectedElement.id}`
                          const handleFiles = (files: FileList | null) => {
                            if (!files || files.length === 0) return
                            compressImageFiles(files).then((urls) => writeImages([...galleryImages, ...urls]))
                          }
                          return (
                            <div className="property-panel__field">
                              <DSFormField title="Images" size="md" showDescription={false} showHelpText={false}>
                                <input
                                  id={inputId}
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  hidden
                                  onChange={(e) => {
                                    handleFiles(e.target.files)
                                    e.target.value = ''
                                  }}
                                />
                                {galleryImages.length > 0 && (
                                  <div className="gallery-images">
                                    {galleryImages.map((url, i) => (
                                      <div className="gallery-images__item" key={i}>
                                        <img src={url} alt="" />
                                        <button
                                          type="button"
                                          className="gallery-images__remove"
                                          aria-label="Remove image"
                                          onClick={() => writeImages(galleryImages.filter((_, idx) => idx !== i))}
                                        >
                                          <Icon name="trash-filled" category="general" size={14} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <label htmlFor={inputId} className="gallery-images__choose">
                                  Choose Images
                                </label>
                              </DSFormField>
                            </div>
                          )
                        })()}
                      </div>
                    )
                  }

                  // Product List Products tab — list view + inline edit form.
                  if (isProductList && propertyTab === 'products') {
                    type Product = { name: string; price: string; description?: string; image?: string; autoScale?: boolean }
                    const readProducts = (): Product[] => {
                      try {
                        const parsed = JSON.parse(String(selectedElement.properties['Products'] ?? '[]'))
                        return Array.isArray(parsed) ? parsed : []
                      } catch {
                        return []
                      }
                    }
                    const writeProducts = (next: Product[]) => handlePropertyChange(selectedElement.id, 'Products', JSON.stringify(next))
                    const products = readProducts()
                    const currency = String(selectedElement.properties['Currency'] ?? '$')

                    if (editingProductIndex !== null) {
                      const idx = editingProductIndex
                      const isNew = idx === products.length
                      const current: Product = isNew ? { name: '', price: '0.00' } : (products[idx] ?? { name: '', price: '0.00' })
                      const updateField = <K extends keyof Product>(field: K, value: Product[K]) => {
                        const next = [...products]
                        if (isNew) next.push({ ...current, [field]: value })
                        else next[idx] = { ...current, [field]: value }
                        writeProducts(next)
                      }
                      const editInputId = `product-image-${selectedElement.id}`
                      return (
                        <div className="property-panel__body product-edit">
                          <div className="property-panel__field">
                            <DSFormField title="Name" required size="md" showDescription={false} showHelpText={false}>
                              <DSInput
                                value={current.name}
                                placeholder="Product Name"
                                onChange={(e) => updateField('name', e.target.value)}
                              />
                            </DSFormField>
                          </div>
                          <div className="property-panel__field">
                            <DSFormField title="Price" size="md" showDescription={false} showHelpText={false}>
                              <div className="product-edit__price">
                                <DSInput
                                  className="product-edit__price-input"
                                  value={current.price}
                                  placeholder="0.00"
                                  onChange={(e) => updateField('price', e.target.value)}
                                />
                                <DSDropdownSingle
                                  className="product-edit__currency"
                                  value={currency}
                                  onChange={(val) => handlePropertyChange(selectedElement.id, 'Currency', val)}
                                  options={[
                                    { value: '$', label: 'USD' },
                                    { value: '€', label: 'EUR' },
                                    { value: '£', label: 'GBP' },
                                    { value: '₺', label: 'TRY' },
                                    { value: '¥', label: 'JPY' },
                                  ]}
                                />
                              </div>
                            </DSFormField>
                          </div>
                          <div className="property-panel__field">
                            <DSFormField title="Description" size="md" showDescription={false} showHelpText={false}>
                              <textarea
                                className="product-edit__textarea"
                                value={current.description ?? ''}
                                placeholder="Please enter a short description"
                                onChange={(e) => updateField('description', e.target.value)}
                                rows={4}
                              />
                            </DSFormField>
                          </div>
                          <div className="property-panel__field">
                            <DSFormField title="Image" size="md" showDescription={false} showHelpText={false}>
                              <input
                                id={editInputId}
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (!file) return
                                  compressImageFile(file).then((url) => updateField('image', url))
                                  e.target.value = ''
                                }}
                              />
                              {current.image ? (
                                <div className="product-edit__image">
                                  <img src={current.image} alt="" />
                                  <button
                                    type="button"
                                    className="product-edit__image-remove"
                                    onClick={() => updateField('image', undefined)}
                                  >
                                    <Icon name="trash-filled" category="general" size={14} />
                                  </button>
                                </div>
                              ) : (
                                <label htmlFor={editInputId} className="gallery-images__choose">
                                  Choose Images
                                </label>
                              )}
                            </DSFormField>
                          </div>
                          <div className="property-panel__field">
                            <div className="product-edit__inline">
                              <div className="product-edit__inline-text">
                                <span className="product-edit__inline-title">Auto Scale Images</span>
                                <span className="product-edit__inline-desc">Scale image to fill available canvas.</span>
                              </div>
                              <DSToggle
                                size="md"
                                checked={current.autoScale !== false}
                                onChange={(e) => updateField('autoScale', e.target.checked)}
                              />
                            </div>
                          </div>
                          <div className="product-edit__footer">
                            <DSButton
                              variant="filled"
                              colorScheme="secondary"
                              size="lg"
                              leftIcon={<Icon name="caret-left" category="arrows" size={20} />}
                              onClick={() => setEditingProductIndex(null)}
                              className="product-edit__back-btn"
                            >
                              Go Back
                            </DSButton>
                          </div>
                        </div>
                      )
                    }

                    const filtered = productSearch.trim().length > 0
                      ? products.map((p, i) => ({ p, i })).filter(({ p }) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                      : products.map((p, i) => ({ p, i }))

                    return (
                      <div className="property-panel__body product-list-panel">
                        <div className="property-panel__field">
                          <DSSearchInput
                            placeholder="Search products"
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            onClear={() => setProductSearch('')}
                          />
                        </div>
                        <div className="product-list-rows">
                          {filtered.map(({ p, i }) => (
                            <button
                              key={i}
                              type="button"
                              className="product-list-row"
                              onClick={() => setEditingProductIndex(i)}
                            >
                              <Icon name="grid-dots" category="general" size={16} className="product-list-row__handle" />
                              <div className="product-list-row__card">
                                <div className="product-list-row__image">
                                  {p.image ? (
                                    <img src={p.image} alt="" />
                                  ) : (
                                    <Icon name="image-filled" category="media" size={20} />
                                  )}
                                </div>
                                <div className="product-list-row__name">{p.name || 'Untitled'}</div>
                                <div className="product-list-row__price">
                                  {p.price && Number(p.price) > 0 ? `${currency}${p.price}` : 'Free'}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="product-list-row__delete"
                                aria-label="Delete product"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  writeProducts(products.filter((_, idx) => idx !== i))
                                }}
                              >
                                <Icon name="trash-filled" category="general" size={16} />
                              </button>
                            </button>
                          ))}
                        </div>
                        <div className="product-list-panel__footer">
                          <DSButton
                            variant="filled"
                            colorScheme="primary"
                            size="lg"
                            leftIcon={<Icon name="plus" category="general" size={20} />}
                            onClick={() => setEditingProductIndex(products.length)}
                            className="product-list-panel__add-btn"
                          >
                            Add Product
                          </DSButton>
                        </div>
                      </div>
                    )
                  }

                  // Image General tab — bespoke upload area + alignment/size when image is set.
                  if (isImage && propertyTab === 'general') {
                    const imageUrl = String(selectedElement.properties['Image URL'] ?? '')
                    const imageName = String(selectedElement.properties['Image Name'] ?? '')
                    const hasImage = imageUrl.length > 0
                    const inputId = `image-input-${selectedElement.id}`

                    const setImage = (url: string, name: string) => {
                      handlePropertyChange(selectedElement.id, 'Image URL', url)
                      handlePropertyChange(selectedElement.id, 'Image Name', name)
                      handleVariantChange(selectedElement.id, 'Has Image', url ? 'Yes' : 'No')
                      if (url) {
                        handlePropertyChange(selectedElement.id, 'Width', '')
                        handlePropertyChange(selectedElement.id, 'Height', 450)
                      }
                    }

                    return (
                      <div className="property-panel__body">
                        <div className="property-panel__field">
                          <DSFormField title="Image" size="md" showDescription={false} showHelpText={false}>
                            <input
                              id={inputId}
                              type="file"
                              accept="image/*"
                              hidden
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                compressImageFile(file).then((url) => setImage(url, file.name))
                                e.target.value = ''
                              }}
                            />
                            {hasImage ? (
                              <div className="image-preview">
                                <div
                                  className="image-preview__thumb"
                                  style={{ backgroundImage: `url(${imageUrl})` }}
                                />
                                <span className="image-preview__name" title={imageName}>
                                  {imageName || 'image'}
                                </span>
                                <button
                                  type="button"
                                  className="image-preview__remove"
                                  aria-label="Remove image"
                                  onClick={() => setImage('', '')}
                                >
                                  <Icon name="trash-filled" category="general" size={16} />
                                </button>
                              </div>
                            ) : (
                              <div className="upload-area">
                                <DSButton
                                  variant="filled"
                                  colorScheme="secondary"
                                  shape="rectangle"
                                  size="md"
                                  leftIcon={<Icon name="image-plus-filled" category="media" size={16} />}
                                  onClick={() => document.getElementById(inputId)?.click()}
                                >
                                  Choose File
                                </DSButton>
                                <span className="upload-area__hint">OR DRAG AND DROP HERE</span>
                              </div>
                            )}
                          </DSFormField>
                        </div>
                        {hasImage && (
                          <>
                            <div className="property-panel__field">
                              <DSFormField title="Size" size="md" showDescription={false} showHelpText={false}>
                                <div className="image-size">
                                  <div className="image-size__input">
                                    <DSNumberInput
                                      unit="PX"
                                      showUnit
                                      min={1}
                                      max={9999}
                                      placeholder={canvasElementWidth ? String(canvasElementWidth) : 'Auto'}
                                      value={Number(selectedElement.properties['Width']) > 0 ? Number(selectedElement.properties['Width']) : undefined}
                                      onChange={(val) => handlePropertyChange(selectedElement.id, 'Width', val ?? '')}
                                      description="Width"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    className="image-size__lock"
                                    aria-label="Lock aspect ratio"
                                    aria-pressed={Boolean(selectedElement.properties['Aspect Locked'])}
                                    onClick={() => handlePropertyChange(selectedElement.id, 'Aspect Locked', !selectedElement.properties['Aspect Locked'])}
                                  >
                                    <Icon name="lock-filled" category="security" size={16} />
                                  </button>
                                  <div className="image-size__input">
                                    <DSNumberInput
                                      unit="PX"
                                      showUnit
                                      min={1}
                                      max={9999}
                                      value={Number(selectedElement.properties['Height']) > 0 ? Number(selectedElement.properties['Height']) : undefined}
                                      onChange={(val) => handlePropertyChange(selectedElement.id, 'Height', val ?? '')}
                                      description="Height"
                                    />
                                  </div>
                                </div>
                              </DSFormField>
                            </div>
                            <div className="property-panel__field">
                              <DSFormField
                                title="Image Alignment"
                                description="Select how the image is aligned horizontally."
                                size="md"
                                showDescription
                                showHelpText={false}
                              >
                                <Segmented
                                  accent="apps"
                                  variant="text"
                                  value={String(selectedElement.variants['Alignment'] ?? 'Center')}
                                  onChange={(val) => handleVariantChange(selectedElement.id, 'Alignment', val)}
                                  items={[
                                    { value: 'Left', label: 'Left' },
                                    { value: 'Center', label: 'Center' },
                                    { value: 'Right', label: 'Right' },
                                  ]}
                                />
                              </DSFormField>
                            </div>
                            <div className="property-panel__field">
                              <DSFormField
                                title="Alternative Text"
                                description="Shown if the image fails to load."
                                size="md"
                                showDescription
                                showHelpText={false}
                              >
                                <DSInput
                                  placeholder="Description of the image"
                                  value={String(selectedElement.properties['Alt Text'] ?? '')}
                                  onChange={(e) => handlePropertyChange(selectedElement.id, 'Alt Text', e.target.value)}
                                />
                              </DSFormField>
                            </div>
                            <div className="property-panel__field property-panel__field--inline">
                              <DSFormField
                                title="Shrink"
                                description="Make element smaller."
                                size="md"
                                showDescription
                                showHelpText={false}
                              >
                                <DSToggle
                                  size="md"
                                  checked={Boolean(selectedElement.properties['Shrinked'])}
                                  onChange={(e) => handlePropertyChange(selectedElement.id, 'Shrinked', e.target.checked)}
                                />
                              </DSFormField>
                            </div>
                            <div className="property-panel__field">
                              <DSFormField
                                title="Duplicate Element"
                                description="Clone selected elements with all saved properties."
                                size="md"
                                showDescription
                                showHelpText={false}
                              >
                                <DSButton
                                  variant="filled"
                                  colorScheme="secondary"
                                  shape="rectangle"
                                  size="md"
                                  leftIcon={<Icon name="copy-filled" category="general" size={16} />}
                                >
                                  Duplicate
                                </DSButton>
                              </DSFormField>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  }

                  // List General tab — bespoke per Figma (Show Header, Data Source, Field mapping, Filter/Sorting, Items to show).
                  if (isList && propertyTab === 'general') {
                    return (
                      <div className="property-panel__body">
                        <div className="property-panel__field">
                          <DSFormField
                            title="Data Source"
                            description={
                              <>
                                This list shows data from App Tables{' '}
                                <DSLink
                                  href="#"
                                  size="sm"
                                  rightIcon={<Icon name="arrow-up-right-from-square" category="arrows" size={14} />}
                                >
                                  Open
                                </DSLink>
                              </>
                            }
                            size="md"
                            showDescription
                            showHelpText={false}
                          >
                            <div className="list-general__data-source">
                              {(() => {
                                const dataSource = String(selectedElement.properties['Data Source'] ?? 'New Table')
                                const checkIcon = <Icon name="check" category="general" size={20} />
                                return (
                                  <DSDropdownSingle
                                    value={dataSource}
                                    onChange={(val) => handlePropertyChange(selectedElement.id, 'Data Source', val)}
                                    options={[
                                      {
                                        value: 'New Table',
                                        label: 'New Table',
                                        leading: <Icon name="table" category="general" size={20} />,
                                        trailing: dataSource === 'New Table' ? checkIcon : undefined,
                                      },
                                      {
                                        value: 'Our Team',
                                        label: 'Our Team',
                                        leading: <Icon name="table" category="general" size={20} />,
                                        trailing: dataSource === 'Our Team' ? checkIcon : undefined,
                                      },
                                      {
                                        value: 'New app table',
                                        label: 'New app table',
                                        leading: <Icon name="plus-circle" category="general" size={20} />,
                                        divider: true,
                                      },
                                    ]}
                                  />
                                )
                              })()}
                              <DSButton
                                variant="filled"
                                colorScheme="secondary"
                                shape="rectangle"
                                size="md"
                                leftIcon={<Icon name="pencil-to-square" category="general" size={16} />}
                                onClick={() => setEditItemsOpen(true)}
                              >
                                Edit Table
                              </DSButton>
                            </div>
                          </DSFormField>
                        </div>
                        {selectedComponent.id !== 'data-table' && (() => {
                          const fieldOptions = [
                            { value: 'Title', label: 'Title', icon: 'type-square-filled', iconCategory: 'editor' },
                            { value: 'Description', label: 'Description', icon: 'type-square-filled', iconCategory: 'editor' },
                            { value: 'Image', label: 'Image', icon: 'paperclip-diagonal', iconCategory: 'forms-files' },
                          ]
                          const labelFor = (val: string) => fieldOptions.find((o) => o.value === val) ?? fieldOptions[0]

                          const readTokens = (propKey: string, defaultLabel: string): FieldToken[] => {
                            const raw = selectedElement.properties[propKey]
                            if (typeof raw === 'string' && raw.startsWith('[')) {
                              try { return JSON.parse(raw) as FieldToken[] } catch { /* fall through */ }
                            }
                            const opt = labelFor(defaultLabel)
                            return [{ type: 'field', value: opt.value, label: opt.label, icon: opt.icon, iconCategory: opt.iconCategory }]
                          }

                          const writeTokens = (propKey: string, tokens: FieldToken[]) => {
                            handlePropertyChange(selectedElement.id, propKey, JSON.stringify(tokens))
                          }

                          const renderComposerRow = (title: string, propKey: string, defaultLabel: string) => {
                            const tokens = readTokens(propKey, defaultLabel)
                            return (
                              <div className="property-panel__field" key={propKey}>
                                <DSFormField title={title} size="md" showDescription={false} showHelpText={false}>
                                  <DSFieldComposer
                                    value={tokens}
                                    onChange={(t) => writeTokens(propKey, t)}
                                    options={fieldOptions}
                                    onCreate={() => {}}
                                    placeholder="Type or insert a field…"
                                  />
                                </DSFormField>
                              </div>
                            )
                          }

                          const renderMapperRow = (title: string, propKey: string, defaultVal: string) => {
                            const selected = String(selectedElement.properties[propKey] ?? defaultVal)
                            const opt = labelFor(selected)
                            return (
                              <div className="property-panel__field" key={propKey}>
                                <DSFormField title={title} size="md" showDescription={false} showHelpText={false}>
                                  <DSFieldMapper
                                    field={{ label: opt.label, icon: opt.icon, iconCategory: opt.iconCategory }}
                                    options={fieldOptions}
                                    value={selected}
                                    onChange={(val) => handlePropertyChange(selectedElement.id, propKey, val)}
                                    onCreate={() => {}}
                                    onAdd={() => {}}
                                  />
                                </DSFormField>
                              </div>
                            )
                          }

                          return (
                            <>
                              {renderComposerRow('Title', 'Field Title', 'Title')}
                              {renderComposerRow('Description', 'Field Description', 'Description')}
                              {renderMapperRow('Image', 'Field Image', 'Image')}
                            </>
                          )
                        })()}
                        <div className="property-panel__field property-panel__field--inline">
                          <DSFormField title="Filter" size="md" showDescription={false} showHelpText={false}>
                            <DSToggle
                              size="md"
                              checked={Boolean(selectedElement.properties['Filter'])}
                              onChange={(e) => handlePropertyChange(selectedElement.id, 'Filter', e.target.checked)}
                            />
                          </DSFormField>
                        </div>
                        <div className="property-panel__field property-panel__field--inline">
                          <DSFormField title="Sorting" size="md" showDescription={false} showHelpText={false}>
                            <DSToggle
                              size="md"
                              checked={Boolean(selectedElement.properties['Sorting'])}
                              onChange={(e) => handlePropertyChange(selectedElement.id, 'Sorting', e.target.checked)}
                            />
                          </DSFormField>
                        </div>
                        <div className="property-panel__field">
                          <DSFormField
                            title="Items to show"
                            description="How many list items to show at first"
                            size="md"
                            showDescription
                            showHelpText={false}
                          >
                            <DSNumberInput
                              showUnit={false}
                              min={1}
                              max={999}
                              value={Number(selectedElement.properties['Items to show']) || 10}
                              onChange={(val) => handlePropertyChange(selectedElement.id, 'Items to show', val ?? 10)}
                            />
                          </DSFormField>
                        </div>
                        <div className="property-panel__field property-panel__field--inline">
                          <DSFormField
                            title="Show Header"
                            description="Display a header above the list items."
                            size="md"
                            showDescription
                            showHelpText={false}
                          >
                            <DSToggle
                              size="md"
                              checked={Boolean(selectedElement.properties['Show Header'])}
                              onChange={(e) => handlePropertyChange(selectedElement.id, 'Show Header', e.target.checked)}
                            />
                          </DSFormField>
                        </div>
                      </div>
                    )
                  }

                  // DataTable General tab — Connected Table card + Filter Data (per Figma 2026-06-04).
                  if (isDataTable && propertyTab === 'general') {
                    return (
                      <div className="property-panel__body">
                        <div className="property-panel__field">
                          <DSFormField
                            title="Connected Table"
                            description={'Use "Edit List" to edit the data, or "Change Table" to switch to another set of content.'}
                            size="md"
                            showDescription
                            showHelpText={false}
                          >
                            <div className="connected-table">
                              <div className="connected-table__card">
                                <div className="connected-table__icon">
                                  <Icon name="table" category="general" size={20} />
                                </div>
                                <span className="connected-table__name">
                                  {String(selectedElement.properties['Source'] || 'List Table')}
                                </span>
                              </div>
                              <div className="connected-table__actions">
                                <button
                                  type="button"
                                  className="connected-table__btn connected-table__btn--primary"
                                  onClick={() => setEditItemsOpen(true)}
                                >
                                  Edit List
                                </button>
                                <button
                                  type="button"
                                  className="connected-table__btn connected-table__btn--secondary"
                                >
                                  Change Table
                                </button>
                              </div>
                            </div>
                          </DSFormField>
                        </div>
                        <div className="property-panel__field">
                          <DSFormField
                            title="Filter Data"
                            description="Limit the items displayed based on their properties"
                            size="md"
                            showDescription
                            showHelpText={false}
                          >
                            <div className="connected-table__filters">
                              <button type="button" className="connected-table__add-filter">
                                <Icon name="plus" category="general" size={14} />
                                <span>Add Filter</span>
                              </button>
                            </div>
                          </DSFormField>
                        </div>
                        <div className="property-panel__field">
                          <DSFormField
                            title="Columns"
                            description="Pick which fields appear in the table."
                            size="md"
                            showDescription
                            showHelpText={false}
                          >
                            {(() => {
                              const colsRaw = selectedElement.properties['Columns'] as string | undefined
                              let cols: string[] = ['Title', 'Description', 'Image']
                              try { if (colsRaw) { const p = JSON.parse(colsRaw); if (Array.isArray(p)) cols = p.map(String) } } catch {}
                              const pinnedRaw = selectedElement.properties['PinnedColumns'] as string | undefined
                              let pinned: string[] = []
                              try { if (pinnedRaw) { const p = JSON.parse(pinnedRaw); if (Array.isArray(p)) pinned = p.map(String) } } catch {}
                              // Only keep pins that still point at an existing column.
                              pinned = pinned.filter((c) => cols.includes(c)).slice(0, MAX_PINNED_COLUMNS)
                              const writeCols = (next: string[]) => handlePropertyChange(selectedElement.id, 'Columns', JSON.stringify(next))
                              const writePinned = (next: string[]) => handlePropertyChange(selectedElement.id, 'PinnedColumns', JSON.stringify(next))
                              return <DataTableColumnsPicker cols={cols} onChange={writeCols} pinned={pinned} onPinnedChange={writePinned} />
                            })()}
                          </DSFormField>
                        </div>
                        <div className="property-panel__field property-panel__field--inline">
                          <DSFormField
                            title="Show Pagination"
                            description="Display page navigation footer below the table."
                            size="md"
                            showDescription
                            showHelpText={false}
                          >
                            <DSToggle
                              size="md"
                              checked={Boolean(selectedElement.properties['Show Pagination'] ?? true)}
                              onChange={(e) => handlePropertyChange(selectedElement.id, 'Show Pagination', e.target.checked)}
                            />
                          </DSFormField>
                        </div>
                        {Boolean(selectedElement.properties['Show Pagination'] ?? true) && (
                          <div className="property-panel__field">
                            <DSFormField
                              title="Items per page"
                              description="Number of rows shown per page."
                              size="md"
                              showDescription
                              showHelpText={false}
                            >
                              <ItemsPerPageInput
                                value={Number(selectedElement.properties['Items per page']) || 5}
                                onCommit={(n) => handlePropertyChange(selectedElement.id, 'Items per page', n)}
                              />
                            </DSFormField>
                          </div>
                        )}
                      </div>
                    )
                  }

                  // DataTable Layout tab — visual controls (size, striped, sort, empty message).
                  if (isDataTable && propertyTab === 'layout') {
                    return (
                      <div className="property-panel__body">
                        <div className="property-panel__field">
                          <DSFormField
                            title="Layout"
                            description="Basic table rows or stacked card rows."
                            size="md"
                            showDescription
                            showHelpText={false}
                          >
                            {(() => {
                              const layoutOptions = [
                                { value: 'Basic', icon: 'list-bullet', iconCat: 'editor' },
                                { value: 'Card', icon: 'grid-2-filled', iconCat: 'layout' },
                                { value: 'Table', icon: 'table', iconCat: 'general' },
                              ] as const
                              const currentLayout = String(selectedElement.properties['Layout'] ?? 'Table')
                              return (
                                <div className="layout-picker">
                                  {layoutOptions.map((opt) => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      className={`layout-picker__btn${currentLayout === opt.value ? ' layout-picker__btn--selected' : ''}`}
                                      onClick={() => handlePropertyChange(selectedElement.id, 'Layout', opt.value)}
                                      aria-pressed={currentLayout === opt.value}
                                    >
                                      <Icon name={opt.icon} category={opt.iconCat} size={20} />
                                      <span>{opt.value}</span>
                                    </button>
                                  ))}
                                </div>
                              )
                            })()}
                          </DSFormField>
                        </div>
                        <div className="property-panel__field">
                          <DSFormField
                            title="Size"
                            description="Row height — Small 40px · Medium 48px · Large 56px."
                            size="md"
                            showDescription
                            showHelpText={false}
                          >
                            <Segmented
                              accent="apps"
                              variant="text"
                              value={String(selectedElement.properties['Size'] ?? 'Medium')}
                              onChange={(val) => handlePropertyChange(selectedElement.id, 'Size', val)}
                              items={[
                                { value: 'Small', label: 'Small' },
                                { value: 'Medium', label: 'Medium' },
                                { value: 'Large', label: 'Large' },
                              ]}
                            />
                          </DSFormField>
                        </div>
                        <div className="property-panel__field property-panel__field--inline">
                          <DSFormField
                            title="Show Header"
                            description="Display the column header row at the top of the table."
                            size="md"
                            showDescription
                            showHelpText={false}
                          >
                            <DSToggle
                              size="md"
                              checked={selectedElement.properties['Show Header'] !== false}
                              onChange={(e) => handlePropertyChange(selectedElement.id, 'Show Header', e.target.checked)}
                            />
                          </DSFormField>
                        </div>
                        {selectedElement.properties['Show Header'] !== false && (
                          <div className="property-panel__field property-panel__field--inline">
                            <DSFormField
                              title="Sticky Header"
                              description="Keep the header pinned at the top while the body scrolls."
                              size="md"
                              showDescription
                              showHelpText={false}
                            >
                              <DSToggle
                                size="md"
                                checked={Boolean(selectedElement.properties['Sticky Header'])}
                                onChange={(e) => handlePropertyChange(selectedElement.id, 'Sticky Header', e.target.checked)}
                              />
                            </DSFormField>
                          </div>
                        )}
                        <div className="property-panel__field property-panel__field--inline">
                          <DSFormField
                            title="Striped Rows"
                            description="Alternate row backgrounds for readability."
                            size="md"
                            showDescription
                            showHelpText={false}
                          >
                            <DSToggle
                              size="md"
                              checked={Boolean(selectedElement.properties['Striped Rows'])}
                              onChange={(e) => handlePropertyChange(selectedElement.id, 'Striped Rows', e.target.checked)}
                            />
                          </DSFormField>
                        </div>
                        {(() => {
                          const colsRaw = selectedElement.properties['Columns'] as string | undefined
                          let cols: string[] = ['Title', 'Description', 'Image']
                          try { if (colsRaw) { const p = JSON.parse(colsRaw); if (Array.isArray(p)) cols = p.map(String) } } catch {}
                          const sortBy = String(selectedElement.properties['Default Sort'] ?? '')
                          const sortOrder = String(selectedElement.properties['Sort Order'] ?? 'Ascending')
                          const setSort = (col: string) => handlePropertyChange(selectedElement.id, 'Default Sort', col)
                          const setOrder = (o: 'Ascending' | 'Descending') => handlePropertyChange(selectedElement.id, 'Sort Order', o)
                          const clearSort = () => { setSort(''); setOrder('Ascending') }
                          const addSort = () => { if (!sortBy) setSort(cols[0] || 'Title') }
                          return (
                            <div className="property-panel__field">
                              <DSFormField
                                title="Default sort"
                                size="md"
                                showDescription={false}
                                showHelpText={false}
                              >
                                <div className="data-table-sort">
                                  {sortBy && (
                                    <div className="data-table-sort__row">
                                      <span className="data-table-sort__drag" aria-hidden="true">
                                        <Icon name="grid-dots-vertical" category="general" size={20} />
                                      </span>
                                      <div className="data-table-sort__pill">
                                        <Icon name="bars-filter" category="general" size={16} />
                                        <DSDropdownSingle
                                          size="sm"
                                          showLeadingIcon={false}
                                          value={sortBy}
                                          onChange={(val) => setSort(val)}
                                          options={cols.map((c) => ({ value: c, label: c }))}
                                        />
                                      </div>
                                      <div className="data-table-sort__pill data-table-sort__pill--order">
                                        <DSDropdownSingle
                                          size="sm"
                                          showLeadingIcon={false}
                                          value={sortOrder}
                                          onChange={(val) => setOrder(val as 'Ascending' | 'Descending')}
                                          options={[
                                            { value: 'Ascending', label: 'Ascending' },
                                            { value: 'Descending', label: 'Descending' },
                                          ]}
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        className="data-table-sort__btn"
                                        aria-label="Remove sort"
                                        onClick={clearSort}
                                      >
                                        <Icon name="trash-filled" category="general" size={16} />
                                      </button>
                                    </div>
                                  )}
                                  <button type="button" className="data-table-sort__add" onClick={addSort}>
                                    <Icon name="plus" category="general" size={14} />
                                    <span>Add sort</span>
                                  </button>
                                </div>
                              </DSFormField>
                            </div>
                          )
                        })()}
                      </div>
                    )
                  }

                  // DataTable Condition tab — visibility / show-when rules (placeholder for now).
                  if (isDataTable && propertyTab === 'condition') {
                    return (
                      <div className="property-panel__body">
                        <div className="property-panel__field">
                          <DSFormField
                            title="Show this table"
                            description="Define when the table should be visible."
                            size="md"
                            showDescription
                            showHelpText={false}
                          >
                            <button type="button" className="connected-table__add-filter">
                              <Icon name="plus" category="general" size={14} />
                              <span>Add Condition</span>
                            </button>
                          </DSFormField>
                        </div>
                      </div>
                    )
                  }

                  // List: Card Actions dropdown + Layout-aware Action variant with nested controls.
                  if (isList && propertyTab === 'action') {
                    const cardActionType = String(selectedElement.properties['Card Action'] ?? 'Do Nothing')
                    const layout = String(selectedElement.variants['Layout'] ?? 'Basic')
                    const variantKey = layout === 'Card' ? 'Card Action' : 'Action'
                    const variantConfig = selectedComponent.variants[variantKey]
                    const actionValue = String(selectedElement.variants[variantKey] ?? 'None')
                    return (
                      <div className="property-panel__body">
                        {renderCardActionsDropdown(selectedElement.id)}
                        {cardActionType !== 'Do Nothing' && (
                          <div className="property-panel__field">
                            <DSFormField title="Action" size="md" showDescription={false} showHelpText={false}>
                              <Segmented
                                accent="apps"
                                variant="text"
                                value={actionValue}
                                onChange={(val) => handleVariantChange(selectedElement.id, variantKey, val)}
                                items={variantConfig.options.map((opt) => ({ value: opt, label: opt }))}
                              />
                            </DSFormField>
                            {actionValue === 'Button' && (
                              <DSFormField title="Button Label" size="md" showDescription={false} showHelpText={false}>
                                <DSInput
                                  value={String(selectedElement.properties['Button Label'] ?? '')}
                                  onChange={(e) => handlePropertyChange(selectedElement.id, 'Button Label', e.target.value)}
                                />
                              </DSFormField>
                            )}
                            {actionValue === 'Icon' && (
                              <DSFormField title="Icon" size="md" showDescription={false} showHelpText={false}>
                                <IconPropertyField
                                  value={String(selectedElement.properties['Action Icon'] ?? 'ChevronRight')}
                                  onChange={(val) => handlePropertyChange(selectedElement.id, 'Action Icon', val)}
                                />
                              </DSFormField>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  }

                  // Card's Action tab — bespoke: Card Actions dropdown + nested Action variant with Button Label/Icon Filled inside.
                  if (isCard && propertyTab === 'action') {
                    const cardActionType = String(selectedElement.properties['Card Action'] ?? 'Do Nothing')
                    const cardActionOptions = [
                      { value: 'Do Nothing', label: 'Do Nothing', icon: 'minus-sm', iconCategory: 'general' },
                      { value: 'Navigate to Page', label: 'Navigate to Page', icon: 'form-title-filled', iconCategory: 'general' },
                      { value: 'Open Form', label: 'Open Form', icon: 'form-filled', iconCategory: 'forms-files' },
                      { value: 'Open URL', label: 'Open URL', icon: 'link-horizontal', iconCategory: 'general' },
                      { value: 'Send Email', label: 'Send Email', icon: 'envelope-closed-filled', iconCategory: 'communication' },
                      { value: 'Make Call', label: 'Make Call', icon: 'phone-filled', iconCategory: 'communication' },
                    ]
                    const actionVariantConfig = selectedComponent.variants['Action']
                    const actionValue = String(selectedElement.variants['Action'] ?? 'None')
                    return (
                      <div className="property-panel__body">
                        <div className="property-panel__field">
                          <DSFormField title="Card Actions" size="md" showDescription={false} showHelpText={false}>
                            <DSDropdownSingle
                              value={cardActionType}
                              onChange={(val) => handlePropertyChange(selectedElement.id, 'Card Action', val)}
                              options={cardActionOptions.map((o) => ({
                                value: o.value,
                                label: o.label,
                                leading: <Icon name={o.icon} category={o.iconCategory} size={20} />,
                              }))}
                            />
                          </DSFormField>
                        </div>
                        {cardActionType !== 'Do Nothing' && (
                          <div className="property-panel__field">
                            <DSFormField title="Action" size="md" showDescription={false} showHelpText={false}>
                              <Segmented
                                accent="apps"
                                variant="text"
                                value={actionValue}
                                onChange={(val) => handleVariantChange(selectedElement.id, 'Action', val)}
                                items={actionVariantConfig.options.map((opt) => ({ value: opt, label: opt }))}
                              />
                            </DSFormField>
                            {actionValue === 'Button' && (
                              <DSFormField title="Button Label" size="md" showDescription={false} showHelpText={false}>
                                <DSInput
                                  value={String(selectedElement.properties['Button Label'] ?? '')}
                                  onChange={(e) => handlePropertyChange(selectedElement.id, 'Button Label', e.target.value)}
                                />
                              </DSFormField>
                            )}
                            {actionValue === 'Icon' && (
                              <DSFormField title="Icon" size="md" showDescription={false} showHelpText={false}>
                                <IconPropertyField
                                  value={String(selectedElement.properties['Action Icon'] ?? 'ChevronRight')}
                                  onChange={(val) => handlePropertyChange(selectedElement.id, 'Action Icon', val)}
                                />
                              </DSFormField>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  }

                  // Card's Layout tab is bespoke — Layout segment + Image Style segment + conditional Icon/Image upload.
                  if (isCard && propertyTab === 'layout') {
                    const imageStyle = String(selectedElement.variants['Image Style'] ?? 'Square')
                    const layoutVariant = selectedComponent.variants['Layout']
                    const imageStyleVariant = selectedComponent.variants['Image Style']
                    const cardImageUrl = String(selectedElement.properties['Image URL'] ?? '')
                    const cardImageName = String(selectedElement.properties['Image Name'] ?? '')
                    const cardImageInputId = `card-image-input-${selectedElement.id}`
                    return (
                      <div className="property-panel__body">
                        <div className="property-panel__field">
                          <DSFormField title="Layout" size="md" showDescription={false} showHelpText={false}>
                            <Segmented
                              accent="apps"
                              variant="text"
                              value={String(selectedElement.variants['Layout'] ?? 'Horizontal')}
                              onChange={(val) => handleVariantChange(selectedElement.id, 'Layout', val)}
                              items={layoutVariant.options.map((opt) => ({ value: opt, label: opt }))}
                            />
                          </DSFormField>
                        </div>
                        <div className="property-panel__field">
                          <DSFormField title="Image Style" size="md" showDescription={false} showHelpText={false}>
                            <Segmented
                              accent="apps"
                              variant="text"
                              value={imageStyle}
                              onChange={(val) => handleVariantChange(selectedElement.id, 'Image Style', val)}
                              items={imageStyleVariant.options.map((opt) => ({ value: opt, label: opt }))}
                            />
                          </DSFormField>
                          {imageStyle === 'Icon' && (
                            <IconPropertyField
                              value={String(selectedElement.properties['Icon'] ?? '')}
                              onChange={(val) => handlePropertyChange(selectedElement.id, 'Icon', val)}
                            />
                          )}
                          {(imageStyle === 'Square' || imageStyle === 'Circle') && (
                            <>
                              <input
                                id={cardImageInputId}
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (!file) return
                                  compressImageFile(file).then((url) => {
                                    handlePropertyChange(selectedElement.id, 'Image URL', url)
                                    handlePropertyChange(selectedElement.id, 'Image Name', file.name)
                                  })
                                  e.target.value = ''
                                }}
                              />
                              {cardImageUrl ? (
                                <div className="image-preview">
                                  <div
                                    className="image-preview__thumb"
                                    style={{ backgroundImage: `url(${cardImageUrl})` }}
                                  />
                                  <span className="image-preview__name" title={cardImageName}>
                                    {cardImageName || 'image'}
                                  </span>
                                  <button
                                    type="button"
                                    className="image-preview__remove"
                                    aria-label="Remove image"
                                    onClick={() => {
                                      handlePropertyChange(selectedElement.id, 'Image URL', '')
                                      handlePropertyChange(selectedElement.id, 'Image Name', '')
                                    }}
                                  >
                                    <Icon name="trash-filled" category="general" size={16} />
                                  </button>
                                </div>
                              ) : (
                                <div className="upload-area">
                                  <DSButton
                                    variant="filled"
                                    colorScheme="secondary"
                                    shape="rectangle"
                                    size="md"
                                    leftIcon={<Icon name="image-plus-filled" category="media" size={16} />}
                                    onClick={() => document.getElementById(cardImageInputId)?.click()}
                                  >
                                    Choose File
                                  </DSButton>
                                  <span className="upload-area__hint">OR DRAG AND DROP HERE</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  }

                  // Card's General tab is bespoke — Title / Description / Shrink / Duplicate placeholder.
                  if (isCard && propertyTab === 'general') {
                    return (
                      <div className="property-panel__body">
                        <div className="property-panel__field">
                          <DSFormField title="Title" size="md" showDescription={false} showHelpText={false}>
                            <DSInput
                              value={String(selectedElement.properties['Title'] ?? '')}
                              onChange={(e) => handlePropertyChange(selectedElement.id, 'Title', e.target.value)}
                            />
                          </DSFormField>
                        </div>
                        <div className="property-panel__field">
                          <DSFormField title="Description" size="md" showDescription={false} showHelpText={false}>
                            <DSTextArea
                              size="md"
                              maxLength={240}
                              showCount
                              showDrag={false}
                              placeholder="Add description"
                              value={String(selectedElement.properties['Description'] ?? '')}
                              onChange={(e) => handlePropertyChange(selectedElement.id, 'Description', e.target.value)}
                            />
                          </DSFormField>
                        </div>
                        <div className="property-panel__field property-panel__field--inline">
                          <DSFormField
                            title="Shrink"
                            description="Make element smaller."
                            size="md"
                            showDescription
                            showHelpText={false}
                          >
                            <DSToggle
                              size="md"
                              checked={Boolean(selectedElement.properties['Shrinked'])}
                              onChange={(e) => handlePropertyChange(selectedElement.id, 'Shrinked', e.target.checked)}
                            />
                          </DSFormField>
                        </div>
                        <div className="property-panel__field">
                          <DSFormField
                            title="Duplicate Element"
                            description="Clone selected elements with all saved properties."
                            size="md"
                            showDescription
                            showHelpText={false}
                          >
                            <DSButton
                              variant="filled"
                              colorScheme="secondary"
                              shape="rectangle"
                              size="md"
                              leftIcon={<Icon name="copy-filled" category="general" size={16} />}
                            >
                              Duplicate
                            </DSButton>
                          </DSFormField>
                        </div>
                      </div>
                    )
                  }

                  if (isSocialFollow && propertyTab === 'general') {
                    return (
                      <div className="property-panel__body">
                        {socialPlatforms.map((p) => {
                          const saved = selectedElement.properties[p.key]
                          const fallback = selectedComponent.properties.find((d) => d.name === p.key)?.default
                          const value = String(saved ?? fallback ?? '')
                          return (
                            <div key={p.key} className="property-panel__field">
                              <DSFormField title={p.key} size="md" showDescription={false} showHelpText={false}>
                                <DSInput
                                  leftContent={p.icon}
                                  value={value}
                                  placeholder={p.placeholder}
                                  onChange={(e) => handlePropertyChange(selectedElement.id, p.key, e.target.value)}
                                />
                              </DSFormField>
                            </div>
                          )
                        })}
                        <div className="property-panel__field property-panel__field--inline">
                          <DSFormField
                            title="Shrink"
                            description="Make element smaller."
                            size="md"
                            showDescription
                            showHelpText={false}
                          >
                            <DSToggle
                              size="md"
                              checked={Boolean(selectedElement.properties['Shrinked'])}
                              onChange={(e) => handlePropertyChange(selectedElement.id, 'Shrinked', e.target.checked)}
                            />
                          </DSFormField>
                        </div>
                      </div>
                    )
                  }

                  if (isSocialFollow && propertyTab === 'style') {
                    const visibleSocialVariants = Object.entries(selectedComponent.variants)
                      .filter(([group]) => group !== 'Layout')
                      .filter(([, config]) => {
                        if (!config.showWhen) return true
                        return Object.entries(config.showWhen).every(
                          ([key, val]) => selectedElement.variants[key] === val,
                        )
                      })
                    const isFilled = selectedElement.variants['Filled'] !== 'No'
                    const isPrimary = selectedElement.variants['Variant'] !== 'Secondary'
                    return (
                      <div className="property-panel__body">
                        {visibleSocialVariants.map(([group, config]) => (
                          <div key={group} className="property-panel__field">
                            <DSFormField title={group} size="md" showDescription={false} showHelpText={false}>
                              <Segmented
                                accent="apps"
                                variant="text"
                                value={String(selectedElement.variants[group] ?? '')}
                                onChange={(val) => handleVariantChange(selectedElement.id, group, val)}
                                items={config.options.map((opt) => ({ value: opt, label: opt }))}
                              />
                            </DSFormField>
                          </div>
                        ))}
                        {isPrimary && (
                          <div className="property-panel__field">
                            <DSFormField title="Icon Color" size="md" showDescription={false} showHelpText={false}>
                              <SocialIconColorField
                                value={String(selectedElement.properties['Icon Color'] || '')}
                                onChange={(val) => handlePropertyChange(selectedElement.id, 'Icon Color', val)}
                                tokenVariable={isFilled ? '--bg-fill-brand' : '--fg-brand'}
                              />
                            </DSFormField>
                          </div>
                        )}
                      </div>
                    )
                  }

                  const showVariants =
                    isAppHeader
                      ? propertyTab === 'style'
                      : isCard
                        ? (propertyTab === 'layout' || propertyTab === 'action')
                        : isList
                          ? (propertyTab === 'general' || propertyTab === 'layout')
                          : isSocialFollow
                            ? false
                            : propertyTab === 'general'

                  const cardTabVariants = propertyTab === 'layout' ? CARD_LAYOUT_VARIANTS : []
                  const cardTabProps = propertyTab === 'layout' ? CARD_LAYOUT_PROPS : []

                  const LIST_ACTION_VARIANTS = ['Action', 'Icon Filled', 'Card Action', 'Card Icon Filled']
                  const LIST_LAYOUT_VARIANTS = ['Layout', 'Image Style', 'Size', 'Card Image Style', 'Card Layout', 'Card Size']

                  const visibleVariants = !showVariants
                    ? []
                    : Object.entries(selectedComponent.variants)
                        .filter(([group]) => {
                          if (isCard) return cardTabVariants.includes(group)
                          if (isList) {
                            if (propertyTab === 'layout') return LIST_LAYOUT_VARIANTS.includes(group)
                            // General: exclude both action and layout variants.
                            return !LIST_ACTION_VARIANTS.includes(group) && !LIST_LAYOUT_VARIANTS.includes(group)
                          }
                          return true
                        })
                        .filter(([, config]) => {
                          if (!config.showWhen) return true
                          return Object.entries(config.showWhen).every(
                            ([key, val]) => selectedElement.variants[key] === val
                          )
                        })
                        .sort(([a], [b]) => {
                          if (!isCard) return 0
                          return cardTabVariants.indexOf(a) - cardTabVariants.indexOf(b)
                        })

                  const visibleProps = selectedComponent.properties
                    .filter((prop) => prop.name !== 'Selected' && prop.name !== 'Skeleton' && prop.name !== 'Skeleton Animation')
                    .filter((prop) => {
                      if (isAppHeader) {
                        // Style tab → everything except Title/Subtitle (general) and Icon (rendered inside Image Style).
                        return prop.name !== 'Title' && prop.name !== 'Subtitle' && prop.name !== 'Icon'
                      }
                      if (isCard) {
                        if (propertyTab === 'general') {
                          return !CARD_LAYOUT_PROPS.includes(prop.name) && !CARD_ACTION_PROPS.includes(prop.name)
                        }
                        return cardTabProps.includes(prop.name)
                      }
                      if (isList) {
                        // Button Label is rendered inside the Action tab; Show Header is rendered bespoke at the top.
                        if (propertyTab === 'general') return prop.name !== 'Button Label' && prop.name !== 'Show Header'
                        return false
                      }
                      if (isProductList) {
                        // Products & Currency live in the Products tab; default render shows the rest on General.
                        if (propertyTab === 'general') return prop.name !== 'Products' && prop.name !== 'Currency'
                        return false
                      }
                      return propertyTab === 'general'
                    })
                    .filter((prop) => {
                      if (!prop.showWhen) return true
                      return Object.entries(prop.showWhen).every(
                        ([key, val]) => selectedElement.variants[key] === val || selectedElement.properties[key] === val
                      )
                    })

                  if (visibleVariants.length === 0 && visibleProps.length === 0) {
                    return (
                      <div className="property-panel__empty">
                        <Icon name="info-circle" category="general" size={20} />
                        <span>Coming soon</span>
                      </div>
                    )
                  }

                  return (
                    <div className="property-panel__body">
                      {isList && propertyTab === 'general' && (
                        <div className="property-panel__field property-panel__field--inline">
                          <DSFormField
                            title="Show Header"
                            description="Display a header above the list items."
                            size="md"
                            showDescription
                            showHelpText={false}
                          >
                            <DSToggle
                              size="md"
                              checked={Boolean(selectedElement.properties['Show Header'])}
                              onChange={(e) => handlePropertyChange(selectedElement.id, 'Show Header', e.target.checked)}
                            />
                          </DSFormField>
                        </div>
                      )}
                      {isAppHeader && propertyTab === 'style' && (
                        <>
                          <div className="property-panel__field property-panel__field--inline">
                            <DSFormField
                              title="Show Background"
                              description="Show a colored background behind the header."
                              size="md"
                              showDescription
                              showHelpText={false}
                            >
                              <DSToggle size="md" defaultChecked />
                            </DSFormField>
                          </div>
                          <div className="property-panel__field">
                            <DSFormField title="Background Image" size="md" showDescription={false} showHelpText={false}>
                              <input
                                ref={appHeaderBgImageInputRef}
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (!file) return
                                  compressImageFile(file).then((url) => {
                                    setAppHeaderState((s) => ({
                                      ...s,
                                      backgroundImageUrl: url,
                                      backgroundImageName: file.name,
                                    }))
                                  })
                                  e.target.value = ''
                                }}
                              />
                              {appHeaderState.backgroundImageUrl ? (
                                <div className="image-preview">
                                  <div
                                    className="image-preview__thumb"
                                    style={{ backgroundImage: `url(${appHeaderState.backgroundImageUrl})` }}
                                  />
                                  <span className="image-preview__name" title={appHeaderState.backgroundImageName ?? ''}>
                                    {appHeaderState.backgroundImageName ?? 'image'}
                                  </span>
                                  <button
                                    type="button"
                                    className="image-preview__remove"
                                    aria-label="Remove image"
                                    onClick={() => setAppHeaderState((s) => ({ ...s, backgroundImageUrl: null, backgroundImageName: null }))}
                                  >
                                    <Icon name="trash-filled" category="general" size={16} />
                                  </button>
                                </div>
                              ) : (
                                <div className="upload-area">
                                  <DSButton
                                    variant="filled"
                                    colorScheme="secondary"
                                    shape="rectangle"
                                    size="md"
                                    leftIcon={<Icon name="image-plus-filled" category="media" size={16} />}
                                    onClick={() => appHeaderBgImageInputRef.current?.click()}
                                  >
                                    Choose File
                                  </DSButton>
                                  <span className="upload-area__hint">OR DRAG AND DROP HERE</span>
                                </div>
                              )}
                            </DSFormField>
                          </div>
                          <div className="property-panel__field">
                            <DSFormField title="Text Color" size="md" showDescription={false} showHelpText={false}>
                              <ColorInputWithPicker
                                size="md"
                                color={appHeaderState.textColor}
                                onColorChange={(val) => setAppHeaderState((s) => ({ ...s, textColor: val }))}
                              />
                            </DSFormField>
                          </div>
                          <div className="property-panel__field">
                            <DSFormField title="Image Style" size="md" showDescription={false} showHelpText={false}>
                              <Segmented
                                accent="apps"
                                variant="text"
                                value={appHeaderState.imageStyle}
                                onChange={(val) => setAppHeaderState((s) => ({ ...s, imageStyle: val as AppHeaderImageStyle }))}
                                items={[
                                  { value: 'Image', label: 'Image' },
                                  { value: 'Icon', label: 'Icon' },
                                  { value: 'None', label: 'None' },
                                ]}
                              />
                            </DSFormField>
                            {appHeaderState.imageStyle === 'Icon' && (
                              <IconPropertyField
                                value={appHeaderState.icon}
                                onChange={(val) => setAppHeaderState((s) => ({ ...s, icon: val }))}
                              />
                            )}
                            {appHeaderState.imageStyle === 'Image' && (
                              <>
                                <input
                                  ref={appHeaderImageInputRef}
                                  type="file"
                                  accept="image/*"
                                  hidden
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (!file) return
                                    compressImageFile(file).then((url) => {
                                      setAppHeaderState((s) => ({
                                        ...s,
                                        imageUrl: url,
                                        imageName: file.name,
                                      }))
                                    })
                                    // Allow re-selecting the same file later.
                                    e.target.value = ''
                                  }}
                                />
                                {appHeaderState.imageUrl ? (
                                  <div className="image-preview">
                                    <div
                                      className="image-preview__thumb"
                                      style={{ backgroundImage: `url(${appHeaderState.imageUrl})` }}
                                    />
                                    <span className="image-preview__name" title={appHeaderState.imageName ?? ''}>
                                      {appHeaderState.imageName ?? 'image'}
                                    </span>
                                    <button
                                      type="button"
                                      className="image-preview__remove"
                                      aria-label="Remove image"
                                      onClick={() => setAppHeaderState((s) => ({ ...s, imageUrl: null, imageName: null }))}
                                    >
                                      <Icon name="trash-filled" category="general" size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="upload-area">
                                    <DSButton
                                      variant="filled"
                                      colorScheme="secondary"
                                      shape="rectangle"
                                      size="md"
                                      leftIcon={<Icon name="image-plus-filled" category="media" size={16} />}
                                      onClick={() => appHeaderImageInputRef.current?.click()}
                                    >
                                      Choose File
                                    </DSButton>
                                    <span className="upload-area__hint">OR DRAG AND DROP HERE</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </>
                      )}
                      {visibleVariants.map(([group, config]) => (
                        <div key={group} className="property-panel__field">
                          <DSFormField title={group} size="md" showDescription={false} showHelpText={false}>
                            <Segmented
                              accent="apps"
                              variant="text"
                              value={String(selectedElement.variants[group] ?? '')}
                              onChange={(val) => handleVariantChange(selectedElement.id, group, val)}
                              items={config.options.map((opt) => ({ value: opt, label: opt }))}
                            />
                          </DSFormField>
                        </div>
                      ))}

                      {visibleProps.map((prop) => (
                        <div key={prop.name} className="property-panel__field">
                          <DSFormField title={prop.name} size="md" showDescription={false} showHelpText={false}>
                            {prop.type === 'boolean' ? (
                              <DSToggle
                                checked={Boolean(selectedElement.properties[prop.name])}
                                onChange={(e) =>
                                  handlePropertyChange(selectedElement.id, prop.name, e.target.checked)
                                }
                              />
                            ) : prop.type === 'number' ? (
                              <DSNumberInput
                                showUnit={false}
                                min={prop.min ?? 0}
                                max={prop.max ?? 200}
                                value={Number(selectedElement.properties[prop.name]) || 0}
                                onChange={(val) =>
                                  handlePropertyChange(selectedElement.id, prop.name, val ?? 0)
                                }
                              />
                            ) : prop.type === 'icon' ? (
                              <IconPropertyField
                                value={String(selectedElement.properties[prop.name] || '')}
                                onChange={(val) =>
                                  handlePropertyChange(selectedElement.id, prop.name, val)
                                }
                              />
                            ) : (
                              <DSInput
                                value={String(selectedElement.properties[prop.name] || '')}
                                onChange={(e) =>
                                  handlePropertyChange(selectedElement.id, prop.name, e.target.value)
                                }
                              />
                            )}
                          </DSFormField>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            ) : (
              <CollectionsProvider>
              <CartProvider>
              <FavoritesProvider>
              <div className="live-preview">
                <div className="live-preview__header" data-theme="dark">
                  <div className="live-preview__viewing">
                    <span className="live-preview__title">Viewing as</span>
                    <div className="live-preview__role-dropdown">
                      <DSDropdownSingle
                        size="sm"
                        value={viewingAsRole}
                        onChange={(v) => setViewingAsRole(v as 'anyone' | 'admin' | 'user')}
                        options={[
                          { value: 'anyone', label: 'Anyone', leading: <span className="live-preview__role-dot" style={{ background: 'var(--green-200)' }} /> },
                          { value: 'admin', label: 'Admin', leading: <span className="live-preview__role-dot" style={{ background: 'var(--purple-200)' }} /> },
                          { value: 'user', label: 'User', leading: <span className="live-preview__role-dot" style={{ background: 'var(--blue-200)' }} /> },
                        ]}
                      />
                    </div>
                  </div>
                  <div className="live-preview__toolbar">
                    <div className="live-preview__qr-wrapper" ref={qrPopoverWrapperRef}>
                      <DSButton
                        className="live-preview__tool-btn"
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label="Show QR code"
                        aria-expanded={isQrPopoverOpen}
                        leftIcon={<Icon name="qr" category="media" size={16} />}
                        onClick={() => setIsQrPopoverOpen((v) => !v)}
                      />
                      {!isQrPopoverOpen && (
                        <span className="live-preview__tooltip live-preview__tooltip--qr" role="tooltip">Try it on your device</span>
                      )}
                      {isQrPopoverOpen && <QrPopover />}
                    </div>
                    <div className="live-preview__close-wrapper">
                      <DSButton
                        className="live-preview__tool-btn"
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label="Close live preview"
                        leftIcon={<Icon name="xmark" size={16} />}
                        onClick={() => setIsLivePreviewVisible(false)}
                      />
                      <span className="live-preview__tooltip live-preview__tooltip--close" role="tooltip">Close</span>
                    </div>
                  </div>
                </div>
                <div className="live-preview__body">
                  <div className="live-preview__phone">
                    {/* Layer 1: Gray shell */}
                    <div className="live-preview__phone-shell app-scope" />
                    {/* Layer 3: Black bezel */}
                    <div className="live-preview__phone-bezel" />
                    {/* Layer 4: Screen */}
                    <div className="live-preview__phone-screen">
                      {!previewMode && (
                      <>
                      <div className="live-preview__status-bar-bg app-scope" />
                      <PhoneStatusBar className="live-preview__status-bar app-scope" style={{ color: 'var(--fg-primary, #000)' }} />
                      {(isLoginPopoverOpen || isAvatarPopoverOpen) && (
                        <div
                          className="live-preview__popover-scrim"
                          onClick={() => {
                            setIsLoginPopoverOpen(false)
                            setIsAvatarPopoverOpen(false)
                          }}
                        />
                      )}
                      <div className={`live-preview__top-header app-scope${isPreviewContentScrolled ? ' live-preview__top-header--scrolled' : ''}`}>
                        {(() => {
                          const isFirstPage = activePageId === pages[0]?.id
                          const showCompact = isFirstPage && appHeaderState.show && isPreviewContentScrolled
                          if (showCompact) {
                            return (
                              <div className="live-preview__top-header-compact">
                                {appHeaderState.imageStyle !== 'None' && (
                                  <div className={`live-preview__top-header-compact-icon${appHeaderState.imageStyle === 'Image' && appHeaderState.imageUrl ? ' live-preview__top-header-compact-icon--image' : ''}`}>
                                    {appHeaderState.imageStyle === 'Image' && appHeaderState.imageUrl ? (
                                      <img src={appHeaderState.imageUrl} alt="" />
                                    ) : (
                                      <AppIcon name={appHeaderState.icon} size={24} />
                                    )}
                                  </div>
                                )}
                                <span className="live-preview__top-header-compact-title">{appTitle}</span>
                              </div>
                            )
                          }
                          const activePage = pages.find((p) => p.id === activePageId)
                          return isMorePageOpen ? (
                            <div className="live-preview__top-header-page">
                              <span className="live-preview__top-header-page-name">Menu</span>
                            </div>
                          ) : activePage ? (
                            <div className="live-preview__top-header-page">
                              <span className="live-preview__top-header-page-name">{activePage.name}</span>
                            </div>
                          ) : (
                            <span className="live-preview__top-header-btn" aria-hidden="true" />
                          )
                        })()}
                        <div className="live-preview__top-header-right">
                          {pages.some((p) => p.elements.some((el) => el.componentId === 'product-list')) && (
                            <LivePreviewCartButton onClick={() => setIsPreviewCartOpen(true)} />
                          )}
                          {isPreviewLoggedIn ? (
                            <>
                              <button
                                type="button"
                                className="live-preview__top-header-avatar-btn"
                                aria-label="Account menu"
                                onClick={() => setIsAvatarPopoverOpen((v) => !v)}
                              >
                                <img
                                  className="live-preview__top-header-avatar"
                                  src={previewUserAvatar}
                                  alt=""
                                  aria-hidden="true"
                                />
                              </button>
                              <LivePreviewAvatarPopover
                                open={isAvatarPopoverOpen}
                                onClose={() => setIsAvatarPopoverOpen(false)}
                              />
                            </>
                          ) : (
                            <button
                              type="button"
                              className="live-preview__top-header-login-btn"
                              aria-label="Login"
                              onClick={() => setIsLoginPopoverOpen((v) => !v)}
                            >
                              <Icon name="circle-user-filled" category="users" size={20} />
                            </button>
                          )}
                        </div>
                      </div>
                      {!isPreviewLoggedIn && (
                        <LivePreviewLoginPopover
                          open={isLoginPopoverOpen}
                          onClose={() => setIsLoginPopoverOpen(false)}
                          onLoggedIn={() => setIsPreviewLoggedIn(true)}
                        />
                      )}
                      <div ref={setPreviewContentScalerEl} className="live-preview__content-scaler app-scope">
                        <div className="live-preview__content app-scope">
                          {isMorePageOpen ? (
                            <LivePreviewMorePagesView
                              pages={pages}
                              onPageSelect={handleMorePageSelect}
                              isLoggedIn={isPreviewLoggedIn}
                              onLoginClick={() => { setLoginPopoverView('login'); setIsLoginPopoverOpen(true) }}
                              onSignUpClick={() => { setLoginPopoverView('signup'); setIsLoginPopoverOpen(true) }}
                            />
                          ) : (() => {
                            const activePage = pages.find((p) => p.id === activePageId) || pages[0]
                            const isFirstPage = activePage?.id === pages[0]?.id
                            return activePage ? (
                              <>
                              {isFirstPage && appHeaderState.show && (
                                <div>
                                <AppHeader
                                  layout={appHeaderState.layout as 'Center' | 'Left' | 'Right'}
                                  icon={appHeaderState.icon}
                                  imageStyle={appHeaderState.imageStyle}
                                  imageUrl={appHeaderState.imageUrl}
                                  textColor={appHeaderState.textColor}
                                  backgroundImageUrl={appHeaderState.backgroundImageUrl}
                                  skeleton={appHeaderState.skeleton}
                                  title={appTitle}
                                  subtitle={appSubtitle}
                                  actions={headerActions.map((el) => {
                                    const comp = ComponentRegistry.get(el.componentId)
                                    if (!comp) return null
                                    const isShrinked = el.componentId === 'button' && el.properties['Shrinked'] === true
                                    return (
                                      <div
                                        key={el.id}
                                        className={`live-preview__header-action${isShrinked ? ' live-preview__header-action--shrinked' : ''}`}
                                      >
                                        {comp.render(el.variants, el.properties, el.states)}
                                      </div>
                                    )
                                  })}
                                />
                                </div>
                              )}
                              <div className={`themes-view__canvas${isFirstPage ? ' themes-view__canvas--first' : ''}`}>
                                <div className="themes-view__app">
                                  {activePage.elements.map((element) => {
                                    const comp = ComponentRegistry.get(element.componentId)
                                    if (!comp) return null
                                    const previewProps = {
                                      ...element.properties,
                                      'Add New Card': false,
                                      // Strip Shrinked in mobile preview so elements stretch full-width.
                                      // Button keeps its shrinked state — a full-width button is worse than a compact one.
                                      Shrinked: element.componentId === 'button' ? element.properties['Shrinked'] : false,
                                    }
                                    const isButtonShrinked = element.componentId === 'button' && element.properties['Shrinked'] === true
                                    return (
                                      <section key={element.id} className={`themes-view__section${isButtonShrinked ? ' themes-view__section--shrinked' : ''}`}>
                                        {comp.render(element.variants, previewProps, element.states)}
                                      </section>
                                    )
                                  })}
                                </div>
                              </div>
                              {isFirstPage && !isPreviewCartOpen && !isPreviewCheckoutOpen && (
                                <div className="themes-view__attribution-footer">
                                  <AttributionBar />
                                </div>
                              )}
                              </>
                            ) : null
                          })()}
                        </div>
                      </div>
                      {pages.length > 1 && !isPreviewCartOpen && !isPreviewCheckoutOpen && (
                        <div className="live-preview__bottom-nav app-scope">
                          <BottomNavigation
                            items={bottomNavItems}
                            activeIndex={bottomNavActiveIndex}
                            onItemClick={handleBottomNavClick}
                          />
                        </div>
                      )}
                      <img src={phoneHomeIndicator} alt="" className="live-preview__home-indicator" />
                      <FormSheet />
                      <LivePreviewMenuDrawer
                        open={isPreviewMenuOpen}
                        onClose={() => setIsPreviewMenuOpen(false)}
                        pages={pages}
                        activePageId={activePageId}
                        onPageSelect={setActivePageId}
                        appTitle={appTitle}
                        appHeader={appHeaderState}
                      />
                      <LivePreviewCartPage
                        open={isPreviewCartOpen}
                        onClose={() => setIsPreviewCartOpen(false)}
                        onContinue={() => setIsPreviewCheckoutOpen(true)}
                        avatarUrl={previewUserAvatar}
                      />
                      <LivePreviewCheckoutPage
                        open={isPreviewCheckoutOpen}
                        onClose={() => setIsPreviewCheckoutOpen(false)}
                        avatarUrl={previewUserAvatar}
                      />
                      <LivePreviewOrderBar
                        hidden={isPreviewCartOpen || isPreviewCheckoutOpen}
                        hasBottomNav={pages.length > 1}
                        onClick={() => setIsPreviewCheckoutOpen(true)}
                      />
                      </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              </FavoritesProvider>
              </CartProvider>
              </CollectionsProvider>
            )}
          </div>

          {/* Slide 2: App Designer */}
          <div className="build-page__right-slide build-page__right-slide--designer" data-theme="dark">
            <AppDesigner
              onClose={handleCloseDesigner}
              targetSelector=".app-scope"
              isMobile={isMobileView}
              visible={rightPanel === 'designer'}
              namespace={preset?.id === 'empty' ? undefined : preset?.id}
              renderIcon={(name, size) => <Icon name={name} category="editor" size={size} />}
              doneButton={<DSButton variant="filled" colorScheme="primary" shape="rectangle" size="md" onClick={handleCloseDesigner}>Done</DSButton>}
            />
          </div>

        </div>
      </aside>
    </div>

    {/* Mobile: Bottom Bar (replaces floating buttons) */}
    {isMobileView && (
      <MobileBottomBar
        onElementsClick={() => {
          if (rightPanel === 'designer') setRightPanel('preview')
          setMobileElementsSheet(true)
        }}
        onDesignClick={() => {
          setMobileElementsSheet(false)
          setSelectedElementId(null)
          setRightPanel('designer')
        }}
        onPagesClick={() => {
          /* placeholder */
        }}
        onPreviewClick={() => {
          /* placeholder */
        }}
      />
    )}

    {/* Mobile: Add Element Bottom Sheet */}
    <BottomSheet
      open={mobileElementsSheet}
      onClose={() => setMobileElementsSheet(false)}
      title="App Elements"
      noOverlay
      dark
      renderCloseButton={(onClose) => (
        <button className="sidebar-panel__close" onClick={onClose}>
          <Icon name="xmark" category="general" size={20} />
        </button>
      )}
    >
      <div className="mobile-elements-sheet v2-sheet">
        <TabMenu activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === 'widgets' && <AiWidgetCard onClick={() => { setMobileElementsSheet(false); setAiWidgetModalOpen(true) }} />}
        {activeTab === 'widgets' && (
          <div className="mobile-elements-grid__separator">WIDGETS</div>
        )}
        {activeGroups.map((group, groupIndex) => {
          const validItems = group.elementIds.map((id) => componentMap[id]).filter(Boolean)
          if (validItems.length === 0) return null
          return (
            <div key={group.label || groupIndex}>
              {group.label && (
                <div className="mobile-elements-grid__separator">{group.label}</div>
              )}
              <div className="mobile-elements-grid">
                {validItems.map((comp) => {
                  const iconInfo = ELEMENT_ICON_MAP[comp.id]
                  return (
                    <button
                      key={comp.id}
                      className="mobile-elements-grid__item"
                      onClick={() => { handleAddElement(comp); }}
                    >
                      <div className="mobile-elements-grid__icon">
                        {iconInfo ? (
                          <Icon name={iconInfo.icon} category={iconInfo.iconCategory} size={24} />
                        ) : (
                          <Icon name="grid-2-filled" category="layout" size={24} />
                        )}
                      </div>
                      <span className="mobile-elements-grid__label">{comp.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
        {activeTab === 'widgets' && (
          <div>
            <div className="mobile-elements-grid">
              {MOCK_WIDGETS.map((w) => (
                <button key={w.id} type="button" className="mobile-elements-grid__item">
                  <div className="mobile-elements-grid__icon mobile-elements-grid__icon--color" style={{ background: w.bg }}>
                    {w.render()}
                  </div>
                  <span className="mobile-elements-grid__label">{w.name.replace('\n', ' ')}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </BottomSheet>

    <AiWidgetModal open={aiWidgetModalOpen} onClose={() => setAiWidgetModalOpen(false)} onGenerate={handleAiGenerate} />
    <EditAiWidgetModal
      open={editAiOpen && !!selectedElement && !!selectedComponent}
      initialName={selectedElement ? (widgetOverrides[selectedElement.id]?.name ?? selectedComponent?.name ?? '') : ''}
      initialDescription={selectedElement ? (widgetOverrides[selectedElement.id]?.description ?? "Track each camper's registration progress and forms.") : ''}
      onClose={() => setEditAiOpen(false)}
      onSave={({ name, description }) => {
        if (!selectedElement) return
        setWidgetOverrides((prev) => ({
          ...prev,
          [selectedElement.id]: { name, description },
        }))
        setEditAiOpen(false)
      }}
    />

    {/* List items editor modal */}
    {editItemsOpen && selectedComponent?.id === 'list' && selectedElement && (() => {
      type Item = { id: string; title: string; description: string; image?: string }
      const readItems = (): Item[] => {
        const raw = selectedElement.properties['Items']
        if (typeof raw === 'string' && raw.startsWith('[')) {
          try {
            const parsed = JSON.parse(raw) as Item[]
            if (Array.isArray(parsed)) return parsed
          } catch { /* fall through */ }
        }
        return [
          { id: 'item-1', title: 'Title 1', description: 'Description 1' },
          { id: 'item-2', title: 'Title 2', description: 'Description 2' },
          { id: 'item-3', title: 'Title 3', description: 'Description 3' },
        ]
      }
      const items = readItems()
      const writeItems = (next: Item[]) => {
        handlePropertyChange(selectedElement.id, 'Items', JSON.stringify(next))
      }
      const updateItem = (idx: number, patch: Partial<Item>) => {
        const next = items.map((it, i) => i === idx ? { ...it, ...patch } : it)
        writeItems(next)
      }
      const addItem = () => {
        const n = items.length + 1
        const id = `item-${Date.now()}`
        writeItems([
          ...items,
          { id, title: `Title ${n}`, description: `Description ${n}` },
        ])
      }
      const removeItem = (idx: number) => {
        writeItems(items.filter((_, i) => i !== idx))
      }
      return (
        <DSModal
          open={editItemsOpen}
          onClose={() => setEditItemsOpen(false)}
          size="lg"
          title="Edit list items"
          description="Add or update each item's title, description, and image."
          confirmLabel="Done"
          cancelLabel="Close"
          onConfirm={() => setEditItemsOpen(false)}
        >
          <div className="list-items-editor">
            <div className="list-items-editor__row list-items-editor__row--header">
              <span className="list-items-editor__cell list-items-editor__cell--title">Title</span>
              <span className="list-items-editor__cell list-items-editor__cell--description">Description</span>
              <span className="list-items-editor__cell list-items-editor__cell--image">Image</span>
              <span className="list-items-editor__cell list-items-editor__cell--actions" />
            </div>
            {items.map((item, idx) => (
              <div className="list-items-editor__row" key={item.id}>
                <div className="list-items-editor__cell list-items-editor__cell--title">
                  <DSInput
                    value={item.title}
                    onChange={(e) => updateItem(idx, { title: e.target.value })}
                  />
                </div>
                <div className="list-items-editor__cell list-items-editor__cell--description">
                  <DSInput
                    value={item.description}
                    onChange={(e) => updateItem(idx, { description: e.target.value })}
                  />
                </div>
                <div className="list-items-editor__cell list-items-editor__cell--image">
                  {item.image ? (
                    <button
                      type="button"
                      className="list-items-editor__image-thumb"
                      style={{ backgroundImage: `url(${item.image})` }}
                      onClick={() => updateItem(idx, { image: undefined })}
                      aria-label="Remove image"
                    />
                  ) : (
                    <label className="list-items-editor__image-upload">
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          compressImageFile(file).then((url) => updateItem(idx, { image: url }))
                          e.target.value = ''
                        }}
                      />
                      <Icon name="image-plus-filled" category="media" size={16} />
                      <span>Choose</span>
                    </label>
                  )}
                </div>
                <div className="list-items-editor__cell list-items-editor__cell--actions">
                  <button
                    type="button"
                    className="list-items-editor__remove"
                    aria-label="Remove item"
                    onClick={() => removeItem(idx)}
                  >
                    <Icon name="trash-filled" category="general" size={16} />
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="list-items-editor__add" onClick={addItem}>
              <Icon name="plus-circle" category="general" size={16} />
              <span>Add item</span>
            </button>
          </div>
        </DSModal>
      )
    })()}

    </>
  )
}
