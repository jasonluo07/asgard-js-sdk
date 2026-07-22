# AGENTS.md

Asgard JS SDK is a TypeScript monorepo that provides React components and core services for integrating AI chatbots with the Asgard AI platform:

- `@asgard-js/core` — Core client library for SSE communication with Asgard AI services.
- `@asgard-js/react` — React components providing ready-to-use chat interfaces.

## Commands

```bash
# Build (build core before react)
npm run build:core        # Build @asgard-js/core
npm run build:react       # Build @asgard-js/react

# Test
npm run test:packages     # Vitest for both core and react
npm run test:core         # Core only
npm run test:react        # React only

# Lint & format
npm run lint:packages     # Lint both core and react packages
npm run lint:core         # Lint core only
npm run lint:react        # Lint react only
npm run format            # Prettier --write
npm run format:check      # Prettier check only

# Watch mode
npm run watch:core        # Watch core package
npm run watch:react       # Watch react package

# Demo
npm run serve:react-demo  # react-demo dev server at http://localhost:4200

# Release (manual; see CLAUDE.local.md)
npm run release:core      # Publish @asgard-js/core to npm
npm run release:react     # Publish @asgard-js/react to npm
```

## Tech Stack

- **Language**: TypeScript 5 (strict mode; no `any`, explicit return types, explicit type exports at module boundaries)
- **Monorepo**: Nx
- **Bundler**: Vite (core outputs ESM + CJS + UMD; react outputs ESM and externalizes react/react-dom)
- **Reactive**: RxJS (SSE streaming, event handling)
- **React package**: React 18 / 19 (peerDependencies), Streamdown (streaming markdown), Vega ecosystem (charts), browser speech recognition (voice input)
- **Lint/Format**: ESLint + Prettier
- **Test**: Vitest

## Project Structure

```
packages/
├── core/    @asgard-js/core — AsgardServiceClient (SSE), types, RxJS event handlers, auth
│   └── src/  lib/ (client) · types/ (sse-response.ts, contracts) · constants/ (enum.ts)
└── react/   @asgard-js/react — Chatbot component, message templates, context/theme providers
    └── src/  components/ (templates/, ...) · providers/ (service + theme context)
apps/
└── react-demo/   Interactive demo (Vite), dev server on port 4200
docs/     spec-driven-development.md (SDD rules)
requirements/  SDD source of truth (see Development Workflow below)
references/    git submodules — background only (see References below)
```

- **Package dependencies**: react depends on core. Core is framework-agnostic and must not import react/react-dom/DOM.
- Component files and message templates follow the existing patterns under `packages/react/src/components/templates/`.

## Conventions

### Endpoint configuration

Always use `botProviderEndpoint` instead of the deprecated `endpoint`:

```typescript
// Correct
config: {
  botProviderEndpoint: 'https://api.asgard-ai.com/ns/{namespace}/bot-provider/{botProviderId}';
}
// Deprecated (avoid)
config: {
  endpoint: 'https://api.asgard-ai.com/ns/{namespace}/bot-provider/{botProviderId}/message/sse';
}
```

### Type safety

- All TypeScript strict rules enforced; no `any` — use proper type definitions.
- Explicit return types for all exported functions; module boundaries have explicit type exports.

### Theme priority (highest to lowest)

1. Props theme configuration
2. Bot provider metadata annotations
3. Default theme values

All theme properties support CSS variables. React/ReactDOM are externalized in the react build.

### Versioning

`@asgard-js/core` and `@asgard-js/react` always share the same version number (see `CLAUDE.local.md` for the manual release flow).

## Development Workflow (SDD)

This project uses lightweight Spec-Driven Development:

- **`requirements/` is the single source of truth for implementation**; `references/` is background material only, **do not implement directly from `references/`**.
- Task specs live in `requirements/tasks/TASK-*.md` using **Single-file SDD**; per-issue cycles use the `BUILD-*` / `REVIEW-*` pair. Acceptance criteria are tagged with EARS `R#` identifiers and map to implementation tasks and verification cases.
- Status flow: `draft → ready → in-progress → done` (**never use the underscore form `in_progress`**).
- When a task is `ready`, **do not start work without an explicit instruction**; if implementation must deviate from an agreed spec, stop and confirm, update the spec, then continue.
- Before starting a new task, read `requirements/_index.md`; see `requirements/README.md` for the full rules and read order, and `docs/spec-driven-development.md` for the complete SDD guidelines.
- The per-issue cycle is driven by the `feature-workflow` skill (resolve a PM issue → plan a BUILD/REVIEW pair → build per `FRONTEND_RULE_COMMON.md` → run the `review` skill for §1 static + §3 functional → done only on your authorization). The `spec-workflow` skill governs larger specs before coding.

## References (background material, not the implementation source)

The entries under `references/` are git submodules (pinned to specific commits). **Treat them as background reference only; do not implement directly from them**; when they conflict with implementation, the actual requirements take precedence. First clone / sync: `git submodule update --init --recursive`.

| Submodule                              | Role                                                                                    | How to use                                                                                                                                                                                                                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `references/asgard-sdk-pm`             | **PM spec repo** (source of feature requirements / use cases for the Asgard SDK family) | Spec source of truth for this repo lives under `tracking/asgard-js-sdk/` (`features/`, `use-cases/`, `tasks/`) and `docs/spec/asgard-js-sdk/`. Conventions in `CONVENTIONS.md`; entry in `AGENTS.md`. Open cross-team issues (API/spec gaps) in that repo's GitHub issues. |
| `references/asgard-chat-kit-prototype` | **Chat kit prototype** (Vite/React design & interaction prototype)                      | Visual / behavioral reference for chat UI and templates. Reference only, do not port line by line.                                                                                                                                                                         |

## Demo application

`apps/react-demo` provides interactive demonstrations:

- **Templates** — preview all message template types (Text, Button, Carousel, Image, Chart, Table, Math)
- **Features** — toggle SDK features (file upload, export, document upload)
- **Theme** — customize appearance with color presets / custom colors
- **Auth** — test auth states (authenticated, needApiKey, error, ...)
- **Events** — handle EMIT actions from button clicks
- **Fullscreen** — view the chatbot in fullscreen

To run: copy `apps/react-demo/.env.example` to `apps/react-demo/.env`, set `VITE_BOT_PROVIDER_ENDPOINT` / `VITE_API_KEY` (see `CLAUDE.local.md` for the full variable map), then `npm run serve:react-demo`.

## Common Development Tasks

### Adding a new message template

1. Define types in `packages/core/src/types/sse-response.ts`.
2. Add the new type to the `MessageTemplateType` enum in `packages/core/src/constants/enum.ts`.
3. Implement the component in `packages/react/src/components/templates/`.
4. Export it from `packages/react/src/components/templates/index.ts`.
5. Add theme configuration support.

### Updating the API client

1. Modify `packages/core/src/lib/client.ts`.
2. Update TypeScript definitions.
3. Ensure backward compatibility (deprecate with `@deprecated`, do not remove).
4. Update the react package if the interface changes.

## Local dev notes

Local verification habits, the manual release flow, `npm pack` local-install into consumer apps, and demo `.env` setup live in `CLAUDE.local.md`.
