import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ClientLayout from "./client-layout";
import { AuthProvider } from "../components/AuthProvider";
import StaleBuildReload from "../components/StaleBuildReload";
import VisitBeacon from "../components/VisitBeacon";
import ReferralCapture from "../components/ReferralCapture";

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
})

export const metadata: Metadata = {
  metadataBase: new URL('https://replysis.com'),
  alternates: { canonical: '/' },
  title: 'Replysis | Live interview answers',
  description: 'Prepare your resume, practice realistic interviews, and stream resume-grounded answer suggestions in real time. Free to start with clear monthly limits.',
  keywords: ['AI interview assistant', 'interview copilot', 'real-time interview help', 'mock interview AI', 'job interview preparation', 'AI coaching', 'career'],
  authors: [{ name: 'Replysis' }],
  twitter: { card: 'summary', images: ['/icon.png'] },
  openGraph: {
    title: 'Replysis | Live interview answers',
    images: ['/icon.png'],
    description: 'AI interview workspace for resume preparation, mock practice, and fast resume-grounded answer suggestions. Free to start.',
    type: 'website',
  },
}

// Official Replysis pages. Keep in step with SOCIAL in components/Footer.tsx.
const SOCIAL_PROFILES = [
  'https://www.instagram.com/replysis_ai/',
  'https://www.facebook.com/profile.php?id=61594662147470',
]

// Tells Google the website, the logo and the social pages belong to one organization.
const ORGANIZATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Replysis',
  url: 'https://replysis.com',
  logo: 'https://replysis.com/icon.png',
  email: 'support@replysis.com',
  sameAs: SOCIAL_PROFILES,
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }} />
      </head>
      <body className="antialiased">
        <StaleBuildReload />
        <VisitBeacon />
        <AuthProvider>
          <ReferralCapture />
          <ClientLayout>
            {children}
          </ClientLayout>
        </AuthProvider>
      </body>
    </html>
  )
}
