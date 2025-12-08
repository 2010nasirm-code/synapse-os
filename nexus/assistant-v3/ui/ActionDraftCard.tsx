'use client';

/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - ACTION DRAFT CARD
 * ============================================================================
 * 
 * Displays action drafts with confirm/reject buttons.
 * 
 * @component ActionDraftCard
 * @version 3.0.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ChevronDown, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ActionDraft } from '../core/types';

// ============================================================================
// TYPES
// ============================================================================

interface ActionDraftCardProps {
  action: ActionDraft;
  onConfirm: () => void;
  onReject: () => void;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ActionDraftCard({
  action,
  onConfirm,
  onReject,
  className,
}: ActionDraftCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'rejected'>('pending');

  const handleConfirm = () => {
    setStatus('confirmed');
    onConfirm();
  };

  const handleReject = () => {
    setStatus('rejected');
    onReject();
  };

  return (
    <motion.div
      layout
      className={cn(
        'rounded-xl border overflow-hidden',
        status === 'pending' && 'border-purple-500/30 bg-purple-500/5',
        status === 'confirmed' && 'border-green-500/30 bg-green-500/5',
        status === 'rejected' && 'border-red-500/30 bg-red-500/5 opacity-60',
        className
      )}
    >
      {/* Header */}
      <div className="p-3 flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              action.impact === 'high' && 'bg-red-500/10 text-red-500',
              action.impact === 'medium' && 'bg-yellow-500/10 text-yellow-500',
              (!action.impact || action.impact === 'low') && 'bg-blue-500/10 text-blue-500'
            )}>
              {action.type.replace(/_/g, ' ')}
            </span>
            {action.requiresConfirmation && (
              <AlertTriangle className="h-3 w-3 text-yellow-500" />
            )}
          </div>
          <p className="text-sm font-medium mt-1">
            {action.previewText || `Execute ${action.type}`}
          </p>
        </div>

        {/* Status indicator */}
        {status !== 'pending' && (
          <div className={cn(
            'p-1.5 rounded-full',
            status === 'confirmed' && 'bg-green-500/10 text-green-500',
            status === 'rejected' && 'bg-red-500/10 text-red-500'
          )}>
            {status === 'confirmed' ? (
              <Check className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </div>
        )}
      </div>

      {/* Expand/collapse */}
      {action.explanation && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          <Info className="h-3 w-3" />
          <span>Why this action?</span>
          <ChevronDown className={cn(
            'h-3 w-3 ml-auto transition-transform',
            expanded && 'rotate-180'
          )} />
        </button>
      )}

      <AnimatePresence>
        {expanded && action.explanation && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="px-3 pb-3 text-xs text-muted-foreground">
              {action.explanation}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      {status === 'pending' && action.requiresConfirmation && (
        <div className="p-3 pt-0 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReject}
            className="flex-1 text-red-500 hover:bg-red-500/10"
          >
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white"
          >
            <Check className="h-3 w-3 mr-1" />
            Confirm
          </Button>
        </div>
      )}

      {/* Status message */}
      {status !== 'pending' && (
        <div className={cn(
          'px-3 pb-3 text-xs',
          status === 'confirmed' && 'text-green-500',
          status === 'rejected' && 'text-red-500'
        )}>
          {status === 'confirmed' ? 'Action confirmed' : 'Action cancelled'}
        </div>
      )}
    </motion.div>
  );
}

export default ActionDraftCard;

