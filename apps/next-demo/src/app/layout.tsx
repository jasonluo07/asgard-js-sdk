import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Asgard Next.js Demo',
  description: 'Demo application for Asgard JS SDK with Next.js',
  icons: {
    icon: '/vercel.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
