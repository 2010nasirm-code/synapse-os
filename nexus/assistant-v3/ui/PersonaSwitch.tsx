'use client';

/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - PERSONA SWITCH
 * ============================================================================
 * 
 * Component to switch between assistant personas.
 * 
 * @component PersonaSwitch
 * @version 3.0.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Smile, GraduationCap, Briefcase, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PersonaType, PERSONAS } from '../core/types';

// ============================================================================
// TYPES
// ============================================================================

interface PersonaSwitchProps {
  value: PersonaType;
  onChange: (persona: PersonaType) => void;
  className?: string;
}

// ============================================================================
// PERSONA ICONS
// ============================================================================

const personaIcons: Record<PersonaType, React.ReactNode> = {
  friendly: <Smile className="h-4 w-4" />,
  teacher: <GraduationCap className="h-4 w-4" />,
  expert: <Briefcase className="h-4 w-4" />,
  concise: <Zap className="h-4 w-4" />,
};

// ============================================================================
// COMPONENT
// ============================================================================

export function PersonaSwitch({ value, onChange, className }: PersonaSwitchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentPersona = PERSONAS[value];

  return (
    <div className={cn('relative', className)}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg',
          'bg-muted/50 hover:bg-muted transition-colors',
          'text-sm font-medium'
        )}
      >
        {personaIcons[value]}
        <span>{currentPersona.name}</span>
        <ChevronDown className={cn(
          'h-4 w-4 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute right-0 top-full mt-2 z-50',
                'w-64 p-2 rounded-xl',
                'bg-card border border-border shadow-lg'
              )}
            >
              <p className="px-2 py-1 text-xs text-muted-foreground font-medium">
                Choose Persona
              </p>

              {Object.entries(PERSONAS).map(([key, persona]) => (
                <button
                  key={key}
                  onClick={() => {
                    onChange(key as PersonaType);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-start gap-3 p-3 rounded-lg',
                    'hover:bg-muted transition-colors text-left',
                    value === key && 'bg-purple-500/10'
                  )}
                >
                  <div className={cn(
                    'p-2 rounded-lg',
                    value === key ? 'bg-purple-500 text-white' : 'bg-muted'
                  )}>
                    {personaIcons[key as PersonaType]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{persona.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {persona.description}
                    </p>
                  </div>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PersonaSwitch;

