'use client';

/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - CHAT BUBBLE
 * ============================================================================
 * 
 * Floating chat bubble component.
 * 
 * @component ChatBubble
 * @version 3.0.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NexusChat } from './NexusChat';

// ============================================================================
// TYPES
// ============================================================================

interface ChatBubbleProps {
  userId?: string;
  sessionId?: string;
  position?: 'bottom-right' | 'bottom-left';
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ChatBubble({
  userId,
  sessionId,
  position = 'bottom-right',
  className,
}: ChatBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const positionClasses = {
    'bottom-right': 'right-4 bottom-4',
    'bottom-left': 'left-4 bottom-4',
  };

  return (
    <div className={cn('fixed z-50', positionClasses[position], className)}>
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              height: isMinimized ? 60 : 500,
            }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'w-96 rounded-2xl overflow-hidden',
              'bg-card border border-border shadow-2xl',
              isMinimized && 'cursor-pointer'
            )}
            onClick={isMinimized ? () => setIsMinimized(false) : undefined}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border bg-gradient-to-r from-violet-500/10 to-purple-500/10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500">
                  <MessageCircle className="h-4 w-4 text-white" />
                </div>
                <span className="font-medium text-sm">Nexus Assistant</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMinimized(!isMinimized);
                  }}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Chat */}
            {!isMinimized && (
              <div className="h-[440px]">
                <NexusChat
                  userId={userId}
                  sessionId={sessionId}
                  className="h-full"
                />
              </div>
            )}
          </motion.div>
        ) : (
          <motion.button
            key="bubble"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className={cn(
              'p-4 rounded-full',
              'bg-gradient-to-r from-violet-500 to-purple-600',
              'shadow-lg shadow-purple-500/25',
              'text-white'
            )}
          >
            <MessageCircle className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ChatBubble;

