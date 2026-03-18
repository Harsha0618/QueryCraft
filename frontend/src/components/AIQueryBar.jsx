import React from 'react'
import useStore from '../store'

export default function AIQueryBar() {
  const { aiQuery, setAIQuery, fetchAIReport, aiLoading, datasetLoaded } = useStore()

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      fetchAIReport()
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-xs px-2 py-1 rounded"
        style={{ background: '#1a1a22', color: '#818cf8', border: '1px solid #2a2a35' }}>
        <span>✦</span>
        <span className="font-medium">AI</span>
      </div>
      <div className="flex-1 flex items-center rounded-lg overflow-hidden"
        style={{ background: '#111115', border: '1px solid #1e1e22' }}>
        <input
          value={aiQuery}
          onChange={e => setAIQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder='Describe your report… e.g. "Show average marks by subject for students above 70%"'
          className="flex-1 bg-transparent text-sm px-4 py-2.5 outline-none"
          style={{ color: '#ccc' }}
          disabled={!datasetLoaded}
        />
        <button
          onClick={fetchAIReport}
          disabled={aiLoading || !aiQuery.trim() || !datasetLoaded}
          className="px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-40"
          style={{ background: '#6366f1', color: '#fff', minWidth: '140px' }}>
          {aiLoading ? (
            <span className="flex items-center gap-2 justify-center">
              <span className="w-3.5 h-3.5 rounded-full border border-white/30 border-t-white/80 animate-spin inline-block" />
              Thinking…
            </span>
          ) : 'Generate with AI'}
        </button>
      </div>
    </div>
  )
}
