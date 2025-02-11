# core

This library was generated with [Nx](https://nx.dev).

## Building

Run `nx build core` to build the library.

## Running unit tests

Run `nx test core` to execute the unit tests via [Vitest](https://vitest.dev/).
# AsgardJs Core

This package contains the core functionalities of the AsgardJs SDK, providing essential tools for interacting with the Asgard AI platform.

## Installation

To install the core package, use the following command:

```sh
yarn add asgardjs-core
```

## Usage

Here's a basic example of how to use the core package:

```javascript
import { AsgardServiceClient } from 'asgardjs-core';

const client = new AsgardServiceClient({
  apiKey: 'your-api-key',
  endpoint: 'https://api.asgard-ai.com',
});

// Use the client to send messages
client.sendMessage({
  customChannelId: 'your-channel-id',
  text: 'Hello, Asgard!',
});
```

## Development

To start developing the core package, follow these steps:

1. Clone the repository and navigate to the `packages/core` directory.
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
