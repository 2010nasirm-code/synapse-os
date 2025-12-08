/**
 * Code Analysis Skill
 * Analyzes code structure, quality, and patterns
 */

import type { Skill, SkillInput, SkillOutput } from "../core/types";

const codeAnalysisSkill: Skill = {
  id: "codeAnalysis",
  name: "Code Analysis",
  description: "Analyzes code structure, quality, and patterns",
  category: "analysis",

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { data, options } = input;
    const code = typeof data === "string" ? data : data.code || "";
    const language = options?.language || detectLanguage(code);

    try {
      const analysis = analyzeCode(code, language);
      return { success: true, result: analysis };
    } catch (error: any) {
      return { success: false, result: null, error: error.message };
    }
  },
};

function detectLanguage(code: string): string {
  if (code.includes("import React") || code.includes("useState")) return "javascript/react";
  if (code.includes("def ") || code.includes("import ")) return "python";
  if (code.includes("func ") || code.includes("package main")) return "go";
  if (code.includes("fn ") || code.includes("let mut")) return "rust";
  if (code.includes("public class") || code.includes("System.out")) return "java";
  if (code.includes("<?php")) return "php";
  if (code.includes("const ") || code.includes("let ") || code.includes("function")) return "javascript";
  return "unknown";
}

function analyzeCode(code: string, language: string): any {
  const lines = code.split("\n");
  const nonEmptyLines = lines.filter(l => l.trim().length > 0);
  const commentLines = lines.filter(l => 
    l.trim().startsWith("//") || 
    l.trim().startsWith("#") || 
    l.trim().startsWith("/*")
  );

  // Count functions
  const functionPatterns = {
    javascript: /function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(/g,
    python: /def\s+\w+/g,
    go: /func\s+\w+/g,
    default: /function|def|func/g,
  };
  const pattern = functionPatterns[language as keyof typeof functionPatterns] || functionPatterns.default;
  const functionMatches = code.match(pattern) || [];

  // Complexity estimate (very basic)
  const conditionals = (code.match(/if\s*\(|else|switch|case/g) || []).length;
  const loops = (code.match(/for\s*\(|while\s*\(|\.map\(|\.forEach\(/g) || []).length;
  const complexity = conditionals + loops;

  return {
    language,
    metrics: {
      totalLines: lines.length,
      codeLines: nonEmptyLines.length - commentLines.length,
      commentLines: commentLines.length,
      functions: functionMatches.length,
      complexity,
    },
    quality: {
      hasComments: commentLines.length > 0,
      commentRatio: ((commentLines.length / nonEmptyLines.length) * 100).toFixed(1) + "%",
      complexityLevel: complexity < 5 ? "Low" : complexity < 15 ? "Medium" : "High",
    },
    suggestions: generateCodeSuggestions(code, complexity, commentLines.length),
  };
}

function generateCodeSuggestions(code: string, complexity: number, comments: number): string[] {
  const suggestions: string[] = [];
  
  if (comments === 0) {
    suggestions.push("Add comments to explain complex logic");
  }
  
  if (complexity > 10) {
    suggestions.push("Consider breaking down complex functions");
  }
  
  if (code.length > 1000 && !code.includes("export")) {
    suggestions.push("Consider modularizing into separate files");
  }

  if (suggestions.length === 0) {
    suggestions.push("Code looks well structured!");
  }

  return suggestions;
}

export default codeAnalysisSkill;


