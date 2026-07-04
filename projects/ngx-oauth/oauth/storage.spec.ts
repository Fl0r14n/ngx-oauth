import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
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

  it('evaluates the key signal at write time', () =>
    TestBed.runInInjectionContext(() => {
      const key = signal('a')
      const s = storageSignal<{ x: number }>(key, { x: 0 })
      s.set({ x: 1 })
      expect(JSON.parse(localStorage.getItem('a')!)).toEqual({ x: 1 })
      key.set('b')
      s.set({ x: 2 })
      expect(JSON.parse(localStorage.getItem('b')!)).toEqual({ x: 2 })
      expect(JSON.parse(localStorage.getItem('a')!)).toEqual({ x: 1 })
    }))

  it('reloads the persisted value when the key signal changes', () =>
    TestBed.runInInjectionContext(() => {
      localStorage.setItem('siteA.token', JSON.stringify({ v: 'a' }))
      localStorage.setItem('siteB.token', JSON.stringify({ v: 'b' }))
      const key = signal('siteA.token')
      const s = storageSignal<{ v?: string }>(key, {})
      expect(s()).toEqual({ v: 'a' })
      key.set('siteB.token')
      TestBed.tick()
      expect(s()).toEqual({ v: 'b' })
    }))
})
