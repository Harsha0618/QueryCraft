import React from 'react'
import UploadZone from './components/UploadZone'
import ConfigPanel from './components/ConfigPanel'
import ResultPanel from './components/ResultPanel'
import AIQueryBar from './components/AIQueryBar'
import useStore from './store'

export default function App() {
  const { datasetLoaded, error, clearError } = useStore()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0d0d0f' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#1e1e22' }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff' }}>
            RB
          </div>
          <span className="font-semibold text-sm tracking-wide" style={{ color: '#e8e6e3' }}>
            Report Builder
          </span>
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#1a1a20', color: '#6366f1', border: '1px solid #2a2a35' }}>
            AI-Powered
          </span>
        </div>
        <div className="text-xs" style={{ color: '#555' }}>
          FastAPI · React · Gemini
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="mx-6 mt-4 px-4 py-3 rounded-lg flex items-center justify-between text-sm"
          style={{ background: '#2a1515', border: '1px solid #5a2020', color: '#ff8080' }}>
          <span>⚠ {error}</span>
          <button onClick={clearError} className="ml-4 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {!datasetLoaded ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <UploadZone />
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="px-6 py-3 border-b" style={{ borderColor: '#1e1e22' }}>
            <AIQueryBar />
          </div>
          <div className="flex-1 flex overflow-hidden" style={{ minHeight: 0 }}>
            <div className="w-72 flex-shrink-0 border-r overflow-y-auto" style={{ borderColor: '#1e1e22' }}>
              <ConfigPanel />
            </div>
            <div className="flex-1 overflow-hidden">
              <ResultPanel />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
