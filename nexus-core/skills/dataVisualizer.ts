/**
 * Data Visualizer Skill
 * Generates chart configurations and visualizations
 */

import type { Skill, SkillInput, SkillOutput } from "../core/types";

const dataVisualizerSkill: Skill = {
  id: "dataVisualizer",
  name: "Data Visualizer",
  description: "Generates chart configurations and visualizations",
  category: "data",

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { data, options } = input;
    const chartType = options?.chartType || "auto";

    try {
      const config = generateChartConfig(data, chartType);
      return { success: true, result: config };
    } catch (error: any) {
      return { success: false, result: null, error: error.message };
    }
  },
};

function generateChartConfig(data: any, chartType: string): any {
  // Auto-detect best chart type
  const type = chartType === "auto" ? detectBestChartType(data) : chartType;

  switch (type) {
    case "bar":
      return generateBarChart(data);
    case "line":
      return generateLineChart(data);
    case "pie":
      return generatePieChart(data);
    case "area":
      return generateAreaChart(data);
    default:
      return generateBarChart(data);
  }
}

function detectBestChartType(data: any): string {
  if (Array.isArray(data)) {
    if (data.length > 10) return "line";
    if (data.every(d => typeof d === "number")) return "bar";
    if (data.every(d => d.date || d.timestamp)) return "line";
  }
  return "bar";
}

function generateBarChart(data: any): any {
  const items = normalizeData(data);
  
  return {
    type: "bar",
    config: {
      data: items.map((item, i) => ({
        name: item.label || `Item ${i + 1}`,
        value: item.value || 0,
      })),
      xAxis: { key: "name" },
      yAxis: { key: "value" },
      colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
    },
    description: `Bar chart with ${items.length} items`,
  };
}

function generateLineChart(data: any): any {
  const items = normalizeData(data);

  return {
    type: "line",
    config: {
      data: items.map((item, i) => ({
        x: item.date || item.label || i,
        y: item.value || 0,
      })),
      xAxis: { key: "x", label: "Time" },
      yAxis: { key: "y", label: "Value" },
      stroke: "#3b82f6",
      strokeWidth: 2,
    },
    description: `Line chart with ${items.length} data points`,
  };
}

function generatePieChart(data: any): any {
  const items = normalizeData(data);
  const total = items.reduce((sum, item) => sum + (item.value || 0), 0);

  return {
    type: "pie",
    config: {
      data: items.map((item, i) => ({
        name: item.label || `Segment ${i + 1}`,
        value: item.value || 0,
        percentage: total > 0 ? ((item.value || 0) / total * 100).toFixed(1) + "%" : "0%",
      })),
      colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
    },
    description: `Pie chart with ${items.length} segments`,
  };
}

function generateAreaChart(data: any): any {
  const items = normalizeData(data);

  return {
    type: "area",
    config: {
      data: items.map((item, i) => ({
        x: item.date || item.label || i,
        y: item.value || 0,
      })),
      fill: "rgba(59, 130, 246, 0.2)",
      stroke: "#3b82f6",
    },
    description: `Area chart with ${items.length} data points`,
  };
}

function normalizeData(data: any): Array<{ label?: string; value: number; date?: string }> {
  if (Array.isArray(data)) {
    return data.map((item, i) => {
      if (typeof item === "number") {
        return { value: item };
      }
      return {
        label: item.name || item.label || item.category,
        value: item.value || item.count || item.amount || 0,
        date: item.date || item.timestamp,
      };
    });
  }

  if (typeof data === "object") {
    return Object.entries(data).map(([key, value]) => ({
      label: key,
      value: typeof value === "number" ? value : 0,
    }));
  }

  return [];
}

export default dataVisualizerSkill;


