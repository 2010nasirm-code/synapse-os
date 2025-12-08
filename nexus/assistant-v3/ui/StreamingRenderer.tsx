'use client';

/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - STREAMING RENDERER
 * ============================================================================
 * 
 * Renders streaming text responses with animation.
 * 
 * @component StreamingRenderer
 * @version 3.0.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface StreamingRendererProps {
  text: string;
  isLoading?: boolean;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function StreamingRenderer({
  text,
  isLoading = false,
  speed = 20,
  className,
  onComplete,
}: StreamingRendererProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Animate text appearance
  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else if (currentIndex === text.length && text.length > 0) {
      onComplete?.();
    }
  }, [currentIndex, text, speed, onComplete]);

  // Reset when text changes
  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  if (isLoading && !text) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
        <span className="text-sm text-muted-foreground">Thinking...</span>
      </div>
    );
  }

  return (
    <div className={cn('text-sm', className)}>
      <span>{displayedText}</span>
      {currentIndex < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 0.5 }}
          className="inline-block w-2 h-4 bg-purple-500 ml-0.5"
        />
      )}
    </div>
  );
}

export default StreamingRenderer;

