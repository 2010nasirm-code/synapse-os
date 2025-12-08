/**
 * ============================================================================
 * NEXUS PRIME - REPAIR AGENT
 * ============================================================================
 * 
 * Suggests code fixes and debugging steps:
 * - Generates patch suggestions
 * - Creates PR drafts only (never auto-applies)
 * - Provides debugging guidance
 * 
 * @module nexus/prime/agents/RepairAgent
 * @version 1.0.0
 */

import { AgentConfig, AgentResult, AIRequest, SystemContext, PatchSuggestion } from '../core/types';
import { BaseAgent } from './BaseAgent';

// ============================================================================
// REPAIR AGENT
// ============================================================================

export class RepairAgent extends BaseAgent {
  readonly config: AgentConfig = {
    id: 'repair',
    name: 'Repair Agent',
    description: 'Suggests code fixes and debugging steps',
    capabilities: ['debug', 'fix', 'patch', 'repair', 'error', 'troubleshoot'],
    rateLimit: 10,
    safetyTier: 3,
    canProduceActions: true,
    requiresContext: true,
    timeout: 30000,
  };

  async process(request: AIRequest, context: SystemContext): Promise<AgentResult> {
    return this.executeWithTracking(request, context, 'repair', async () => {
      const repairType = this.determineRepairType(request.prompt);
      
      switch (repairType) {
        case 'error':
          return this.diagnoseError(request, context);
        case 'debug':
          return this.provideDebugGuidance(request, context);
        case 'fix':
          return this.suggestFix(request, context);
        default:
          return this.generalTroubleshooting(request);
      }
    });
  }

  /**
   * Determine the type of repair needed
   */
  private determineRepairType(prompt: string): 'error' | 'debug' | 'fix' | 'general' {
    const lower = prompt.toLowerCase();
    
    if (/error|exception|crash|fail/i.test(lower)) return 'error';
    if (/debug|trace|log|inspect/i.test(lower)) return 'debug';
    if (/fix|repair|correct|patch/i.test(lower)) return 'fix';
    
    return 'general';
  }

  /**
   * Diagnose an error
   */
  private diagnoseError(
    request: AIRequest,
    _context: SystemContext
  ): Omit<AgentResult, 'provenance' | 'processingTimeMs'> {
    // Extract error information from prompt
    const errorInfo = this.extractErrorInfo(request.prompt);

    const insights = [
      this.createInsight(
        'analysis',
        'Error Analysis',
        `I've analyzed the error: "${errorInfo.summary}"\n\n` +
        `**Likely cause:** ${errorInfo.likelyCause}\n` +
        `**Severity:** ${errorInfo.severity}`,
        {
          level: errorInfo.severity === 'high' ? 'critical' : 'warning',
          confidence: 0.7,
          data: errorInfo,
        }
      ),
    ];

    // Create patch suggestion if applicable
    const patches = this.generatePatches(errorInfo);

    const actionDrafts = patches.map(patch => 
      this.createActionDraft(
        'patch',
        `Apply Fix: ${patch.description}`,
        'This will create a PR draft for review (not auto-applied)',
        {
          patch,
          targetFile: patch.file,
        },
        {
          requiresConfirmation: true,
          safetyLevel: 'high',
          preview: this.formatPatchPreview(patch),
          estimatedImpact: 'Code changes will be proposed as a PR draft.',
          reversible: true,
        }
      )
    );

    return this.createSuccessResult(
      `## Error Diagnosis\n\n` +
      `**Error:** ${errorInfo.summary}\n\n` +
      `### Analysis\n${errorInfo.analysis}\n\n` +
      `### Recommended Steps\n` +
      errorInfo.steps.map((s, i) => `${i + 1}. ${s}`).join('\n') +
      `\n\n_Note: Any code changes will be proposed as PR drafts for your review._`,
      {
        insights,
        actionDrafts,
        confidence: 0.75,
      }
    );
  }

  /**
   * Extract error information from prompt
   */
  private extractErrorInfo(prompt: string): {
    summary: string;
    likelyCause: string;
    severity: 'low' | 'medium' | 'high';
    analysis: string;
    steps: string[];
  } {
    // Simple error pattern matching
    let summary = 'Unknown error';
    let likelyCause = 'Could not determine cause';
    let severity: 'low' | 'medium' | 'high' = 'medium';
    let analysis = 'Further investigation needed.';
    let steps = ['Check the console for more details', 'Review recent changes'];

    // Type errors
    if (/type.*error|is not.*type|cannot.*type/i.test(prompt)) {
      summary = 'Type Error';
      likelyCause = 'Type mismatch or undefined value';
      analysis = 'The code is expecting a different type than what it received.';
      steps = [
        'Check the variable types at the error location',
        'Add type guards or null checks',
        'Verify data sources return expected types',
      ];
    }
    // Reference errors
    else if (/undefined|null|reference.*error/i.test(prompt)) {
      summary = 'Reference Error / Undefined Value';
      likelyCause = 'Accessing property of undefined or null';
      analysis = 'A variable or property is being accessed before it has a value.';
      steps = [
        'Add optional chaining (?.) to property access',
        'Initialize variables with default values',
        'Add null/undefined checks before usage',
      ];
    }
    // Network errors
    else if (/network|fetch|api|request.*fail/i.test(prompt)) {
      summary = 'Network/API Error';
      likelyCause = 'Failed network request or API issue';
      severity = 'high';
      analysis = 'The application failed to communicate with an external service.';
      steps = [
        'Check network connectivity',
        'Verify API endpoint URL and credentials',
        'Add error handling for failed requests',
        'Implement retry logic for transient failures',
      ];
    }
    // Render errors
    else if (/render|component|react|jsx/i.test(prompt)) {
      summary = 'Render Error';
      likelyCause = 'Component rendering issue';
      analysis = 'A React component failed to render properly.';
      steps = [
        'Check component props for correct types',
        'Wrap async data access in loading states',
        'Add error boundaries around suspect components',
      ];
    }

    return { summary, likelyCause, severity, analysis, steps };
  }

  /**
   * Generate patch suggestions
   */
  private generatePatches(errorInfo: ReturnType<typeof this.extractErrorInfo>): PatchSuggestion[] {
    const patches: PatchSuggestion[] = [];

    // Example patches based on error type
    if (errorInfo.summary.includes('Type')) {
      patches.push({
        id: `patch-${Date.now()}-1`,
        file: 'unknown',
        description: 'Add type safety checks',
        before: '// Original code',
        after: '// Code with type guards',
        lineStart: 0,
        lineEnd: 0,
        reason: 'Prevents type errors by adding runtime checks',
      });
    }

    if (errorInfo.summary.includes('Undefined')) {
      patches.push({
        id: `patch-${Date.now()}-2`,
        file: 'unknown',
        description: 'Add null safety',
        before: 'const value = obj.prop;',
        after: 'const value = obj?.prop ?? defaultValue;',
        lineStart: 0,
        lineEnd: 0,
        reason: 'Prevents undefined errors with optional chaining',
      });
    }

    return patches;
  }

  /**
   * Format patch preview
   */
  private formatPatchPreview(patch: PatchSuggestion): string {
    return `
\`\`\`diff
- ${patch.before}
+ ${patch.after}
\`\`\`
Reason: ${patch.reason}
    `.trim();
  }

  /**
   * Provide debug guidance
   */
  private provideDebugGuidance(
    _request: AIRequest,
    _context: SystemContext
  ): Omit<AgentResult, 'provenance' | 'processingTimeMs'> {
    return this.createSuccessResult(
      `## Debugging Guide\n\n` +
      `### 1. Check Console\n` +
      `Open browser DevTools (F12) → Console tab for error messages.\n\n` +
      `### 2. Add Logging\n` +
      `\`\`\`javascript\nconsole.log('Debug:', variableName);\n\`\`\`\n\n` +
      `### 3. Use Breakpoints\n` +
      `DevTools → Sources tab → Click line number to add breakpoint.\n\n` +
      `### 4. Check Network\n` +
      `DevTools → Network tab to inspect API calls.\n\n` +
      `### 5. React DevTools\n` +
      `Install React DevTools extension to inspect component state.\n\n` +
      `Would you like me to help debug a specific issue?`,
      { confidence: 0.9 }
    );
  }

  /**
   * Suggest a fix
   */
  private suggestFix(
    request: AIRequest,
    context: SystemContext
  ): Omit<AgentResult, 'provenance' | 'processingTimeMs'> {
    // This would analyze the specific issue and suggest targeted fixes
    return this.diagnoseError(request, context);
  }

  /**
   * General troubleshooting
   */
  private generalTroubleshooting(
    _request: AIRequest
  ): Omit<AgentResult, 'provenance' | 'processingTimeMs'> {
    return this.createSuccessResult(
      `## Troubleshooting Help\n\n` +
      `I can help you with:\n\n` +
      `• **Error diagnosis** - Tell me about the error you're seeing\n` +
      `• **Debug guidance** - Step-by-step debugging instructions\n` +
      `• **Fix suggestions** - I'll propose fixes as PR drafts\n\n` +
      `_Note: I never auto-apply code changes. All fixes are proposed as drafts for your review._\n\n` +
      `What issue would you like help with?`,
      { confidence: 0.9 }
    );
  }

  canHandle(request: AIRequest): boolean {
    return this.matchesPatterns(request.prompt, [
      /error/i,
      /bug/i,
      /fix/i,
      /broken/i,
      /not working/i,
      /debug/i,
      /crash/i,
      /fail/i,
    ]);
  }
}

export default RepairAgent;

