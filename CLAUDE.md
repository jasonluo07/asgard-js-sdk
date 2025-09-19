# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Asgard JS SDK is a TypeScript monorepo that provides React components and core services for integrating AI chatbots with the Asgard AI platform. The SDK consists of two main packages:
- `@asgard-js/core` - Core client library for SSE communication with Asgard AI services
- `@asgard-js/react` - React components providing ready-to-use chat interfaces

## Key Commands

### Development
```bash
# Start demo application
yarn serve:react-demo

# Run tests
yarn test                  # All tests
yarn test:core            # Core package tests only
yarn test:react           # React package tests only
yarn test:coverage        # With coverage report

# Build packages
yarn build:core           # Build core package (required before building React)
yarn build:react          # Build React package

# Lint code
yarn lint:packages        # Lint both core and React packages

# Watch mode for development
yarn watch:core           # Watch core package changes
yarn watch:react          # Watch React package changes
```

### Release
```bash
yarn release:core         # Publish core package to npm
yarn release:react        # Publish React package to npm
```

## Architecture

### Package Dependencies
- React package depends on Core package
- Both packages are built with Vite and output ES modules
- Core also supports CJS and UMD formats for wider compatibility

### Core Package (`packages/core`)
- **Client**: `AsgardServiceClient` handles SSE connections and message streaming
- **Types**: Comprehensive TypeScript definitions for all message templates and API contracts
- **Event Handlers**: RxJS-based reactive event handling for real-time communication
- **Authentication**: Supports both static API keys and dynamic authentication flows

### React Package (`packages/react`)
- **Chatbot Component**: Main component with full theming support
- **Message Templates**: Pre-built components for text, images, carousels, buttons, charts
- **Context Providers**: Service context and theme context for state management
- **Markdown Support**: React-markdown with syntax highlighting and math rendering
- **Voice Input**: Browser speech recognition API integration

## Important Conventions

### Endpoint Configuration
Always use `botProviderEndpoint` instead of the deprecated `endpoint`:
```typescript
// Correct
config: {
  botProviderEndpoint: 'https://api.asgard-ai.com/ns/{namespace}/bot-provider/{botProviderId}'
}

// Deprecated (avoid)
config: {
  endpoint: 'https://api.asgard-ai.com/ns/{namespace}/bot-provider/{botProviderId}/message/sse'
}
```

### Type Safety
- All TypeScript strict mode rules are enforced
- Explicit return types required for all functions
- No `any` types allowed - use proper type definitions
- Module boundaries must have explicit type exports

### Testing Requirements
- Core package: All configuration scenarios must be tested
- React package: Component behavior and interaction tests required
- Run tests before committing changes
- Maintain existing test coverage levels

## Build System

The project uses Nx for monorepo management with these key configurations:
- **Vite**: Primary bundler for both packages
- **TypeScript**: Strict mode with explicit type requirements
- **ESLint**: Custom configuration with React and TypeScript rules
- **Vitest**: Test runner with jsdom environment
- **Dependencies**: Core package dependencies are bundled, React package externalizes React/ReactDOM

## Common Development Tasks

### Adding a New Message Template
1. Define types in `packages/core/src/types/sse-response.ts`
2. Implement component in `packages/react/src/components/templates/`
3. Register in template registry
4. Add theme configuration support
5. Write tests for both rendering and interaction

### Updating API Client
1. Modify `packages/core/src/lib/client.ts`
2. Update TypeScript definitions
3. Ensure backward compatibility (use deprecation warnings if needed)
4. Test all configuration scenarios
5. Update React package if interface changes

### Theme Customization
Theme priority (highest to lowest):
1. Props theme configuration
2. Bot provider metadata annotations
3. Default theme values

All theme properties support CSS variables for consistency.