import { useCallback, useEffect, useState } from 'react'
import { normalize } from './model'

const KEY = 'viabilidade-medicos:v1'

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data.processes) ? data.processes.map(normalize) : []
  } catch {
    return []
  }
}

function save(processes) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, processes }))
    return true
  } catch {
    return false
  }
}

export function useProcesses() {
  const [processes, setProcesses] = useState(load)
  const [saveError, setSaveError] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setSaveError(!save(processes)), 250)
    return () => clearTimeout(t)
  }, [processes])

  const add = useCallback((p) => setProcesses((list) => [p, ...list]), [])
  const remove = useCallback((id) => setProcesses((list) => list.filter((p) => p.id !== id)), [])
  const update = useCallback((id, updater) => {
    setProcesses((list) =>
      list.map((p) => (p.id === id ? { ...updater(p), updatedAt: new Date().toISOString() } : p)),
    )
  }, [])
  const importMany = useCallback((items) => {
    setProcesses((list) => {
      const byId = new Map(list.map((p) => [p.id, p]))
      items.map(normalize).forEach((p) => byId.set(p.id, p))
      return [...byId.values()].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    })
  }, [])

  return { processes, add, remove, update, importMany, saveError }
}

// Roteamento por hash: #/ (lista) ou #/p/<id>/<aba>
export function useHashRoute() {
  const parse = () => {
    const parts = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
    if (parts[0] === 'p' && parts[1]) return { id: parts[1], tab: parts[2] || 'painel' }
    return { id: null, tab: null }
  }
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const on = () => {
      setRoute(parse())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const go = useCallback((id, tab) => {
    window.location.hash = id ? `#/p/${id}/${tab || 'painel'}` : '#/'
  }, [])
  return [route, go]
}

export function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function slug(s) {
  return (s || 'viabilidade')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 60) || 'viabilidade'
}
