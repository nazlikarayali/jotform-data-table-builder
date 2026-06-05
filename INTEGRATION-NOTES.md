# Pre-built Apps + Figma Export — entegrasyon paketi

Bu paket, `jotform-workspace` monorepo'sundaki **pre-built app (preset)** ve
**live-preview → Figma export (capture)** özelliklerini — ve bunlara bağlı
tüm yapıları — senin repo'na taşır.

## İçerik

| Dosya | Ne işe yarar |
|-------|--------------|
| `integration.patch` | Senin mevcut repo'na uygulanacak git patch'i |
| `jotform-workspace-merged/` | Birleştirme uygulanmış, kullanıma hazır tam repo kopyası |

## Nasıl uygulanır

İki yol var, birini seç:

### Yol A — Patch (önerilen, kendi git geçmişini korur)

Senin repo'nun kök dizininde:

```sh
git checkout -b prebuilt-apps-integration
git apply integration.patch
git add -A && git commit -m "Add pre-built apps + Figma export integration"
pnpm install
```

`integration.patch` senin **mevcut HEAD'ine** (`75e7cf6 ... ActivitySchedule + SalesDashboard`)
karşı üretildi ve o commit üzerine **temiz uygulandığı doğrulandı**. Çakışma çıkmaz.

### Yol B — Hazır klasör

`jotform-workspace-merged/` zaten birleştirilmiş tam repo. `.git`, `node_modules`
ve `dist` içermez. Kendi `.git` klasörünü kopyalayıp `pnpm install` çalıştırman yeterli.

## Nasıl birleştirildi

- Senin repo'nun ayrı bir git geçmişi var, ama içerik olarak tam olarak
  kaynak repo'nun `d9dfd08` commit'ine eşitti — bu **ortak temel** olarak
  kullanılıp gerçek 3-yönlü merge yapıldı.
- **218 dosya** değişti: 158 yeni dosya + 60 değişiklik.
- Senin işin **tamamen korundu**: Copilot paneli, AI Widget Modal, AI üretim
  akışı, `widget-actions` overlay, CamperCard / ActivitySchedule /
  SalesDashboard / DailyTaskManager widget'ların.
- Kaynak repo'nun işi eklendi: preset sistemi, IndexedDB snapshot storage,
  Figma capture akışı (chromeless mod, URL paramları), zengin Live Preview
  paneli (rol dropdown, Cart/Favorites/Collections, QR), DS Tabs, yeniden
  tasarlanmış properties paneli.

### Çakışma kararları (sadece 3 dosyada çakışma çıktı)

- **`BuildPage.tsx`** (14 çakışma) — builder kabuğu için kaynak repo'nun
  sürümü; senin Copilot/AI-widget kodun korundu. Widgets sekmesindeki AI
  girişi: **senin `AiWidgetCard`'ın** (modal'a bağlı çalışan akış).
- **`app.scss`** (8 çakışma) — additive birleştirme; builder sol panel CSS'i
  için friend (senin) sürümün korundu, kaynak repo'nun yeni selektörleri
  (`.live-preview__*`, `.property-panel__*`, `.build-with-podo`, `.page-nav`…)
  eklendi. Kullanılmayan hale gelen `.ai-create-btn` CSS'i kaldırıldı.
- **`DailyTaskManager.scss`** (1 çakışma) — `:hover` border token'ı
  `--border-hover` olarak alındı.

## ⚠️ Görsel QA gerekiyor

`tsc` + `vite build` **3 pakette de geçiyor**. Ama tip kontrolü CSS/layout
doğruluğunu garanti etmez. Şu alanları çalışır halde gözden geçir:

- Builder **sol paneli** — sekme menüsü (DS Tabs), Widgets sekmesi, elements
  listesi (iki taraf da bu bölgeyi yeniden yazmıştı)
- **Properties paneli** ↔ **Live Preview** geçişi — özellikle camper-card /
  activity-schedule için `AiWidgetPropertiesPanel` dalı
- Copilot panelinin sol paneli gizleme davranışı (`leftPanelOpen && !copilotPanelOpen`)

## Figma export'u kullanma

Bir preset'in ekranlarını Figma'ya aktarmak için URL kalıbı:

```
http://localhost:5173/?preset=<presetId>&page=<N>&fullscreen=phone#figmacapture=<id>&figmaendpoint=<endpoint>&figmadelay=2500&figmaselector=.live-preview__phone
```

Capture script'i `packages/app-builder/index.html` içinde. Detaylar:
`packages/design-system/tools/figma-html-to-design-capture/`.
