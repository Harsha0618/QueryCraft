import React, { useRef, useState } from 'react'
import useStore from '../store'

export default function UploadZone() {
  const { uploadDataset, loading } = useStore()
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)

  const handleFile = (file) => {
    if (file && file.name.endsWith('.csv')) uploadDataset(file)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-xl">
      <div className="text-center">
        <h1 className="text-3xl font-semibold mb-2" style={{ color: '#e8e6e3' }}>
          Custom Report Builder
        </h1>
        <p className="text-sm" style={{ color: '#666' }}>
          Upload any CSV dataset and generate reports with filters, calculations, and AI.
        </p>
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        className="w-full rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center gap-4 py-16"
        style={{
          border: `2px dashed ${dragging ? '#6366f1' : '#2a2a35'}`,
          background: dragging ? '#141420' : '#111115',
        }}
      >
        <input ref={inputRef} type="file" accept=".csv" onChange={e => handleFile(e.target.files[0])} />
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
            <span className="text-sm" style={{ color: '#888' }}>Processing CSV…</span>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
              style={{ background: '#1a1a22', border: '1px solid #2a2a35' }}>
              📊
            </div>
            <div className="text-center">
              <p className="font-medium text-sm" style={{ color: '#ccc' }}>Drop your CSV file here</p>
              <p className="text-xs mt-1" style={{ color: '#555' }}>or click to browse</p>
            </div>
          </>
        )}
      </div>

      <div className="w-full rounded-lg p-4 text-xs" style={{ background: '#111115', border: '1px solid #1e1e22' }}>
        <p className="font-medium mb-2" style={{ color: '#888' }}>FEATURES</p>
        <div className="grid grid-cols-2 gap-2">
          {['Dynamic column detection', 'Filter builder', 'Aggregation engine', 'Safe formula parser', 'AI natural language queries', 'Chart visualizations', 'CSV export', 'Any dataset'].map(f => (
            <div key={f} className="flex items-center gap-2" style={{ color: '#555' }}>
              <span style={{ color: '#6366f1' }}>›</span> {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
