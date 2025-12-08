// Dimensional View System - 3D-like living graph visualization
export interface DimensionalNode {
  id: string;
  type: 'item' | 'category' | 'automation' | 'suggestion' | 'event' | 'cluster';
  label: string;
  x: number;
  y: number;
  z: number; // Depth/importance
  size: number;
  color: string;
  velocity: { x: number; y: number; z: number };
  connections: string[];
  activity: number; // 0-100, affects glow/pulse
  metadata?: Record<string, any>;
}

export interface DimensionalEdge {
  id: string;
  source: string;
  target: string;
  type: 'relation' | 'trigger' | 'influence' | 'dependency';
  strength: number;
  animated: boolean;
}

export interface DimensionalCluster {
  id: string;
  nodes: string[];
  center: { x: number; y: number; z: number };
  radius: number;
  label: string;
  color: string;
}

export interface DimensionalViewState {
  nodes: DimensionalNode[];
  edges: DimensionalEdge[];
  clusters: DimensionalCluster[];
  camera: {
    x: number;
    y: number;
    z: number;
    rotationX: number;
    rotationY: number;
    zoom: number;
  };
  activeFilters: string[];
  highlightedNode: string | null;
}

const COLORS = {
  item: '#6366f1',
  category: '#8b5cf6',
  automation: '#f59e0b',
  suggestion: '#10b981',
  event: '#ef4444',
  cluster: '#3b82f6',
};

class DimensionalViewEngine {
  private state: DimensionalViewState = {
    nodes: [],
    edges: [],
    clusters: [],
    camera: { x: 0, y: 0, z: 500, rotationX: 0, rotationY: 0, zoom: 1 },
    activeFilters: [],
    highlightedNode: null,
  };
  private animationFrame: number | null = null;
  private listeners: Set<(state: DimensionalViewState) => void> = new Set();

  initialize(data: { items: any[]; automations: any[]; suggestions: any[] }) {
    // Create nodes from data
    const nodes: DimensionalNode[] = [];
    const edges: DimensionalEdge[] = [];
    
    // Add items
    data.items.forEach((item, i) => {
      const angle = (i / data.items.length) * Math.PI * 2;
      const radius = 200;
      
      nodes.push({
        id: item.id,
        type: 'item',
        label: item.name || item.title || `Item ${i}`,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: Math.random() * 100 - 50,
        size: 20 + (item.priority === 'high' ? 10 : 0),
        color: COLORS.item,
        velocity: { x: 0, y: 0, z: 0 },
        connections: [],
        activity: item.status === 'completed' ? 30 : 70,
        metadata: item,
      });
    });
    
    // Add automations
    data.automations.forEach((auto, i) => {
      const angle = (i / data.automations.length) * Math.PI * 2 + Math.PI / 4;
      const radius = 300;
      
      nodes.push({
        id: auto.id,
        type: 'automation',
        label: auto.name || `Automation ${i}`,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: 50,
        size: 25,
        color: COLORS.automation,
        velocity: { x: 0, y: 0, z: 0 },
        connections: [],
        activity: auto.is_active ? 90 : 20,
        metadata: auto,
      });
    });
    
    // Add suggestions
    data.suggestions.forEach((sug, i) => {
      const angle = (i / data.suggestions.length) * Math.PI * 2 + Math.PI / 2;
      const radius = 250;
      
      nodes.push({
        id: sug.id,
        type: 'suggestion',
        label: sug.title || `Suggestion ${i}`,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: -30,
        size: 15,
        color: COLORS.suggestion,
        velocity: { x: 0, y: 0, z: 0 },
        connections: [],
        activity: sug.status === 'pending' ? 80 : 40,
        metadata: sug,
      });
    });
    
    // Create edges based on relationships
    nodes.forEach(node => {
      if (node.type === 'automation' && node.metadata?.item_id) {
        const itemId = node.metadata.item_id;
        const targetNode = nodes.find(n => n.id === itemId);
        if (targetNode) {
          edges.push({
            id: `${node.id}-${targetNode.id}`,
            source: node.id,
            target: targetNode.id,
            type: 'trigger',
            strength: 0.8,
            animated: true,
          });
          node.connections.push(targetNode.id);
          targetNode.connections.push(node.id);
        }
      }
      
      if (node.type === 'suggestion' && node.metadata?.item_id) {
        const itemId = node.metadata.item_id;
        const targetNode = nodes.find(n => n.id === itemId);
        if (targetNode) {
          edges.push({
            id: `${node.id}-${targetNode.id}`,
            source: node.id,
            target: targetNode.id,
            type: 'influence',
            strength: 0.5,
            animated: false,
          });
          node.connections.push(targetNode.id);
          targetNode.connections.push(node.id);
        }
      }
    });
    
    // Detect clusters
    const clusters = this.detectClusters(nodes);
    
    this.state = {
      ...this.state,
      nodes,
      edges,
      clusters,
    };
    
    this.startAnimation();
    this.notifyListeners();
  }

  private detectClusters(nodes: DimensionalNode[]): DimensionalCluster[] {
    const clusters: DimensionalCluster[] = [];
    const visited = new Set<string>();
    
    // Simple clustering by type
    const typeGroups = new Map<string, DimensionalNode[]>();
    nodes.forEach(node => {
      const group = typeGroups.get(node.type) || [];
      group.push(node);
      typeGroups.set(node.type, group);
    });
    
    typeGroups.forEach((groupNodes, type) => {
      if (groupNodes.length >= 3) {
        const center = {
          x: groupNodes.reduce((sum, n) => sum + n.x, 0) / groupNodes.length,
          y: groupNodes.reduce((sum, n) => sum + n.y, 0) / groupNodes.length,
          z: groupNodes.reduce((sum, n) => sum + n.z, 0) / groupNodes.length,
        };
        
        const maxDist = Math.max(...groupNodes.map(n => 
          Math.sqrt((n.x - center.x) ** 2 + (n.y - center.y) ** 2)
        ));
        
        clusters.push({
          id: `cluster-${type}`,
          nodes: groupNodes.map(n => n.id),
          center,
          radius: maxDist + 30,
          label: type.charAt(0).toUpperCase() + type.slice(1) + 's',
          color: COLORS[type as keyof typeof COLORS] || '#666',
        });
      }
    });
    
    return clusters;
  }

  private startAnimation() {
    if (typeof window === 'undefined') return;
    
    const animate = () => {
      // Apply forces
      this.state.nodes.forEach(node => {
        // Small random motion
        node.velocity.x += (Math.random() - 0.5) * 0.5;
        node.velocity.y += (Math.random() - 0.5) * 0.5;
        node.velocity.z += (Math.random() - 0.5) * 0.2;
        
        // Damping
        node.velocity.x *= 0.95;
        node.velocity.y *= 0.95;
        node.velocity.z *= 0.95;
        
        // Apply velocity
        node.x += node.velocity.x;
        node.y += node.velocity.y;
        node.z += node.velocity.z;
        
        // Activity pulse
        node.activity = Math.max(10, Math.min(100, 
          node.activity + (Math.random() - 0.5) * 5
        ));
      });
      
      // Repulsion between nodes
      for (let i = 0; i < this.state.nodes.length; i++) {
        for (let j = i + 1; j < this.state.nodes.length; j++) {
          const a = this.state.nodes[i];
          const b = this.state.nodes[j];
          
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          
          if (dist < 100) {
            const force = (100 - dist) / dist * 0.1;
            a.velocity.x -= dx * force;
            a.velocity.y -= dy * force;
            b.velocity.x += dx * force;
            b.velocity.y += dy * force;
          }
        }
      }
      
      // Attraction along edges
      this.state.edges.forEach(edge => {
        const source = this.state.nodes.find(n => n.id === edge.source);
        const target = this.state.nodes.find(n => n.id === edge.target);
        
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          
          const force = (dist - 150) * 0.001 * edge.strength;
          source.velocity.x += dx * force;
          source.velocity.y += dy * force;
          target.velocity.x -= dx * force;
          target.velocity.y -= dy * force;
        }
      });
      
      this.notifyListeners();
      this.animationFrame = requestAnimationFrame(animate);
    };
    
    this.animationFrame = requestAnimationFrame(animate);
  }

  stopAnimation() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  setCamera(updates: Partial<DimensionalViewState['camera']>) {
    this.state.camera = { ...this.state.camera, ...updates };
    this.notifyListeners();
  }

  highlightNode(nodeId: string | null) {
    this.state.highlightedNode = nodeId;
    this.notifyListeners();
  }

  setFilters(filters: string[]) {
    this.state.activeFilters = filters;
    this.notifyListeners();
  }

  subscribe(listener: (state: DimensionalViewState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  getState(): DimensionalViewState {
    return this.state;
  }

  getNode(id: string): DimensionalNode | undefined {
    return this.state.nodes.find(n => n.id === id);
  }

  getConnectedNodes(nodeId: string): DimensionalNode[] {
    const node = this.getNode(nodeId);
    if (!node) return [];
    return node.connections
      .map(id => this.getNode(id))
      .filter((n): n is DimensionalNode => n !== undefined);
  }
}

export const dimensionalView = new DimensionalViewEngine();

