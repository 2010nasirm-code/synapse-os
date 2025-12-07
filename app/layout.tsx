import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { FeedbackWidget } from "@/components/feedback/feedback-widget";
import { DebugPanel } from "@/components/debug/debug-panel";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Synapse OS - AI-Powered Productivity",
  description: "Your cognitive operating system powered by AI agents",
  keywords: ["AI", "productivity", "automation", "smart suggestions"],
  authors: [{ name: "Synapse OS Team" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isBetaMode = process.env.NODE_ENV !== "production" || 
                     process.env.NEXT_PUBLIC_BETA_MODE === "true";

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          
          {/* Beta Testing Tools */}
          {isBetaMode && (
            <>
              <FeedbackWidget position="bottom-right" />
              <DebugPanel enabled={true} />
            </>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}

