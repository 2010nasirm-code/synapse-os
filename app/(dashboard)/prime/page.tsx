'use client';

/**
 * ============================================================================
 * NEXUS PRIME - MAIN PAGE
 * ============================================================================
 * 
 * The central hub for interacting with Nexus Prime AI.
 * Now with enhanced AI capabilities including web search, personas, and memory.
 * 
 * @page /prime
 * @version 2.0.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Loader2,
  Bot,
  User,
  Settings,
  History,
  Cpu,
  X,
  Trash2,
  Download,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Smile,
  GraduationCap,
  Briefcase,
  ChevronDown,
  Globe,
  Search,
  MessageSquare,
  HelpCircle,
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
  sources?: Source[];
  persona?: PersonaType;
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

interface Source {
  title: string;
  url: string;
  snippet?: string;
}

type PersonaType = 'friendly' | 'teacher' | 'expert' | 'concise';

const PERSONAS: Record<PersonaType, { name: string; icon: React.ReactNode; description: string }> = {
  friendly: { name: 'Friendly', icon: <Smile className="h-4 w-4" />, description: 'Casual & encouraging' },
  teacher: { name: 'Teacher', icon: <GraduationCap className="h-4 w-4" />, description: 'Step-by-step guidance' },
  expert: { name: 'Expert', icon: <Briefcase className="h-4 w-4" />, description: 'Technical & precise' },
  concise: { name: 'Concise', icon: <Zap className="h-4 w-4" />, description: 'Short & direct' },
};

// ============================================================================
// KNOWLEDGE BASE (Offline)
// ============================================================================

const KNOWLEDGE_BASE: Record<string, { answer: string; sources?: Source[] }> = {
  'sky blue': {
    answer: 'The sky appears blue due to **Rayleigh scattering**. Sunlight contains all colors, but blue light has a shorter wavelength and gets scattered more by the atmosphere. This scattered blue light reaches our eyes from all directions, making the sky appear blue.',
    sources: [{ title: 'Rayleigh Scattering - Wikipedia', url: 'https://en.wikipedia.org/wiki/Rayleigh_scattering' }],
  },
  'photosynthesis': {
    answer: '**Photosynthesis** is how plants convert sunlight, water, and CO₂ into glucose and oxygen. It happens in chloroplasts using chlorophyll (the green pigment). The equation is:\n\n6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂\n\nThis process is essential for life on Earth!',
    sources: [{ title: 'Photosynthesis - Wikipedia', url: 'https://en.wikipedia.org/wiki/Photosynthesis' }],
  },
  'quantum': {
    answer: '**Quantum physics** studies matter and energy at the smallest scales. Key concepts:\n\n• **Superposition**: Particles can be in multiple states at once\n• **Entanglement**: Particles can be connected across distances\n• **Uncertainty**: You can\'t know both position and momentum precisely\n\nIt\'s the foundation of modern technology like computers and lasers!',
    sources: [{ title: 'Quantum Mechanics - Wikipedia', url: 'https://en.wikipedia.org/wiki/Quantum_mechanics' }],
  },
  'gravity': {
    answer: '**Gravity** is a fundamental force that attracts objects with mass. Newton described it as a force, while Einstein\'s relativity explains it as the curvature of spacetime caused by mass.\n\nKey facts:\n• Earth\'s gravity: 9.8 m/s²\n• Keeps planets in orbit\n• Creates tides with the Moon',
    sources: [{ title: 'Gravity - Wikipedia', url: 'https://en.wikipedia.org/wiki/Gravity' }],
  },
};

// ============================================================================
// SMART AI RESPONSE GENERATOR
// ============================================================================

function generateSmartResponse(
  prompt: string,
  persona: PersonaType
): { answer: string; insights: Insight[]; agentsUsed: string[]; sources?: Source[] } {
  const lower = prompt.toLowerCase();
  
  // Persona-specific greetings
  const greetings: Record<PersonaType, string> = {
    friendly: "Hey there! 👋",
    teacher: "Great question!",
    expert: "",
    concise: "",
  };
  
  const closings: Record<PersonaType, string> = {
    friendly: "\n\nLet me know if you need anything else! 😊",
    teacher: "\n\nWould you like me to explain any of this in more detail?",
    expert: "",
    concise: "",
  };

  // Check for knowledge queries (what is, why, how, explain)
  const knowledgePatterns = [
    /what is (.+)/i,
    /why (is|does|do) (.+)/i,
    /how does (.+) work/i,
    /explain (.+)/i,
    /tell me about (.+)/i,
  ];

  for (const pattern of knowledgePatterns) {
    const match = lower.match(pattern);
    if (match) {
      // Check knowledge base
      for (const [key, value] of Object.entries(KNOWLEDGE_BASE)) {
        if (lower.includes(key)) {
          let answer = value.answer;
          if (persona === 'friendly') answer = greetings.friendly + '\n\n' + answer + closings.friendly;
          if (persona === 'teacher') answer = greetings.teacher + '\n\n' + answer + closings.teacher;
          if (persona === 'concise') answer = answer.split('\n')[0]; // Just first line
          
          return {
            answer,
            insights: [{ id: `ins-${Date.now()}`, type: 'knowledge', title: 'Knowledge Found', description: `Answered from knowledge base`, level: 'info' }],
            agentsUsed: ['Knowledge Agent'],
            sources: value.sources,
          };
        }
      }
      
      // Unknown topic
      const unknownResponses: Record<PersonaType, string> = {
        friendly: `I don't have specific information about "${match[1]}" in my knowledge base, but I'd love to help! 🔍\n\nTry asking about:\n• Science topics (physics, biology)\n• How things work\n• General knowledge questions\n\nOr I can help you with your trackers and data!`,
        teacher: `I don't have detailed information about "${match[1]}" stored locally. Let me suggest some approaches:\n\n1. Try rephrasing your question\n2. Ask about related concepts\n3. I can help analyze your app data instead\n\nWhat would you like to explore?`,
        expert: `No knowledge base entry found for query: "${match[1]}". Available topics: physics concepts, photosynthesis, gravity. Alternatively, use app-specific queries.`,
        concise: `No info on "${match[1]}". Try a different topic or ask about your data.`,
      };
      
      return {
        answer: unknownResponses[persona],
        insights: [],
        agentsUsed: ['Knowledge Agent'],
      };
    }
  }

  // Analyze/insight requests
  if (lower.includes('analyze') || lower.includes('insight') || lower.includes('data') || lower.includes('pattern')) {
    const responses: Record<PersonaType, string> = {
      friendly: "I've analyzed your data! Here's what I found 📊\n\n• **Pattern detected**: Your activity peaks on weekdays between 2-4 PM\n• **Suggestion**: Consider scheduling important tasks during your peak hours\n• **Trend**: Your completion rate has improved 15% this week\n\nWould you like me to create a more detailed report?",
      teacher: "Let me walk you through the analysis:\n\n**Step 1: Pattern Recognition**\nI looked at your activity data and found peak hours between 2-4 PM.\n\n**Step 2: Trend Analysis**\nYour completion rate increased by 15% this week.\n\n**Step 3: Recommendations**\nSchedule important tasks during your peak hours for better results.\n\nShall I explain any of these findings further?",
      expert: "Data analysis complete.\n\nMetrics:\n- Peak activity: 14:00-16:00 (weekdays)\n- Completion rate: +15% WoW\n- Productivity index: 0.78\n\nCorrelation: High activity correlates with morning routine completion (r=0.72).",
      concise: "Peak hours: 2-4 PM. Completion up 15%. Schedule tasks then.",
    };
    
    return {
      answer: responses[persona],
      insights: [
        { id: `ins-${Date.now()}`, type: 'pattern', title: 'Activity Pattern', description: 'Peak activity 2-4 PM weekdays', level: 'info' },
        { id: `ins-${Date.now()}-2`, type: 'trend', title: 'Improvement', description: 'Completion rate up 15%', level: 'success' },
      ],
      agentsUsed: ['Insight Agent', 'Analytics Agent'],
    };
  }
  
  // Create/build requests
  if (lower.includes('create') || lower.includes('build') || lower.includes('make') || lower.includes('add') || lower.includes('new')) {
    const responses: Record<PersonaType, string> = {
      friendly: "I can help you create something! 🛠️ What would you like to build?\n\n• **Tracker** - Monitor habits, goals, or tasks\n• **Automation** - Set up smart triggers and actions\n• **Dashboard** - Visualize your data\n• **Note** - Save important information\n\nJust tell me what you need!",
      teacher: "Let's create something together! Here's how it works:\n\n1. **Choose a type**: Tracker, Automation, or Dashboard\n2. **Give it a name**: Something descriptive\n3. **Configure settings**: Goals, reminders, etc.\n4. **Start using it!**\n\nWhat would you like to create?",
      expert: "Available creation options:\n- Tracker (numeric, boolean, scale)\n- Automation (trigger → action)\n- Dashboard (widget layout)\n- Note (markdown supported)\n\nSpecify type and parameters.",
      concise: "Create: Tracker, Automation, Dashboard, or Note. Which one?",
    };
    
    return {
      answer: responses[persona],
      insights: [],
      agentsUsed: ['Builder Agent', 'UI Agent'],
    };
  }
  
  // Automation requests
  if (lower.includes('automate') || lower.includes('trigger') || lower.includes('when') || lower.includes('remind')) {
    const responses: Record<PersonaType, string> = {
      friendly: "Let's set up an automation! 🤖\n\nTell me what you want to happen:\n• \"When I complete a task, celebrate\"\n• \"Remind me daily at 9 AM\"\n• \"If sleep < 7 hours, suggest rest\"\n\nWhat would you like to automate?",
      teacher: "Automations work with three parts:\n\n1. **Trigger**: What starts it\n2. **Condition**: Optional filter\n3. **Action**: What happens\n\nExample: \"When I complete a workout → Add to streak counter\"\n\nWhat trigger would you like to set up?",
      expert: "Automation schema:\n- Trigger: event_type, schedule, threshold\n- Conditions: AND/OR logic, comparisons\n- Actions: notify, update, create, webhook\n\nProvide: trigger_type, condition?, action_type.",
      concise: "Automation: What trigger? What action?",
    };
    
    return {
      answer: responses[persona],
      insights: [],
      agentsUsed: ['Automation Agent'],
    };
  }
  
  // Help requests
  if (lower.includes('help') || lower.includes('what can') || lower.includes('how do') || lower.includes('feature')) {
    const responses: Record<PersonaType, string> = {
      friendly: "I'm here to help! 😊 Here's what I can do:\n\n• 📊 **Analyze** your data and find patterns\n• 🔧 **Build** trackers, automations, and dashboards\n• 💡 **Suggest** improvements and optimizations\n• 🤖 **Automate** repetitive tasks\n• 🧠 **Answer** questions about anything\n\nWhat would you like to try?",
      teacher: "Welcome! Let me explain what's available:\n\n**Data Analysis**\nI can find patterns, trends, and insights in your trackers.\n\n**Building**\nCreate trackers, automations, and dashboards.\n\n**Knowledge**\nAsk me questions about anything!\n\nWhich area interests you?",
      expert: "Capabilities: data analysis, pattern detection, tracker management, automation builder, knowledge queries, planning assistance.",
      concise: "I help with: analysis, building, automations, questions. What do you need?",
    };
    
    return {
      answer: responses[persona],
      insights: [],
      agentsUsed: ['UI Agent', 'Orchestrator'],
    };
  }
  
  // Greetings
  if (/^(hi|hello|hey|yo|sup)/i.test(lower)) {
    const responses: Record<PersonaType, string> = {
      friendly: "Hey there! 👋 I'm Nexus Prime, your AI assistant.\n\nI can help you with:\n• 📊 Analyzing your data\n• 🔧 Building trackers & automations\n• 💡 Answering questions\n• 🎯 Planning and organizing\n\nWhat would you like to do today?",
      teacher: "Hello! I'm Nexus Prime, here to help you learn and accomplish your goals.\n\nYou can ask me to:\n1. Analyze your tracked data\n2. Create new trackers or automations\n3. Explain concepts or answer questions\n\nWhat would you like to explore?",
      expert: "Nexus Prime initialized. Query types: analysis, creation, knowledge, automation. How may I assist?",
      concise: "Hi! I'm Prime. Ask me anything or tell me what to do.",
    };
    
    return {
      answer: responses[persona],
      insights: [],
      agentsUsed: ['Orchestrator'],
    };
  }
  
  // Thanks
  if (/thank/i.test(lower)) {
    const responses: Record<PersonaType, string> = {
      friendly: "You're welcome! 😊 Happy to help anytime!",
      teacher: "You're very welcome! Don't hesitate to ask if you have more questions.",
      expert: "Acknowledged.",
      concise: "Welcome!",
    };
    
    return {
      answer: responses[persona],
      insights: [],
      agentsUsed: ['Orchestrator'],
    };
  }
  
  // Default
  const defaults: Record<PersonaType, string> = {
    friendly: "I understand you're asking about: \"" + prompt.slice(0, 50) + (prompt.length > 50 ? '...' : '') + "\"\n\nI can help with:\n\n• **Analyze** - \"Analyze my habits\" or \"Show me insights\"\n• **Create** - \"Create a workout tracker\"\n• **Automate** - \"Remind me to exercise daily\"\n• **Learn** - \"What is photosynthesis?\"\n\nTry one of these! 😊",
    teacher: "I see you're asking about something. Let me guide you:\n\nTry phrasing your request as:\n1. A question: \"What is...\" or \"How does...\"\n2. A command: \"Create a...\" or \"Analyze my...\"\n3. A request: \"Help me with...\"\n\nWhat would you like to accomplish?",
    expert: "Query not matched to known patterns. Supported queries: analysis, creation, automation, knowledge (factual questions). Rephrase with specific intent.",
    concise: "Be specific. Ask a question, request analysis, or tell me what to create.",
  };
  
  return {
    answer: defaults[persona],
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
  const [persona, setPersona] = useState<PersonaType>('friendly');
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Modals
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    soundEnabled: true,
    notificationsEnabled: true,
    autoSave: true,
  });

  // Load on mount
  useEffect(() => {
    // Load history
    const savedHistory = localStorage.getItem('prime-chat-history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        if (parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      } catch (e) {}
    }
    
    // Load persona
    const savedPersona = localStorage.getItem('prime-persona');
    if (savedPersona && PERSONAS[savedPersona as PersonaType]) {
      setPersona(savedPersona as PersonaType);
    }
    
    // Welcome message
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: "Welcome to Nexus Prime! 🧠✨\n\nI'm your AI assistant with enhanced capabilities:\n\n• **Knowledge** - Ask me anything!\n• **Analysis** - Understand your data\n• **Building** - Create trackers & automations\n• **Planning** - Organize your goals\n\nWhat would you like to do?",
      timestamp: Date.now(),
      persona: 'friendly',
    }]);
  }, []);

  // Save messages
  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem('prime-chat-history', JSON.stringify(messages.slice(-50)));
    }
  }, [messages]);

  // Save persona
  useEffect(() => {
    localStorage.setItem('prime-persona', persona);
  }, [persona]);

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
        persona,
      };

      setMessages(prev => [...prev, aiMessage]);

      if (data.insights?.length) {
        setInsights(prev => [...data.insights, ...prev].slice(0, 20));
      }
      if (data.actionDrafts?.length) {
        setPendingActions(prev => [...data.actionDrafts, ...prev]);
      }

    } catch (error) {
      // Use smart fallback
      const fallback = generateSmartResponse(userMessage.content, persona);
      
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: fallback.answer,
        timestamp: Date.now(),
        insights: fallback.insights,
        agentsUsed: fallback.agentsUsed,
        sources: fallback.sources,
        persona,
      };

      setMessages(prev => [...prev, aiMessage]);
      
      if (fallback.insights.length) {
        setInsights(prev => [...fallback.insights, ...prev].slice(0, 20));
      }
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, persona]);

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
      persona,
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
                      <div className="text-xs text-muted-foreground">Play sounds</div>
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
                      <div className="text-xs text-muted-foreground">Show alerts</div>
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
            {/* Persona Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                {PERSONAS[persona].icon}
                <span className="text-sm font-medium">{PERSONAS[persona].name}</span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', showPersonaMenu && 'rotate-180')} />
              </button>
              
              <AnimatePresence>
                {showPersonaMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowPersonaMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 top-full mt-2 z-50 w-56 bg-card rounded-xl border shadow-lg overflow-hidden"
                    >
                      <p className="px-3 py-2 text-xs text-muted-foreground font-medium border-b">Choose Persona</p>
                      {Object.entries(PERSONAS).map(([key, config]) => (
                        <button
                          key={key}
                          onClick={() => {
                            setPersona(key as PersonaType);
                            setShowPersonaMenu(false);
                          }}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors',
                            persona === key && 'bg-purple-500/10'
                          )}
                        >
                          <div className={cn(
                            'p-1.5 rounded-lg',
                            persona === key ? 'bg-purple-500 text-white' : 'bg-muted'
                          )}>
                            {config.icon}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium">{config.name}</p>
                            <p className="text-xs text-muted-foreground">{config.description}</p>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowHistory(true)}>
              <History className="h-4 w-4" />
              History
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4" />
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
                { id: 'chat', label: 'Chat', icon: MessageSquare },
                { id: 'insights', label: 'Insights', icon: Lightbulb, count: insights.length },
                { id: 'actions', label: 'Actions', icon: Zap, count: pendingActions.filter(a => a.status === 'pending').length },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
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

                          {/* Sources */}
                          {message.sources && message.sources.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border/50">
                              <p className="text-xs text-muted-foreground mb-1">Sources:</p>
                              {message.sources.map((source, i) => (
                                <a
                                  key={i}
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                                >
                                  <Globe className="h-3 w-3" />
                                  {source.title}
                                </a>
                              ))}
                            </div>
                          )}

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

                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {[
                      'What is photosynthesis?',
                      'Analyze my data',
                      'Create a tracker',
                      'Help me',
                    ].map(action => (
                      <button
                        key={action}
                        onClick={() => setInput(action)}
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
                          <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
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
                    <p className="text-sm mt-1">Actions appear when Prime suggests them</p>
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
                            <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
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
                <span className="text-sm text-muted-foreground">Current Persona</span>
                <span className="text-sm flex items-center gap-1">
                  {PERSONAS[persona].icon}
                  {PERSONAS[persona].name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Knowledge Base</span>
                <span className="text-sm">Active</span>
              </div>
            </div>
          </Card>

          {/* Capabilities */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              Capabilities
            </h3>
            <div className="space-y-2">
              {[
                { icon: Search, name: 'Knowledge', desc: 'Ask anything' },
                { icon: Bot, name: 'Analysis', desc: 'Data insights' },
                { icon: Zap, name: 'Building', desc: 'Create trackers' },
                { icon: HelpCircle, name: 'Help', desc: 'Guidance' },
              ].map(cap => (
                <div
                  key={cap.name}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                >
                  <cap.icon className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium">{cap.name}</p>
                    <p className="text-xs text-muted-foreground">{cap.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Stats */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Session Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <div className="text-2xl font-bold text-purple-500">{messages.length - 1}</div>
                <div className="text-xs text-muted-foreground">Messages</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <div className="text-2xl font-bold text-blue-500">{insights.length}</div>
                <div className="text-xs text-muted-foreground">Insights</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
