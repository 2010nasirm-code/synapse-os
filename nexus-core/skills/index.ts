/**
 * Skills Registry
 * Exports all skills for easy import
 */

export { default as reasoningSkill } from "./reasoning";
export { default as summarizationSkill } from "./summarization";
export { default as translationSkill } from "./translation";
export { default as codeAnalysisSkill } from "./codeAnalysis";
export { default as dataVisualizerSkill } from "./dataVisualizer";
export { default as taskPlannerSkill } from "./taskPlanner";
export { default as writingAssistantSkill } from "./writingAssistant";

// Import all skills
import reasoningSkill from "./reasoning";
import summarizationSkill from "./summarization";
import translationSkill from "./translation";
import codeAnalysisSkill from "./codeAnalysis";
import dataVisualizerSkill from "./dataVisualizer";
import taskPlannerSkill from "./taskPlanner";
import writingAssistantSkill from "./writingAssistant";

// Skills registry map
export const skillsRegistry = new Map([
  ["reasoning", reasoningSkill],
  ["summarization", summarizationSkill],
  ["translation", translationSkill],
  ["codeAnalysis", codeAnalysisSkill],
  ["dataVisualizer", dataVisualizerSkill],
  ["taskPlanner", taskPlannerSkill],
  ["writingAssistant", writingAssistantSkill],
]);

// Execute a skill by ID
export async function executeSkill(
  skillId: string,
  data: any,
  options?: Record<string, any>
) {
  const skill = skillsRegistry.get(skillId);
  if (!skill) {
    return { success: false, result: null, error: `Skill not found: ${skillId}` };
  }
  return skill.execute({ data, options });
}

// Get all available skills
export function getAllSkills() {
  return Array.from(skillsRegistry.values());
}

// All skills array
export const allSkills = [
  reasoningSkill,
  summarizationSkill,
  translationSkill,
  codeAnalysisSkill,
  dataVisualizerSkill,
  taskPlannerSkill,
  writingAssistantSkill,
];

