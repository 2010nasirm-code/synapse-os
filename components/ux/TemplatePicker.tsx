'use client';

/**
 * ============================================================================
 * TEMPLATE PICKER
 * ============================================================================
 * 
 * Browse and select from pre-built templates.
 * 
 * @component TemplatePicker
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  forBeginners: boolean;
  popularity: number;
}

interface TemplatePickerProps {
  templates: Template[];
  onSelect: (template: Template) => void;
  onClose: () => void;
  title?: string;
}

const CATEGORY_METADATA: Record<string, { name: string; icon: string }> = {
  habits: { name: 'Habits', icon: '✨' },
  fitness: { name: 'Fitness', icon: '💪' },
  school: { name: 'School', icon: '📚' },
  mood: { name: 'Mood', icon: '😊' },
  sleep: { name: 'Sleep', icon: '😴' },
  goals: { name: 'Goals', icon: '🎯' },
  finance: { name: 'Finance', icon: '💰' },
  work: { name: 'Work', icon: '💼' },
  health: { name: 'Health', icon: '❤️' },
  custom: { name: 'Custom', icon: '⚙️' },
};

export function TemplatePicker({
  templates,
  onSelect,
  onClose,
  title = 'Choose a Template',
}: TemplatePickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Get unique categories
  const categories = Array.from(new Set(templates.map(t => t.category)));

  // Filter templates
  const filteredTemplates = templates.filter(t => {
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Sort by popularity
  const sortedTemplates = [...filteredTemplates].sort((a, b) => b.popularity - a.popularity);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-card rounded-2xl shadow-2xl border overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className={cn(
                'w-full px-4 py-2.5 pl-10 rounded-xl border',
                'bg-background text-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary/50',
                'placeholder:text-muted-foreground'
              )}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              🔍
            </span>
          </div>
        </div>

        {/* Categories */}
        <div className="px-6 py-3 border-b border-border overflow-x-auto">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                !selectedCategory
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 hover:bg-muted'
              )}
            >
              All
            </button>
            {categories.map(cat => {
              const meta = CATEGORY_METADATA[cat] || { name: cat, icon: '📁' };
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                    selectedCategory === cat
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 hover:bg-muted'
                  )}
                >
                  {meta.icon} {meta.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {sortedTemplates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-4xl mb-3">🔍</div>
              <p>No templates found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {sortedTemplates.map((template, index) => (
                <button
                  key={template.id}
                  onClick={() => onSelect(template)}
                  className={cn(
                    'p-4 rounded-xl border text-left transition-all',
                    'hover:border-primary hover:shadow-lg',
                    'animate-in fade-in-0 slide-in-from-bottom-2',
                    'bg-card hover:bg-muted/30'
                  )}
                  style={{
                    animationDelay: `${index * 50}ms`,
                    borderColor: `${template.color}20`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                      style={{ backgroundColor: `${template.color}20` }}
                    >
                      {template.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{template.name}</h3>
                        {template.forBeginners && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 font-medium">
                            Easy
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-medium bg-muted hover:bg-muted/80 transition-colors"
          >
            Create from scratch instead
          </button>
        </div>
      </div>
    </div>
  );
}

export default TemplatePicker;

