import { Link } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Icon } from '@/components/Icon'

/**
 * PRD 13.4 — Nutrition PDFs: purchased or assigned PDFs; also in marketplace library.
 * Placeholder until marketplace/assigned library is wired; link to Market.
 */
export function NutritionPdfsPlaceholder() {
  return (
    <Card className="p-5 border border-dashed border-gray-300 bg-gray-50/50">
      <div className="flex items-start gap-3">
        <Icon
          name="book"
          family="solid"
          size={20}
          className="text-gray-400 shrink-0 mt-0.5"
        />
        <div>
          <Text
            variant="default"
            className="font-medium text-gray-900 block mb-1"
          >
            Nutrition guides & PDFs
          </Text>
          <Text variant="secondary" className="text-sm block mb-3">
            PDFs you purchase or are assigned will appear here and can be opened
            or downloaded. They’re also available in the Market library.
          </Text>
          <Link
            to="/market"
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Go to Market →
          </Link>
        </div>
      </div>
    </Card>
  )
}
