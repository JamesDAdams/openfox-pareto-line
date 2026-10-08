# AGENTS.md — openfox-pareto-line

Paths relative to `openfox-plugins/openfox-pareto-line/`.

## Purpose

OpenFox plugin that visualizes intelligence vs cost per task with a Pareto efficiency frontier. Synchronizes benchmarks from artificialanalysis.ai and exposes a `get_pareto_models` tool for agents.

## Stack

- TypeScript, ESM, tsup, vitest 3.x
- peerDep: `openfox` (not specified)

## Commands

```bash
npm run build      # tsup
npm test           # vitest run --passWithNoTests
npm run typecheck  # tsc --noEmit
```

## Project Map

```
src/
├── index.ts          # Entry point (register, ParetoManager)
├── types.ts          # TypeScript types
├── fetcher.ts        # fetchArtificialAnalysisModels (benchmarks retrieval)
├── models-filter.ts  # getOpenFoxConfiguredModels (provider-based filtering)
├── pareto.ts         # computeParetoFrontier (Pareto frontier calculation)
├── renderer.ts       # buildParetoModalDeclarativeTree (SVG rendering)
└── index.test.ts     # Unit tests
```

## Where to Look What

- **Modify benchmarks retrieval** → `src/fetcher.ts`
- **Modify Pareto frontier calculation** → `src/pareto.ts`
- **Modify SVG rendering** → `src/renderer.ts`
- **Add a setting** → `src/index.ts` (SETTINGS_SCHEMA)

## Conventions

- `apiVersion: 2`, capabilities: `ui`, `rpc`, `settings`, `tools`
- ESM build only via tsup (target: node20)
- `openfox` is externalized (provided by host)

## Cross-Project Dependencies

**Consumes**: `openfox/plugin` (PluginRegistry, PluginContext, DeclarativeNode).

**Consumed by**: OpenFox (loaded as plugin).

**Touchpoints**:

- `src/index.ts` (register, ParetoManager)
- `src/fetcher.ts` (fetchArtificialAnalysisModels)
- `src/pareto.ts` (computeParetoFrontier)

## Known Gotchas

- `dist/index.js` is the entry point loaded by OpenFox, not `src/`.
- Hardcoded fallback data (FALLBACK_ARTIFICIAL_ANALYSIS_MODELS).
- Cache via `context.storage`.
- No `node_modules` or `package-lock.json` in repository.

## Do Not Read / Do Not Touch

- `node_modules/`, `dist/`, `.git/`

## Further Reading

- [README.md](README.md) — overview

---

> After any change affecting structure, a command, a convention, an inter-project contract, or a primary flow, update this file in the same commit. If any information here is inaccurate, fix it.
