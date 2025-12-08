/**
 * Data Exporter
 * Export data in various formats
 */

export type ExportFormat = "json" | "csv" | "markdown";

interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeMetadata?: boolean;
}

/**
 * Export data to specified format
 */
export function exportData(
  data: any,
  options: ExportOptions
): { content: string; filename: string; mimeType: string } {
  const { format, filename, includeMetadata = true } = options;
  const timestamp = new Date().toISOString().split("T")[0];
  
  switch (format) {
    case "json":
      return {
        content: exportToJSON(data, includeMetadata),
        filename: filename || `export-${timestamp}.json`,
        mimeType: "application/json",
      };
    case "csv":
      return {
        content: exportToCSV(data),
        filename: filename || `export-${timestamp}.csv`,
        mimeType: "text/csv",
      };
    case "markdown":
      return {
        content: exportToMarkdown(data),
        filename: filename || `export-${timestamp}.md`,
        mimeType: "text/markdown",
      };
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

function exportToJSON(data: any, includeMetadata: boolean): string {
  const exportObj = includeMetadata
    ? {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        data,
      }
    : data;

  return JSON.stringify(exportObj, null, 2);
}

function exportToCSV(data: any): string {
  if (!Array.isArray(data)) {
    data = [data];
  }

  if (data.length === 0) return "";

  // Get headers from first item
  const headers = Object.keys(data[0]);
  const rows = [headers.join(",")];

  data.forEach((item: any) => {
    const values = headers.map((header) => {
      const value = item[header];
      if (value === null || value === undefined) return "";
      if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    });
    rows.push(values.join(","));
  });

  return rows.join("\n");
}

function exportToMarkdown(data: any): string {
  let md = `# Data Export\n\n`;
  md += `*Exported: ${new Date().toLocaleString()}*\n\n`;

  if (Array.isArray(data)) {
    if (data.length === 0) {
      md += "*No data*\n";
      return md;
    }

    // Create table
    const headers = Object.keys(data[0]);
    md += `| ${headers.join(" | ")} |\n`;
    md += `| ${headers.map(() => "---").join(" | ")} |\n`;

    data.forEach((item: any) => {
      const values = headers.map((h) => {
        const val = item[h];
        if (val === null || val === undefined) return "";
        if (typeof val === "object") return JSON.stringify(val);
        return String(val);
      });
      md += `| ${values.join(" | ")} |\n`;
    });
  } else if (typeof data === "object") {
    md += "## Properties\n\n";
    Object.entries(data).forEach(([key, value]) => {
      md += `- **${key}**: ${JSON.stringify(value)}\n`;
    });
  } else {
    md += String(data);
  }

  return md;
}

/**
 * Create download blob for browser
 */
export function createDownloadBlob(
  content: string,
  mimeType: string
): Blob {
  return new Blob([content], { type: mimeType });
}

/**
 * Trigger browser download
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  if (typeof window === "undefined") return;

  const blob = createDownloadBlob(content, mimeType);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

