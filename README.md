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
import React from 'react';
import { Chatbot } from '@asgard-js/react';

const App = () => {
  return (
    <Chatbot
      title="Asgard AI Chatbot"
      config={{
        apiKey: 'your-api-key',
        endpoint: 'https://api.asgard-ai.com/ns/{namespace}/bot-provider/{botProviderId}/message/sse',
        botProviderEndpoint: 'https://api.asgard-ai.com/ns/{namespace}/bot-provider/{botProviderId}',
        onExecutionError: (error) => {
          console.error('Execution error:', error);
        },
        transformSsePayload: (payload) => {
          return payload;
        }
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
    />
  );
};

export default App;
```

### Chatbot Component Props

- **title**: `string` - The title of the chatbot.
- **config**: `ClientConfig` - Configuration object for the Asgard service client, including:
  - `apiKey`: `string` (required) - API key for authentication
  - `endpoint`: `string` (required) - API endpoint URL
  - `botProviderEndpoint?`: `string` - Bot provider endpoint URL
  - `onExecutionError?`: `(error: ErrorEventData) => void` - Error handler for execution errors
  - `transformSsePayload?`: `(payload: FetchSsePayload) => FetchSsePayload` - SSE payload transformer
- **enableLoadConfigFromService?**: `boolean` - Enable loading configuration from service
- **loadingComponent?**: `ReactNode` - Custom loading component
- **asyncInitializers?**: `Record<string, () => Promise<unknown>>` - Asynchronous initializers for app initialization before rendering any component. Good for loading data or other async operations as the initial state. It only works when `enableLoadConfigFromService` is set to `true`.
- **customChannelId**: `string` - Custom channel identifier for the chat session
- **initMessages**: `ConversationMessage[]` - Initial messages to display in the chat
- **debugMode**: `boolean` - Enable debug mode, defaults to `false`
- **fullScreen**: `boolean` - Display chatbot in full screen mode, defaults to `false`
- **avatar**: `string` - URL for the chatbot's avatar image
- **botTypingPlaceholder**: `string` - Text to display while the bot is typing
- **theme**: `Partial<AsgardThemeContextValue>` - Custom theme configuration
- **onReset**: `() => void` - Callback function when chat is reset
- **onClose**: `() => void` - Callback function when chat is closed

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
}
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
