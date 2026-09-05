import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface TicketAttributeCardProps {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}

const CARD_CLASS =
  'flex flex-col gap-1 p-2 rounded bg-surface/60 border border-border/40 transition-colors duration-200 ' +
  'hover:bg-primary-500/5 hover:border-primary-500/30 focus-within:bg-primary-500/5 focus-within:border-primary-500/40';

const LABEL_CLASS = 'text-[10px] capitalize text-text-secondary font-semibold flex items-center gap-1';

export const TicketAttributeCard = ({ icon: Icon, label, children }: TicketAttributeCardProps) => (
  <div className={CARD_CLASS}>
    <label className={LABEL_CLASS}>
      <Icon size={11} className="text-primary-500" /> {label}
    </label>
    {children}
  </div>
);
