/**
 * Date Picker Component for Program Forms
 *
 * Simple date picker component specifically for Amber cycle day selection.
 * Matches the implementation guide structure.
 */

interface DatePickerProps {
  /**
   * Current date value in YYYY-MM-DD format
   */
  value: string
  /**
   * Callback when date changes
   */
  onChange: (date: string) => void
  /**
   * Label for the date picker
   */
  label: string
}

/**
 * DatePicker component for program forms
 *
 * Simple date input for selecting dates in Amber cycle programs.
 *
 * @example
 * ```tsx
 * <DatePicker
 *   label="Day"
 *   value={selectedDate}
 *   onChange={(date) => setSelectedDate(date)}
 * />
 * ```
 */
export const DatePicker = ({ value, onChange, label }: DatePickerProps) => {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full p-2 border rounded"
        min={new Date().toISOString().split('T')[0]}
      />
    </div>
  )
}
