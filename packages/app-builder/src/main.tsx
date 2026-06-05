import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import './styles/app.scss'

// Design System styles (builder UI fonts, tokens)
import '@jf/design-system/src/styles/app.scss'

// App Elements tokens & component styles (for canvas area)
import '@jf/app-elements/styles'

import { APP_PRESETS } from './presets/appPresets.ts'
import { initStorage } from './presets/storage.ts'

// Always clear the yoga-studio snapshot on boot so the demo starts from a
// clean preset every refresh — the Visible AI flow mutates the Classes page,
// and we want that mutation gone next time the user reloads.
function clearYogaSnapshot(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('jf-app-builder')
      req.onsuccess = (e) => {
        const db = (e.target as IDBOpenDBRequest).result
        try {
          const tx = db.transaction('preset-snapshots', 'readwrite')
          tx.objectStore('preset-snapshots').delete('yoga-studio')
          tx.oncomplete = () => resolve()
          tx.onerror = () => resolve()
        } catch { resolve() }
      }
      req.onerror = () => resolve()
    } catch { resolve() }
  })
}

const presetIds = APP_PRESETS.map((p) => p.id)

clearYogaSnapshot()
  .then(() => initStorage(presetIds))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
