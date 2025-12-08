"use client";

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  GripVertical, X, Maximize2, Minimize2, Settings,
  BarChart3, ListTodo, Sparkles, Workflow, Brain,
  Activity, Clock, Target, TrendingUp, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Widget {
  id: string;
  type: 'stats' | 'chart' | 'tasks' | 'suggestions' | 'automations' | 'graph' | 'activity' | 'clock' | 'goals' | 'insights';
  title: string;
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  isMinimized: boolean;
}

const defaultWidgets: Widget[] = [
  { id: 'w1', type: 'stats', title: 'Quick Stats', size: 'medium', position: { x: 0, y: 0 }, isMinimized: false },
  { id: 'w2', type: 'tasks', title: 'Recent Tasks', size: 'medium', position: { x: 1, y: 0 }, isMinimized: false },
  { id: 'w3', type: 'chart', title: 'Analytics', size: 'large', position: { x: 0, y: 1 }, isMinimized: false },
  { id: 'w4', type: 'suggestions', title: 'AI Suggestions', size: 'small', position: { x: 2, y: 0 }, isMinimized: false },
  { id: 'w5', type: 'insights', title: 'Nexus Insights', size: 'medium', position: { x: 2, y: 1 }, isMinimized: false },
];

const widgetIcons: Record<Widget['type'], React.ReactNode> = {
  stats: <Activity size={16} />,
  chart: <BarChart3 size={16} />,
  tasks: <ListTodo size={16} />,
  suggestions: <Sparkles size={16} />,
  automations: <Workflow size={16} />,
  graph: <Brain size={16} />,
  activity: <TrendingUp size={16} />,
  clock: <Clock size={16} />,
  goals: <Target size={16} />,
  insights: <Zap size={16} />,
};

interface DraggableGridProps {
  onWidgetClick?: (widget: Widget) => void;
}

export function DraggableGrid({ onWidgetClick }: DraggableGridProps) {
  const [widgets, setWidgets] = useState<Widget[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexus_widgets');
      return saved ? JSON.parse(saved) : defaultWidgets;
    }
    return defaultWidgets;
  });
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    localStorage.setItem('nexus_widgets', JSON.stringify(widgets));
  }, [widgets]);

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDragging(widgetId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragging || dragging === targetId) return;

    setWidgets(prev => {
      const dragWidget = prev.find(w => w.id === dragging);
      const targetWidget = prev.find(w => w.id === targetId);
      if (!dragWidget || !targetWidget) return prev;

      return prev.map(w => {
        if (w.id === dragging) return { ...w, position: targetWidget.position };
        if (w.id === targetId) return { ...w, position: dragWidget.position };
        return w;
      });
    });
    setDragging(null);
  };

  const toggleMinimize = (widgetId: string) => {
    setWidgets(prev => prev.map(w => 
      w.id === widgetId ? { ...w, isMinimized: !w.isMinimized } : w
    ));
  };

  const removeWidget = (widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
  };

  const cycleSize = (widgetId: string) => {
    const sizes: Widget['size'][] = ['small', 'medium', 'large'];
    setWidgets(prev => prev.map(w => {
      if (w.id === widgetId) {
        const currentIndex = sizes.indexOf(w.size);
        const nextIndex = (currentIndex + 1) % sizes.length;
        return { ...w, size: sizes[nextIndex] };
      }
      return w;
    }));
  };

  const getSizeClasses = (size: Widget['size']) => {
    switch (size) {
      case 'small': return 'col-span-1 row-span-1';
      case 'medium': return 'col-span-1 row-span-1 md:col-span-1';
      case 'large': return 'col-span-1 md:col-span-2 row-span-1';
    }
  };

  const renderWidgetContent = (widget: Widget) => {
    if (widget.isMinimized) return null;

    switch (widget.type) {
      case 'stats':
        return (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <div className="text-2xl font-bold text-indigo-400">24</div>
              <div className="text-xs text-zinc-400">Tasks</div>
            </div>
            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <div className="text-2xl font-bold text-green-400">18</div>
              <div className="text-xs text-zinc-400">Completed</div>
            </div>
            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <div className="text-2xl font-bold text-purple-400">5</div>
              <div className="text-xs text-zinc-400">Automations</div>
            </div>
            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-400">78%</div>
              <div className="text-xs text-zinc-400">Score</div>
            </div>
          </div>
        );
      
      case 'tasks':
        return (
          <div className="space-y-2">
            {['Complete project docs', 'Review PR #42', 'Team meeting', 'Update tests'].map((task, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded-lg">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  i < 2 ? "bg-green-500" : "bg-zinc-500"
                )} />
                <span className="text-sm text-zinc-300">{task}</span>
              </div>
            ))}
          </div>
        );
      
      case 'chart':
        return (
          <div className="h-40 flex items-end gap-2 pt-4">
            {[40, 65, 45, 80, 55, 70, 90].map((height, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="flex-1 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-md"
              />
            ))}
          </div>
        );
      
      case 'suggestions':
        return (
          <div className="space-y-2">
            <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <p className="text-xs text-purple-200">Focus on high-priority items first</p>
            </div>
            <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-xs text-blue-200">Consider batching similar tasks</p>
            </div>
          </div>
        );
      
      case 'insights':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-zinc-300">Productivity up 12%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              <span className="text-sm text-zinc-300">3 items need attention</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-sm text-zinc-300">Peak hours: 9-11 AM</span>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="h-20 flex items-center justify-center text-zinc-500 text-sm">
            Widget content
          </div>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-min">
      {widgets.map((widget, index) => (
        <motion.div
          key={widget.id}
          layout
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          draggable
          onDragStart={(e: any) => handleDragStart(e, widget.id)}
          onDragOver={handleDragOver}
          onDrop={(e: any) => handleDrop(e, widget.id)}
          className={cn(
            "bg-zinc-900/50 border border-zinc-700/50 rounded-xl overflow-hidden backdrop-blur-sm",
            "transition-all duration-200 hover:border-zinc-600/50",
            getSizeClasses(widget.size),
            dragging === widget.id && "opacity-50 scale-95"
          )}
        >
          {/* Widget Header */}
          <div className="flex items-center justify-between p-3 border-b border-zinc-700/50 cursor-move">
            <div className="flex items-center gap-2">
              <GripVertical size={14} className="text-zinc-500" />
              <span className="text-zinc-400">{widgetIcons[widget.type]}</span>
              <span className="text-sm font-medium text-white">{widget.title}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => cycleSize(widget.id)}
                className="p-1 hover:bg-zinc-800 rounded transition-colors"
              >
                <Maximize2 size={12} className="text-zinc-400" />
              </button>
              <button
                onClick={() => toggleMinimize(widget.id)}
                className="p-1 hover:bg-zinc-800 rounded transition-colors"
              >
                <Minimize2 size={12} className="text-zinc-400" />
              </button>
              <button
                onClick={() => removeWidget(widget.id)}
                className="p-1 hover:bg-zinc-800 rounded transition-colors"
              >
                <X size={12} className="text-zinc-400" />
              </button>
            </div>
          </div>
          
          {/* Widget Content */}
          <motion.div 
            className="p-3"
            animate={{ height: widget.isMinimized ? 0 : 'auto', opacity: widget.isMinimized ? 0 : 1 }}
          >
            {renderWidgetContent(widget)}
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}


