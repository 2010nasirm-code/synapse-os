// ============================================================================
// NEXUS PRIME - NEXUS NEURAL CANVAS
// Visual workflow builder and idea connection system
// ============================================================================

import { globalEvents } from '../core/events';

export interface CanvasNode {
  id: string;
  type: 'idea' | 'task' | 'workflow' | 'automation' | 'data' | 'trigger' | 'action';
  title: string;
  description?: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  color?: string;
  data?: any;
  locked: boolean;
  collapsed: boolean;
}

export interface CanvasConnection {
  id: string;
  from: { nodeId: string; port: 'top' | 'right' | 'bottom' | 'left' };
  to: { nodeId: string; port: 'top' | 'right' | 'bottom' | 'left' };
  type: 'flow' | 'data' | 'trigger' | 'reference';
  label?: string;
  animated: boolean;
}

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Canvas {
  id: string;
  name: string;
  nodes: Map<string, CanvasNode>;
  connections: Map<string, CanvasConnection>;
  viewport: CanvasViewport;
  created: number;
  updated: number;
}

export class NeuralCanvasEngine {
  private static instance: NeuralCanvasEngine;
  private canvases = new Map<string, Canvas>();
  private activeCanvasId: string = '';
  private clipboard: { nodes: CanvasNode[]; connections: CanvasConnection[] } | null = null;
  private undoStack: any[] = [];
  private redoStack: any[] = [];

  private constructor() {
    this.loadSavedCanvases();
  }

  static getInstance(): NeuralCanvasEngine {
    if (!NeuralCanvasEngine.instance) {
      NeuralCanvasEngine.instance = new NeuralCanvasEngine();
    }
    return NeuralCanvasEngine.instance;
  }

  // ----------------------------- Canvas Management --------------------------
  createCanvas(name: string): string {
    const canvas: Canvas = {
      id: `canvas-${Date.now()}`,
      name,
      nodes: new Map(),
      connections: new Map(),
      viewport: { x: 0, y: 0, zoom: 1 },
      created: Date.now(),
      updated: Date.now(),
    };

    this.canvases.set(canvas.id, canvas);
    this.activeCanvasId = canvas.id;
    this.saveCanvases();

    globalEvents.emit('canvas:created', canvas);
    return canvas.id;
  }

  deleteCanvas(canvasId: string): boolean {
    const deleted = this.canvases.delete(canvasId);
    if (deleted) {
      if (this.activeCanvasId === canvasId) {
        const first = this.canvases.keys().next().value;
        this.activeCanvasId = first || '';
      }
      this.saveCanvases();
      globalEvents.emit('canvas:deleted', { canvasId });
    }
    return deleted;
  }

  setActiveCanvas(canvasId: string): void {
    if (this.canvases.has(canvasId)) {
      this.activeCanvasId = canvasId;
      globalEvents.emit('canvas:activated', { canvasId });
    }
  }

  // ----------------------------- Node Operations ----------------------------
  addNode(node: Omit<CanvasNode, 'id'>): string {
    const canvas = this.getActiveCanvas();
    if (!canvas) return '';

    const fullNode: CanvasNode = {
      ...node,
      id: `node-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };

    this.saveUndoState();
    canvas.nodes.set(fullNode.id, fullNode);
    canvas.updated = Date.now();
    this.saveCanvases();

    globalEvents.emit('canvas:node-added', fullNode);
    return fullNode.id;
  }

  updateNode(nodeId: string, updates: Partial<CanvasNode>): void {
    const canvas = this.getActiveCanvas();
    if (!canvas) return;

    const node = canvas.nodes.get(nodeId);
    if (!node || node.locked) return;

    this.saveUndoState();
    Object.assign(node, updates);
    canvas.updated = Date.now();
    this.saveCanvases();

    globalEvents.emit('canvas:node-updated', node);
  }

  deleteNode(nodeId: string): void {
    const canvas = this.getActiveCanvas();
    if (!canvas) return;

    const node = canvas.nodes.get(nodeId);
    if (!node || node.locked) return;

    this.saveUndoState();

    // Remove connected connections
    for (const [connId, conn] of canvas.connections) {
      if (conn.from.nodeId === nodeId || conn.to.nodeId === nodeId) {
        canvas.connections.delete(connId);
      }
    }

    canvas.nodes.delete(nodeId);
    canvas.updated = Date.now();
    this.saveCanvases();

    globalEvents.emit('canvas:node-deleted', { nodeId });
  }

  moveNode(nodeId: string, position: { x: number; y: number }): void {
    const canvas = this.getActiveCanvas();
    if (!canvas) return;

    const node = canvas.nodes.get(nodeId);
    if (!node || node.locked) return;

    node.position = position;
    canvas.updated = Date.now();

    globalEvents.emit('canvas:node-moved', { nodeId, position });
  }

  // ----------------------------- Connection Operations ----------------------
  connect(from: CanvasConnection['from'], to: CanvasConnection['to'], type: CanvasConnection['type'] = 'flow'): string {
    const canvas = this.getActiveCanvas();
    if (!canvas) return '';

    // Validate nodes exist
    if (!canvas.nodes.has(from.nodeId) || !canvas.nodes.has(to.nodeId)) {
      return '';
    }

    // Check for existing connection
    for (const conn of canvas.connections.values()) {
      if (conn.from.nodeId === from.nodeId && conn.to.nodeId === to.nodeId) {
        return '';
      }
    }

    const connection: CanvasConnection = {
      id: `conn-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      from,
      to,
      type,
      animated: type === 'flow',
    };

    this.saveUndoState();
    canvas.connections.set(connection.id, connection);
    canvas.updated = Date.now();
    this.saveCanvases();

    globalEvents.emit('canvas:connection-added', connection);
    return connection.id;
  }

  disconnect(connectionId: string): void {
    const canvas = this.getActiveCanvas();
    if (!canvas) return;

    this.saveUndoState();
    canvas.connections.delete(connectionId);
    canvas.updated = Date.now();
    this.saveCanvases();

    globalEvents.emit('canvas:connection-removed', { connectionId });
  }

  // ----------------------------- Viewport Operations ------------------------
  setViewport(viewport: Partial<CanvasViewport>): void {
    const canvas = this.getActiveCanvas();
    if (!canvas) return;

    Object.assign(canvas.viewport, viewport);
    globalEvents.emit('canvas:viewport-changed', canvas.viewport);
  }

  zoomIn(): void {
    const canvas = this.getActiveCanvas();
    if (!canvas) return;

    canvas.viewport.zoom = Math.min(3, canvas.viewport.zoom * 1.2);
    globalEvents.emit('canvas:viewport-changed', canvas.viewport);
  }

  zoomOut(): void {
    const canvas = this.getActiveCanvas();
    if (!canvas) return;

    canvas.viewport.zoom = Math.max(0.2, canvas.viewport.zoom / 1.2);
    globalEvents.emit('canvas:viewport-changed', canvas.viewport);
  }

  fitToScreen(): void {
    const canvas = this.getActiveCanvas();
    if (!canvas || canvas.nodes.size === 0) return;

    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    for (const node of canvas.nodes.values()) {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + node.size.width);
      maxY = Math.max(maxY, node.position.y + node.size.height);
    }

    // Center viewport
    const padding = 50;
    canvas.viewport = {
      x: -(minX - padding),
      y: -(minY - padding),
      zoom: 1,
    };

    globalEvents.emit('canvas:viewport-changed', canvas.viewport);
  }

  // ----------------------------- Clipboard Operations -----------------------
  copyNodes(nodeIds: string[]): void {
    const canvas = this.getActiveCanvas();
    if (!canvas) return;

    const nodes: CanvasNode[] = [];
    const connections: CanvasConnection[] = [];

    for (const nodeId of nodeIds) {
      const node = canvas.nodes.get(nodeId);
      if (node) {
        nodes.push({ ...node });
      }
    }

    // Copy connections between selected nodes
    for (const conn of canvas.connections.values()) {
      if (nodeIds.includes(conn.from.nodeId) && nodeIds.includes(conn.to.nodeId)) {
        connections.push({ ...conn });
      }
    }

    this.clipboard = { nodes, connections };
    globalEvents.emit('canvas:copied', { count: nodes.length });
  }

  paste(): string[] {
    if (!this.clipboard) return [];

    const canvas = this.getActiveCanvas();
    if (!canvas) return [];

    this.saveUndoState();

    const idMap = new Map<string, string>();
    const newNodeIds: string[] = [];

    // Paste nodes with offset
    for (const node of this.clipboard.nodes) {
      const newId = `node-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      idMap.set(node.id, newId);

      const newNode: CanvasNode = {
        ...node,
        id: newId,
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50,
        },
        locked: false,
      };

      canvas.nodes.set(newId, newNode);
      newNodeIds.push(newId);
    }

    // Paste connections
    for (const conn of this.clipboard.connections) {
      const newFromId = idMap.get(conn.from.nodeId);
      const newToId = idMap.get(conn.to.nodeId);

      if (newFromId && newToId) {
        const newConn: CanvasConnection = {
          ...conn,
          id: `conn-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          from: { ...conn.from, nodeId: newFromId },
          to: { ...conn.to, nodeId: newToId },
        };

        canvas.connections.set(newConn.id, newConn);
      }
    }

    canvas.updated = Date.now();
    this.saveCanvases();

    globalEvents.emit('canvas:pasted', { nodeIds: newNodeIds });
    return newNodeIds;
  }

  // ----------------------------- Undo/Redo ----------------------------------
  private saveUndoState(): void {
    const canvas = this.getActiveCanvas();
    if (!canvas) return;

    this.undoStack.push({
      nodes: new Map(canvas.nodes),
      connections: new Map(canvas.connections),
    });

    // Limit stack size
    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }

    // Clear redo stack
    this.redoStack = [];
  }

  undo(): void {
    const canvas = this.getActiveCanvas();
    if (!canvas || this.undoStack.length === 0) return;

    // Save current state for redo
    this.redoStack.push({
      nodes: new Map(canvas.nodes),
      connections: new Map(canvas.connections),
    });

    // Restore previous state
    const state = this.undoStack.pop()!;
    canvas.nodes = state.nodes;
    canvas.connections = state.connections;
    canvas.updated = Date.now();
    this.saveCanvases();

    globalEvents.emit('canvas:undo');
  }

  redo(): void {
    const canvas = this.getActiveCanvas();
    if (!canvas || this.redoStack.length === 0) return;

    // Save current state for undo
    this.undoStack.push({
      nodes: new Map(canvas.nodes),
      connections: new Map(canvas.connections),
    });

    // Restore next state
    const state = this.redoStack.pop()!;
    canvas.nodes = state.nodes;
    canvas.connections = state.connections;
    canvas.updated = Date.now();
    this.saveCanvases();

    globalEvents.emit('canvas:redo');
  }

  // ----------------------------- Persistence --------------------------------
  private saveCanvases(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const data = Array.from(this.canvases.entries()).map(([id, canvas]) => ({
        ...canvas,
        nodes: Array.from(canvas.nodes.entries()),
        connections: Array.from(canvas.connections.entries()),
      }));

      localStorage.setItem('nexus-prime-canvases', JSON.stringify(data));
    } catch (e) {
      console.warn('[NeuralCanvas] Failed to save canvases:', e);
    }
  }

  private loadSavedCanvases(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const saved = localStorage.getItem('nexus-prime-canvases');
      if (saved) {
        const data = JSON.parse(saved);
        for (const canvasData of data) {
          const canvas: Canvas = {
            ...canvasData,
            nodes: new Map(canvasData.nodes),
            connections: new Map(canvasData.connections),
          };
          this.canvases.set(canvas.id, canvas);
        }

        // Set first as active
        const first = this.canvases.keys().next().value;
        this.activeCanvasId = first || '';
      }
    } catch (e) {
      console.warn('[NeuralCanvas] Failed to load canvases:', e);
    }
  }

  // ----------------------------- Getters ------------------------------------
  getActiveCanvas(): Canvas | undefined {
    return this.canvases.get(this.activeCanvasId);
  }

  getCanvas(canvasId: string): Canvas | undefined {
    return this.canvases.get(canvasId);
  }

  getAllCanvases(): Canvas[] {
    return Array.from(this.canvases.values());
  }

  getNodes(): CanvasNode[] {
    const canvas = this.getActiveCanvas();
    return canvas ? Array.from(canvas.nodes.values()) : [];
  }

  getConnections(): CanvasConnection[] {
    const canvas = this.getActiveCanvas();
    return canvas ? Array.from(canvas.connections.values()) : [];
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}

export const neuralCanvas = NeuralCanvasEngine.getInstance();

