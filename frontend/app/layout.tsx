import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RSS Articles',
  description: 'RSS feed processing and LinkedIn content generation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sv">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          <nav className="border-b">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">RSS Articles</h1>
                <div className="flex space-x-4">
                  <a href="/" className="text-sm hover:underline">Körning</a>
                  <a href="/feeds" className="text-sm hover:underline">Feeds</a>
                  <a href="/prompts" className="text-sm hover:underline">Prompts</a>
                  <a href="/settings" className="text-sm hover:underline">Inställningar</a>
                  <a href="/logs" className="text-sm hover:underline">Loggar</a>
                  <a href="/secrets" className="text-sm hover:underline">Nycklar</a>
                </div>
              </div>
            </div>
          </nav>
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
