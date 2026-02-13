import { useState, useRef } from 'react'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/Button'
import { ProgressBar } from '@/components/ProgressBar'
import { Stack } from '@/components/Stack'
import { Text } from '@/components/Text'
import { Icon } from '@/components/Icon'
import { useProfilePictureUpload } from '@/hooks/useProfilePictureUpload'
import type { UpdateProfileResponse } from '@/types/user'
import { cn } from '@/utils/cn'

/**
 * Props for ProfilePictureUpload component
 */
export interface ProfilePictureUploadProps {
  /**
   * Current profile picture URL
   */
  currentImageUrl?: string

  /**
   * User name for avatar fallback
   */
  userName?: string

  /**
   * Callback when upload succeeds
   */
  onUploadSuccess?: (user: UpdateProfileResponse['data']['user']) => void

  /**
   * Callback when upload fails
   */
  onUploadError?: (error: Error) => void

  /**
   * Show preview before upload
   * @default true
   */
  showPreview?: boolean

  /**
   * Avatar size
   * @default 'xlarge'
   */
  avatarSize?: 'small' | 'medium' | 'large' | 'xlarge' | number

  /**
   * Additional className
   */
  className?: string
}

/**
 * ProfilePictureUpload component
 *
 * A complete, reusable component for uploading profile pictures.
 * Handles file selection, preview, upload, and profile update automatically.
 *
 * @example
 * ```tsx
 * <ProfilePictureUpload
 *   currentImageUrl={user.profilePicture}
 *   userName={user.name}
 *   onUploadSuccess={(user) => {
 *     console.log('Profile updated:', user)
 *   }}
 * />
 * ```
 */
export function ProfilePictureUpload({
  currentImageUrl,
  userName,
  onUploadSuccess,
  onUploadError,
  showPreview = true,
  avatarSize = 'xlarge',
  className,
}: Readonly<ProfilePictureUploadProps>) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(
    currentImageUrl || null
  )

  const { uploadAndUpdate, uploading, progress, error, reset } =
    useProfilePictureUpload({
      onSuccess: updatedUser => {
        // Update preview with new image URL
        if (updatedUser.profilePicture) {
          setPreviewImage(updatedUser.profilePicture)
        }
        onUploadSuccess?.(updatedUser)
      },
      onError: error => {
        onUploadError?.(error)
      },
    })

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      return
    }

    try {
      await uploadAndUpdate(file)
    } catch {
      // Error handled by hook
    }
  }

  const handleRemovePreview = () => {
    setPreviewImage(currentImageUrl || null)
    reset()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    if (!uploading) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className={cn('w-full', className)}>
      <Stack direction="vertical" spacing={16} align="start">
        <div className="flex items-center gap-6">
          <div
            className={cn(
              'relative cursor-pointer transition-opacity',
              uploading && 'opacity-50 cursor-not-allowed'
            )}
            onClick={handleClick}
            role="button"
            tabIndex={uploading ? -1 : 0}
            onKeyDown={e => {
              if (!uploading && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                handleClick()
              }
            }}
          >
            <Avatar
              source={previewImage || undefined}
              name={userName}
              size={avatarSize}
              showBorder
              borderVariant="primary"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {progress && (
                    <Text variant="white" className="text-xs font-medium">
                      {Math.round(progress.percent)}%
                    </Text>
                  )}
                </div>
              </div>
            )}
          </div>

          <Stack direction="vertical" spacing={8} className="flex-1">
            <Text variant="muted" className="text-sm">
              Upload a new profile picture
            </Text>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  id="profile-picture-upload-input"
                  disabled={uploading}
                />
                <label
                  htmlFor="profile-picture-upload-input"
                  className={cn(
                    'px-4 py-2 rounded-lg cursor-pointer',
                    'border-2 border-primary text-primary',
                    'hover:bg-primary hover:text-white',
                    'transition-colors duration-200',
                    'flex items-center gap-2',
                    uploading && 'opacity-50 cursor-not-allowed'
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
                {showPreview &&
                  previewImage &&
                  previewImage !== currentImageUrl && (
                    <>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleUpload}
                        loading={uploading}
                        disabled={uploading}
                      >
                        Upload
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleRemovePreview}
                        disabled={uploading}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
              </div>

              {/* Progress Bar */}
              {uploading && progress && (
                <div className="w-full max-w-md">
                  <ProgressBar
                    progress={progress.percent}
                    showPercentage={true}
                    variant="primary"
                    size="medium"
                    label="Uploading..."
                  />
                </div>
              )}

              {/* Error Message */}
              {error && !uploading && (
                <div className="flex items-center gap-2">
                  <Text variant="error" className="text-sm">
                    {error.message}
                  </Text>
                  <Button
                    type="button"
                    variant="ghost"
                    size="small"
                    onClick={reset}
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          </Stack>
        </div>
      </Stack>
    </div>
  )
}
