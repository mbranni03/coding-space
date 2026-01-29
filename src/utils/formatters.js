/**
 * Format milliseconds into a readable "1h 30m" or "45m" string.
 * @param {number} ms - Time in milliseconds
 * @returns {string}
 */
export function formatTime(ms) {
  const seconds = ms / 1000 || 0
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
