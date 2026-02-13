import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { BrandColors } from '@/constants/theme'

interface AppLayoutProps {
  children: React.ReactNode
}

/**
 * AppLayout component
 *
 * Provides the main layout structure with Header and Sidebar for authenticated pages.
 * Excludes onboarding page from this layout.
 */
export function AppLayout({ children }: Readonly<AppLayoutProps>) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main
          className="flex-1 overflow-y-auto p-6 ml-60"
          style={{ backgroundColor: BrandColors.neutral.lightGray }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
