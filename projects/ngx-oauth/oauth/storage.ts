import { effect, signal, Signal, WritableSignal } from '@angular/core'

const storage = () => {
  const s = globalThis.localStorage
  return typeof s?.getItem === 'function' ? s : undefined
}

const get = (key: string) => {
  const value = storage()?.getItem(key)
  try {
    return (value && JSON.parse(value)) || undefined
  } catch {
    return undefined
  }
}

const set = (key: string, value: any) => {
  storage()?.setItem(key, JSON.stringify(value))
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

  if (typeof keyInput === 'function') {
    let loadedKey = keyFn()
    effect(() => {
      const key = keyInput()
      if (key === loadedKey) return
      loadedKey = key
      signalSet(get(key) ?? defaultValue)
    })
  }

  return s
}
