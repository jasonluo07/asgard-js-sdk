# AsgardJs React

This package provides React components and hooks for integrating with the Asgard AI platform, allowing you to build interactive chat interfaces.

## Installation

To install the React package, use the following command:

```sh
yarn add asgardjs-react
```

## Usage

Here's a basic example of how to use the React components:

```javascript
import React from 'react';
import { Chatbot } from 'asgardjs-react';

const App = () => {
  return (
    <Chatbot
      title="Asgard AI Chatbot"
      config={{
        apiKey: 'your-api-key',
        endpoint: 'https://api.asgard-ai.com',
      }}
      customChannelId="your-channel-id"
      initMessages={[]}
      fullScreen={false}
      avatar="https://example.com/avatar.png"
      botTypingPlaceholder="Bot is typing..."
      options={{ showDebugMessage: true }}
    />
  );
};

export default App;
```

### Chatbot Component Props

- **title**: `string` - The title of the chatbot.
- **config**: `ClientConfig` - Configuration object for the Asgard service client.
- **customChannelId**: `string` - Custom channel identifier.
- **initMessages**: `ConversationMessage[]` - Initial messages to display in the chat.
- **fullScreen**: `boolean` - Whether the chatbot should be displayed in full screen.
- **avatar**: `string` - URL of the avatar image for the chatbot.
- **botTypingPlaceholder**: `string` - Placeholder text to show when the bot is typing.
- **options**: `object` - Additional options, such as `showDebugMessage`.

## Development

To start developing the React package, follow these steps:

1. Clone the repository and navigate to the `packages/react` directory.
2. Install dependencies:

```sh
yarn install
```

3. Build the package:

```sh
yarn build
```

4. Run tests to ensure everything is working:

```sh
yarn test
```

5. Start the development server:

```sh
yarn start
```

## Contributing

We welcome contributions! Please read our [contributing guide](../../CONTRIBUTING.md) to get started.

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.
