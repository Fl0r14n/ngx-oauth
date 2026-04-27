// Node 25 ships an empty `globalThis.localStorage` placeholder. Replace it with an
// in-memory shim so jsdom-based specs that rely on Web Storage actually work.
const memory = new Map<string, string>()
const polyfill: Storage = {
  get length() {
    return memory.size
  },
  clear: () => memory.clear(),
  getItem: (k: string) => (memory.has(k) ? memory.get(k)! : null),
  key: (i: number) => Array.from(memory.keys())[i] ?? null,
  removeItem: (k: string) => void memory.delete(k),
  setItem: (k: string, v: string) => void memory.set(k, String(v))
}
const ls = (globalThis as any).localStorage
if (!ls || typeof ls.clear !== 'function') {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: polyfill })
}
