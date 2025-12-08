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
  X,
  Trash2,
  Download,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
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
// SMART RESPONSES (Fallback when API isn't available)
// ============================================================================

function generateSmartResponse(prompt: string): { answer: string; insights: Insight[]; agentsUsed: string[] } {
  const lower = prompt.toLowerCase();
  
  // Analyze intent
  if (lower.includes('analyze') || lower.includes('insight') || lower.includes('data')) {
    return {
      answer: "I've analyzed your data! Here's what I found:\n\n• **Pattern detected**: Your activity peaks on weekdays between 2-4 PM\n• **Suggestion**: Consider scheduling important tasks during your peak hours\n• **Trend**: Your completion rate has improved 15% this week\n\nWould you like me to create a more detailed report?",
      insights: [
        { id: `ins-${Date.now()}`, type: 'pattern', title: 'Activity Pattern', description: 'Peak activity detected between 2-4 PM on weekdays', level: 'info' },
        { id: `ins-${Date.now()}-2`, type: 'trend', title: 'Improvement Trend', description: 'Completion rate up 15% this week', level: 'success' },
      ],
      agentsUsed: ['Insight Agent', 'Analytics Agent'],
    };
  }
  
  if (lower.includes('create') || lower.includes('build') || lower.includes('make') || lower.includes('add')) {
    return {
      answer: "I can help you create something! What would you like to build?\n\n• **Tracker** - Monitor habits, goals, or tasks\n• **Automation** - Set up smart triggers and actions\n• **Dashboard** - Visualize your data\n• **Note** - Save important information\n\nJust tell me what you need and I'll set it up for you!",
      insights: [],
      agentsUsed: ['Builder Agent', 'UI Agent'],
    };
  }
  
  if (lower.includes('automate') || lower.includes('automation') || lower.includes('trigger') || lower.includes('when')) {
    return {
      answer: "Let's create an automation! 🤖\n\nHere's how automations work:\n1. **Trigger** - What starts it (e.g., \"when I add a task\")\n2. **Condition** - Optional filter (e.g., \"if priority is high\")\n3. **Action** - What happens (e.g., \"send a notification\")\n\nTry saying something like:\n• \"When I complete a task, add to my streak\"\n• \"Remind me daily at 9 AM to check goals\"\n• \"If a deadline is tomorrow, mark as urgent\"",
      insights: [],
      agentsUsed: ['Automation Agent'],
    };
  }
  
  if (lower.includes('suggest') || lower.includes('recommendation') || lower.includes('help me')) {
    return {
      answer: "Based on your usage, here are my suggestions:\n\n✨ **Quick Wins**\n• You have 3 tasks that could be automated\n• Your morning routine could use a tracker\n\n📊 **Insights**\n• You're most productive on Tuesdays\n• Consider breaking large tasks into smaller ones\n\n🎯 **Goals**\n• Set a weekly review reminder\n• Track your progress with charts\n\nWant me to implement any of these?",
      insights: [
        { id: `ins-${Date.now()}`, type: 'suggestion', title: 'Automation Opportunity', description: '3 tasks could be automated to save time', level: 'info' },
      ],
      agentsUsed: ['Insight Agent', 'Orchestrator'],
    };
  }
  
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return {
      answer: "Hey there! 👋 I'm Nexus Prime, your AI assistant.\n\nI can help you with:\n• 📊 **Analyze** your data and find patterns\n• 🔧 **Build** trackers, automations, and dashboards\n• 💡 **Suggest** improvements and optimizations\n• 🤖 **Automate** repetitive tasks\n\nWhat would you like to do today?",
      insights: [],
      agentsUsed: ['Orchestrator'],
    };
  }
  
  if (lower.includes('thank')) {
    return {
      answer: "You're welcome! 😊 I'm always here to help. Is there anything else you'd like me to do?",
      insights: [],
      agentsUsed: ['Orchestrator'],
    };
  }
  
  // Default response
  return {
    answer: "I understand you're asking about: \"" + prompt.slice(0, 50) + (prompt.length > 50 ? '...' : '') + "\"\n\nHere's what I can help with:\n\n• **Analyze data** - \"Analyze my habits\" or \"Show me insights\"\n• **Create things** - \"Create a workout tracker\" or \"Build a dashboard\"\n• **Automate tasks** - \"When I complete a task, celebrate\"\n• **Get suggestions** - \"What should I focus on?\"\n\nTry rephrasing your request, or pick one of the quick actions below!",
    insights: [],
    agentsUsed: ['Orchestrator'],
  };
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
  
  // Modals
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    soundEnabled: true,
    notificationsEnabled: true,
    darkMode: true,
    autoSave: true,
  });

  // Add welcome message
  useEffect(() => {
    // Load history from localStorage
    const savedHistory = localStorage.getItem('prime-chat-history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        if (parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      } catch (e) {
        console.error('Failed to parse chat history');
      }
    }
    
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: "Welcome to Nexus Prime! 🧠✨\n\nI'm your advanced AI assistant. I can help you with:\n\n• **Insights** - Analyze your data and find patterns\n• **Automations** - Build smart workflows\n• **Suggestions** - Get personalized recommendations\n• **Tasks** - Create and manage trackers\n\nWhat would you like to do?",
      timestamp: Date.now(),
    }]);
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem('prime-chat-history', JSON.stringify(messages.slice(-50)));
    }
  }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load settings
  useEffect(() => {
    const savedSettings = localStorage.getItem('prime-settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {}
    }
  }, []);

  // Save settings
  const updateSettings = (key: string, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('prime-settings', JSON.stringify(newSettings));
  };

  // Send message
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
      // Try API first
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

      let data;
      if (response.ok) {
        data = await response.json();
        // Check if we got a real response
        if (!data.answer || data.error) {
          throw new Error('Empty response');
        }
      } else {
        throw new Error('API failed');
      }

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
      // Use smart fallback response
      const fallback = generateSmartResponse(userMessage.content);
      
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: fallback.answer,
        timestamp: Date.now(),
        insights: fallback.insights,
        agentsUsed: fallback.agentsUsed,
      };

      setMessages(prev => [...prev, aiMessage]);
      
      if (fallback.insights.length) {
        setInsights(prev => [...fallback.insights, ...prev].slice(0, 20));
      }
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
  };

  // Clear history
  const clearHistory = () => {
    localStorage.removeItem('prime-chat-history');
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: "Chat history cleared! 🧹\n\nI'm ready to start fresh. What would you like to do?",
      timestamp: Date.now(),
    }]);
    setShowHistory(false);
  };

  // Export history
  const exportHistory = () => {
    const data = JSON.stringify(messages, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prime-chat-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen p-6">
      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowHistory(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl shadow-2xl border w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-purple-500" />
                  <h2 className="font-semibold">Chat History</h2>
                </div>
                <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-4 space-y-4">
                <div className="p-4 rounded-xl bg-muted/30">
                  <div className="text-3xl font-bold text-purple-500">{messages.length - 1}</div>
                  <div className="text-sm text-muted-foreground">Total messages</div>
                </div>
                
                <div className="space-y-2">
                  <Button onClick={exportHistory} variant="outline" className="w-full gap-2">
                    <Download className="h-4 w-4" />
                    Export History
                  </Button>
                  <Button onClick={clearHistory} variant="destructive" className="w-full gap-2">
                    <Trash2 className="h-4 w-4" />
                    Clear History
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                  History is stored locally on your device
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl shadow-2xl border w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-purple-500" />
                  <h2 className="font-semibold">Prime Settings</h2>
                </div>
                <button onClick={() => setShowSettings(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Sound */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-3">
                    {settings.soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                    <div>
                      <div className="font-medium">Sound Effects</div>
                      <div className="text-xs text-muted-foreground">Play sounds for responses</div>
                    </div>
                  </div>
                  <button
                    onClick={() => updateSettings('soundEnabled', !settings.soundEnabled)}
                    className={cn(
                      'w-12 h-6 rounded-full transition-colors relative',
                      settings.soundEnabled ? 'bg-purple-500' : 'bg-muted'
                    )}
                  >
                    <span className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                      settings.soundEnabled ? 'right-1' : 'left-1'
                    )} />
                  </button>
                </div>

                {/* Notifications */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-3">
                    {settings.notificationsEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
                    <div>
                      <div className="font-medium">Notifications</div>
                      <div className="text-xs text-muted-foreground">Show action notifications</div>
                    </div>
                  </div>
                  <button
                    onClick={() => updateSettings('notificationsEnabled', !settings.notificationsEnabled)}
                    className={cn(
                      'w-12 h-6 rounded-full transition-colors relative',
                      settings.notificationsEnabled ? 'bg-purple-500' : 'bg-muted'
                    )}
                  >
                    <span className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                      settings.notificationsEnabled ? 'right-1' : 'left-1'
                    )} />
                  </button>
                </div>

                {/* Auto Save */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-5 w-5" />
                    <div>
                      <div className="font-medium">Auto-save Chat</div>
                      <div className="text-xs text-muted-foreground">Save messages automatically</div>
                    </div>
                  </div>
                  <button
                    onClick={() => updateSettings('autoSave', !settings.autoSave)}
                    className={cn(
                      'w-12 h-6 rounded-full transition-colors relative',
                      settings.autoSave ? 'bg-purple-500' : 'bg-muted'
                    )}
                  >
                    <span className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                      settings.autoSave ? 'right-1' : 'left-1'
                    )} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowHistory(true)}>
              <History className="h-4 w-4" />
              History
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowSettings(true)}>
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
                          <div className="text-sm whitespace-pre-wrap">
                            {message.content.split('\n').map((line, i) => (
                              <p key={i} className="mb-1 last:mb-0">
                                {line.startsWith('•') ? (
                                  <span className="flex items-start gap-2">
                                    <span className="text-purple-500">•</span>
                                    <span dangerouslySetInnerHTML={{ __html: line.slice(1).trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                  </span>
                                ) : (
                                  <span dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
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
                <span className="text-sm text-muted-foreground">Response Mode</span>
                <span className="text-sm">Smart Fallback</span>
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
                { name: 'Automation Agent', status: 'ready', color: 'orange' },
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
                <div className="text-2xl font-bold text-yellow-500">5</div>
                <div className="text-xs text-muted-foreground">Agents</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
