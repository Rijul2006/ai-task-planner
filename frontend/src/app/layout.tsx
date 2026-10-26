import './globals.css';
import QueryProvider from '../providers/QueryProvider';

export const metadata = {
  title: 'AI TPM Platform',
  description: 'AI-Powered Technical Program Management Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}