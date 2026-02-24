import type {
  CreateCurriculumItemPayload,
  CurriculumItemType,
} from '@/api/adminCurriculum.service'
import { Input } from '../Input'
import { Text } from '../Text'
import { Dropdown } from '../Dropdown'

const ITEM_TYPES: { value: CurriculumItemType; label: string }[] = [
  { value: 'WEEKLY_LESSON', label: 'Weekly lesson' },
  { value: 'PDF', label: 'PDF' },
  { value: 'VIDEO', label: 'Video' },
]

export default function CurriculumItemForm({
  form,
  setForm,
}: {
  form: CreateCurriculumItemPayload & {
    description?: string
    url?: string
    sortOrder?: number
  }
  setForm: (f: typeof form) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Type
        </Text>
        <Dropdown
          value={form.type}
          onValueChange={v =>
            setForm({ ...form, type: v as CurriculumItemType })
          }
          options={ITEM_TYPES.map(t => ({ value: t.value, label: t.label }))}
          placeholder="Type"
        />
      </div>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Title
        </Text>
        <Input
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          placeholder="Title"
        />
      </div>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Description (optional)
        </Text>
        <textarea
          className="w-full min-h-[60px] rounded border border-gray-300 px-3 py-2 text-sm"
          value={form.description ?? ''}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Description"
        />
      </div>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          URL (optional)
        </Text>
        <Input
          value={form.url ?? ''}
          onChange={e => setForm({ ...form, url: e.target.value })}
          placeholder="https://..."
        />
      </div>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Week number
        </Text>
        <Input
          type="number"
          min={1}
          value={form.weekIndex}
          onChange={e =>
            setForm({ ...form, weekIndex: Number(e.target.value) || 1 })
          }
        />
      </div>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Sort order
        </Text>
        <Input
          type="number"
          min={0}
          value={form.sortOrder ?? 0}
          onChange={e =>
            setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
          }
        />
      </div>
    </div>
  )
}
