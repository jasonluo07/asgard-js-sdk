import type { Metadata } from 'next';
import './globals.css';
import '@asgard-js/react/style';

export const metadata: Metadata = {
  title: 'Asgard Next.js Vanilla Demo',
  description: 'Demo application for Asgard JS SDK with Next.js using vanilla CSS',
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
      <body>{children}</body>
    </html>
  );
}
