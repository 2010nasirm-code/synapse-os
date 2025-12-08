'use client';

/**
 * ============================================================================
 * FRIENDLY AI CHAT
 * ============================================================================
 * 
 * Conversational AI interface with friendly personality.
 * 
 * @component FriendlyAI
 * @version 1.0.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface FriendlyAIProps {
  className?: string;
  placeholder?: string;
  initialMessage?: string;
  onSend?: (message: string) => Promise<string>;
}

const GREETING_MESSAGES = [
  "Hey! 👋 How can I help you today?",
  "Hi there! What would you like to do?",
  "Hello! I'm here to help. What's on your mind?",
];

const THINKING_MESSAGES = [
  "Let me think about that...",
  "Working on it...",
  "One moment...",
];

export function FriendlyAI({
  className,
  placeholder = "Ask me anything...",
  initialMessage,
  onSend,
}: FriendlyAIProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Add initial greeting
  useEffect(() => {
    const greeting = initialMessage || 
      GREETING_MESSAGES[Math.floor(Math.random() * GREETING_MESSAGES.length)];
    
    setMessages([{
      id: 'greeting',
      role: 'assistant',
      content: greeting,
      timestamp: Date.now(),
    }]);
  }, [initialMessage]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);

    try {
      let response: string;
      
      if (onSend) {
        response = await onSend(userMessage.content);
      } else {
        // Default simple responses
        response = getSimpleResponse(userMessage.content);
      }

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Oops! Something went wrong. Let me try again. 🔄",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[80%] px-4 py-2.5 rounded-2xl',
                'animate-in fade-in-0 slide-in-from-bottom-2',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted rounded-bl-sm'
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-muted px-4 py-2.5 rounded-2xl rounded-bl-sm animate-pulse">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isThinking}
            className={cn(
              'flex-1 px-4 py-2.5 rounded-xl border',
              'bg-background text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary/50',
              'placeholder:text-muted-foreground',
              'disabled:opacity-50'
            )}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isThinking}
            className={cn(
              'px-4 py-2.5 rounded-xl font-medium',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// Simple response generator (fallback)
function getSimpleResponse(input: string): string {
  const lower = input.toLowerCase();

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return "Hey! 👋 Great to hear from you. What can I help you with?";
  }

  if (lower.includes('help')) {
    return "I'm here to help! You can:\n\n• Create trackers to monitor habits, goals, or anything else\n• Set up automations to save time\n• Check analytics to see your progress\n• Ask me questions anytime!\n\nWhat would you like to do?";
  }

  if (lower.includes('create') || lower.includes('add') || lower.includes('new')) {
    return "I can help you create something new! Would you like to:\n\n1. 📊 Create a new tracker\n2. ⚡ Set up an automation\n3. 📝 Add a note\n\nJust let me know!";
  }

  if (lower.includes('thanks') || lower.includes('thank you')) {
    return "You're welcome! 😊 Let me know if you need anything else.";
  }

  return "I'm not sure I understood that. Could you try rephrasing? You can also:\n\n• Ask for help\n• Create something new\n• Check your progress\n\nI'm here to assist! 🤖";
}

export default FriendlyAI;

