'use client';

import { ChatbotButton, TestComponent } from '~/components';

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          Next.js Demo App
        </h1>

        <div className="space-y-6">
          <TestComponent message="Path alias '~/*' is working correctly! 🎉" />

          <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">
              Features Demonstrated:
            </h2>
            <ul className="list-disc list-inside space-y-2">
              <li>✅ TypeScript support</li>
              <li>✅ App Router with src directory</li>
              <li>✅ Tailwind CSS styling</li>
              <li>✅ Custom path alias (~/*)</li>
              <li>✅ No Turbopack (standard Webpack)</li>
              <li>✅ Port 4300 configuration</li>
              <li>✅ Chatbot Button (right bottom corner)</li>
            </ul>
          </div>
        </div>
      </main>

      <div className="fixed right-5 bottom-5 md:right-6 md:bottom-6">
        <ChatbotButton onClick={() => console.log('Chatbot button clicked!')} />
      </div>
    </div>
  );
}
