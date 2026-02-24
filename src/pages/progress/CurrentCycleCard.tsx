import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Text } from '@/components/Text'

export default function CurrentCycleCard() {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text as="h1">CurrentCycle:: Red</Text>
        <Button size="small">view Cycle Info</Button>
      </div>
      <Text as="h2">NextCycle begin in : 2 weeks</Text>
    </Card>
  )
}
