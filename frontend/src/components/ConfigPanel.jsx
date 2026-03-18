import React from 'react'
import useStore from '../store'

const OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'contains']
const CALC_TYPES = ['avg', 'sum', 'count', 'min', 'max', 'custom']

const label = (s) => (
  <p className="text-xs font-medium mb-2 uppercase tracking-widest" style={{ color: '#555' }}>{s}</p>
)

export default function ConfigPanel() {
  const {
    datasetColumns, columnInfo, selectedColumns, updateSelectedColumns,
    filters, addFilter, updateFilter, removeFilter,
    calculations, addCalculation, updateCalculation, removeCalculation,
    fetchReport, loading, fileName, rowCount,
  } = useStore()

  const getDtype = (col) => columnInfo.find(c => c.name === col)?.dtype || ''
  const isNumeric = (col) => /int|float/.test(getDtype(col))

  const toggleColumn = (col) => {
    if (selectedColumns.includes(col)) {
      updateSelectedColumns(selectedColumns.filter(c => c !== col))
    } else {
      updateSelectedColumns([...selectedColumns, col])
    }
  }

  const btn = (onClick, children, variant = 'ghost') => {
    const styles = {
      ghost: { background: 'transparent', color: '#888', border: '1px solid #1e1e22' },
      primary: { background: '#6366f1', color: '#fff', border: 'none' },
    }
    return (
      <button onClick={onClick} className="text-xs px-3 py-1.5 rounded transition-all hover:opacity-80"
        style={styles[variant]}>
        {children}
      </button>
    )
  }

  return (
    <div className="p-4 flex flex-col gap-6">
      {/* Dataset info */}
      <div className="rounded-lg p-3 text-xs" style={{ background: '#111115', border: '1px solid #1e1e22' }}>
        <p className="font-medium truncate" style={{ color: '#ccc' }}>{fileName}</p>
        <p style={{ color: '#555' }}>{rowCount} rows · {datasetColumns.length} columns</p>
      </div>

      {/* Column selector */}
      <div>
        {label('Columns')}
        <div className="flex flex-wrap gap-1.5">
          {datasetColumns.map(col => {
            const active = selectedColumns.includes(col)
            return (
              <button key={col} onClick={() => toggleColumn(col)}
                className="text-xs px-2 py-1 rounded transition-all"
                style={{
                  background: active ? '#1e1e35' : '#111115',
                  border: `1px solid ${active ? '#6366f1' : '#1e1e22'}`,
                  color: active ? '#818cf8' : '#555',
                }}>
                {col}
                {isNumeric(col) && <span className="ml-1 opacity-50">#</span>}
              </button>
            )
          })}
        </div>
        <div className="flex gap-2 mt-2">
          {btn(() => updateSelectedColumns(datasetColumns), 'All')}
          {btn(() => updateSelectedColumns([]), 'None')}
        </div>
      </div>

      {/* Filters */}
      <div>
        {label('Filters')}
        <div className="flex flex-col gap-2">
          {filters.map(f => (
            <div key={f.id} className="flex flex-col gap-1 p-2 rounded" style={{ background: '#111115', border: '1px solid #1e1e22' }}>
              <div className="flex gap-1">
                <select value={f.field} onChange={e => updateFilter(f.id, 'field', e.target.value)}
                  className="flex-1 text-xs rounded px-2 py-1"
                  style={{ background: '#0d0d0f', border: '1px solid #1e1e22', color: '#ccc' }}>
                  {datasetColumns.map(c => <option key={c}>{c}</option>)}
                </select>
                <select value={f.op} onChange={e => updateFilter(f.id, 'op', e.target.value)}
                  className="text-xs rounded px-2 py-1"
                  style={{ background: '#0d0d0f', border: '1px solid #1e1e22', color: '#ccc' }}>
                  {OPERATORS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="flex gap-1">
                <input value={f.value} onChange={e => updateFilter(f.id, 'value', e.target.value)}
                  placeholder="value"
                  className="flex-1 text-xs rounded px-2 py-1"
                  style={{ background: '#0d0d0f', border: '1px solid #1e1e22', color: '#ccc' }} />
                <button onClick={() => removeFilter(f.id)}
                  className="text-xs px-2 rounded opacity-50 hover:opacity-100"
                  style={{ color: '#f87171' }}>✕</button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={addFilter} className="mt-2 text-xs w-full py-1.5 rounded transition-all hover:opacity-80"
          style={{ background: '#111115', border: '1px dashed #2a2a35', color: '#555' }}>
          + Add Filter
        </button>
      </div>

      {/* Calculations */}
      <div>
        {label('Calculations')}
        <div className="flex flex-col gap-2">
          {calculations.map(c => (
            <div key={c.id} className="flex flex-col gap-1 p-2 rounded" style={{ background: '#111115', border: '1px solid #1e1e22' }}>
              <div className="flex gap-1 items-center">
                <select value={c.type} onChange={e => updateCalculation(c.id, 'type', e.target.value)}
                  className="text-xs rounded px-2 py-1"
                  style={{ background: '#0d0d0f', border: '1px solid #1e1e22', color: '#818cf8' }}>
                  {CALC_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                {c.type !== 'custom' && (
                  <select value={c.field} onChange={e => updateCalculation(c.id, 'field', e.target.value)}
                    className="flex-1 text-xs rounded px-2 py-1"
                    style={{ background: '#0d0d0f', border: '1px solid #1e1e22', color: '#ccc' }}>
                    {datasetColumns.map(col => <option key={col}>{col}</option>)}
                  </select>
                )}
                <button onClick={() => removeCalculation(c.id)}
                  className="text-xs px-2 opacity-50 hover:opacity-100" style={{ color: '#f87171' }}>✕</button>
              </div>
              {c.type === 'custom' && (
                <input value={c.formula} onChange={e => updateCalculation(c.id, 'formula', e.target.value)}
                  placeholder="e.g. (marks / total_marks) * 100"
                  className="text-xs rounded px-2 py-1 mono"
                  style={{ background: '#0d0d0f', border: '1px solid #1e1e22', color: '#a5f3a5' }} />
              )}
              <input value={c.label} onChange={e => updateCalculation(c.id, 'label', e.target.value)}
                placeholder="label (optional)"
                className="text-xs rounded px-2 py-1"
                style={{ background: '#0d0d0f', border: '1px solid #1e1e22', color: '#888' }} />
            </div>
          ))}
        </div>
        <button onClick={addCalculation} className="mt-2 text-xs w-full py-1.5 rounded transition-all hover:opacity-80"
          style={{ background: '#111115', border: '1px dashed #2a2a35', color: '#555' }}>
          + Add Calculation
        </button>
      </div>

      {/* Generate */}
      <button
        onClick={fetchReport}
        disabled={loading || !selectedColumns.length}
        className="w-full py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-40"
        style={{ background: '#6366f1', color: '#fff' }}>
        {loading ? 'Generating…' : 'Generate Report'}
      </button>
    </div>
  )
}
