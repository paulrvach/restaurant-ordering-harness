import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Order worksheet',
  description: 'Recipe to reviewed order draft. Synthetic demo only; drafts never place orders.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
