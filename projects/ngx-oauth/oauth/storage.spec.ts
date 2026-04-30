import { signal } from '@angular/core'
import { storageSignal } from './storage'

describe('storageSignal', () => {
  beforeEach(() => localStorage.clear())

  it('reads initial value from localStorage', () => {
    localStorage.setItem('k', JSON.stringify({ foo: 'bar' }))
    const s = storageSignal('k', {})
    expect(s()).toEqual({ foo: 'bar' })
  })

  it('falls back to the default when key is absent', () => {
    const s = storageSignal<{ foo?: string }>('k', { foo: 'def' })
    expect(s()).toEqual({ foo: 'def' })
  })

  it('persists on set', () => {
    const s = storageSignal<{ n: number }>('k', { n: 0 })
    s.set({ n: 5 })
    expect(JSON.parse(localStorage.getItem('k')!)).toEqual({ n: 5 })
    expect(s()).toEqual({ n: 5 })
  })

  it('persists on update', () => {
    const s = storageSignal<{ n: number }>('k', { n: 0 })
    s.update(v => ({ n: v.n + 1 }))
    expect(JSON.parse(localStorage.getItem('k')!)).toEqual({ n: 1 })
    expect(s()).toEqual({ n: 1 })
  })

  it('evaluates the key signal at write time', () => {
    const key = signal('a')
    const s = storageSignal<{ x: number }>(key, { x: 0 })
    s.set({ x: 1 })
    expect(JSON.parse(localStorage.getItem('a')!)).toEqual({ x: 1 })
    key.set('b')
    s.set({ x: 2 })
    expect(JSON.parse(localStorage.getItem('b')!)).toEqual({ x: 2 })
    expect(JSON.parse(localStorage.getItem('a')!)).toEqual({ x: 1 })
  })
})
