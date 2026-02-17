import { Stack } from '@/components/Stack'
import { Text } from '@/components/Text'
import { Icon } from '@/components/Icon'
import { useAuth } from '@/contexts/useAuth'
import { useNavigate, useLocation } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { BrandColors } from '@/constants/theme'

interface NavItem {
  path: string
  label: string
  icon: string
  roles?: string[]
}

/**
 * Sidebar component
 *
 * Displays navigation sidebar with role-based menu items.
 */
export function Sidebar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Define navigation items based on roles
  const navItems: NavItem[] = [
    {
      path: '/profile',
      label: 'Profile',
      icon: 'user',
    },
    {
      path: '/train',
      label: 'Train',
      icon: 'dumbbell',
      roles: ['ATHLETE'],
    },
    {
      path: '/create_program',
      label: 'Create Program',
      icon: 'plus-circle',
      roles: ['COACH'],
    },
    {
      path: '/coach/user-management',
      label: 'Athlete Management',
      icon: 'users',
      roles: ['COACH'],
    },
    {
      path: '/admin/user-management',
      label: 'User Management',
      icon: 'users',
      roles: ['ADMIN'],
    },
    {
      path: '/admin/goal-types',
      label: 'Goal Types',
      icon: 'bullseye',
      roles: ['ADMIN'],
    },
    {
      path: '/admin/program-management',
      label: 'Manage Program',
      icon: 'clipboard-list',
      roles: ['ADMIN'],
    },
    {
      path: '/coach-head/user-management',
      label: 'User Management',
      icon: 'users',
      roles: ['COACH_HEAD'],
    },
  ]

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true // Show to all roles
    return user && item.roles.includes(user.role)
  })

  const isActive = (path: string) => location.pathname === path

  const handleNavClick = (path: string) => {
    navigate(path)
  }

  return (
    <aside
      className="w-60 border-r flex flex-col fixed top-16 left-0 h-[calc(100vh-4rem)] overflow-y-auto"
      style={{
        backgroundColor: BrandColors.neutral.charcoal,
        borderColor: BrandColors.neutral.midGray,
      }}
    >
      <nav className="p-4">
        <Stack direction="vertical" spacing={4}>
          {filteredNavItems.map(item => {
            const active = isActive(item.path)
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  'w-full px-4 py-3 rounded-lg text-left',
                  'flex items-center gap-3 transition-colors',
                  'border-none cursor-pointer'
                )}
                style={
                  active
                    ? {
                        backgroundColor: `${BrandColors.primary.light}33`,
                        color: BrandColors.primary.light,
                      }
                    : {
                        backgroundColor: 'transparent',
                        color: BrandColors.neutral.white,
                      }
                }
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = `${BrandColors.neutral.white}1A`
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                <Icon
                  name={item.icon}
                  family="solid"
                  size={20}
                  variant={active ? 'primary' : 'white'}
                />
                <Text
                  variant={active ? 'primary' : 'default'}
                  className={cn(
                    'text-sm font-medium',
                    active && 'font-semibold'
                  )}
                  style={
                    active
                      ? undefined
                      : {
                          color: BrandColors.neutral.white,
                        }
                  }
                >
                  {item.label}
                </Text>
              </button>
            )
          })}
        </Stack>
      </nav>
    </aside>
  )
}
