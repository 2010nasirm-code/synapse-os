'use client';

// ============================================================================
// NEXUS PRIME - AGENTS HOOK
// React hook for agent management
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { agentsAPI, AgentInfo } from '../api/agents-api';
import { primeAPI } from '../api/prime-api';

export function useAgents() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [stats, setStats] = useState<ReturnType<typeof agentsAPI.getStats> | null>(null);

  // Load agents
  useEffect(() => {
    const loadAgents = () => {
      setAgents(agentsAPI.getAgents());
      setStats(agentsAPI.getStats());
    };

    loadAgents();

    // Refresh on agent events
    const unsubscribe = primeAPI.on('agent:*', loadAgents);

    // Periodic refresh
    const interval = setInterval(loadAgents, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Agent control functions
  const startAgent = useCallback(async (agentId: string) => {
    const result = await agentsAPI.startAgent(agentId);
    setAgents(agentsAPI.getAgents());
    return result;
  }, []);

  const stopAgent = useCallback(async (agentId: string) => {
    const result = await agentsAPI.stopAgent(agentId);
    setAgents(agentsAPI.getAgents());
    return result;
  }, []);

  const pauseAgent = useCallback((agentId: string) => {
    const result = agentsAPI.pauseAgent(agentId);
    setAgents(agentsAPI.getAgents());
    return result;
  }, []);

  const resumeAgent = useCallback((agentId: string) => {
    const result = agentsAPI.resumeAgent(agentId);
    setAgents(agentsAPI.getAgents());
    return result;
  }, []);

  const executeCapability = useCallback(async (agentId: string, capability: string, data: any) => {
    return agentsAPI.executeCapability(agentId, capability, data);
  }, []);

  const addTask = useCallback((agentId: string, task: Parameters<typeof agentsAPI.addTask>[1]) => {
    return agentsAPI.addTask(agentId, task);
  }, []);

  return {
    agents,
    stats,
    startAgent,
    stopAgent,
    pauseAgent,
    resumeAgent,
    executeCapability,
    addTask,
    getAgent: agentsAPI.getAgent.bind(agentsAPI),
    findAgentWithCapability: agentsAPI.findAgentWithCapability.bind(agentsAPI),
  };
}

export function useAgent(agentId: string) {
  const [agent, setAgent] = useState<AgentInfo | undefined>();

  useEffect(() => {
    const loadAgent = () => {
      setAgent(agentsAPI.getAgent(agentId));
    };

    loadAgent();

    // Subscribe to agent events
    const unsubscribe = agentsAPI.subscribeToAgent(agentId, '*', loadAgent);

    return unsubscribe;
  }, [agentId]);

  return agent;
}

