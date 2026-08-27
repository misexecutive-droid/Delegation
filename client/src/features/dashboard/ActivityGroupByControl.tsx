import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ACTIVITY_GROUP_LABEL, type ActivityGroupBy } from './dashboardDisplay';

const OPTIONS: ActivityGroupBy[] = ['day', 'month', 'quarter', 'year'];

interface ActivityGroupByControlProps {
  value: ActivityGroupBy;
  onChange: (value: ActivityGroupBy) => void;
}

export const ActivityGroupByControl = ({ value, onChange }: ActivityGroupByControlProps) => (
  <Tabs value={value} onValueChange={(v) => onChange(v as ActivityGroupBy)}>
    <TabsList>
      {OPTIONS.map((o) => (
        <TabsTrigger key={o} value={o}>
          {ACTIVITY_GROUP_LABEL[o]}
        </TabsTrigger>
      ))}
    </TabsList>
  </Tabs>
);
