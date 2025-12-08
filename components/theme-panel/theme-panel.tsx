"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Palette, X, RotateCcw, Sparkles, Moon, Sun, Monitor,
  Droplet, Square, Maximize2, Zap, Wand2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useThemeStore } from '@/stores/theme-store';
import { themePresets } from '@/lib/theme/theme-engine';

interface ThemePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemePanel({ isOpen, onClose }: ThemePanelProps) {
  const { config, setConfig, applyPreset, generateFromPrompt, reset } = useThemeStore();
  const [aiPrompt, setAiPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'presets' | 'customize' | 'ai'>('presets');

  const handleGenerateTheme = () => {
    if (aiPrompt.trim()) {
      generateFromPrompt(aiPrompt);
      setAiPrompt('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 h-full w-full max-w-sm bg-zinc-900/95 border-r border-zinc-700/50 z-50 flex flex-col backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-700/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-pink-500 to-orange-500 rounded-lg">
                  <Palette size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">Theme Engine</h2>
                  <p className="text-xs text-zinc-400">Customize your experience</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={reset}>
                  <RotateCcw size={16} />
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X size={18} />
                </Button>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-zinc-700/50">
              {[
                { id: 'presets', label: 'Presets', icon: Square },
                { id: 'customize', label: 'Customize', icon: Droplet },
                { id: 'ai', label: 'AI Generate', icon: Wand2 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors",
                    activeTab === tab.id
                      ? "text-white border-b-2 border-indigo-500"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'presets' && (
                <div className="space-y-3">
                  <p className="text-sm text-zinc-400 mb-4">Choose a preset theme</p>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(themePresets).map(([name, preset]) => (
                      <button
                        key={name}
                        onClick={() => applyPreset(name)}
                        className={cn(
                          "p-3 rounded-lg border transition-all",
                          config.preset === name
                            ? "border-indigo-500 bg-indigo-500/10"
                            : "border-zinc-700 hover:border-zinc-500"
                        )}
                      >
                        <div className="flex gap-1 mb-2">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ background: preset.primary }}
                          />
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ background: preset.secondary }}
                          />
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ background: preset.accent }}
                          />
                        </div>
                        <span className="text-sm text-white capitalize">{name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {activeTab === 'customize' && (
                <div className="space-y-6">
                  {/* Mode Toggle */}
                  <div>
                    <label className="text-sm text-zinc-400 mb-2 block">Mode</label>
                    <div className="flex gap-2">
                      {[
                        { id: 'light', icon: Sun },
                        { id: 'dark', icon: Moon },
                        { id: 'system', icon: Monitor },
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => setConfig({ mode: mode.id as any })}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-all",
                            config.mode === mode.id
                              ? "border-indigo-500 bg-indigo-500/10 text-white"
                              : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                          )}
                        >
                          <mode.icon size={16} />
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Colors */}
                  <div>
                    <label className="text-sm text-zinc-400 mb-2 block">Colors</label>
                    <div className="space-y-3">
                      {[
                        { key: 'primary', label: 'Primary' },
                        { key: 'secondary', label: 'Secondary' },
                        { key: 'accent', label: 'Accent' },
                      ].map((color) => (
                        <div key={color.key} className="flex items-center gap-3">
                          <input
                            type="color"
                            value={(config as any)[color.key]}
                            onChange={(e) => setConfig({ [color.key]: e.target.value })}
                            className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-zinc-700"
                          />
                          <span className="text-sm text-zinc-300">{color.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Sliders */}
                  <div className="space-y-4">
                    {/* Blur */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-zinc-400">Blur</span>
                        <span className="text-white">{config.blur}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        value={config.blur}
                        onChange={(e) => setConfig({ blur: Number(e.target.value) })}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                    
                    {/* Corner Radius */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-zinc-400">Corner Radius</span>
                        <span className="text-white">{config.cornerRadius}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="24"
                        value={config.cornerRadius}
                        onChange={(e) => setConfig({ cornerRadius: Number(e.target.value) })}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                    
                    {/* Spacing */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-zinc-400">Spacing</span>
                        <span className="text-white">{config.spacing}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={config.spacing}
                        onChange={(e) => setConfig({ spacing: Number(e.target.value) })}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                    
                    {/* Animation Speed */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-zinc-400">Animation Speed</span>
                        <span className="text-white">{config.animationSpeed}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={config.animationSpeed}
                        onChange={(e) => setConfig({ animationSpeed: Number(e.target.value) })}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                  </div>
                  
                  {/* Effect Toggles */}
                  <div className="space-y-3">
                    <label className="text-sm text-zinc-400 mb-2 block">Effects</label>
                    {[
                      { key: 'glassEnabled', label: 'Glass Effect', icon: Droplet },
                      { key: 'neonEnabled', label: 'Neon Glow', icon: Zap },
                      { key: 'gradientEnabled', label: 'Gradients', icon: Palette },
                    ].map((effect) => (
                      <button
                        key={effect.key}
                        onClick={() => setConfig({ [effect.key]: !(config as any)[effect.key] })}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg border transition-all",
                          (config as any)[effect.key]
                            ? "border-indigo-500 bg-indigo-500/10"
                            : "border-zinc-700 hover:border-zinc-500"
                        )}
                      >
                        <effect.icon size={18} className={(config as any)[effect.key] ? "text-indigo-400" : "text-zinc-400"} />
                        <span className="text-sm text-white">{effect.label}</span>
                        <div className={cn(
                          "ml-auto w-10 h-6 rounded-full transition-colors",
                          (config as any)[effect.key] ? "bg-indigo-500" : "bg-zinc-700"
                        )}>
                          <div className={cn(
                            "w-5 h-5 rounded-full bg-white transition-transform mt-0.5",
                            (config as any)[effect.key] ? "translate-x-4.5 ml-0.5" : "translate-x-0.5"
                          )} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {activeTab === 'ai' && (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-400">
                    Describe the theme you want and AI will generate it for you.
                  </p>
                  
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g., A calm ocean theme with blue gradients and soft glow effects..."
                    className="w-full h-32 bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500 resize-none"
                  />
                  
                  <Button 
                    onClick={handleGenerateTheme}
                    disabled={!aiPrompt.trim()}
                    className="w-full gap-2"
                  >
                    <Sparkles size={16} />
                    Generate Theme
                  </Button>
                  
                  <div className="pt-4 border-t border-zinc-700/50">
                    <p className="text-xs text-zinc-500 mb-3">Quick prompts:</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Cyberpunk neon',
                        'Calm forest',
                        'Minimal clean',
                        'Sunset gradient',
                        'Ocean glass',
                        'Purple magic',
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => setAiPrompt(prompt)}
                          className="px-3 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded-full text-zinc-300 hover:border-zinc-500 transition-colors"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Preview */}
            <div className="p-4 border-t border-zinc-700/50">
              <p className="text-xs text-zinc-500 mb-2">Preview</p>
              <div 
                className="p-4 rounded-lg border"
                style={{
                  background: config.glassEnabled 
                    ? `linear-gradient(135deg, ${config.primary}20, ${config.secondary}20)`
                    : config.background,
                  borderColor: config.border,
                  borderRadius: config.cornerRadius,
                  backdropFilter: config.glassEnabled ? `blur(${config.blur}px)` : 'none',
                  boxShadow: config.neonEnabled 
                    ? `0 0 ${config.neonIntensity / 5}px ${config.neonColor}`
                    : 'none',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ background: config.primary }}
                  />
                  <span className="text-sm" style={{ color: config.foreground }}>
                    Sample Text
                  </span>
                </div>
                <div 
                  className="h-2 rounded"
                  style={{ 
                    background: config.gradientEnabled 
                      ? `linear-gradient(${config.gradientAngle}deg, ${config.gradientStart}, ${config.gradientEnd})`
                      : config.primary 
                  }}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


