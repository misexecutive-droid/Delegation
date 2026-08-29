import { Loader2, Check, Store } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useStoresQuery } from '../../features/tickets/hook';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StoreMultiSelectProps {
  selected: string[];
  onChange: (ids: string[]) => void;
}

export const StoreMultiSelect = ({ selected, onChange }: StoreMultiSelectProps) => {
  const { data: stores, isLoading } = useStoresQuery();

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };

  return (
    <div className="flex flex-col gap-1 w-full max-h-56 overflow-y-auto custom-scrollbar p-2 bg-slate-50 border border-slate-200 rounded-xl shadow-inner shadow-slate-100/50">
      
      {isLoading && (
        <div className="flex items-center gap-2.5 text-sm font-medium text-slate-500 px-3 py-4 animate-pulse">
          <Loader2 size={16} className="animate-spin text-slate-400" /> 
          Loading stores…
        </div>
      )}

      {!isLoading && !stores?.length && (
        <div className="flex flex-col items-center justify-center gap-2 px-3 py-6 text-center">
          <div className="flex items-center justify-center size-10 rounded-full bg-slate-100 text-slate-400 mb-1">
            <Store size={18} strokeWidth={2} />
          </div>
          <p className="text-sm font-medium text-slate-600">No stores configured yet.</p>
        </div>
      )}

      {stores?.map(s => {
        const checked = selected.includes(s.id);
        
        return (
          <label
            key={s.id}
            className={cn(
              "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 active:scale-[0.98]",
              checked 
                ? "bg-primary-50 text-primary-900" 
                : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
            )}
          >
            {/* 
              Visually hidden native checkbox ensures keyboard accessibility and form semantics, 
              while `peer` allows us to style the custom visual box below based on its state. 
            */}
            <input
              type="checkbox"
              className="peer sr-only"
              checked={checked}
              onChange={() => toggle(s.id)}
            />
            
            {/* Custom Visual Checkbox */}
            <div 
              className={cn(
                "flex items-center justify-center size-5 rounded-md border transition-all duration-200 shadow-sm shrink-0",
                "peer-focus-visible:ring-4 peer-focus-visible:ring-primary-100 peer-focus-visible:border-primary-400",
                checked
                  ? "bg-primary-600 border-primary-600 text-white shadow-primary-600/20"
                  : "bg-white border-slate-300 text-transparent group-hover:border-primary-400"
              )}
            >
              <Check 
                size={14} 
                strokeWidth={3} 
                className={cn(
                  "transition-all duration-200",
                  checked ? "opacity-100 scale-100" : "opacity-0 scale-50"
                )} 
              />
            </div>

            <span className="truncate">{s.name}</span>
          </label>
        );
      })}
    </div>
  );
};