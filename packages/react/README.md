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
        endpoint: 'https://api.asgard-ai.com',
        onExecutionError: (error) => {
          console.error('Execution error:', error);
        },
        transformSsePayload: (payload) => {
          return payload;
        }
      }}
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
  - `onExecutionError?`: `(error: ErrorEventData) => void` - Error handler for execution errors
  - `transformSsePayload?`: `(payload: FetchSsePayload) => FetchSsePayload` - SSE payload transformer
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

```typescript
interface AsgardThemeContextValue {
  chatbot: {
    width?: string;
    height?: string;
    maxWidth?: string;
    minWidth?: string;
    maxHeight?: string;
    minHeight?: string;
    backgroundColor?: string;
    borderColor?: string;
    borderRadius?: string;
    contentMaxWidth?: string;
  };
  botMessage: {
    color?: string;
    backgroundColor?: string;
  };
  userMessage: {
    color?: string;
    backgroundColor?: string;
  };
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
  },
  botMessage: {
    color: 'var(--asg-color-text)',
    backgroundColor: 'var(--asg-color-secondary)',
  },
  userMessage: {
    color: 'var(--asg-color-text)',
    backgroundColor: 'var(--asg-color-primary)',
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

For working with both core and React packages:

```sh
# Lint both packages
yarn lint:packages

# Build core package (required for React package)
yarn build:core

# Release packages
yarn release:core  # Release core package
yarn release:react # Release React package
```

All builds will be available in the `dist` directory of their respective packages.

## Contributing

We welcome contributions! Please read our [contributing guide](../../CONTRIBUTING.md) to get started.

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.
