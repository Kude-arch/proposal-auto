import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '제안서 자동화 시스템',
  description: '건설사업관리 CM 제안서 자동화',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  )
}
