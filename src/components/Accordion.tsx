import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LucideIcon } from 'lucide-react';

export interface AccordionProps {
  id?: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: string;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: (nextOpen: boolean) => void;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export const Accordion: React.FC<AccordionProps> = ({
  id,
  title,
  subtitle,
  icon: Icon,
  badge,
  defaultOpen = true,
  isOpen: controlledIsOpen,
  onToggle,
  children,
  className = '',
  contentClassName = 'flex flex-col gap-3.5 pt-2.5 pb-1',
}) => {
  const [internalOpen, setInternalOpen] = useState<boolean>(
    controlledIsOpen !== undefined ? controlledIsOpen : defaultOpen
  );

  useEffect(() => {
    if (controlledIsOpen !== undefined) {
      setInternalOpen(controlledIsOpen);
    }
  }, [controlledIsOpen]);

  const isExpanded = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

  const handleHeaderClick = () => {
    const nextState = !isExpanded;
    setInternalOpen(nextState);
    if (onToggle) {
      onToggle(nextState);
    }
  };

  return (
    <div
      id={id}
      data-accordion-id={id}
      data-accordion-open={isExpanded ? 'true' : 'false'}
      className={`w-full shrink-0 flex flex-col ${className}`}
    >
      <motion.button
        type="button"
        onClick={handleHeaderClick}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        aria-expanded={isExpanded}
        className={`w-full shrink-0 p-3 rounded-xl border text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer select-none ${
          isExpanded
            ? 'bg-white/[0.08] border-white/30 shadow-[0_6px_24px_rgba(0,0,0,0.45)]'
            : 'bg-[#0c0c0c]/90 border-white/10 hover:bg-white/[0.05] hover:border-white/25'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                isExpanded
                  ? 'bg-white text-[#050505] border-white'
                  : 'bg-[#161616] text-white/70 border-white/15'
              }`}
            >
              <Icon size={14} strokeWidth={1.9} />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-xs font-display font-bold text-white tracking-tight truncate">
              {title}
            </div>
            {subtitle && (
              <div className="text-[10px] font-mono text-white/50 truncate">
                {subtitle}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {badge && (
            <span
              className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider border ${
                isExpanded
                  ? 'bg-white text-[#050505] border-white'
                  : 'bg-white/5 text-white/60 border-white/10'
              }`}
            >
              {badge}
            </span>
          )}
          <ChevronDown
            size={15}
            className={`text-white/75 transition-transform duration-200 ${
              isExpanded ? 'rotate-180 text-white' : 'rotate-0'
            }`}
          />
        </div>
      </motion.button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="accordion-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden w-full shrink-0"
          >
            <div className={contentClassName}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Accordion;
