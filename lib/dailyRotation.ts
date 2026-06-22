const DAY_IN_MS = 86_400_000;

export function rotateDaily<T>(items: readonly T[], timestamp = Date.now()) {
  if (items.length < 2) {
    return [...items];
  }

  const dayNumber = Math.floor(timestamp / DAY_IN_MS);
  const offset = ((dayNumber % items.length) + items.length) % items.length;

  return [...items.slice(offset), ...items.slice(0, offset)];
}
