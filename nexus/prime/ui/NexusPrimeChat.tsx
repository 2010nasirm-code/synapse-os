'use client';

/**
 * ============================================================================
 * NEXUS PRIME - CHAT INTERFACE
 * ============================================================================
 * 
 * Chat interface for NEXUS PRIME:
 * - Message input and history
 * - Displays provenance
 * - Shows draft action cards
 * - Confirm/deny buttons
 * 
 * @module nexus/prime/ui/NexusPrimeChat
 * @version 1.0.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { AIResponse, ActionDraft, ProvenanceRecord } from '../core/types';

// ============================================================================
// TYPES
// ============================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  response?: AIResponse;
}

interface NexusPrimeChatProps {
  onSendMessage: (message: string) => Promise<AIResponse>;
  onConfirmAction: (action: ActionDraft) => Promise<void>;
  onRejectAction: (action: ActionDraft) => void;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function NexusPrimeChat({
  onSendMessage,
  onConfirmAction,
  onRejectAction,
  className = '',
}: NexusPrimeChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showProvenance, setShowProvenance] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle send message
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await onSendMessage(userMessage.content);

      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        timestamp: Date.now(),
        response,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`flex flex-col h-full bg-background ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="font-semibold">NEXUS PRIME</span>
        </div>
        <button
          onClick={() => setShowProvenance(!showProvenance)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {showProvenance ? 'Hide' : 'Show'} Provenance
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-lg font-medium mb-2">Welcome to NEXUS PRIME</p>
            <p className="text-sm">Ask me anything or give me a task to help you with.</p>
          </div>
        )}

        {messages.map(message => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg p-3 ${
              message.role === 'user' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted'
            }`}>
              {/* Message content */}
              <div className="whitespace-pre-wrap">{message.content}</div>

              {/* Insights */}
              {message.response?.insights && message.response.insights.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-medium opacity-70">Insights:</div>
                  {message.response.insights.map(insight => (
                    <div key={insight.id} className="text-xs p-2 rounded bg-background/50">
                      <span className={`font-medium ${
                        insight.level === 'critical' ? 'text-destructive' :
                        insight.level === 'warning' ? 'text-yellow-600' :
                        insight.level === 'success' ? 'text-green-600' : ''
                      }`}>
                        {insight.title}
                      </span>
                      <p className="opacity-70">{insight.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Drafts */}
              {message.response?.actionDrafts && message.response.actionDrafts.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-medium opacity-70">Actions:</div>
                  {message.response.actionDrafts.map(action => (
                    <ActionCard
                      key={action.id}
                      action={action}
                      onConfirm={() => onConfirmAction(action)}
                      onReject={() => onRejectAction(action)}
                    />
                  ))}
                </div>
              )}

              {/* Provenance */}
              {showProvenance && message.response?.provenance && (
                <ProvenanceView provenance={message.response.provenance} />
              )}

              {/* Metadata */}
              <div className="mt-2 text-xs opacity-50 flex items-center gap-2">
                <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                {message.response && (
                  <>
                    <span>•</span>
                    <span>{message.response.processingTime}ms</span>
                    <span>•</span>
                    <span>{Math.round(message.response.confidence * 100)}% confident</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask NEXUS PRIME..."
            className="flex-1 min-h-[44px] max-h-32 p-2 rounded-lg border bg-background resize-none"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ACTION CARD COMPONENT
// ============================================================================

function ActionCard({
  action,
  onConfirm,
  onReject,
}: {
  action: ActionDraft;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    await onConfirm();
    setIsConfirming(false);
  };

  return (
    <div className="p-2 rounded border bg-background/50 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{action.title}</div>
          <div className="opacity-70">{action.description}</div>
          <div className="mt-1 flex items-center gap-2">
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
              action.safetyLevel === 'high' ? 'bg-destructive/20 text-destructive' :
              action.safetyLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-700' :
              'bg-green-500/20 text-green-700'
            }`}>
              {action.safetyLevel}
            </span>
            {action.requiresConfirmation && (
              <span className="text-[10px] opacity-50">Requires confirmation</span>
            )}
          </div>
        </div>
        {action.requiresConfirmation && (
          <div className="flex gap-1">
            <button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="px-2 py-1 bg-green-600 text-white rounded text-[10px] disabled:opacity-50"
            >
              {isConfirming ? '...' : 'Confirm'}
            </button>
            <button
              onClick={onReject}
              className="px-2 py-1 bg-destructive text-destructive-foreground rounded text-[10px]"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// PROVENANCE VIEW COMPONENT
// ============================================================================

function ProvenanceView({ provenance }: { provenance: ProvenanceRecord[] }) {
  if (!provenance || provenance.length === 0) return null;

  return (
    <div className="mt-3 p-2 rounded bg-background/30 text-[10px]">
      <div className="font-medium mb-1">Provenance Chain:</div>
      {provenance.map((p, i) => (
        <div key={i} className="flex items-center gap-1 opacity-70">
          <span>{p.agentId}</span>
          <span>→</span>
          <span>{p.operation}</span>
          <span className={p.status === 'success' ? 'text-green-600' : 'text-destructive'}>
            ({p.status})
          </span>
        </div>
      ))}
    </div>
  );
}

export default NexusPrimeChat;

