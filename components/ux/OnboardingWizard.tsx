'use client';

/**
 * ============================================================================
 * ONBOARDING WIZARD
 * ============================================================================
 * 
 * Guided first-time user setup with friendly AI assistant.
 * 
 * @component OnboardingWizard
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
}

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [name, setName] = useState('');

  const toggleTemplate = (id: string) => {
    setSelectedTemplates(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Nexus! 👋',
      description: "I'm your AI assistant. Let's set things up together!",
      content: (
        <div className="space-y-6">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🌟</div>
            <h2 className="text-2xl font-bold mb-2">Hey there!</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Nexus helps you track habits, stay organized, and get smart suggestions - all in one place.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-xl bg-muted/30">
              <div className="text-2xl mb-2">📊</div>
              <p className="text-sm font-medium">Track Anything</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/30">
              <div className="text-2xl mb-2">🤖</div>
              <p className="text-sm font-medium">AI Suggestions</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/30">
              <div className="text-2xl mb-2">⚡</div>
              <p className="text-sm font-medium">Automations</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'name',
      title: "What's your name?",
      description: "I'd love to know what to call you!",
      content: (
        <div className="space-y-6 py-4">
          <div className="text-center">
            <div className="text-4xl mb-4">😊</div>
          </div>
          
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name..."
            className={cn(
              'w-full px-4 py-3 text-lg rounded-xl border',
              'bg-background text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary/50',
              'placeholder:text-muted-foreground'
            )}
            autoFocus
          />
          
          <p className="text-sm text-muted-foreground text-center">
            Don't worry, you can change this later!
          </p>
        </div>
      ),
    },
    {
      id: 'templates',
      title: 'What would you like to track?',
      description: 'Pick one or more to get started (you can add more later)',
      content: (
        <div className="grid grid-cols-2 gap-3 py-4">
          {[
            { id: 'habits', icon: '✨', name: 'Daily Habits', desc: 'Exercise, reading, etc.' },
            { id: 'school', icon: '📚', name: 'School Work', desc: 'Homework & grades' },
            { id: 'fitness', icon: '💪', name: 'Fitness', desc: 'Workouts & health' },
            { id: 'mood', icon: '😊', name: 'Mood', desc: 'How you feel' },
            { id: 'goals', icon: '🎯', name: 'Goals', desc: 'Personal goals' },
            { id: 'finance', icon: '💰', name: 'Money', desc: 'Spending & saving' },
          ].map(template => (
            <button
              key={template.id}
              onClick={() => toggleTemplate(template.id)}
              className={cn(
                'p-4 rounded-xl border-2 text-left transition-all',
                selectedTemplates.includes(template.id)
                  ? 'border-primary bg-primary/10'
                  : 'border-transparent bg-muted/30 hover:bg-muted/50'
              )}
            >
              <div className="text-2xl mb-2">{template.icon}</div>
              <div className="font-medium">{template.name}</div>
              <div className="text-xs text-muted-foreground">{template.desc}</div>
            </button>
          ))}
        </div>
      ),
    },
    {
      id: 'ready',
      title: "You're all set! 🎉",
      description: name ? `Welcome, ${name}! Your trackers are ready.` : 'Your trackers are ready to go!',
      content: (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🚀</div>
          <h2 className="text-xl font-bold mb-4">Everything is set up!</h2>
          
          {selectedTemplates.length > 0 && (
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-3">Created for you:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {selectedTemplates.map(id => {
                  const icons: Record<string, string> = {
                    habits: '✨', school: '📚', fitness: '💪',
                    mood: '😊', goals: '🎯', finance: '💰',
                  };
                  return (
                    <span
                      key={id}
                      className="px-3 py-1 rounded-full bg-primary/10 text-sm"
                    >
                      {icons[id]} {id.charAt(0).toUpperCase() + id.slice(1)}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-muted/30 text-sm">
            <p className="font-medium mb-1">💡 Quick tip</p>
            <p className="text-muted-foreground">
              Look for the ⓘ icons to learn about any feature!
            </p>
          </div>
        </div>
      ),
    },
  ];

  const isLastStep = currentStep === steps.length - 1;
  const canContinue = currentStep !== 2 || selectedTemplates.length > 0;

  const handleNext = useCallback(() => {
    if (isLastStep) {
      // Save preferences
      localStorage.setItem('nexus-onboarding-complete', 'true');
      localStorage.setItem('nexus-user-name', name);
      localStorage.setItem('nexus-selected-templates', JSON.stringify(selectedTemplates));
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [isLastStep, name, selectedTemplates, onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-card rounded-2xl shadow-2xl border overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
            <button
              onClick={onSkip}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Skip setup
            </button>
          </div>
          <h1 className="text-xl font-bold">{steps[currentStep].title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {steps[currentStep].description}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[300px]">
          {steps[currentStep].content}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium',
              'text-muted-foreground hover:text-foreground transition-colors',
              currentStep === 0 && 'invisible'
            )}
          >
            ← Back
          </button>

          <button
            onClick={handleNext}
            disabled={!canContinue}
            className={cn(
              'px-6 py-2.5 rounded-xl text-sm font-medium',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isLastStep ? "Let's go! 🚀" : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OnboardingWizard;

