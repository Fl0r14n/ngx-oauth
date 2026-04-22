import { signal, Signal, WritableSignal } from '@angular/core'

const get = (key: string) => {
  const value = globalThis.localStorage?.getItem(key)
  return (value && JSON.parse(value)) || undefined
}

const set = (key: string, value: any) => {
  globalThis.localStorage?.setItem(key, JSON.stringify(value))
}

export const storageSignal = <T>(keyInput: string | Signal<string>, defaultValue: T): WritableSignal<T> => {
  const keyFn = typeof keyInput === 'function' ? keyInput : () => keyInput
  const s = signal<T>(get(keyFn()) ?? defaultValue)
  const { set: signalSet, update } = s

  s.set = value => {
    set(keyFn(), value)
    signalSet(value)
  }

  s.update = fn => {
    update(current => {
      const next = fn(current)
      set(keyFn(), next)
      return next
    })
  }

  return s
}
