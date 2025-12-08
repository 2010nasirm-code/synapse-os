'use client';

/**
 * ============================================================================
 * NEXUS PRIME - MAIN PAGE
 * ============================================================================
 * 
 * The central hub for interacting with Nexus Prime AI.
 * 
 * @page /prime
 * @version 1.0.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Zap,
  Send,
  Sparkles,
  Brain,
  Lightbulb,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  Loader2,
  Bot,
  User,
  RefreshCw,
  Settings,
  History,
  Cpu,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  insights?: Insight[];
  actions?: ActionDraft[];
  agentsUsed?: string[];
}

interface Insight {
  id: string;
  type: string;
  title: string;
  description: string;
  level: 'info' | 'success' | 'warning' | 'critical';
}

interface ActionDraft {
  id: string;
  type: string;
  title: string;
  description: string;
  requiresConfirmation: boolean;
  status: 'pending' | 'confirmed' | 'rejected';
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function PrimePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'insights' | 'actions'>('chat');
  const [insights, setInsights] = useState<Insight[]>([]);
  const [pendingActions, setPendingActions] = useState<ActionDraft[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Add welcome message
  useEffect(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: "Welcome to Nexus Prime! 🧠✨\n\nI'm your advanced AI assistant. I can help you with:\n\n• **Insights** - Analyze your data and find patterns\n• **Automations** - Build smart workflows\n• **Suggestions** - Get personalized recommendations\n• **Tasks** - Create and manage trackers\n\nWhat would you like to do?",
      timestamp: Date.now(),
    }]);
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message to Prime API
  const sendMessage = async () => {
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

    try {
      const response = await fetch('/api/prime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMessage.content,
          conversationHistory: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.answer || data.message || "I processed your request.",
        timestamp: Date.now(),
        insights: data.insights,
        actions: data.actionDrafts,
        agentsUsed: data.agentsUsed,
      };

      setMessages(prev => [...prev, aiMessage]);

      // Update insights and actions
      if (data.insights?.length) {
        setInsights(prev => [...data.insights, ...prev].slice(0, 20));
      }
      if (data.actionDrafts?.length) {
        setPendingActions(prev => [...data.actionDrafts, ...prev]);
      }

    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle action confirmation
  const handleAction = async (actionId: string, confirm: boolean) => {
    setPendingActions(prev =>
      prev.map(a =>
        a.id === actionId
          ? { ...a, status: confirm ? 'confirmed' : 'rejected' }
          : a
      )
    );

    if (confirm) {
      try {
        await fetch('/api/prime/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actionId, confirmed: true }),
        });
      } catch (error) {
        console.error('Failed to confirm action:', error);
      }
    }
  };

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-purple-500/25">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-500 to-purple-500 bg-clip-text text-transparent">
                Nexus Prime
              </h1>
              <p className="text-muted-foreground">Advanced AI Intelligence Hub</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <History className="h-4 w-4" />
              History
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Panel */}
        <div className="lg:col-span-2">
          <Card className="h-[calc(100vh-200px)] flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-border">
              {[
                { id: 'chat', label: 'Chat', icon: Bot },
                { id: 'insights', label: 'Insights', icon: Lightbulb, count: insights.length },
                { id: 'actions', label: 'Actions', icon: Zap, count: pendingActions.filter(a => a.status === 'pending').length },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    'flex-1 px-4 py-3 flex items-center justify-center gap-2 transition-colors',
                    activeTab === tab.id
                      ? 'bg-muted text-foreground border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <AnimatePresence>
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          'flex',
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[85%] rounded-2xl px-4 py-3',
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground rounded-br-sm'
                              : 'bg-muted rounded-bl-sm'
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {message.role === 'user' ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Brain className="h-4 w-4 text-purple-500" />
                            )}
                            <span className="text-xs opacity-70">
                              {message.role === 'user' ? 'You' : 'Prime'}
                            </span>
                          </div>
                          <div className="text-sm whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">
                            {message.content.split('\n').map((line, i) => (
                              <p key={i} className="mb-1 last:mb-0">
                                {line.startsWith('•') ? (
                                  <span className="flex items-start gap-2">
                                    <span className="text-primary">•</span>
                                    <span>{line.slice(1).trim()}</span>
                                  </span>
                                ) : line.startsWith('**') && line.endsWith('**') ? (
                                  <strong>{line.slice(2, -2)}</strong>
                                ) : (
                                  line
                                )}
                              </p>
                            ))}
                          </div>

                          {/* Agents Used */}
                          {message.agentsUsed && message.agentsUsed.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border/50">
                              <div className="flex flex-wrap gap-1">
                                {message.agentsUsed.map(agent => (
                                  <span
                                    key={agent}
                                    className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 text-xs"
                                  >
                                    {agent}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Loading */}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
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
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder="Ask Prime anything..."
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

                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {[
                      'Analyze my data',
                      'Generate insights',
                      'Create automation',
                      'Show suggestions',
                    ].map(action => (
                      <button
                        key={action}
                        onClick={() => {
                          setInput(action);
                          setTimeout(sendMessage, 100);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-muted/50 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Insights Tab */}
            {activeTab === 'insights' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {insights.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No insights yet</p>
                    <p className="text-sm mt-1">Chat with Prime to generate insights</p>
                  </div>
                ) : (
                  insights.map((insight, i) => (
                    <motion.div
                      key={insight.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={cn(
                        'p-4 rounded-xl border',
                        insight.level === 'success' && 'bg-green-500/5 border-green-500/20',
                        insight.level === 'warning' && 'bg-yellow-500/5 border-yellow-500/20',
                        insight.level === 'critical' && 'bg-red-500/5 border-red-500/20',
                        insight.level === 'info' && 'bg-blue-500/5 border-blue-500/20'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'p-2 rounded-lg',
                          insight.level === 'success' && 'bg-green-500/10 text-green-500',
                          insight.level === 'warning' && 'bg-yellow-500/10 text-yellow-500',
                          insight.level === 'critical' && 'bg-red-500/10 text-red-500',
                          insight.level === 'info' && 'bg-blue-500/10 text-blue-500'
                        )}>
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{insight.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {insight.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* Actions Tab */}
            {activeTab === 'actions' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {pendingActions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No pending actions</p>
                    <p className="text-sm mt-1">Actions will appear when Prime suggests them</p>
                  </div>
                ) : (
                  pendingActions.map((action, i) => (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={cn(
                        'p-4 rounded-xl border',
                        action.status === 'pending' && 'bg-muted/30',
                        action.status === 'confirmed' && 'bg-green-500/5 border-green-500/20',
                        action.status === 'rejected' && 'bg-red-500/5 border-red-500/20 opacity-50'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                            <Zap className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="font-medium">{action.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {action.description}
                            </p>
                            <span className="text-xs text-muted-foreground mt-2 inline-block">
                              Type: {action.type}
                            </span>
                          </div>
                        </div>

                        {action.status === 'pending' && action.requiresConfirmation && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction(action.id, false)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleAction(action.id, true)}
                              className="bg-green-500 hover:bg-green-600"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        {action.status === 'confirmed' && (
                          <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs">
                            Confirmed
                          </span>
                        )}

                        {action.status === 'rejected' && (
                          <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-500 text-xs">
                            Rejected
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-purple-500" />
              System Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Prime Engine</span>
                <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-xs">
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Agents Online</span>
                <span className="text-sm">8/8</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Memory Usage</span>
                <span className="text-sm">24 MB</span>
              </div>
            </div>
          </Card>

          {/* Active Agents */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Bot className="h-4 w-4 text-purple-500" />
              Active Agents
            </h3>
            <div className="space-y-2">
              {[
                { name: 'Orchestrator', status: 'ready', color: 'purple' },
                { name: 'Insight Agent', status: 'ready', color: 'blue' },
                { name: 'Builder Agent', status: 'ready', color: 'green' },
                { name: 'Memory Agent', status: 'ready', color: 'yellow' },
              ].map(agent => (
                <div
                  key={agent.name}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      agent.status === 'ready' && 'bg-green-500'
                    )} />
                    <span className="text-sm">{agent.name}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Stats */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              Session Stats
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <div className="text-2xl font-bold text-purple-500">{messages.length - 1}</div>
                <div className="text-xs text-muted-foreground">Messages</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <div className="text-2xl font-bold text-blue-500">{insights.length}</div>
                <div className="text-xs text-muted-foreground">Insights</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <div className="text-2xl font-bold text-green-500">
                  {pendingActions.filter(a => a.status === 'confirmed').length}
                </div>
                <div className="text-xs text-muted-foreground">Actions</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <div className="text-2xl font-bold text-yellow-500">8</div>
                <div className="text-xs text-muted-foreground">Agents</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

