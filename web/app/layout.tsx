import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Order worksheet',
  description: 'Recipe to reviewed order draft. Synthetic demo only; drafts never place orders.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#fff', color: '#111' }}>
        {children}
      </body>
    </html>
  );
}
