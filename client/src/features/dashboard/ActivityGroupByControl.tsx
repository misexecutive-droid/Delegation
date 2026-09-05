import { PeriodTabControl } from './PeriodTabControl';
import { ACTIVITY_GROUP_LABEL, type ActivityGroupBy } from './dashboardDisplay';

const OPTIONS: ActivityGroupBy[] = ['day', 'month', 'quarter', 'year'];

interface ActivityGroupByControlProps {
  value: ActivityGroupBy;
  onChange: (value: ActivityGroupBy) => void;
}

export const ActivityGroupByControl = ({ value, onChange }: ActivityGroupByControlProps) => (
  <PeriodTabControl value={value} options={OPTIONS} labels={ACTIVITY_GROUP_LABEL} onChange={onChange} />
);
