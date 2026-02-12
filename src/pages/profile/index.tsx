import { Text } from '@/components/Text'
import { Stack } from '@/components/Stack'
import { Tabs } from '@/components/Tabs'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { Avatar } from '@/components/Avatar'
import { Icon } from '@/components/Icon'
import { useAuth } from '@/contexts/useAuth'
import { useForm, Controller } from 'react-hook-form'
import { authService } from '@/api/auth.service'
import { userService } from '@/api/user.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { ChangePasswordProps } from '@/types/auth'
import type { UpdateProfileProps } from '@/types/user'
import { AxiosError } from 'axios'
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/utils/cn'

const Profile = () => {
  const { user, login } = useAuth()
  const { showSuccess, showError } = useSnackbar()
  const [loading, setLoading] = useState(false)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Change Password Form
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    watch,
    reset: resetPassword,
  } = useForm<ChangePasswordProps>()

  // Profile Update Form
  const {
    control: controlProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm<UpdateProfileProps>({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
    },
  })

  // Set form values when user changes
  useEffect(() => {
    if (user) {
      console.log('Profile user data:', user)
      resetProfile({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
      })
    }
  }, [user, resetProfile])

  const newPassword = watch('newPassword')

  const onSubmitChangePassword = async (data: ChangePasswordProps) => {
    setLoading(true)

    try {
      const response = await authService.changePassword(data)
      showSuccess(
        response.data.data.message || 'Password changed successfully!'
      )
      resetPassword()
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage =
        axiosError.response?.data?.message ||
        'Failed to change password. Please try again.'
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const onSubmitUpdateProfile = async (data: UpdateProfileProps) => {
    setUpdateLoading(true)

    try {
      const response = await userService.updateProfile(data)
      showSuccess(response.data.data.message || 'Profile updated successfully!')

      // Update user in auth context
      if (response.data.data.user) {
        const token = localStorage.getItem('accessToken')
        if (token) {
          login(token, {
            id: response.data.data.user.id,
            email: response.data.data.user.email,
            name: response.data.data.user.name,
            firstName: response.data.data.user.firstName,
            lastName: response.data.data.user.lastName,
            role: response.data.data.user.role,
            profilePicture:
              response.data.data.user.profilePicture || user?.profilePicture,
          })
        }
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage =
        axiosError.response?.data?.message ||
        'Failed to update profile. Please try again.'
      showError(errorMessage)
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showError('Please select a valid image file')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showError('Image size should be less than 5MB')
        return
      }

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUploadProfilePicture = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      showError('Please select an image file')
      return
    }

    setUploadingPicture(true)

    try {
      const response = await userService.uploadProfilePicture(file)
      showSuccess(
        response.data.data.message || 'Profile picture updated successfully!'
      )

      // Update user in auth context
      if (response.data.data.user) {
        const token = localStorage.getItem('accessToken')
        if (token) {
          login(token, {
            id: response.data.data.user.id,
            email: response.data.data.user.email,
            name: response.data.data.user.name,
            firstName: response.data.data.user.firstName,
            lastName: response.data.data.user.lastName,
            role: response.data.data.user.role,
            profilePicture: response.data.data.user.profilePicture,
          })
        }
      }

      // Clear preview and file input
      setPreviewImage(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage =
        axiosError.response?.data?.message ||
        'Failed to upload profile picture. Please try again.'
      showError(errorMessage)
    } finally {
      setUploadingPicture(false)
    }
  }

  const handleRemovePreview = () => {
    setPreviewImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const generalTabContent = (
    <Stack direction="vertical" spacing={24} className="max-w-2xl">
      {/* Profile Picture Section */}
      <div>
        <Text
          as="h2"
          variant="secondary"
          className="text-xl font-semibold mb-4"
        >
          Profile Picture
        </Text>
        <Stack direction="vertical" spacing={16} align="start">
          <div className="flex items-center gap-6">
            <Avatar
              source={previewImage || user?.profilePicture}
              name={user?.name || user?.firstName || user?.email || 'User'}
              size="xlarge"
              showBorder
              borderVariant="primary"
            />
            <Stack direction="vertical" spacing={8}>
              <Text variant="muted" className="text-sm">
                Upload a new profile picture
              </Text>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="profile-picture-input"
                />
                <label
                  htmlFor="profile-picture-input"
                  className={cn(
                    'px-4 py-2 rounded-lg cursor-pointer',
                    'border-2 border-primary text-primary',
                    'hover:bg-primary hover:text-white',
                    'transition-colors duration-200',
                    'flex items-center gap-2'
                  )}
                >
                  <Icon
                    name="image"
                    family="solid"
                    size={16}
                    variant="default"
                  />
                  <Text variant="default" className="text-sm font-medium">
                    Choose Image
                  </Text>
                </label>
                {previewImage && (
                  <>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleUploadProfilePicture}
                      loading={uploadingPicture}
                      disabled={uploadingPicture}
                    >
                      Upload
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleRemovePreview}
                      disabled={uploadingPicture}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </Stack>
          </div>
        </Stack>
      </div>

      {/* Profile Update Section */}
      <div>
        <Text
          as="h2"
          variant="secondary"
          className="text-xl font-semibold mb-4"
        >
          Update Profile
        </Text>
        <form onSubmit={handleSubmitProfile(onSubmitUpdateProfile)}>
          <Stack direction="vertical" spacing={16}>
            <Controller
              name="firstName"
              control={controlProfile}
              render={({ field }) => (
                <Input
                  label="First Name"
                  type="text"
                  size="small"
                  value={field.value || ''}
                  onChange={e => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  error={profileErrors.firstName?.message}
                />
              )}
            />

            <Controller
              name="lastName"
              control={controlProfile}
              render={({ field }) => (
                <Input
                  label="Last Name"
                  type="text"
                  size="small"
                  value={field.value || ''}
                  onChange={e => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  error={profileErrors.lastName?.message}
                />
              )}
            />

            <Button
              type="submit"
              variant="primary"
              loading={updateLoading}
              fullWidth
            >
              Update Profile
            </Button>
          </Stack>
        </form>
      </div>

      {/* User Details Section */}
      <div>
        <Text
          as="h2"
          variant="secondary"
          className="text-xl font-semibold mb-4"
        >
          User Information
        </Text>
        <Stack direction="vertical" spacing={16}>
          <Input
            label="Email"
            type="email"
            size="small"
            value={user?.email || ''}
            disabled
          />

          <Input
            label="Role"
            type="text"
            size="small"
            value={user?.role || ''}
            disabled
          />
        </Stack>
      </div>
    </Stack>
  )

  const changePasswordTabContent = (
    <Stack direction="vertical" spacing={16} className="max-w-2xl">
      <div>
        <Text
          as="h2"
          variant="secondary"
          className="text-xl font-semibold mb-4"
        >
          Change Password
        </Text>
        <form onSubmit={handleSubmitPassword(onSubmitChangePassword)}>
          <Stack direction="vertical" spacing={16}>
            <Input
              label="Current Password"
              type="password"
              size="small"
              required
              showPasswordToggle
              {...registerPassword('currentPassword', {
                required: 'Current password is required',
              })}
              error={passwordErrors.currentPassword?.message}
            />

            <Input
              label="New Password"
              type="password"
              size="small"
              required
              showPasswordToggle
              {...registerPassword('newPassword', {
                required: 'New password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters',
                },
              })}
              error={passwordErrors.newPassword?.message}
            />

            <Input
              label="Confirm New Password"
              type="password"
              size="small"
              required
              showPasswordToggle
              {...registerPassword('confirmPassword', {
                required: 'Please confirm your new password',
                validate: value =>
                  value === newPassword || 'Passwords do not match',
              })}
              error={passwordErrors.confirmPassword?.message}
            />

            <Button type="submit" variant="primary" loading={loading} fullWidth>
              Change Password
            </Button>
          </Stack>
        </form>
      </div>
    </Stack>
  )

  const tabItems = [
    {
      id: 'general',
      label: 'General',
      icon: 'user',
      content: generalTabContent,
    },
    {
      id: 'change-password',
      label: 'Change Password',
      icon: 'lock',
      content: changePasswordTabContent,
    },
  ]

  return (
    <Stack direction="vertical" spacing={16}>
      <Text as="h1" variant="secondary" className="text-3xl font-bold">
        Profile
      </Text>
      <Tabs items={tabItems} defaultActiveTab="general" />
    </Stack>
  )
}

export default Profile
