'use client';

/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - CHAT PAGE
 * ============================================================================
 * 
 * Main chat interface for Nexus Assistant.
 * 
 * @component NexusChat
 * @version 3.0.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Loader2,
  User,
  Bot,
  Sparkles,
  Settings,
  History,
  Trash2,
  Download,
  ChevronDown,
  Info,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PersonaSwitch } from './PersonaSwitch';
import { ActionDraftCard } from './ActionDraftCard';
import { StreamingRenderer } from './StreamingRenderer';
import { AIResponse, ActionDraft, PersonaType, Source } from '../core/types';

// ============================================================================
// TYPES
// ============================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  persona?: PersonaType;
  provenance?: Array<{ agent: string; confidence?: number }>;
  actions?: ActionDraft[];
  sources?: Source[];
  isStreaming?: boolean;
}

interface NexusChatProps {
  userId?: string;
  sessionId?: string;
  initialPersona?: PersonaType;
  onAction?: (action: ActionDraft, confirmed: boolean) => void;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function NexusChat({
  userId = 'anonymous',
  sessionId,
  initialPersona = 'friendly',
  onAction,
  className,
}: NexusChatProps) {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [persona, setPersona] = useState<PersonaType>(initialPersona);
  const [showSettings, setShowSettings] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem(`nexus-chat-${userId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.slice(-50)); // Keep last 50 messages
      } catch {}
    }

    // Add welcome message if empty
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: getWelcomeMessage(persona),
        timestamp: Date.now(),
        persona,
      }]);
    }
  }, [userId]);

  // Save messages
  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem(`nexus-chat-${userId}`, JSON.stringify(messages.slice(-50)));
    }
  }, [messages, userId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Add placeholder for assistant response
    const assistantId = `assistant-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      persona,
      isStreaming: true,
    }]);

    try {
      const response = await fetch('/api/nexus/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage.content,
          userId,
          sessionId,
          persona,
        }),
      });

      const data: AIResponse = await response.json();

      // Update assistant message
      setMessages(prev => prev.map(m => 
        m.id === assistantId
          ? {
              ...m,
              content: data.messages?.[0]?.text || 'I apologize, but I encountered an issue processing your request.',
              provenance: data.messages?.[0]?.provenance,
              actions: data.actions,
              sources: data.messages?.[0]?.sources,
              isStreaming: false,
            }
          : m
      ));

    } catch (error) {
      // Error response
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? {
              ...m,
              content: 'Sorry, I encountered an error. Please try again.',
              isStreaming: false,
            }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, persona, userId, sessionId]);

  // Handle action confirmation
  const handleActionConfirm = useCallback((action: ActionDraft, confirmed: boolean) => {
    onAction?.(action, confirmed);
    
    // Add confirmation message
    const confirmMessage: Message = {
      id: `confirm-${Date.now()}`,
      role: 'assistant',
      content: confirmed 
        ? `✅ Action confirmed: ${action.previewText || action.type}`
        : `❌ Action cancelled: ${action.previewText || action.type}`,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, confirmMessage]);
  }, [onAction]);

  // Clear chat
  const clearChat = useCallback(() => {
    localStorage.removeItem(`nexus-chat-${userId}`);
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: getWelcomeMessage(persona),
      timestamp: Date.now(),
      persona,
    }]);
  }, [userId, persona]);

  // Export chat
  const exportChat = useCallback(() => {
    const data = JSON.stringify(messages, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-chat-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold">Nexus Assistant</h2>
            <p className="text-xs text-muted-foreground">AI-powered help</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PersonaSwitch value={persona} onChange={setPersona} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border"
          >
            <div className="p-4 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-sm">Chat History</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={exportChat}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearChat}>
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="p-2 rounded-lg bg-purple-500/10 h-fit">
                  <Bot className="h-4 w-4 text-purple-500" />
                </div>
              )}

              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-3',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted rounded-bl-sm'
                )}
              >
                {message.isStreaming ? (
                  <StreamingRenderer text="" isLoading />
                ) : (
                  <>
                    <div className="text-sm whitespace-pre-wrap">
                      {formatMessage(message.content)}
                    </div>

                    {/* Provenance badges */}
                    {message.provenance && message.provenance.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/30">
                        {message.provenance.map((p, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 text-xs"
                          >
                            {p.agent}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/30">
                        <p className="text-xs text-muted-foreground mb-1">Sources:</p>
                        {message.sources.slice(0, 3).map((source, i) => (
                          <a
                            key={i}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline block truncate"
                          >
                            {source.title}
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.actions.map(action => (
                          <ActionDraftCard
                            key={action.id}
                            action={action}
                            onConfirm={() => handleActionConfirm(action, true)}
                            onReject={() => handleActionConfirm(action, false)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {message.role === 'user' && (
                <div className="p-2 rounded-lg bg-primary/10 h-fit">
                  <User className="h-4 w-4 text-primary" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="p-2 rounded-lg bg-purple-500/10 h-fit">
              <Bot className="h-4 w-4 text-purple-500" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask anything..."
            disabled={isLoading}
            className={cn(
              'flex-1 px-4 py-3 rounded-xl border',
              'bg-background text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-purple-500/50',
              'placeholder:text-muted-foreground',
              'disabled:opacity-50'
            )}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2 mt-3">
          {['Help me', 'Analyze my data', 'Create a tracker', 'What can you do?'].map(q => (
            <button
              key={q}
              onClick={() => setInput(q)}
              className="px-3 py-1.5 rounded-lg bg-muted/50 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getWelcomeMessage(persona: PersonaType): string {
  const messages: Record<PersonaType, string> = {
    friendly: "Hey there! 👋 I'm Nexus Assistant, your AI helper. I can answer questions, analyze your data, create trackers, set up automations, and more. What would you like to do?",
    teacher: "Hello! I'm Nexus Assistant, here to help you learn and accomplish your goals. I can explain concepts, guide you through tasks, and help you understand your data. What would you like to explore?",
    expert: "Nexus Assistant initialized. Available capabilities: data analysis, tracker management, automation configuration, knowledge queries. How may I assist?",
    concise: "Hi! I'm Nexus Assistant. Ask me anything.",
  };
  return messages[persona];
}

function formatMessage(content: string): React.ReactNode {
  // Simple markdown-like formatting
  return content.split('\n').map((line, i) => {
    // Bold
    let formatted: React.ReactNode = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Return with line breaks
    return (
      <span key={i}>
        <span dangerouslySetInnerHTML={{ __html: formatted as string }} />
        {i < content.split('\n').length - 1 && <br />}
      </span>
    );
  });
}

export default NexusChat;

