"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Brain, Activity, Network, Sparkles, 
  Eye, EyeOff, Maximize, Minimize, Settings,
  ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { dimensionalView, DimensionalNode, DimensionalViewState } from '@/lib/nexus/dimensional-view';
import { predictiveFlow } from '@/lib/nexus/predictive-flow';

interface NexusModeProps {
  isActive: boolean;
  onToggle: () => void;
  data: { items: any[]; automations: any[]; suggestions: any[] };
}

export function NexusMode({ isActive, onToggle, data }: NexusModeProps) {
  const [viewState, setViewState] = useState<DimensionalViewState | null>(null);
  const [selectedNode, setSelectedNode] = useState<DimensionalNode | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [predictions, setPredictions] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isActive && data) {
      setIsLoading(true);
      dimensionalView.initialize(data);
      
      const unsubscribe = dimensionalView.subscribe((state) => {
        setViewState(state);
        setIsLoading(false);
      });
      
      return () => {
        unsubscribe();
        dimensionalView.stopAnimation();
      };
    }
  }, [isActive, data]);

  useEffect(() => {
    if (isActive) {
      const preds = predictiveFlow.getPredictions();
      setPredictions(preds.slice(0, 3).map(p => p.action));
    }
  }, [isActive]);

  useEffect(() => {
    if (!canvasRef.current || !viewState || !isActive) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * 2;
      canvas.height = height * 2;
      ctx.scale(2, 2);
      
      // Clear
      ctx.fillStyle = 'rgba(10, 10, 15, 0.95)';
      ctx.fillRect(0, 0, width, height);
      
      const centerX = width / 2;
      const centerY = height / 2;
      const { camera } = viewState;
      
      // Draw edges
      ctx.lineWidth = 1;
      for (const edge of viewState.edges) {
        const source = viewState.nodes.find(n => n.id === edge.source);
        const target = viewState.nodes.find(n => n.id === edge.target);
        if (!source || !target) continue;
        
        const sx = centerX + (source.x - camera.x) * camera.zoom;
        const sy = centerY + (source.y - camera.y) * camera.zoom;
        const tx = centerX + (target.x - camera.x) * camera.zoom;
        const ty = centerY + (target.y - camera.y) * camera.zoom;
        
        // Edge glow
        ctx.strokeStyle = `rgba(99, 102, 241, ${edge.strength * 0.5})`;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        
        // Animated particle along edge
        if (edge.animated) {
          const t = (Date.now() % 2000) / 2000;
          const px = sx + (tx - sx) * t;
          const py = sy + (ty - sy) * t;
          
          ctx.fillStyle = '#6366f1';
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // Draw clusters (background)
      for (const cluster of viewState.clusters) {
        const cx = centerX + (cluster.center.x - camera.x) * camera.zoom;
        const cy = centerY + (cluster.center.y - camera.y) * camera.zoom;
        const r = cluster.radius * camera.zoom;
        
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        gradient.addColorStop(0, `${cluster.color}10`);
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Draw nodes
      for (const node of viewState.nodes) {
        // Apply focus mode dimming
        const isFocused = !focusMode || 
          node.id === selectedNode?.id ||
          selectedNode?.connections.includes(node.id);
        
        const opacity = isFocused ? 1 : 0.2;
        const x = centerX + (node.x - camera.x) * camera.zoom;
        const y = centerY + (node.y - camera.y) * camera.zoom;
        const size = node.size * camera.zoom;
        
        // Node glow based on activity
        if (node.activity > 50) {
          const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
          glowGradient.addColorStop(0, `${node.color}${Math.floor(node.activity * 0.5).toString(16).padStart(2, '0')}`);
          glowGradient.addColorStop(1, 'transparent');
          
          ctx.fillStyle = glowGradient;
          ctx.beginPath();
          ctx.arc(x, y, size * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Node body
        ctx.globalAlpha = opacity;
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Node border
        ctx.strokeStyle = node.id === viewState.highlightedNode ? '#fff' : 'rgba(255,255,255,0.3)';
        ctx.lineWidth = node.id === viewState.highlightedNode ? 3 : 1;
        ctx.stroke();
        
        // Label
        ctx.fillStyle = '#fff';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.label.slice(0, 15), x, y + size + 15);
        
        ctx.globalAlpha = 1;
      }
      
      requestAnimationFrame(render);
    };
    
    render();
  }, [viewState, focusMode, selectedNode, isActive]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!viewState || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const { camera } = viewState;
    
    // Find clicked node
    for (const node of viewState.nodes) {
      const nx = centerX + (node.x - camera.x) * camera.zoom;
      const ny = centerY + (node.y - camera.y) * camera.zoom;
      const dist = Math.sqrt((x - nx) ** 2 + (y - ny) ** 2);
      
      if (dist < node.size * camera.zoom) {
        setSelectedNode(node);
        dimensionalView.highlightNode(node.id);
        return;
      }
    }
    
    setSelectedNode(null);
    dimensionalView.highlightNode(null);
  };

  const handleZoom = (delta: number) => {
    if (!viewState) return;
    dimensionalView.setCamera({
      zoom: Math.max(0.5, Math.min(2, viewState.camera.zoom + delta)),
    });
  };

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#0a0a0f]"
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-zinc-900/90 to-transparent z-10 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onToggle}>
              <ChevronLeft size={20} />
            </Button>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                <Zap size={18} className="text-white" />
              </div>
              <span className="font-semibold text-white">Nexus Mode</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFocusMode(!focusMode)}
              className={cn(focusMode && "bg-indigo-500/20")}
            >
              {focusMode ? <Eye size={16} /> : <EyeOff size={16} />}
              <span className="ml-2">Focus</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleZoom(-0.2)}>
              <Minimize size={16} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleZoom(0.2)}>
              <Maximize size={16} />
            </Button>
          </div>
        </div>
        
        {/* Canvas */}
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin text-indigo-500" size={48} />
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="w-full h-full cursor-crosshair"
          />
        )}
        
        {/* Predictions Panel */}
        <motion.div
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          className="absolute left-4 top-20 w-64 bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Brain size={16} className="text-purple-400" />
            <span className="text-sm font-medium text-white">Predictions</span>
          </div>
          <div className="space-y-2">
            {predictions.length > 0 ? predictions.map((pred, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded-lg"
              >
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  i === 0 ? "bg-green-500" : i === 1 ? "bg-yellow-500" : "bg-zinc-500"
                )} />
                <span className="text-sm text-zinc-300">{pred}</span>
              </div>
            )) : (
              <p className="text-sm text-zinc-500">Learning your patterns...</p>
            )}
          </div>
        </motion.div>
        
        {/* Node Details Panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="absolute right-4 top-20 w-72 bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: selectedNode.color }}
                  />
                  <span className="text-sm font-medium text-white capitalize">
                    {selectedNode.type}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  ×
                </button>
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-2">
                {selectedNode.label}
              </h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Activity</span>
                  <span className="text-white">{Math.round(selectedNode.activity)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Connections</span>
                  <span className="text-white">{selectedNode.connections.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Depth (Z)</span>
                  <span className="text-white">{Math.round(selectedNode.z)}</span>
                </div>
              </div>
              
              {selectedNode.connections.length > 0 && (
                <div className="mt-4 pt-4 border-t border-zinc-700/50">
                  <p className="text-xs text-zinc-500 mb-2">Connected to:</p>
                  <div className="flex flex-wrap gap-1">
                    {dimensionalView.getConnectedNodes(selectedNode.id).slice(0, 5).map(node => (
                      <span
                        key={node.id}
                        className="px-2 py-1 text-xs bg-zinc-800 rounded text-zinc-300"
                      >
                        {node.label.slice(0, 12)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Stats Bar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-full">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-green-400" />
            <span className="text-sm text-zinc-300">
              {viewState?.nodes.length || 0} nodes
            </span>
          </div>
          <div className="w-px h-4 bg-zinc-700" />
          <div className="flex items-center gap-2">
            <Network size={14} className="text-blue-400" />
            <span className="text-sm text-zinc-300">
              {viewState?.edges.length || 0} connections
            </span>
          </div>
          <div className="w-px h-4 bg-zinc-700" />
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-purple-400" />
            <span className="text-sm text-zinc-300">
              {viewState?.clusters.length || 0} clusters
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}


