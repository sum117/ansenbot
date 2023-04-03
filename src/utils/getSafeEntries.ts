export default function getSafeEntries<T extends object, K extends keyof T>(obj: T): [K, T[K]][] {
  return Object.entries(obj) as [K, T[K]][];
}
