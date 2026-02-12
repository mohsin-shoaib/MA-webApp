import { Stack } from '@/components/Stack'
import { Text } from '@/components/Text'
import { Avatar } from '@/components/Avatar'
import { Icon } from '@/components/Icon'
import { useAuth } from '@/contexts/useAuth'
import { useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/utils/cn'
import { BrandColors } from '@/constants/theme'
import logoImage from '@/assets/images/logo/logo.svg'

/**
 * Header component
 *
 * Displays the application header with user information and navigation.
 * Shows user avatar, name, and logout functionality.
 */
export function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const userDisplayName = user?.name || user?.firstName || user?.email || 'User'

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isMenuOpen])

  const handleProfileClick = () => {
    setIsMenuOpen(false)
    navigate('/profile')
  }

  const handleLogout = () => {
    setIsMenuOpen(false)
    logout()
  }

  return (
    <header
      className="h-16 border-b px-4 flex items-center justify-between sticky top-0 z-100"
      style={{
        backgroundColor: BrandColors.neutral.charcoal,
        borderColor: BrandColors.neutral.midGray,
      }}
    >
      <Stack direction="horizontal" align="center" spacing={16}>
        <img
          src={logoImage}
          alt="MA App Logo"
          className="h-12 w-auto object-contain brightness-110 contrast-110"
          style={{ imageRendering: 'crisp-edges' }}
        />
      </Stack>

      <div className="relative flex items-center gap-3" ref={menuRef}>
        {user?.role && (
          <Text
            variant="muted"
            className="text-xs font-bold hidden md:block"
            style={{ color: BrandColors.neutral.midGray }}
          >
            {user.role}
          </Text>
        )}
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="cursor-pointer border-none bg-transparent p-0 focus:outline-none"
          aria-label="User menu"
        >
          <Avatar
            name={userDisplayName}
            size="medium"
            showBorder
            borderVariant="primary"
          />
        </button>

        {isMenuOpen && (
          <div
            className="absolute top-full right-0 mt-2 min-w-[180px] border rounded-lg shadow-lg z-1000 overflow-hidden"
            style={{
              backgroundColor: BrandColors.neutral.white,
              borderColor: BrandColors.neutral.lightGray,
            }}
          >
            <button
              type="button"
              onClick={handleProfileClick}
              className={cn(
                'w-full px-4 py-2 text-left',
                'flex items-center gap-2 border-none bg-transparent cursor-pointer'
              )}
              style={
                {
                  '--hover-bg': BrandColors.neutral.lightGray,
                } as React.CSSProperties & { '--hover-bg': string }
              }
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor =
                  BrandColors.neutral.lightGray
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <Icon name="user" family="solid" size={16} variant="default" />
              <Text variant="default" className="text-sm">
                Profile
              </Text>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className={cn(
                'w-full px-4 py-2 text-left',
                'flex items-center gap-2 border-none bg-transparent cursor-pointer'
              )}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor =
                  BrandColors.neutral.lightGray
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <Icon
                name="right-from-bracket"
                family="solid"
                size={16}
                variant="default"
              />
              <Text variant="default" className="text-sm">
                Logout
              </Text>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
