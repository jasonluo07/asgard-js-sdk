# @asgard-js/react

This library was generated with [Nx](https://nx.dev).

## Running unit tests

Run `nx test @asgard-js/react` to execute the unit tests via [Vitest](https://vitest.dev/).
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
    />
  );
};

export default App;
```

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
