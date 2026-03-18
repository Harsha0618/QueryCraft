import { create } from 'zustand'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const useStore = create((set, get) => ({
  // Dataset state
  datasetLoaded: false,
  datasetColumns: [],
  columnInfo: [],
  rowCount: 0,
  fileName: '',

  // Config
  selectedColumns: [],
  filters: [],
  calculations: [],

  // Results
  reportData: [],
  summary: {},
  reportRowCount: 0,

  // UI
  loading: false,
  aiLoading: false,
  error: null,
  activeTab: 'table',
  aiQuery: '',

  // ── Actions ─────────────────────────────────────────────────────────────

  setActiveTab: (tab) => set({ activeTab: tab }),
  setAIQuery: (q) => set({ aiQuery: q }),

  uploadDataset: async (file) => {
    set({ loading: true, error: null, datasetLoaded: false, reportData: [], summary: {} })
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await axios.post(`${API}/api/upload-csv`, fd)
      set({
        datasetLoaded: true,
        datasetColumns: data.columns,
        columnInfo: data.column_info || [],
        rowCount: data.row_count,
        fileName: file.name,
        selectedColumns: data.columns.slice(0, Math.min(5, data.columns.length)),
        filters: [],
        calculations: [],
        reportData: [],
        summary: {},
        loading: false,
      })
    } catch (e) {
      set({ loading: false, error: e.response?.data?.detail || e.message })
    }
  },

  updateSelectedColumns: (cols) => set({ selectedColumns: cols }),

  addFilter: () => {
    const cols = get().datasetColumns
    if (!cols.length) return
    set(s => ({
      filters: [...s.filters, { id: Date.now(), field: cols[0], op: '=', value: '' }]
    }))
  },

  updateFilter: (id, key, val) => set(s => ({
    filters: s.filters.map(f => f.id === id ? { ...f, [key]: val } : f)
  })),

  removeFilter: (id) => set(s => ({
    filters: s.filters.filter(f => f.id !== id)
  })),

  addCalculation: () => {
    const cols = get().datasetColumns
    if (!cols.length) return
    set(s => ({
      calculations: [...s.calculations, {
        id: Date.now(), type: 'avg', field: cols[0], formula: '', label: ''
      }]
    }))
  },

  updateCalculation: (id, key, val) => set(s => ({
    calculations: s.calculations.map(c => c.id === id ? { ...c, [key]: val } : c)
  })),

  removeCalculation: (id) => set(s => ({
    calculations: s.calculations.filter(c => c.id !== id)
  })),

  fetchReport: async () => {
    const { selectedColumns, filters, calculations } = get()
    set({ loading: true, error: null })
    try {
      const payload = {
        columns: selectedColumns,
        filters: filters.map(({ field, op, value }) => ({ field, op, value })),
        calculations: calculations.map(({ type, field, formula, label }) => ({
          type, field: type === 'custom' ? undefined : field,
          formula: type === 'custom' ? formula : undefined,
          label: label || undefined,
        })).filter(c => c.type !== 'custom' || c.formula),
      }
      const { data } = await axios.post(`${API}/api/generate-report`, payload)
      set({ reportData: data.data, summary: data.summary, reportRowCount: data.row_count, loading: false })
    } catch (e) {
      set({ loading: false, error: e.response?.data?.detail || e.message })
    }
  },

  fetchAIReport: async () => {
    const { aiQuery } = get()
    if (!aiQuery.trim()) return
    set({ aiLoading: true, error: null })
    try {
      const { data } = await axios.post(`${API}/api/ai-query`, { query: aiQuery })
      const config = data.config

      // Apply AI config to state
      const cols = get().datasetColumns
      const selCols = config.columns?.length ? config.columns : cols.slice(0, 5)

      const filters = (config.filters || []).map((f, i) => ({ ...f, id: Date.now() + i }))
      const calcs = (config.calculations || []).map((c, i) => ({ ...c, id: Date.now() + 100 + i }))

      set({ selectedColumns: selCols, filters, calculations: calcs, aiLoading: false })

      // Auto-generate
      await get().fetchReport()
    } catch (e) {
      set({ aiLoading: false, error: e.response?.data?.detail || e.message })
    }
  },

  clearError: () => set({ error: null }),

  exportCSV: () => {
    const { reportData } = get()
    if (!reportData.length) return
    const headers = Object.keys(reportData[0])
    const rows = reportData.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'report.csv'; a.click()
    URL.revokeObjectURL(url)
  },
}))

export default useStore
