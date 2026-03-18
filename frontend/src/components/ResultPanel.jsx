import React, { useMemo } from 'react'
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getPaginationRowModel, flexRender,
} from '@tanstack/react-table'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, Cell,
} from 'recharts'
import useStore from '../store'

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e']

export default function ResultPanel() {
  const { reportData, summary, reportRowCount, loading, activeTab, setActiveTab, exportCSV } = useStore()

  const columns = useMemo(() => {
    if (!reportData.length) return []
    return Object.keys(reportData[0]).map(key => ({
      accessorKey: key,
      header: key,
      cell: info => {
        const val = info.getValue()
        if (val === null || val === undefined) return <span style={{ color: '#333' }}>—</span>
        if (typeof val === 'number') return <span className="mono">{Number.isInteger(val) ? val : val.toFixed(4)}</span>
        return String(val)
      }
    }))
  }, [reportData])

  const table = useReactTable({
    data: reportData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  })

  // Chart data: first string col as key, first numeric col as value
  const chartData = useMemo(() => {
    if (!reportData.length) return []
    const keys = Object.keys(reportData[0])
    const strKey = keys.find(k => typeof reportData[0][k] === 'string') || keys[0]
    const numKey = keys.find(k => typeof reportData[0][k] === 'number')
    if (!numKey) return []
    return reportData.slice(0, 30).map(r => ({ name: String(r[strKey]).slice(0, 20), value: r[numKey] }))
  }, [reportData])

  const summaryEntries = Object.entries(summary)
  const hasData = reportData.length > 0

  return (
    <div className="h-full flex flex-col" style={{ background: '#0d0d0f' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: '#1e1e22' }}>
        <div className="flex items-center gap-1">
          {['table', 'bar', 'line'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className="text-xs px-3 py-1.5 rounded transition-all"
              style={{
                background: activeTab === t ? '#1e1e35' : 'transparent',
                color: activeTab === t ? '#818cf8' : '#555',
                border: `1px solid ${activeTab === t ? '#6366f1' : 'transparent'}`,
              }}>
              {t === 'table' ? '⊞ Table' : t === 'bar' ? '▊ Bar' : '⌇ Line'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {hasData && (
            <span className="text-xs" style={{ color: '#555' }}>
              {reportRowCount} rows
            </span>
          )}
          {hasData && (
            <button onClick={exportCSV}
              className="text-xs px-3 py-1.5 rounded transition-all hover:opacity-80"
              style={{ background: '#111115', border: '1px solid #1e1e22', color: '#888' }}>
              ↓ Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {summaryEntries.length > 0 && (
        <div className="px-6 py-4 flex flex-wrap gap-3 border-b" style={{ borderColor: '#1e1e22' }}>
          {summaryEntries.map(([key, val]) => (
            <div key={key} className="rounded-lg px-4 py-3 flex flex-col gap-1"
              style={{ background: '#111115', border: '1px solid #1e1e22', minWidth: '120px' }}>
              <p className="text-xs" style={{ color: '#555' }}>{key}</p>
              <p className="text-lg font-semibold mono" style={{ color: '#818cf8' }}>
                {typeof val === 'number' ? (Number.isInteger(val) ? val.toLocaleString() : val.toFixed(2)) : val}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 rounded-full border-2 animate-spin"
                style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
              <p className="text-sm" style={{ color: '#555' }}>Generating report…</p>
            </div>
          </div>
        ) : !hasData ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-4">📋</div>
              <p className="text-sm" style={{ color: '#555' }}>
                Configure columns and click Generate Report,<br />or use the AI query bar above.
              </p>
            </div>
          </div>
        ) : activeTab === 'table' ? (
          <TableView table={table} />
        ) : activeTab === 'bar' ? (
          <ChartView data={chartData} type="bar" />
        ) : (
          <ChartView data={chartData} type="line" />
        )}
      </div>

      {/* Pagination */}
      {activeTab === 'table' && hasData && (
        <div className="flex items-center justify-between px-6 py-3 border-t text-xs"
          style={{ borderColor: '#1e1e22', color: '#555' }}>
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <div className="flex gap-2">
            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
              className="px-3 py-1 rounded disabled:opacity-30"
              style={{ background: '#111115', border: '1px solid #1e1e22', color: '#888' }}>
              ← Prev
            </button>
            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
              className="px-3 py-1 rounded disabled:opacity-30"
              style={{ background: '#111115', border: '1px solid #1e1e22', color: '#888' }}>
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function TableView({ table }) {
  return (
    <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid #1e1e22' }}>
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id} style={{ background: '#111115', borderBottom: '1px solid #1e1e22' }}>
              {hg.headers.map(h => (
                <th key={h.id}
                  onClick={h.column.getToggleSortingHandler()}
                  className="text-left px-4 py-3 text-xs cursor-pointer select-none whitespace-nowrap"
                  style={{ color: '#666', fontWeight: 500 }}>
                  {flexRender(h.column.columnDef.header, h.getContext())}
                  {h.column.getIsSorted() === 'asc' ? ' ↑' : h.column.getIsSorted() === 'desc' ? ' ↓' : ''}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, i) => (
            <tr key={row.id}
              style={{
                background: i % 2 === 0 ? '#0d0d0f' : '#0f0f12',
                borderBottom: '1px solid #141416',
              }}>
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-4 py-2.5 text-xs whitespace-nowrap"
                  style={{ color: '#bbb' }}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ChartView({ data, type }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{ color: '#555' }}>No numeric data to chart. Ensure you have at least one numeric column.</p>
      </div>
    )
  }

  const tooltipStyle = {
    contentStyle: { background: '#111115', border: '1px solid #2a2a35', color: '#ccc', borderRadius: 8 },
    labelStyle: { color: '#888' },
  }

  return (
    <div style={{ height: '480px' }}>
      <ResponsiveContainer width="100%" height="100%">
        {type === 'bar' ? (
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e22" />
            <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 11 }} angle={-30} textAnchor="end" />
            <YAxis tick={{ fill: '#555', fontSize: 11 }} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e22" />
            <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 11 }} angle={-30} textAnchor="end" />
            <YAxis tick={{ fill: '#555', fontSize: 11 }} />
            <Tooltip {...tooltipStyle} />
            <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
