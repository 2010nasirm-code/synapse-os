/**
 * Summarization Skill
 * Text summarization and condensation
 */

import type { Skill, SkillInput, SkillOutput } from "../core/types";

const summarizationSkill: Skill = {
  id: "summarization",
  name: "Summarization",
  description: "Creates summaries, abstracts, and condensed versions",
  category: "reasoning",

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { data, options } = input;
    const length = options?.length || "medium";
    const format = options?.format || "paragraph";

    try {
      const text = typeof data === "string" ? data : JSON.stringify(data);
      const summary = summarize(text, length, format);
      return { success: true, result: summary };
    } catch (error: any) {
      return { success: false, result: null, error: error.message };
    }
  },
};

function summarize(text: string, length: string, format: string): any {
  const words = text.split(/\s+/);
  const targetLength = {
    short: Math.min(50, words.length / 4),
    medium: Math.min(100, words.length / 2),
    long: Math.min(200, words.length * 0.75),
  }[length] || 100;

  // Simple extractive summarization
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const selectedSentences = sentences.slice(0, Math.ceil(targetLength / 20));
  
  let summary = selectedSentences.join(". ").trim();
  if (summary && !summary.endsWith(".")) summary += ".";

  if (format === "bullets") {
    return {
      format: "bullets",
      points: selectedSentences.map(s => s.trim()),
      wordCount: summary.split(/\s+/).length,
    };
  }

  return {
    format: "paragraph",
    summary: summary || "No content to summarize.",
    wordCount: summary.split(/\s+/).length,
    originalLength: words.length,
    compressionRatio: ((1 - summary.split(/\s+/).length / words.length) * 100).toFixed(1) + "%",
  };
}

export default summarizationSkill;


