import { Input, SelectDropdown } from '../../components';
import { FIELD_LABEL_CLASS, FIELD_CARD_CLASS } from './taskFormFieldStyles';
import type { Task } from '../../api/task';

export type ReminderChannel = Task['reminderChannel'];

const CHANNEL_LABEL: Record<ReminderChannel, string> = {
  notification: 'Notification',
  alarm: 'Alarm',
  email: 'Email',
  sms: 'SMS',
};
const CHANNEL_OPTIONS = (Object.keys(CHANNEL_LABEL) as ReminderChannel[]).map((c) => ({
  value: c,
  label: CHANNEL_LABEL[c],
}));

type ReminderUnit = 'days' | 'weeks' | 'months';

const UNIT_MINUTES: Record<ReminderUnit, number> = { days: 1440, weeks: 1440 * 7, months: 1440 * 30 };
const UNIT_LABEL: Record<ReminderUnit, string> = { days: 'Days', weeks: 'Weeks', months: 'Months' };
const UNIT_OPTIONS = (Object.keys(UNIT_LABEL) as ReminderUnit[]).map((u) => ({
  value: u,
  label: UNIT_LABEL[u],
}));

const splitMinutes = (minutes: number): { amount: number; unit: ReminderUnit } => {
  if (minutes % UNIT_MINUTES.months === 0) return { amount: minutes / UNIT_MINUTES.months, unit: 'months' };
  if (minutes % UNIT_MINUTES.weeks === 0) return { amount: minutes / UNIT_MINUTES.weeks, unit: 'weeks' };
  return { amount: Math.max(1, Math.round(minutes / UNIT_MINUTES.days)), unit: 'days' };
};

interface TaskFormReminderFieldProps {
  minutes: number | null;
  channel: ReminderChannel;
  onChange: (minutes: number | null, channel: ReminderChannel) => void;
  disabled?: boolean;
}

export const TaskFormReminderField = ({ minutes, channel, onChange, disabled = false }: TaskFormReminderFieldProps) => {
  const enabled = minutes !== null && minutes > 0;
  const { amount, unit } = enabled ? splitMinutes(minutes) : { amount: 1, unit: 'days' as ReminderUnit };

  return (
    <div className={`group/field flex flex-col gap-2 ${FIELD_CARD_CLASS}`}>
      <label className={FIELD_LABEL_CLASS}>
        Deadline Notification
      </label>

      {/* Fluid layout: Stacks on mobile, forms a clean inline row on sm+ screens */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 w-full">

        {/* Channel Dropdown — themed popover instead of a native <select>, matching every other
            menu in the app. */}
        <div className="w-full sm:flex-1 sm:max-w-[45%]">
          <SelectDropdown
            value={channel}
            onChange={(next) => onChange(minutes, next)}
            options={CHANNEL_OPTIONS}
            disabled={disabled}
            aria-label="Reminder channel"
          />
        </div>

        {/* Amount + Unit Input Group */}
        <div className="flex w-full sm:flex-1 gap-2.5">
          <div className="w-1/3 sm:w-[4.5rem]">
            <Input
              type="number"
              min={0}
              value={amount}
              disabled={disabled}
              onChange={(e) => {
                const next = Math.max(0, Number(e.target.value) || 0);
                onChange(next > 0 ? next * UNIT_MINUTES[unit] : null, channel);
              }}
              className="h-10 text-sm font-medium text-center px-1 rounded-lg w-full"
            />
          </div>

          <div className="flex-1">
            <SelectDropdown
              value={unit}
              onChange={(next) => onChange(enabled ? amount * UNIT_MINUTES[next] : null, channel)}
              options={UNIT_OPTIONS}
              disabled={disabled}
              aria-label="Reminder unit"
            />
          </div>
        </div>

      </div>
    </div>
  );
};