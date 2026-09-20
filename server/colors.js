export function getCategoryColorName(catOrColor) {
  if (!catOrColor) return 'grey'
  const hex = (typeof catOrColor === 'string' ? catOrColor : catOrColor.color || '').toLowerCase()
  if (!hex) return 'grey'
  if (hex === 'blue' || hex.includes('3b82f6') || hex.includes('06b6d4') || hex.includes('2563eb')) return 'blue'
  if (hex === 'green' || hex.includes('10b981') || hex.includes('15803d') || hex.includes('22c55e')) return 'green'
  if (hex === 'purple' || hex.includes('7c3aed') || hex.includes('8b5cf6') || hex.includes('7e22ce')) return 'purple'
  if (hex === 'yellow' || hex.includes('f59e0b') || hex.includes('ca8a04') || hex.includes('eab308')) return 'yellow'
  if (hex === 'orange' || hex.includes('ea580c') || hex.includes('f97316')) return 'orange'
  if (hex === 'salmon' || hex === 'red' || hex.includes('ef4444') || hex.includes('e11d48') || hex.includes('f43f5e')) return 'salmon'
  if (hex === 'pink' || hex.includes('ec4899') || hex.includes('db2777')) return 'pink'
  if (hex === 'grey' || hex === 'gray' || hex.includes('64748b') || hex.includes('6b7280')) return 'grey'
  return 'grey'
}
