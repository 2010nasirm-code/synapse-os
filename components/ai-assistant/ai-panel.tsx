"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Sparkles, TrendingUp, AlertTriangle, Lightbulb,
  ChevronRight, X, RefreshCw, Zap, MessageSquare, Send,
  Loader2, Clock, Target, Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AIInsight {
  id: string;
  type: 'prediction' | 'summary' | 'insight' | 'warning' | 'suggestion';
  title: string;
  content: string;
  confidence: number;
  timestamp: Date;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface AIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

export function AIPanel({ isOpen, onClose, userId }: AIPanelProps) {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadInsights();
    }
  }, [isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const loadInsights = async () => {
    setIsLoading(true);
    
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockInsights: AIInsight[] = [
      {
        id: '1',
        type: 'prediction',
        title: 'Productivity Peak',
        content: 'Based on your patterns, you\'re most productive between 9-11 AM. Consider scheduling important tasks during this window.',
        confidence: 87,
        timestamp: new Date(),
      },
      {
        id: '2',
        type: 'insight',
        title: 'Task Completion Trend',
        content: 'Your task completion rate increased by 23% this week. Keep up the momentum!',
        confidence: 94,
        timestamp: new Date(),
      },
      {
        id: '3',
        type: 'warning',
        title: 'Overdue Items',
        content: 'You have 3 items that are past their deadline. Consider reviewing and reprioritizing.',
        confidence: 100,
        timestamp: new Date(),
        action: {
          label: 'View Items',
          onClick: () => window.location.href = '/tracker?filter=overdue',
        },
      },
      {
        id: '4',
        type: 'suggestion',
        title: 'Automation Opportunity',
        content: 'You frequently create similar items on Mondays. Would you like to set up an automation?',
        confidence: 78,
        timestamp: new Date(),
        action: {
          label: 'Create Automation',
          onClick: () => window.location.href = '/automations',
        },
      },
    ];
    
    setInsights(mockInsights);
    setIsLoading(false);
  };

  const handleSendQuery = async () => {
    if (!query.trim()) return;
    
    const userMessage = query;
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setQuery('');
    setIsTyping(true);
    
    // Simulate AI response
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const aiResponses: Record<string, string> = {
      'default': 'I\'ve analyzed your data and here\'s what I found: Your most active category is "Work" with 45% of your items. You typically complete tasks in the morning. Would you like me to suggest some optimizations?',
      'help': 'I can help you with:\n• Analyzing your productivity patterns\n• Suggesting task prioritization\n• Creating automations\n• Predicting completion times\n• Finding insights in your data',
      'productivity': 'Your productivity score this week is 78/100. You completed 12 tasks and created 8 new ones. Your best day was Tuesday with 5 completions.',
      'suggest': 'Based on your patterns, I suggest:\n1. Start with high-priority items in the morning\n2. Group similar tasks together\n3. Set up recurring automations for weekly tasks',
    };
    
    const lowerQuery = userMessage.toLowerCase();
    let response = aiResponses.default;
    
    if (lowerQuery.includes('help')) response = aiResponses.help;
    else if (lowerQuery.includes('productivity') || lowerQuery.includes('score')) response = aiResponses.productivity;
    else if (lowerQuery.includes('suggest') || lowerQuery.includes('recommend')) response = aiResponses.suggest;
    
    setChatHistory(prev => [...prev, { role: 'ai', content: response }]);
    setIsTyping(false);
  };

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'prediction': return <TrendingUp className="text-blue-400" size={18} />;
      case 'summary': return <Activity className="text-green-400" size={18} />;
      case 'insight': return <Lightbulb className="text-yellow-400" size={18} />;
      case 'warning': return <AlertTriangle className="text-red-400" size={18} />;
      case 'suggestion': return <Sparkles className="text-purple-400" size={18} />;
    }
  };

  const getInsightColor = (type: AIInsight['type']) => {
    switch (type) {
      case 'prediction': return 'border-blue-500/30 bg-blue-500/5';
      case 'summary': return 'border-green-500/30 bg-green-500/5';
      case 'insight': return 'border-yellow-500/30 bg-yellow-500/5';
      case 'warning': return 'border-red-500/30 bg-red-500/5';
      case 'suggestion': return 'border-purple-500/30 bg-purple-500/5';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-zinc-900/95 border-l border-zinc-700/50 z-50 flex flex-col backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-700/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                  <Brain size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">Nexus AI</h2>
                  <p className="text-xs text-zinc-400">Analyzing your data...</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X size={18} />
              </Button>
            </div>
            
            {/* Insights Section */}
            <div className="flex-1 overflow-y-auto">
              {/* Quick Stats */}
              <div className="p-4 border-b border-zinc-700/50">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-zinc-800/50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-indigo-400">78</div>
                    <div className="text-xs text-zinc-400">Productivity</div>
                  </div>
                  <div className="p-3 bg-zinc-800/50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-400">12</div>
                    <div className="text-xs text-zinc-400">Completed</div>
                  </div>
                  <div className="p-3 bg-zinc-800/50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-400">3</div>
                    <div className="text-xs text-zinc-400">Insights</div>
                  </div>
                </div>
              </div>
              
              {/* Insights List */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-zinc-300">AI Insights</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={loadInsights}
                    disabled={isLoading}
                  >
                    <RefreshCw size={14} className={cn(isLoading && "animate-spin")} />
                  </Button>
                </div>
                
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-indigo-400" size={24} />
                  </div>
                ) : (
                  insights.map((insight, i) => (
                    <motion.div
                      key={insight.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={cn(
                        "p-3 rounded-lg border",
                        getInsightColor(insight.type)
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{getInsightIcon(insight.type)}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-white text-sm">{insight.title}</h4>
                            <span className="text-xs text-zinc-500">{insight.confidence}%</span>
                          </div>
                          <p className="text-sm text-zinc-400 mt-1">{insight.content}</p>
                          {insight.action && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 text-xs"
                              onClick={insight.action.onClick}
                            >
                              {insight.action.label}
                              <ChevronRight size={14} />
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
              
              {/* Chat Section */}
              <div className="p-4 border-t border-zinc-700/50">
                <h3 className="text-sm font-medium text-zinc-300 mb-3">Ask Nexus</h3>
                <div className="space-y-3 max-h-48 overflow-y-auto mb-3">
                  {chatHistory.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        "p-2 rounded-lg text-sm",
                        msg.role === 'user' 
                          ? "bg-indigo-500/20 text-indigo-100 ml-8" 
                          : "bg-zinc-800 text-zinc-300 mr-8"
                      )}
                    >
                      {msg.content}
                    </div>
                  ))}
                  {isTyping && (
                    <div className="bg-zinc-800 text-zinc-400 p-2 rounded-lg text-sm mr-8 flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      Thinking...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>
            </div>
            
            {/* Chat Input */}
            <div className="p-4 border-t border-zinc-700/50">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}
                  placeholder="Ask anything about your data..."
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500"
                />
                <Button onClick={handleSendQuery} disabled={!query.trim() || isTyping}>
                  <Send size={16} />
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


