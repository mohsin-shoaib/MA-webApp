/**
 * Coach Marketplace (PRD 7.5.9–7.5.12): create items (unpublished), list, assign to my athletes.
 */
import type { ReactNode } from 'react'
import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { Modal } from '@/components/Modal'
import { Input } from '@/components/Input'
import { Dropdown } from '@/components/Dropdown'
import { FileDropZone } from '@/components/FileUpload'
import { ProgressBar } from '@/components/ProgressBar'
import { uploadService } from '@/services/uploadService'
import { FileType, ParentType } from '@/constants/fileTypes'
import { coachMarketplaceService } from '@/api/coach-marketplace.service'
import { Icon } from '@/components/Icon'
import type { MarketplaceItemWithCreator } from '@/types/marketplace'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { AxiosError } from 'axios'

const TYPES = [
  { value: 'PDF', label: 'PDF' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'GUIDE', label: 'Guide' },
  { value: 'MASTERCLASS', label: 'Masterclass' },
]

const TYPE_ICON: Record<string, string> = {
  PDF: 'file-pdf',
  VIDEO: 'video',
  GUIDE: 'book',
  MASTERCLASS: 'graduation-cap',
}

/** PDF and image only; no video upload—use Video link for type VIDEO. */
function getFileTypeForMarketplace(file: File): FileType {
  if (file.type.startsWith('image/')) return FileType.PROGRAM_IMAGE
  if (
    file.type === 'application/pdf' ||
    file.type === 'application/msword' ||
    file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return FileType.DOCUMENT
  }
  return FileType.DOCUMENT
}

const MARKETPLACE_ACCEPT =
  'application/pdf,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp'
const MARKETPLACE_MAX_SIZE = 100 * 1024 * 1024 // 100MB (PDF); images validated at 10MB

export default function CoachMarketplace() {
  const [list, setList] = useState<MarketplaceItemWithCreator[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'PDF' as string,
    filePath: '',
  })
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{
    percent: number
  } | null>(null)
  const { showError, showSuccess } = useSnackbar()

  const fetchList = useCallback(async () => {
    try {
      setLoading(true)
      const res = await coachMarketplaceService.list()
      const data = res.data as {
        statusCode: number
        data?: { items?: MarketplaceItemWithCreator[] }
      }
      if (data?.statusCode === 200 && data?.data?.items) {
        setList(data.data.items)
      } else {
        setList([])
      }
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Failed to load')
      setList([])
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const isVideoType = form.type === 'VIDEO'
  const openCreate = () => {
    setForm({ title: '', description: '', type: 'PDF', filePath: '' })
    setCreateOpen(true)
  }

  const handleMarketplaceFileSelect = useCallback(
    async (file: File) => {
      const validation = uploadService.validateFile(
        file,
        getFileTypeForMarketplace(file)
      )
      if (!validation.valid) {
        showError(validation.error ?? 'Invalid file')
        return
      }
      setUploadingFile(true)
      setUploadProgress(null)
      try {
        const fileUrl = await uploadService.uploadFile(
          file,
          getFileTypeForMarketplace(file),
          ParentType.MARKETPLACE,
          p => setUploadProgress(p)
        )
        setForm(f => ({ ...f, filePath: fileUrl }))
        showSuccess('File uploaded')
      } catch (e) {
        showError(e instanceof Error ? e.message : 'Upload failed')
      } finally {
        setUploadingFile(false)
        setUploadProgress(null)
      }
    },
    [showError, showSuccess]
  )

  const handleCreate = async () => {
    if (!form.title.trim()) {
      showError('Title is required')
      return
    }
    setSaving(true)
    try {
      await coachMarketplaceService.create({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        filePath: form.filePath.trim() || undefined,
      })
      showSuccess('Item created (pending admin approval to publish)')
      setCreateOpen(false)
      fetchList()
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  let cardContent: ReactNode
  if (loading) {
    cardContent = (
      <div className="flex flex-col items-center justify-center py-16">
        <Spinner size="large" variant="primary" />
        <Text variant="secondary" className="mt-3 text-sm">
          Loading marketplace items...
        </Text>
      </div>
    )
  } else if (list.length === 0) {
    cardContent = (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="rounded-full bg-gray-100 p-4 mb-4">
          <Icon name="store" family="solid" size={32} variant="muted" />
        </div>
        <Text variant="default" className="font-semibold text-lg mb-1">
          No marketplace items yet
        </Text>
        <Text variant="secondary" className="text-sm max-w-sm mb-6">
          Create content (guides, PDFs, videos). Admin must approve before items
          appear in the market.
        </Text>
        <Button type="button" onClick={openCreate}>
          Create first item
        </Button>
      </div>
    )
  } else {
    cardContent = (
      <ul className="divide-y divide-gray-200">
        {list.map(item => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50/80 transition-colors first:rounded-t-xl last:rounded-b-xl"
          >
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Icon
                  name={TYPE_ICON[item.type] ?? 'file'}
                  family="solid"
                  size={20}
                  variant="secondary"
                />
              </div>
              <div className="min-w-0">
                <Text variant="default" className="font-semibold truncate">
                  {item.title}
                </Text>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                    {TYPES.find(t => t.value === item.type)?.label ?? item.type}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                      item.isPublished
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.isPublished
                      ? 'Published'
                      : 'Draft (awaiting approval)'}
                  </span>
                  {item.createdBy && (
                    <span className="text-xs text-gray-500 truncate">
                      {[item.createdBy.firstName, item.createdBy.lastName]
                        .filter(Boolean)
                        .join(' ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-gray-100 p-2">
              <Icon name="store" family="solid" size={24} variant="primary" />
            </div>
            <Text variant="primary" className="text-2xl font-semibold">
              Marketplace
            </Text>
          </div>
          <Text variant="secondary" className="text-sm mt-1">
            Upload content (PDFs, videos, guides). Only Admin can publish.
          </Text>
        </div>
        <Button type="button" onClick={openCreate} size="medium">
          Create item
        </Button>
      </div>

      <Card className="p-0 overflow-hidden rounded-xl border border-gray-200/80 shadow-sm">
        {cardContent}
      </Card>

      {createOpen && (
        <Modal
          visible={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Create marketplace item"
        >
          <div className="space-y-3">
            <Input
              label="Title"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Nutrition guide"
            />
            <Input
              label="Description"
              value={form.description}
              onChange={e =>
                setForm(f => ({ ...f, description: e.target.value }))
              }
              placeholder="Optional"
            />
            <Dropdown
              label="Type"
              placeholder="Select type"
              options={TYPES}
              value={form.type}
              onValueChange={v =>
                setForm(f => ({
                  ...f,
                  type: typeof v === 'string' ? v : 'PDF',
                }))
              }
            />
            <div>
              <Text
                variant="default"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {isVideoType ? 'Video link' : 'File'}
              </Text>
              <p className="text-sm text-gray-500 mb-2">
                {isVideoType
                  ? 'Paste a link (e.g. YouTube, Vimeo). Do not upload video files.'
                  : 'PDFs up to 100MB, images up to 10MB. Upload a PDF or image.'}
              </p>
              {isVideoType ? (
                <Input
                  value={form.filePath}
                  onChange={e =>
                    setForm(f => ({ ...f, filePath: e.target.value }))
                  }
                  placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                  className="mt-1"
                  size="small"
                />
              ) : form.filePath ? (
                <div className="space-y-2">
                  <a
                    href={form.filePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Current file (open link)
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="small"
                    onClick={() => setForm(f => ({ ...f, filePath: '' }))}
                  >
                    Remove file
                  </Button>
                </div>
              ) : (
                <>
                  <FileDropZone
                    accept={MARKETPLACE_ACCEPT}
                    maxSize={MARKETPLACE_MAX_SIZE}
                    onFileSelect={handleMarketplaceFileSelect}
                    disabled={uploadingFile}
                  />
                  {uploadingFile && uploadProgress && (
                    <ProgressBar
                      progress={uploadProgress.percent}
                      className="mt-2"
                    />
                  )}
                </>
              )}
            </div>
            {!form.filePath?.trim() && (
              <p className="text-sm text-amber-600">
                {isVideoType
                  ? 'Enter a video link to enable Create.'
                  : 'Upload a file to enable Create.'}
              </p>
            )}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleCreate}
                disabled={saving || !form.filePath?.trim() || uploadingFile}
              >
                {saving ? 'Creating...' : 'Create'}
              </Button>
              <Button variant="secondary" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
