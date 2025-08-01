# AsgardJs Core

This package contains the core functionalities of the AsgardJs SDK, providing essential tools for interacting with the Asgard AI platform through Server-Sent Events (SSE) and conversation management.

## Installation

To install the core package, use the following command:

```sh
yarn add @jasonluo07/asgard-js-core
```

## Usage

Here's a basic example of how to use the core package:

```javascript
import { AsgardServiceClient } from '@jasonluo07/asgard-js-core';

const client = new AsgardServiceClient({
  apiKey: 'your-api-key',
  botProviderEndpoint:
    'https://api.asgard-ai.com/ns/{namespace}/bot-provider/{botProviderId}',
  debugMode: true, // Enable to see deprecation warnings
});

// Use the client to send messages via SSE
client.fetchSse({
  customChannelId: 'your-channel-id',
  text: 'Hello, Asgard!',
  action: 'message',
});

// Listen to events
client.on('MESSAGE', (response) => {
  console.log('Received message:', response);
});

client.on('DONE', (response) => {
  console.log('Conversation completed:', response);
});

client.on('ERROR', (error) => {
  console.error('Error occurred:', error);
});
```

## Migration from `endpoint` to `botProviderEndpoint`

**Important**: The `endpoint` configuration option is deprecated. Use `botProviderEndpoint` instead for simplified configuration.

### Before (Deprecated)

```javascript
const client = new AsgardServiceClient({
  apiKey: 'your-api-key',
  endpoint:
    'https://api.asgard-ai.com/ns/{namespace}/bot-provider/{botProviderId}/message/sse',
  botProviderEndpoint:
    'https://api.asgard-ai.com/ns/{namespace}/bot-provider/{botProviderId}',
});
```

### After (Recommended)

```javascript
const client = new AsgardServiceClient({
  apiKey: 'your-api-key',
  botProviderEndpoint:
    'https://api.asgard-ai.com/ns/{namespace}/bot-provider/{botProviderId}',
  // SSE endpoint is automatically derived as: botProviderEndpoint + '/message/sse'
});
```

**Benefits:**

- Simplified configuration with single endpoint
- Reduced chance of configuration errors
- Automatic endpoint derivation

**Backward Compatibility:** Existing code using `endpoint` will continue to work but may show deprecation warnings when `debugMode` is enabled.

## API Reference

The core package exports three main classes for different levels of abstraction:

### AsgardServiceClient

The main client class for interacting with the Asgard AI platform.

#### Constructor Options (ClientConfig)

- **apiKey**: `string` (required) - API key for authentication
- **botProviderEndpoint**: `string` (required) - Bot provider endpoint URL (SSE endpoint will be auto-derived)
- **endpoint?**: `string` (deprecated) - Legacy API endpoint URL. Use `botProviderEndpoint` instead.
- **debugMode?**: `boolean` - Enable debug mode for deprecation warnings, defaults to `false`
- **transformSsePayload?**: `(payload: FetchSsePayload) => FetchSsePayload` - SSE payload transformer
- **onRunInit?**: `InitEventHandler` - Handler for run initialization events
- **onMessage?**: `MessageEventHandler` - Handler for message events
- **onToolCall?**: `ToolCallEventHandler` - Handler for tool call events
- **onProcess?**: `ProcessEventHandler` - Handler for process events
- **onRunDone?**: `DoneEventHandler` - Handler for run completion events
- **onRunError?**: `ErrorEventHandler` - Error handler for execution errors

#### Methods

- **fetchSse(payload, options?)**: Send a message via Server-Sent Events
- **on(event, handler)**: Listen to specific SSE events
- **close()**: Close the SSE connection and cleanup resources

#### Event Types

- **INIT**: Run initialization events
- **MESSAGE**: Message events (start, delta, complete)
- **TOOL_CALL**: Tool call events (start, complete)
- **PROCESS**: Process events (start, complete)
- **DONE**: Run completion events
- **ERROR**: Error events

### Channel

Higher-level abstraction for managing a conversation channel with reactive state management using RxJS.

#### Static Methods

- **Channel.reset(config, payload?, options?)**: `Promise<Channel>` - Create and initialize a new channel

#### Instance Methods

- **sendMessage(payload, options?)**: `Promise<void>` - Send a message through the channel
- **close()**: `void` - Close the channel and cleanup subscriptions

#### Configuration (ChannelConfig)

- **client**: `IAsgardServiceClient` - Instance of AsgardServiceClient
- **customChannelId**: `string` - Unique channel identifier
- **customMessageId?**: `string` - Optional message ID
- **conversation**: `Conversation` - Initial conversation state
- **statesObserver?**: `ObserverOrNext<ChannelStates>` - Observer for channel state changes

#### Properties

- **customChannelId**: `string` - The channel identifier
- **customMessageId?**: `string` - Optional message identifier

#### Example Usage

```javascript
import {
  AsgardServiceClient,
  Channel,
  Conversation,
} from '@jasonluo07/asgard-js-core';

const client = new AsgardServiceClient({
  botProviderEndpoint: 'https://api.example.com/bot-provider/123',
  apiKey: 'your-api-key',
});

const conversation = new Conversation({ messages: new Map() });

const channel = await Channel.reset({
  client,
  customChannelId: 'channel-123',
  conversation,
  statesObserver: (states) => {
    console.log('Connection status:', states.isConnecting);
    console.log('Messages:', Array.from(states.conversation.messages.values()));
  },
});

// Send a message
await channel.sendMessage({ text: 'Hello, bot!' });
```

### Conversation

Immutable conversation state manager that handles message updates and SSE event processing.

#### Constructor

- **constructor(options)**: Initialize conversation with `{messages: Map<string, ConversationMessage> | null}`

#### Methods

- **pushMessage(message)**: `Conversation` - Add a new message (returns new instance)
- **onMessage(response)**: `Conversation` - Process SSE response and update conversation

#### Properties

- **messages**: `Map<string, ConversationMessage> | null` - Map of all messages in the conversation

#### Message Types

- **ConversationUserMessage**: User-sent messages with `text` and `time`
- **ConversationBotMessage**: Bot responses with `message`, `isTyping`, `typingText`, `eventType`
- **ConversationErrorMessage**: Error messages with `error` details

#### Example Usage

```javascript
import { Conversation } from '@jasonluo07/asgard-js-core';

// Create new conversation
const conversation = new Conversation({ messages: new Map() });

// Add a user message
const userMessage = {
  id: 'msg-1',
  type: 'user',
  text: 'Hello',
  time: Date.now(),
};

const updatedConversation = conversation.pushMessage(userMessage);
console.log('Messages:', Array.from(updatedConversation.messages.values()));
```

## Testing

The core package includes comprehensive tests using Vitest.

### Running Tests

```sh
# Run tests once
yarn test:core

# Run tests in watch mode
yarn test:core:watch

# Run tests with UI
yarn test:core:ui

# Run tests with coverage
yarn test:core:coverage
```

### Test Structure

Tests are located alongside source files with `.spec.ts` extensions:

- `src/lib/client.spec.ts` - Tests for AsgardServiceClient including deprecation scenarios
- Test environment: jsdom with Vitest
- Coverage reports available in `test-output/vitest/coverage/`

### Writing Tests

The package uses Vitest for testing with the following setup:

- TypeScript support
- jsdom environment for DOM APIs
- ESLint integration
- Coverage reporting with v8 provider

Example test structure:

```javascript
import { describe, it, expect } from 'vitest';
import { AsgardServiceClient } from './client';

describe('AsgardServiceClient', () => {
  it('should create client with botProviderEndpoint', () => {
    const client = new AsgardServiceClient({
      botProviderEndpoint: 'https://api.example.com/bot-provider/bp-123',
      apiKey: 'test-key',
    });

    expect(client).toBeDefined();
  });
});
```

## Development

To develop the core package locally, follow these steps:

1. Clone the repository and navigate to the project root directory.

2. Install dependencies:

```sh
yarn install
```

3. Start development:

You can use the following commands to work with the core package:

```sh
# Lint the core package
yarn lint:core

# Run tests
yarn test:core

# Build the package
yarn build:core

# Watch mode for development
yarn watch:core
```

Setup your npm registry token for yarn publishing:

```sh
cd ~/
touch .npmrc
echo "//registry.npmjs.org/:_authToken={{YOUR_TOKEN}}" >> .npmrc
```

For working with both core and React packages:

```sh
# Lint both packages
yarn lint:packages

# Test both packages
yarn test

# Build core package (required for React package)
yarn build:core
yarn build:react

# Release packages
yarn release:core  # Release core package
yarn release:react # Release React package
```

All builds will be available in the `dist` directory.

## Contributing

We welcome contributions! Please read our [contributing guide](../../CONTRIBUTING.md) to get started.

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.
