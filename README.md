# OpenFox Pareto Line

Visualize model intelligence vs cost per task and Pareto efficiency frontier from Artificial Analysis in OpenFox.

## Features

- **Pareto Efficiency Frontier**: Interactive SVG graph calculating optimal frontier between Intelligence Index and Cost per Task.
- **Artificial Analysis Benchmarks**: Real-time synchronization with latest benchmark datasets from [artificialanalysis.ai](https://artificialanalysis.ai).
- **Configured Providers Filtering**: Filter and compare models available in your configured OpenFox providers with custom cost calculations.
- **Header Action & Plugin Menu**: Quick access button in the top navigation header and plugin dropdown menu.
- **Agent Querying Tool**: `get_pareto_models` tool for agent sessions to query benchmark and Pareto-optimal models.

## Installation

Install directly in OpenFox from **Settings → Plugins**:

```
https://github.com/JamesDAdams/openfox-pareto-line
```

## Configuration

| Setting | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `showInHeader` | `boolean` | `false` | Display a direct quick-access button in the top navigation header. |
| `autoSyncOnOpen` | `boolean` | `true` | Automatically fetch latest benchmarks from artificialanalysis.ai when opening the modal. |

## License

MIT
