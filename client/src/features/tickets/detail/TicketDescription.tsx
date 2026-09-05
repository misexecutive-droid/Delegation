import { useState } from 'react';
import { AlignLeft, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface TicketDescriptionProps {
  description?: string;
}

const renderFormattedText = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-bold underline underline-offset-4 decoration-primary-600/30 hover:decoration-primary-600/100 transition-all break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export const TicketDescription = ({ description }: TicketDescriptionProps) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const trimmedText = description?.trim();
  if (!trimmedText) return null;

  // Determine if text is long by character count OR line count
  const isLongText = trimmedText.length > 350 || trimmedText.split('\n').length > 6;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(trimmedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied by the browser — silently no-op, copy button just won't confirm.
    }
  };

  return (
    <div className="flex flex-col gap-4 font-sans">
      {/* Header section with copy action */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-text">
          <AlignLeft size={18} className="text-primary-600 dark:text-primary-400" strokeWidth={2.5} />
          <span>Description</span>
        </h3>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-2 text-xs font-bold text-text-secondary hover:text-text transition-all px-3 py-1.5 rounded-xl hover:bg-surface-hover cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95 shadow-sm border border-transparent hover:border-border"
          title="Copy description"
          aria-label="Copy description"
        >
          {copied ? (
            <>
              <Check size={14} className="text-success" strokeWidth={2.5} />
              <span className="text-success">Copied</span>
            </>
          ) : (
            <>
              <Copy size={14} strokeWidth={2.5} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <div className="relative rounded-2xl border border-border bg-surface-hover/50 p-5 shadow-inner transition-all overflow-hidden">
        <div
          className={`text-sm text-text-secondary leading-relaxed whitespace-pre-wrap break-words font-medium ${
            isLongText && !isExpanded ? 'line-clamp-6 mb-4' : ''
          }`}
        >
          {renderFormattedText(trimmedText)}
        </div>

        {isLongText && (
          <div
            className={`flex justify-center mt-2 ${
              !isExpanded 
                ? 'absolute bottom-0 left-0 right-0 pt-20 pb-4 bg-gradient-to-t from-surface-hover via-surface-hover/90 to-transparent pointer-events-none'
                : 'pb-1'
            }`}
          >
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="pointer-events-auto inline-flex items-center gap-1.5 text-xs font-black text-primary-700 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 bg-surface px-4 py-2 rounded-xl shadow-sm border border-border transition-all hover:shadow-md hover:bg-surface-hover cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 focus-visible:ring-offset-background z-10 active:scale-95"
            >
              {isExpanded ? (
                <>
                  <span>Show less</span>
                  <ChevronUp size={16} strokeWidth={3} />
                </>
              ) : (
                <>
                  <span>Show more</span>
                  <ChevronDown size={16} strokeWidth={3} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};