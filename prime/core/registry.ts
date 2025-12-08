// ============================================================================
// NEXUS PRIME - SERVICE REGISTRY
// Central registry for all system components and services
// ============================================================================

export interface ServiceDefinition {
  name: string;
  version: string;
  status: 'registered' | 'initializing' | 'active' | 'error' | 'stopped';
  dependencies: string[];
  instance?: any;
  metadata: Record<string, unknown>;
  registeredAt: number;
  lastHealthCheck?: number;
}

export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services = new Map<string, ServiceDefinition>();
  private initOrder: string[] = [];

  private constructor() {}

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  // ----------------------------- Registration -------------------------------
  register<T>(
    name: string,
    instance: T,
    options: {
      version?: string;
      dependencies?: string[];
      metadata?: Record<string, unknown>;
    } = {}
  ): void {
    if (this.services.has(name)) {
      console.warn(`[Registry] Service ${name} already registered, updating...`);
    }

    this.services.set(name, {
      name,
      version: options.version || '1.0.0',
      status: 'registered',
      dependencies: options.dependencies || [],
      instance,
      metadata: options.metadata || {},
      registeredAt: Date.now(),
    });

    this.initOrder.push(name);
  }

  unregister(name: string): boolean {
    // Check if other services depend on this one
    for (const [serviceName, service] of this.services) {
      if (service.dependencies.includes(name) && service.status === 'active') {
        console.error(`[Registry] Cannot unregister ${name}: ${serviceName} depends on it`);
        return false;
      }
    }

    return this.services.delete(name);
  }

  // ----------------------------- Retrieval ----------------------------------
  get<T>(name: string): T | undefined {
    const service = this.services.get(name);
    return service?.instance as T | undefined;
  }

  getDefinition(name: string): ServiceDefinition | undefined {
    return this.services.get(name);
  }

  has(name: string): boolean {
    return this.services.has(name);
  }

  // ----------------------------- Status Management --------------------------
  setStatus(name: string, status: ServiceDefinition['status']): void {
    const service = this.services.get(name);
    if (service) {
      service.status = status;
    }
  }

  getStatus(name: string): ServiceDefinition['status'] | undefined {
    return this.services.get(name)?.status;
  }

  // ----------------------------- Initialization -----------------------------
  async initializeAll(): Promise<void> {
    // Sort by dependencies
    const sorted = this.topologicalSort();

    for (const name of sorted) {
      await this.initializeService(name);
    }
  }

  private async initializeService(name: string): Promise<void> {
    const service = this.services.get(name);
    if (!service) return;

    // Check dependencies
    for (const dep of service.dependencies) {
      const depService = this.services.get(dep);
      if (!depService || depService.status !== 'active') {
        console.error(`[Registry] Cannot initialize ${name}: dependency ${dep} not active`);
        service.status = 'error';
        return;
      }
    }

    try {
      service.status = 'initializing';
      
      // Call initialize if exists
      if (service.instance?.initialize) {
        await service.instance.initialize();
      }

      service.status = 'active';
      console.log(`[Registry] Service ${name} initialized`);

    } catch (error) {
      service.status = 'error';
      console.error(`[Registry] Failed to initialize ${name}:`, error);
    }
  }

  private topologicalSort(): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);

      const service = this.services.get(name);
      if (service) {
        for (const dep of service.dependencies) {
          visit(dep);
        }
      }

      result.push(name);
    };

    for (const name of this.services.keys()) {
      visit(name);
    }

    return result;
  }

  // ----------------------------- Health Check -------------------------------
  async healthCheck(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const now = Date.now();

    for (const [name, service] of this.services) {
      try {
        let healthy = service.status === 'active';

        // Call healthCheck if exists
        if (service.instance?.healthCheck) {
          healthy = await service.instance.healthCheck();
        }

        service.lastHealthCheck = now;
        results.set(name, healthy);

      } catch (error) {
        results.set(name, false);
        console.error(`[Registry] Health check failed for ${name}:`, error);
      }
    }

    return results;
  }

  // ----------------------------- Queries ------------------------------------
  getAll(): ServiceDefinition[] {
    return Array.from(this.services.values());
  }

  getActive(): ServiceDefinition[] {
    return this.getAll().filter(s => s.status === 'active');
  }

  getByStatus(status: ServiceDefinition['status']): ServiceDefinition[] {
    return this.getAll().filter(s => s.status === status);
  }

  // ----------------------------- Statistics ---------------------------------
  getStats(): {
    total: number;
    byStatus: Record<string, number>;
    averageAge: number;
  } {
    const all = this.getAll();
    const now = Date.now();

    const byStatus: Record<string, number> = {};
    let totalAge = 0;

    for (const service of all) {
      byStatus[service.status] = (byStatus[service.status] || 0) + 1;
      totalAge += now - service.registeredAt;
    }

    return {
      total: all.length,
      byStatus,
      averageAge: all.length > 0 ? totalAge / all.length : 0,
    };
  }
}

// Export singleton
export const registry = ServiceRegistry.getInstance();

