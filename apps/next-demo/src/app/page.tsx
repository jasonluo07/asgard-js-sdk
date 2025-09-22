'use client';

import { TestComponent, SimpleChatbot } from '~/components';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Asgard SDK Demo
              </h1>
              <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                Next.js 15
              </span>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              <a
                href="#features"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Features
              </a>
              <a
                href="#components"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Components
              </a>
              <a
                href="#documentation"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Docs
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-20">
        <div className="max-w-4xl mx-auto p-8">
          {/* Hero Section */}
          <section className="text-center mb-12">
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Next.js Demo Application
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              A comprehensive demonstration of the Asgard JS SDK integration
              with Next.js, featuring modern React patterns, TypeScript support,
              and responsive design.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                Get Started
              </button>
              <button className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 px-6 py-3 rounded-lg font-semibold transition-colors">
                View Source
              </button>
            </div>
          </section>

          {/* Test Component */}
          <section className="mb-12">
            <TestComponent message="Path alias '~/*' is working correctly! 🎉" />
          </section>

          {/* Features Section */}
          <section id="features" className="mb-12">
            <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl">
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Features Demonstrated
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">
                      TypeScript support with strict mode
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">
                      App Router with src directory structure
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">
                      Tailwind CSS with dark mode support
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">
                      Custom path alias configuration (~/*)
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">
                      Standard Webpack (no Turbopack)
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">
                      Custom port configuration (4300)
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">
                      Asgard Chatbot integration
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">
                      Responsive mobile-first design
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Components Section */}
          <section id="components" className="mb-12">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
              Components Overview
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  SimpleChatbot
                </h4>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  A responsive chatbot component that adapts to different screen
                  sizes. Features fullscreen mode on mobile devices and floating
                  window on desktop.
                </p>
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  Features: Mobile responsive, Environment variables, Custom
                  theming
                </div>
              </div>

              <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  TestComponent
                </h4>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  A simple test component demonstrating the path alias
                  functionality and basic component composition patterns in the
                  application.
                </p>
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  Features: Path alias demo, TypeScript props, Clean
                  architecture
                </div>
              </div>

              <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Theme System
                </h4>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Comprehensive theming system with support for light and dark
                  modes, custom color schemes, and responsive design patterns.
                </p>
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  Features: Dark mode, Custom colors, CSS variables
                </div>
              </div>
            </div>
          </section>

          {/* Documentation Section */}
          <section id="documentation" className="mb-12">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
              Documentation & Resources
            </h3>
            <div className="space-y-6">
              <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-3">
                  Getting Started Guide
                </h4>
                <p className="text-blue-800 dark:text-blue-200 mb-4">
                  Learn how to integrate the Asgard JS SDK into your Next.js
                  application. This guide covers installation, configuration,
                  and basic usage patterns.
                </p>
                <ul className="list-disc list-inside text-blue-700 dark:text-blue-300 space-y-1">
                  <li>Environment variable configuration</li>
                  <li>Component setup and customization</li>
                  <li>Theme configuration options</li>
                  <li>API integration patterns</li>
                </ul>
              </div>

              <div className="p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <h4 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-3">
                  API Reference
                </h4>
                <p className="text-green-800 dark:text-green-200 mb-4">
                  Comprehensive API documentation for all components, hooks, and
                  utilities provided by the Asgard JS SDK. Includes TypeScript
                  definitions and examples.
                </p>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong className="text-green-900 dark:text-green-100">
                      Core Components:
                    </strong>
                    <ul className="list-disc list-inside text-green-700 dark:text-green-300 mt-1">
                      <li>Chatbot</li>
                      <li>MessageBubble</li>
                      <li>InputField</li>
                      <li>ThemeProvider</li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-green-900 dark:text-green-100">
                      Utilities:
                    </strong>
                    <ul className="list-disc list-inside text-green-700 dark:text-green-300 mt-1">
                      <li>useChat hook</li>
                      <li>Theme utilities</li>
                      <li>Event handlers</li>
                      <li>Type definitions</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <h4 className="text-xl font-semibold text-purple-900 dark:text-purple-100 mb-3">
                  Best Practices
                </h4>
                <p className="text-purple-800 dark:text-purple-200 mb-4">
                  Follow these recommended patterns and practices when building
                  applications with the Asgard JS SDK to ensure optimal
                  performance and maintainability.
                </p>
                <div className="space-y-3 text-purple-700 dark:text-purple-300">
                  <div className="flex items-start space-x-2">
                    <span className="text-purple-500 font-bold">1.</span>
                    <span>
                      Use environment variables for sensitive configuration data
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-purple-500 font-bold">2.</span>
                    <span>
                      Implement proper error handling for API communications
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-purple-500 font-bold">3.</span>
                    <span>
                      Optimize for mobile devices with responsive design
                      patterns
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-purple-500 font-bold">4.</span>
                    <span>
                      Use TypeScript for better development experience and type
                      safety
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Code Examples Section */}
          <section className="mb-12">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
              Code Examples
            </h3>
            <div className="space-y-6">
              <div className="bg-gray-900 rounded-lg p-6 overflow-x-auto">
                <h4 className="text-lg font-semibold text-white mb-4">
                  Basic Chatbot Setup
                </h4>
                <pre className="text-green-400 text-sm">
                  {`import { Chatbot } from '@asgard-js/react';

function App() {
  return (
    <Chatbot
      config={{
        botProviderEndpoint: process.env.NEXT_PUBLIC_BOT_PROVIDER_ENDPOINT,
        apiKey: process.env.NEXT_PUBLIC_API_KEY,
      }}
      customChannelId="unique-channel-id"
      title="AI Assistant"
      fullScreen={isMobile}
      theme={{
        chatbot: {
          backgroundColor: '#1F1F1F',
          borderRadius: '16px',
        }
      }}
    />
  );
}`}
                </pre>
              </div>

              <div className="bg-gray-900 rounded-lg p-6 overflow-x-auto">
                <h4 className="text-lg font-semibold text-white mb-4">
                  Environment Configuration
                </h4>
                <pre className="text-blue-400 text-sm">
                  {`# .env.local
NEXT_PUBLIC_BOT_PROVIDER_ENDPOINT=https://api.asgard-ai.com/...
NEXT_PUBLIC_API_KEY=your-api-key

# next.config.ts
const nextConfig = {
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};`}
                </pre>
              </div>
            </div>
          </section>

          {/* Footer Info */}
          <section className="text-center py-12 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to Get Started?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
              Explore the interactive chatbot in the bottom right corner to see
              the Asgard SDK in action. The chatbot automatically adapts to your
              screen size for the best user experience.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold transition-colors">
                Download SDK
              </button>
              <button className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 px-8 py-3 rounded-lg font-semibold transition-colors">
                View Examples
              </button>
            </div>
          </section>
        </div>
      </main>

      {/* Fixed Chatbot */}
      <div className="fixed right-5 bottom-5 md:right-6 md:bottom-6 z-50">
        <SimpleChatbot />
      </div>
    </div>
  );
}
