import type { ParetoModelPoint } from './types.js'

/**
 * Computes the 2D Pareto frontier for a set of models.
 * Goal: Maximize Intelligence Index, Minimize Cost per Task.
 * 
 * Model A strictly dominates Model B if:
 * - A.intelligenceIndex >= B.intelligenceIndex AND A.costPerTask <= B.costPerTask
 * - AND at least one of the inequalities is strict (> or <)
 * 
 * A model is on the Pareto frontier if no other model dominates it.
 */
export function computeParetoFrontier(models: ParetoModelPoint[]): ParetoModelPoint[] {
  if (models.length === 0) return []

  // Filter valid points with numbers > 0
  const valid = models.filter(
    (m) => typeof m.intelligenceIndex === 'number' && m.intelligenceIndex > 0 && typeof m.costPerTask === 'number' && m.costPerTask > 0,
  )

  const nonDominated: ParetoModelPoint[] = []

  for (const candidate of valid) {
    let dominated = false
    for (const other of valid) {
      if (candidate === other) continue

      const higherOrEqualIntelligence = other.intelligenceIndex >= candidate.intelligenceIndex
      const lowerOrEqualCost = other.costPerTask <= candidate.costPerTask
      const strictlyBetter =
        other.intelligenceIndex > candidate.intelligenceIndex || other.costPerTask < candidate.costPerTask

      if (higherOrEqualIntelligence && lowerOrEqualCost && strictlyBetter) {
        dominated = true
        break
      }
    }

    if (!dominated) {
      nonDominated.push(candidate)
    }
  }

  // Sort along the frontier by cost ascending (and therefore intelligence ascending)
  return nonDominated.sort((a, b) => a.costPerTask - b.costPerTask)
}

/**
 * Mark each model with its isParetoOptimal flag.
 */
export function markParetoOptimality(models: ParetoModelPoint[]): ParetoModelPoint[] {
  // Deduplicate by benchmark slug when computing frontier
  const seenSlugs = new Set<string>()
  const uniqueModels: ParetoModelPoint[] = []
  for (const m of models) {
    if (m.costPerTask <= 0 || m.intelligenceIndex <= 0) continue
    const key = m.slug || m.id
    if (seenSlugs.has(key)) continue
    seenSlugs.add(key)
    uniqueModels.push(m)
  }

  const frontier = computeParetoFrontier(uniqueModels)
  const frontierSlugs = new Set(frontier.map((m) => m.slug || m.id))

  return models.map((m) => ({
    ...m,
    isParetoOptimal: frontierSlugs.has(m.slug || m.id),
  }))
}
