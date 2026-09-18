# Documentation Index

Project-wide documentation for CareerForcePro Web. For setup/quick start, see the [root README](../README.md).

| File | What it covers |
| --- | --- |
| [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) | Architecture, strict code patterns, naming conventions, API/Redux/form patterns, testing strategy, and common workflows. |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Color, typography, spacing, and component design tokens reverse-engineered from the Figma redesign reference. |
| [STRUCTURE_MAPPING.md](STRUCTURE_MAPPING.md) | Why `src/api/` is organized by backend microservice boundary, and what moved where. |
| [ORGANIZATION_SERVICE_INTEGRATION.md](ORGANIZATION_SERVICE_INTEGRATION.md) | Change log of wiring the frontend to the real `organization-service` backend (phases, bug fixes, known backend gaps). |
| [CANDIDATE_SERVICE_INTEGRATION.md](CANDIDATE_SERVICE_INTEGRATION.md) | Change log of wiring the frontend to the real `candidate-service` backend (phases, bug fixes, known backend gaps). |

Not in this folder, on purpose — moving these would break the tooling that reads them from a fixed location:

- [`../.github/copilot-instructions.md`](../.github/copilot-instructions.md) — read directly by GitHub Copilot.
- [`../.agents/rules/`](../.agents/rules/) — read directly by AI agent tooling.
- [`../public/data/geo/SOURCE.md`](../public/data/geo/SOURCE.md) — license/source notes kept next to the geo data files it documents.
