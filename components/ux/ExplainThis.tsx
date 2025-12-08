'use client';

/**
 * ============================================================================
 * EXPLAIN THIS BUTTON
 * ============================================================================
 * 
 * Small info button that explains features in simple terms.
 * 
 * @component ExplainThis
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface ExplainThisProps {
  feature: string;
  explanation: string;
  example?: string;
  canDoForMe?: boolean;
  onDoForMe?: () => void;
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function ExplainThis({
  feature,
  explanation,
  example,
  canDoForMe,
  onDoForMe,
  className,
  position = 'top',
}: ExplainThisProps) {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className={cn('relative inline-flex', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className={cn(
          'flex items-center justify-center w-5 h-5 rounded-full',
          'text-xs font-medium transition-all duration-200',
          'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50',
          isOpen
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        )}
        aria-label={`Learn about ${feature}`}
      >
        ⓘ
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute z-50 w-64 p-4 rounded-xl shadow-xl',
            'bg-card border border-border',
            'animate-in fade-in-0 zoom-in-95 duration-200',
            positionClasses[position]
          )}
        >
          {/* Arrow */}
          <div
            className={cn(
              'absolute w-3 h-3 bg-card border-border rotate-45',
              position === 'top' && 'top-full left-1/2 -translate-x-1/2 -mt-1.5 border-b border-r',
              position === 'bottom' && 'bottom-full left-1/2 -translate-x-1/2 mb-1.5 border-t border-l',
              position === 'left' && 'left-full top-1/2 -translate-y-1/2 -ml-1.5 border-t border-r',
              position === 'right' && 'right-full top-1/2 -translate-y-1/2 mr-1.5 border-b border-l'
            )}
          />

          {/* Content */}
          <div className="relative">
            <h4 className="font-semibold text-sm mb-2">{feature}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {explanation}
            </p>

            {example && (
              <div className="mt-3 p-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                <span className="font-medium">Example:</span> {example}
              </div>
            )}

            {canDoForMe && onDoForMe && (
              <button
                onClick={() => {
                  onDoForMe();
                  setIsOpen(false);
                }}
                className={cn(
                  'mt-3 w-full py-2 px-3 rounded-lg text-sm font-medium',
                  'bg-primary text-primary-foreground',
                  'hover:bg-primary/90 transition-colors'
                )}
              >
                ✨ Do it for me
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ExplainThis;

