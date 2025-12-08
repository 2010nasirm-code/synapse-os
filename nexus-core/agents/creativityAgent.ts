/**
 * Creativity Agent
 * Generates ideas, brainstorms, and creative content
 */

import type { Agent, AgentInput, AgentOutput } from "../core/types";

const creativityAgent: Agent = {
  id: "creativity",
  name: "Creativity Agent",
  description: "Generates ideas, brainstorms solutions, and creates content",
  capabilities: ["brainstorming", "idea-generation", "creative-writing", "expansion"],
  priority: 9,
  enabled: true,

  async process(input: AgentInput): Promise<AgentOutput> {
    const { query, context } = input;

    try {
      const creativeType = detectCreativeType(query);
      const result = await generateCreativeOutput(creativeType, query, context);

      return {
        success: true,
        result,
        confidence: 0.75,
        explanation: `Generated ${creativeType} output`,
        suggestions: [
          "Explore another angle",
          "Combine ideas",
          "Add constraints for more focused ideas",
        ],
      };
    } catch (error: any) {
      return {
        success: false,
        result: null,
        confidence: 0,
        error: error.message,
      };
    }
  },
};

function detectCreativeType(query: string): string {
  const lower = query.toLowerCase();
  
  if (lower.includes("idea") || lower.includes("brainstorm")) return "brainstorm";
  if (lower.includes("expand") || lower.includes("elaborate")) return "expansion";
  if (lower.includes("write") || lower.includes("compose")) return "writing";
  if (lower.includes("name") || lower.includes("title")) return "naming";
  
  return "ideas";
}

async function generateCreativeOutput(
  type: string,
  query: string,
  context: Record<string, any>
): Promise<any> {
  const seed = query.replace(/brainstorm|ideas?|generate|create|give me/gi, "").trim();

  switch (type) {
    case "brainstorm":
      return generateBrainstorm(seed);
    case "expansion":
      return generateExpansion(seed);
    case "writing":
      return generateWriting(seed);
    case "naming":
      return generateNames(seed);
    default:
      return generateIdeas(seed);
  }
}

function generateBrainstorm(topic: string): { answer: string; ideas: string[] } {
  const ideas = [
    `Break down ${topic} into smaller components`,
    `Look at ${topic} from a different perspective`,
    `Combine ${topic} with an unrelated concept`,
    `What if ${topic} had no limitations?`,
    `How would an expert approach ${topic}?`,
    `What's the opposite approach to ${topic}?`,
    `What would make ${topic} 10x better?`,
    `What problems does ${topic} solve?`,
  ];

  const answer = `🧠 **Brainstorm: ${topic}**\n\n` +
    ideas.slice(0, 5).map((idea, i) => `${i + 1}. ${idea}`).join("\n");

  return { answer, ideas: ideas.slice(0, 5) };
}

function generateExpansion(seed: string): { answer: string; expansions: string[] } {
  const expansions = [
    `${seed} could be expanded by adding more context about the background`,
    `Consider the implications of ${seed} on related areas`,
    `${seed} connects to broader themes like efficiency, growth, and impact`,
    `The core of ${seed} can be applied in multiple domains`,
    `Building on ${seed}, we could explore advanced applications`,
  ];

  const answer = `📝 **Expansion of: ${seed}**\n\n` +
    expansions.map((exp, i) => `• ${exp}`).join("\n");

  return { answer, expansions };
}

function generateWriting(prompt: string): { answer: string; content: string } {
  const content = `Here's a draft based on "${prompt}":\n\n` +
    `[Opening]\nIntroducing the concept and setting the context...\n\n` +
    `[Main Points]\n- Key insight about the topic\n- Supporting details and examples\n- Practical applications\n\n` +
    `[Conclusion]\nSummarizing the key takeaways and next steps.`;

  return {
    answer: `✍️ **Writing Draft**\n\n${content}`,
    content,
  };
}

function generateNames(concept: string): { answer: string; names: string[] } {
  const prefixes = ["Smart", "Neo", "Pro", "Ultra", "Next", "Prime"];
  const suffixes = ["Hub", "Flow", "Mind", "Core", "Sync", "Wave"];
  
  const names: string[] = [];
  const words = concept.split(/\s+/).filter(w => w.length > 2);
  const baseWord = words[0] || "Project";

  prefixes.forEach(pre => {
    names.push(`${pre}${baseWord}`);
  });

  suffixes.forEach(suf => {
    names.push(`${baseWord}${suf}`);
  });

  names.push(`${baseWord}AI`, `${baseWord}X`, `i${baseWord}`);

  const answer = `🏷️ **Name Ideas for: ${concept}**\n\n` +
    names.slice(0, 8).map((name, i) => `${i + 1}. ${name}`).join("\n");

  return { answer, names: names.slice(0, 8) };
}

function generateIdeas(topic: string): { answer: string; ideas: string[] } {
  const ideas = [
    `Start with the simplest version of ${topic}`,
    `Research how others have approached ${topic}`,
    `Create a mind map around ${topic}`,
    `Set a time limit and free-write about ${topic}`,
    `Ask "what if?" questions about ${topic}`,
  ];

  const answer = `💡 **Ideas for: ${topic}**\n\n` +
    ideas.map((idea, i) => `${i + 1}. ${idea}`).join("\n");

  return { answer, ideas };
}

export default creativityAgent;

