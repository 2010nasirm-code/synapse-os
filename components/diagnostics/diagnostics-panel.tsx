"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, AlertTriangle, CheckCircle, XCircle, 
  RefreshCw, Wrench, Trash2, Shield, Cpu, HardDrive,
  Wifi, WifiOff, X, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { diagnostics, SystemHealth, DiagnosticResult } from '@/lib/diagnostics/system-check';
import { selfHealing, SystemStatus } from '@/lib/nexus/self-healing';

interface DiagnosticsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DiagnosticsPanel({ isOpen, onClose }: DiagnosticsPanelProps) {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [healingStatus, setHealingStatus] = useState<SystemStatus | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('overview');

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
      
      const unsubscribeDiag = diagnostics.subscribe(setHealth);
      const unsubscribeHeal = selfHealing.subscribe(setHealingStatus);
      
      return () => {
        unsubscribeDiag();
        unsubscribeHeal();
      };
    }
  }, [isOpen]);

  const runDiagnostics = async () => {
    setIsScanning(true);
    const result = await diagnostics.runFullDiagnostics();
    setHealth(result);
    setHealingStatus(selfHealing.getStatus());
    setIsScanning(false);
  };

  const getStatusColor = (status: SystemHealth['status']) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'degraded': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
    }
  };

  const getStatusIcon = (status: SystemHealth['status']) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="text-green-400" size={20} />;
      case 'degraded': return <AlertTriangle className="text-yellow-400" size={20} />;
      case 'critical': return <XCircle className="text-red-400" size={20} />;
    }
  };

  const getSeverityColor = (severity: DiagnosticResult['severity']) => {
    switch (severity) {
      case 'error': return 'bg-red-500/20 border-red-500/30 text-red-200';
      case 'warning': return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-200';
      case 'info': return 'bg-blue-500/20 border-blue-500/30 text-blue-200';
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[600px] md:max-h-[80vh] bg-zinc-900/95 border border-zinc-700/50 rounded-xl z-50 flex flex-col backdrop-blur-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-700/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                  <Shield size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">System Diagnostics</h2>
                  <p className="text-xs text-zinc-400">Self-healing architecture status</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={runDiagnostics}
                  disabled={isScanning}
                >
                  <RefreshCw size={14} className={cn(isScanning && "animate-spin")} />
                  <span className="ml-2">Scan</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X size={18} />
                </Button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Overview */}
              <div 
                className="bg-zinc-800/50 rounded-lg overflow-hidden"
                onClick={() => setExpandedSection(expandedSection === 'overview' ? null : 'overview')}
              >
                <div className="flex items-center justify-between p-4 cursor-pointer">
                  <div className="flex items-center gap-3">
                    {health && getStatusIcon(health.status)}
                    <div>
                      <p className="font-medium text-white">System Status</p>
                      <p className={cn("text-sm", health && getStatusColor(health.status))}>
                        {health?.status.charAt(0).toUpperCase()}{health?.status.slice(1)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">{health?.score || 0}</p>
                      <p className="text-xs text-zinc-400">Health Score</p>
                    </div>
                    <ChevronDown className={cn(
                      "text-zinc-400 transition-transform",
                      expandedSection === 'overview' && "rotate-180"
                    )} size={20} />
                  </div>
                </div>
                
                <AnimatePresence>
                  {expandedSection === 'overview' && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 grid grid-cols-3 gap-3">
                        <div className="p-3 bg-zinc-700/30 rounded-lg text-center">
                          <Cpu size={20} className="mx-auto mb-2 text-blue-400" />
                          <p className="text-sm text-white">{health?.issues.length || 0}</p>
                          <p className="text-xs text-zinc-400">Issues</p>
                        </div>
                        <div className="p-3 bg-zinc-700/30 rounded-lg text-center">
                          <Wrench size={20} className="mx-auto mb-2 text-green-400" />
                          <p className="text-sm text-white">{health?.autoFixedCount || 0}</p>
                          <p className="text-xs text-zinc-400">Auto-Fixed</p>
                        </div>
                        <div className="p-3 bg-zinc-700/30 rounded-lg text-center">
                          {navigator.onLine ? (
                            <Wifi size={20} className="mx-auto mb-2 text-green-400" />
                          ) : (
                            <WifiOff size={20} className="mx-auto mb-2 text-red-400" />
                          )}
                          <p className="text-sm text-white">{navigator.onLine ? 'Online' : 'Offline'}</p>
                          <p className="text-xs text-zinc-400">Network</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Issues */}
              {health && health.issues.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-zinc-400">Current Issues</h3>
                  {health.issues.map((issue, i) => (
                    <motion.div
                      key={issue.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={cn(
                        "p-3 rounded-lg border",
                        getSeverityColor(issue.severity)
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium">{issue.message}</p>
                          <p className="text-xs opacity-70 mt-1">
                            Category: {issue.category} • {issue.autoFixable ? 'Auto-fixable' : 'Manual fix needed'}
                          </p>
                        </div>
                        {issue.autoFixable && (
                          <Button size="sm" variant="ghost" className="text-xs">
                            <Wrench size={12} className="mr-1" />
                            Fix
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              
              {/* Healing History */}
              {healingStatus && healingStatus.healingActions.length > 0 && (
                <div 
                  className="bg-zinc-800/50 rounded-lg overflow-hidden"
                  onClick={() => setExpandedSection(expandedSection === 'history' ? null : 'history')}
                >
                  <div className="flex items-center justify-between p-4 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Activity size={18} className="text-purple-400" />
                      <span className="font-medium text-white">Healing History</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-400">
                        {healingStatus.healingActions.length} actions
                      </span>
                      <ChevronDown className={cn(
                        "text-zinc-400 transition-transform",
                        expandedSection === 'history' && "rotate-180"
                      )} size={20} />
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {expandedSection === 'history' && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-2 max-h-48 overflow-y-auto">
                          {healingStatus.healingActions.slice(-10).reverse().map((action, i) => (
                            <div
                              key={action.id}
                              className="flex items-center gap-3 p-2 bg-zinc-700/30 rounded-lg text-sm"
                            >
                              {action.success ? (
                                <CheckCircle size={14} className="text-green-400" />
                              ) : (
                                <XCircle size={14} className="text-red-400" />
                              )}
                              <div className="flex-1">
                                <p className="text-zinc-200">{action.description}</p>
                                <p className="text-xs text-zinc-500">
                                  {action.type} • {new Date(action.timestamp).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              
              {/* All Clear */}
              {health && health.issues.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8">
                  <CheckCircle className="text-green-400 mb-3" size={48} />
                  <p className="text-lg font-medium text-white">All Systems Operational</p>
                  <p className="text-sm text-zinc-400">No issues detected</p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-zinc-700/50 flex items-center justify-between">
              <p className="text-xs text-zinc-500">
                Last checked: {health?.lastCheck.toLocaleTimeString() || 'Never'}
              </p>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    diagnostics.clearIssues();
                    selfHealing.clearHistory();
                    runDiagnostics();
                  }}
                >
                  <Trash2 size={14} className="mr-1" />
                  Clear History
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => selfHealing.forceHeal()}
                >
                  <RefreshCw size={14} className="mr-1" />
                  Force Reset
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


