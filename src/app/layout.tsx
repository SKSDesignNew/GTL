import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AuditQens — GL Knowledge Graph',
  description: 'Universal Data Model explorer for General Ledger data',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap" rel="stylesheet" />
        {/* Apply saved theme before first paint — prevents flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var t = localStorage.getItem('aq-theme');
              if (t && (t === 'sage' || t === 'arctic')) {
                document.documentElement.setAttribute('data-theme', t);
              }
            } catch(e) {}
          })();
        `}} />
      </head>
      <body>{children}</body>
    </html>
  )
}
