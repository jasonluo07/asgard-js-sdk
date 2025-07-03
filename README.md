# AsgardJs React

This package provides React components and hooks for integrating with the Asgard AI platform, allowing you to build interactive chat interfaces.

## Installation

To install the React package, use the following command:

```sh
yarn add @asgard-js/core @asgard-js/react
```

## Usage

Here's a basic example of how to use the React components:

```javascript
import React, { useRef } from 'react';
import { Chatbot } from '@asgard-js/react';

const chatbotRef = useRef(null);

const App = () => {
  return (
    <div style={{ width: '800px', position: 'relative' }}>
      <button
        style={{
          position: 'absolute',
          top: '80px',
          right: '50%',
          transform: 'translateX(50%)',
          zIndex: 10,
          border: '1px solid white',
          borderRadius: '5px',
          color: 'white',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          padding: '0.5rem 1rem',
        }}
        onClick={() =>
          chatbotRef.current?.serviceContext?.sendMessage?.({ text: 'Hello' })
        }
      >
        Send a message from outside of chatbot
      </button>
      <Chatbot
        ref={chatbotRef}
        title="Asgard AI Chatbot"
        config={{
          apiKey: 'your-api-key',
          botProviderEndpoint:
            'https://api.asgard-ai.com/ns/{namespace}/bot-provider/{botProviderId}',
          debugMode: true, // Enable to see deprecation warnings
          transformSsePayload: (payload) => {
            return payload;
          },
        }}
        enableLoadConfigFromService={true}
        customChannelId="your-channel-id"
        initMessages={[]}
        debugMode={false}
        fullScreen={false}
        avatar="https://example.com/avatar.png"
        botTypingPlaceholder="Bot is typing..."
        onReset={() => {
          console.log('Chat reset');
        }}
        onClose={() => {
          console.log('Chat closed');
        }}
        onSseMessage={(response, ctx) => {
          if (response.eventType === 'asgard.run.done') {
            console.log('onSseMessage', response, ctx.conversation);

            setTimeout(() => {
              // delay some time to wait for the serviceContext to be available
              chatbotRef.current?.serviceContext?.sendMessage?.({
                text: 'Say hi after 5 seconds',
              });
            }, 5000);
          }
        }}
      />
    </div>
  );
};

export default App;
```

## Migration from `endpoint` to `botProviderEndpoint`

**Important**: The `endpoint` configuration option is deprecated. Use `botProviderEndpoint` instead for simplified configuration.

### Before (Deprecated)
```javascript
config: {
  apiKey: 'your-api-key',
  endpoint: 'https://api.asgard-ai.com/ns/{namespace}/bot-provider/{botProviderId}/message/sse',
  botProviderEndpoint: 'https://api.asgard-ai.com/ns/{namespace}/bot-provider/{botProviderId}',
}
```

### After (Recommended)
```javascript
config: {
  apiKey: 'your-api-key', 
  botProviderEndpoint: 'https://api.asgard-ai.com/ns/{namespace}/bot-provider/{botProviderId}',
  // SSE endpoint is automatically derived as: botProviderEndpoint + '/message/sse'
}
```

**Benefits:**
- Simplified configuration with single endpoint
- Reduced chance of configuration errors
- Automatic endpoint derivation

**Backward Compatibility:** Existing code using `endpoint` will continue to work but may show deprecation warnings when `debugMode` is enabled.

**Note:** If both `endpoint` and `botProviderEndpoint` are provided, the `endpoint` value takes precedence and will be used with a deprecation warning.

### Chatbot Component Props

- **title**: `string` - The title of the chatbot.
- **config**: `ClientConfig` - Configuration object for the Asgard service client, including:
  - `apiKey`: `string` (required) - API key for authentication
  - `botProviderEndpoint`: `string` (required) - Bot provider endpoint URL (SSE endpoint will be auto-derived)
  - `endpoint?`: `string` (deprecated) - Legacy API endpoint URL. Use `botProviderEndpoint` instead.
  - `transformSsePayload?`: `(payload: FetchSsePayload) => FetchSsePayload` - SSE payload transformer
  - `debugMode?`: `boolean` - Enable debug mode, defaults to `false`
  - `onRunInit?`: `InitEventHandler` - Handler for run initialization events
  - `onMessage?`: `MessageEventHandler` - Handler for message events
  - `onToolCall?`: `ToolCallEventHandler` - Handler for tool call events
  - `onProcess?`: `ProcessEventHandler` - Handler for process events
  - `onRunDone?`: `DoneEventHandler` - Handler for run completion events
  - `onRunError?`: `ErrorEventHandler` - Error handler for execution errors
- **customActions?**: `ReactNode[]` - Custom actions to display on the chatbot header
- **enableLoadConfigFromService?**: `boolean` - Enable loading configuration from service
- **maintainConnectionWhenClosed?**: `boolean` - Maintain connection when chat is closed, defaults to `false`
- **loadingComponent?**: `ReactNode` - Custom loading component
- **asyncInitializers?**: `Record<string, () => Promise<unknown>>` - Asynchronous initializers for app initialization before rendering any component. Good for loading data or other async operations as the initial state. It only works when `enableLoadConfigFromService` is set to `true`.
- **customChannelId**: `string` - Custom channel identifier for the chat session
- **initMessages**: `ConversationMessage[]` - Initial messages to display in the chat
- **fullScreen**: `boolean` - Display chatbot in full screen mode, defaults to `false`
- **avatar**: `string` - URL for the chatbot's avatar image
- **botTypingPlaceholder**: `string` - Text to display while the bot is typing
- **theme**: `Partial<AsgardThemeContextValue>` - Custom theme configuration
- **onReset**: `() => void` - Callback function when chat is reset
- **onClose**: `() => void` - Callback function when chat is closed
- **onSseMessage**: `(response: SseResponse, ctx: AsgardServiceContextValue) => void` - Callback function when SSE message is received. It would be helpful if using with the ref to provide some context and conversation data and do some proactively actions like sending messages to the bot.
- **ref**: `ForwardedRef<ChatbotRef>` - Forwarded ref to access the chatbot instance. It can be used to access the chatbot instance and do some actions like sending messages to the bot. ChatbotRef extends the ref of the chatbot instance and provides some additional methods like `serviceContext.sendMessage` to interact with the chatbot instance.

### Theme Configuration

The theme configuration can be obtained from the bot provider metadata of `annotations` field and `theme` props.

The priority of themes is as follows (high to low):

1. Theme from props
2. Theme from annotations from bot provider metadata
3. Default theme

```typescript
export interface AsgardThemeContextValue {
  chatbot: Pick<
    CSSProperties,
    | 'width'
    | 'height'
    | 'maxWidth'
    | 'minWidth'
    | 'maxHeight'
    | 'minHeight'
    | 'backgroundColor'
    | 'borderColor'
    | 'borderRadius'
  > & {
    contentMaxWidth?: CSSProperties['maxWidth'];
    style?: CSSProperties;
    header?: Partial<{
      style: CSSProperties;
      title: {
        style: CSSProperties;
      };
    }>;
    body?: Partial<{
      style: CSSProperties;
    }>;
    footer?: Partial<{
      style: CSSProperties;
      textArea: {
        style: CSSProperties;
      };
      submitButton: {
        style: CSSProperties;
      };
      speechInputButton: {
        style: CSSProperties;
      };
    }>;
  };
  botMessage: Pick<CSSProperties, 'color' | 'backgroundColor'>;
  userMessage: Pick<CSSProperties, 'color' | 'backgroundColor'>;
  template?: Partial<{
    /**
     * first level for common/shared properties.
     * Check MessageTemplate type for more details (packages/core/src/types/sse-response.ts).
     */
    quickReplies?: Partial<{
      style: CSSProperties;
      button: {
        style: CSSProperties;
      };
    }>;
    TextMessageTemplate: Partial<{ style: CSSProperties }>;
    HintMessageTemplate: Partial<{ style: CSSProperties }>;
    ImageMessageTemplate: Partial<{ style: CSSProperties }>;
    ChartMessageTemplate: Partial<{ style: CSSProperties }>;
    ButtonMessageTemplate: Partial<{ style: CSSProperties }>;
    CarouselMessageTemplate: Partial<{ style: CSSProperties }>;

    // Didn't implement yet
    VideoMessageTemplate: Partial<{ style: CSSProperties }>;
    AudioMessageTemplate: Partial<{ style: CSSProperties }>;
    LocationMessageTemplate: Partial<{ style: CSSProperties }>;
  }>;
}
```

### Default Theme

The default theme uses CSS variables for consistent styling:

```javascript
const defaultTheme = {
  chatbot: {
    width: '375px',
    height: '640px',
    backgroundColor: 'var(--asg-color-bg)',
    borderColor: 'var(--asg-color-border)',
    borderRadius: 'var(--asg-radius-md)',
    contentMaxWidth: '1200px',
    style: {},
    header: {
      style: {},
      title: {
        style: {},
      },
    },
    body: {
      style: {},
    },
    footer: {
      style: {},
      textArea: {
        style: {},
      },
      submitButton: {
        style: {},
      },
      speechInputButton: {
        style: {},
      },
    },
  },
  botMessage: {
    color: 'var(--asg-color-text)',
    backgroundColor: 'var(--asg-color-secondary)',
  },
  userMessage: {
    color: 'var(--asg-color-text)',
    backgroundColor: 'var(--asg-color-primary)',
  },
  template: {
    quickReplies: {
      style: {},
      button: {
        style: {},
      },
    },
    TextMessageTemplate: {
      style: {},
    },
    HintMessageTemplate: {
      style: {},
    },
    ImageMessageTemplate: {
      style: {},
    },
    VideoMessageTemplate: {
      style: {},
    },
    AudioMessageTemplate: {
      style: {},
    },
    LocationMessageTemplate: {
      style: {},
    },
    ChartMessageTemplate: {
      style: {},
    },
    ButtonMessageTemplate: {
      style: {},
    },
    CarouselMessageTemplate: {
      style: {},
    },
  },
};
```

### Usage Example

```javascript
const App = () => {
  const customTheme = {
    chatbot: {
      width: '400px',
      height: '600px',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
    },
    botMessage: {
      backgroundColor: '#f0f0f0',
    },
    userMessage: {
      backgroundColor: '#007bff',
      color: '#ffffff',
    },
  };

  return (
    <Chatbot
      // ... other props
      theme={customTheme}
    />
  );
};
```

Note: When `fullScreen` prop is set to `true`, the chatbot's width and height will be set to `100vw` and `100vh` respectively, and `borderRadius` will be set to zero, regardless of theme settings.

## Testing

The SDK includes comprehensive tests using Vitest for both packages.

### Running Tests

```sh
# Run all tests
npm test
# or
yarn test

# Run specific package tests
yarn test:core     # Core package tests
yarn test:react    # React package tests

# Run tests in watch mode
yarn test:core:watch    # Core package watch mode
yarn test:react:watch   # React package watch mode

# Run tests with UI
yarn test:core:ui       # Core package UI
yarn test:react:ui      # React package UI

# Run tests with coverage
yarn test:core:coverage    # Core package coverage
yarn test:react:coverage   # React package coverage
yarn test:coverage         # All packages coverage
```

### Test Structure

Tests are co-located with source files using `.spec.ts` and `.spec.tsx` extensions:

**Core Package:**
- `packages/core/src/lib/client.spec.ts` - AsgardServiceClient tests including deprecation scenarios
- Test environment: jsdom with Vitest
- 7 test cases covering all configuration scenarios

**React Package:**
- `packages/react/src/components/chatbot/chatbot.spec.tsx` - React component tests
- Test environment: jsdom with React Testing Library
- Setup file: `packages/react/src/test-setup.ts`

### Writing Tests

Both packages use Vitest with the following setup:
- TypeScript support
- jsdom environment for DOM APIs
- ESLint integration
- Coverage reporting with v8 provider
- React Testing Library for component testing

Example test patterns:
```javascript
// Core package test
import { describe, it, expect } from 'vitest';
import { AsgardServiceClient } from './client';

describe('AsgardServiceClient', () => {
  it('should derive endpoint from botProviderEndpoint', () => {
    const client = new AsgardServiceClient({
      botProviderEndpoint: 'https://api.example.com/bot-provider/bp-123',
      apiKey: 'test-key',
    });
    
    expect(client).toBeDefined();
  });
});

// React package test
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Chatbot } from './chatbot';

describe('Chatbot Component', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <Chatbot
        title="Test"
        config={{ botProviderEndpoint: 'https://api.example.com', apiKey: 'test' }}
        customChannelId="test"
      />
    );
    
    expect(container).toBeInTheDocument();
  });
});
```

## Development

To develop the React package locally, follow these steps:

1. Clone the repository and navigate to the project root directory.

2. Install dependencies:

```sh
yarn install
```

3. Start development:

You can use the following commands to work with the React package:

```sh
# Lint the React package
yarn lint:react

# Run tests
yarn test:react

# Build the package
yarn build:react

# Watch mode for development
yarn watch:react

# Run the demo application
yarn serve:react-demo
```

Setup your npm release token,

```sh
cd ~/
touch .npmrc
echo "//registry.npmjs.org/:_authToken={{YOUR_TOKEN}}" >> .npmrc
```

For working with both core and React packages:

```sh
# Lint both packages
yarn lint:packages

# Build core package (required for React package)
yarn build:core
yarn build:react

# Release packages
yarn release:core  # Release core package
yarn release:react # Release React package
```

All builds will be available in the `dist` directory of their respective packages.

## Contributing

We welcome contributions! Please read our [contributing guide](../../CONTRIBUTING.md) to get started.

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.
