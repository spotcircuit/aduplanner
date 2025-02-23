import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import GoogleMapsWrapper from '@/components/maps/GoogleMapsWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ADU Planner',
  description: 'Design and plan your Accessory Dwelling Unit',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GoogleMapsWrapper>
          {children}
          <Toaster position="bottom-right" />
        </GoogleMapsWrapper>
      </body>
    </html>
  );
}
