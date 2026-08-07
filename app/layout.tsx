import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ClientLayout from "./client-layout";
import { AuthProvider } from "../components/AuthProvider";

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
})

export const metadata: Metadata = {
  metadataBase: new URL('https://replysis.com'),
  alternates: { canonical: '/' },
  title: 'Replysis - Master Every Interview',
  description: 'Replysis listens to your interview in real time and streams tailored answers in under 2 seconds, grounded in your resume. Private by design, invisible on screen-share, and free to start.',
  keywords: ['AI interview assistant', 'interview copilot', 'real-time interview help', 'mock interview AI', 'job interview preparation', 'AI coaching', 'career'],
  authors: [{ name: 'Replysis' }],
  openGraph: {
    title: 'Replysis - Master Every Interview',
    description: 'Real-time AI interview assistant that streams resume-grounded answers in under 2 seconds. Invisible to screen-share, private by design, free to start.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0a0a0f',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&display=swap" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </AuthProvider>
      </body>
    </html>
  )
}