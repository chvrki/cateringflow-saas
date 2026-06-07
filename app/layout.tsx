import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const jbMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--geist-mono-font',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Caterix – Gestión de Catering y Eventos',
  description: 'Plataforma profesional para gestionar menús, reservas y pagos de tu empresa de catering.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning className={`${inter.variable} ${jbMono.variable}`}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
