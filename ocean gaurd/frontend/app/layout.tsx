import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'OceanGuard — Ocean Plastic Climate Damage Estimator',
  description:
    'Real-time monitoring of microplastic zones, carbon absorption loss, and economic damage for Indian coastal regions. Powered by XGBoost ML models and open satellite data.',
  keywords: ['ocean plastic', 'microplastic', 'carbon absorption', 'climate damage', 'India coast'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body className={`${inter.className} bg-ocean-950 text-white antialiased`}>
        {children}
      </body>
    </html>
  )
}
