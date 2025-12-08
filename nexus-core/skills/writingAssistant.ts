/**
 * Writing Assistant Skill
 * Helps with writing, editing, and content creation
 */

import type { Skill, SkillInput, SkillOutput } from "../core/types";

const writingAssistantSkill: Skill = {
  id: "writingAssistant",
  name: "Writing Assistant",
  description: "Helps with writing, editing, and content creation",
  category: "creative",

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { data, options } = input;
    const mode = options?.mode || "improve";
    const text = typeof data === "string" ? data : data.text || "";

    try {
      let result;
      
      switch (mode) {
        case "improve":
          result = improveWriting(text);
          break;
        case "outline":
          result = createOutline(data.topic || text);
          break;
        case "expand":
          result = expandText(text);
          break;
        case "simplify":
          result = simplifyText(text);
          break;
        case "proofread":
          result = proofread(text);
          break;
        default:
          result = improveWriting(text);
      }

      return { success: true, result };
    } catch (error: any) {
      return { success: false, result: null, error: error.message };
    }
  },
};

function improveWriting(text: string): any {
  const suggestions: string[] = [];
  let improvedText = text;

  // Basic improvements
  const patterns = [
    { find: /\s+/g, replace: " ", note: "Fixed spacing" },
    { find: /\.\s*\./g, replace: ".", note: "Removed double periods" },
    { find: /\bi\b/g, replace: "I", note: "Capitalized 'I'" },
  ];

  patterns.forEach(({ find, replace, note }) => {
    if (find.test(improvedText)) {
      improvedText = improvedText.replace(find, replace);
      suggestions.push(note);
    }
  });

  // Check for common issues
  if (text.split(/[.!?]/).some(s => s.trim().length > 100)) {
    suggestions.push("Consider breaking long sentences");
  }

  if (text.length > 0 && !text.match(/[.!?]$/)) {
    suggestions.push("Add ending punctuation");
  }

  return {
    original: text,
    improved: improvedText.trim(),
    suggestions,
    wordCount: text.split(/\s+/).filter(w => w).length,
  };
}

function createOutline(topic: string): any {
  return {
    topic,
    outline: [
      { level: 1, title: "Introduction", notes: "Hook and thesis statement" },
      { level: 1, title: "Background", notes: "Context and definitions" },
      { level: 1, title: "Main Point 1", notes: "First major argument" },
      { level: 2, title: "Supporting Evidence", notes: "Data and examples" },
      { level: 1, title: "Main Point 2", notes: "Second major argument" },
      { level: 2, title: "Supporting Evidence", notes: "Data and examples" },
      { level: 1, title: "Main Point 3", notes: "Third major argument" },
      { level: 2, title: "Supporting Evidence", notes: "Data and examples" },
      { level: 1, title: "Conclusion", notes: "Summary and call to action" },
    ],
  };
}

function expandText(text: string): any {
  return {
    original: text,
    expanded: text + "\n\n[Expansion would add:\n- More context and background\n- Supporting examples\n- Detailed explanations\n- Transitions between ideas]",
    suggestions: [
      "Add specific examples",
      "Include relevant statistics",
      "Explain technical terms",
      "Add transitional phrases",
    ],
  };
}

function simplifyText(text: string): any {
  // Basic simplification
  const simplified = text
    .replace(/utilize/gi, "use")
    .replace(/implement/gi, "do")
    .replace(/facilitate/gi, "help")
    .replace(/subsequent/gi, "next")
    .replace(/prior to/gi, "before");

  return {
    original: text,
    simplified,
    changes: ["Replaced complex words with simpler alternatives"],
    readabilityImprovement: "Simplified vocabulary",
  };
}

function proofread(text: string): any {
  const issues: Array<{ type: string; description: string; position?: number }> = [];

  // Check for common issues
  if (/\s{2,}/g.test(text)) {
    issues.push({ type: "spacing", description: "Multiple consecutive spaces found" });
  }

  if (/[,;:]\s*[A-Z]/g.test(text)) {
    issues.push({ type: "capitalization", description: "Possible incorrect capitalization after punctuation" });
  }

  // Check sentence endings
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  sentences.forEach((s, i) => {
    if (s.trim().length < 10 && i < sentences.length - 1) {
      issues.push({ type: "fragment", description: `Possible sentence fragment: "${s.trim().slice(0, 20)}..."` });
    }
  });

  return {
    text,
    issues,
    score: Math.max(0, 100 - issues.length * 10),
    summary: issues.length === 0 
      ? "No obvious issues found!" 
      : `Found ${issues.length} potential issue(s)`,
  };
}

export default writingAssistantSkill;


