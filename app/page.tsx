"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles, Zap, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 glass sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Synapse OS</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="container py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm text-primary">
              <Sparkles className="h-4 w-4" />
              <span>Powered by AI Agents</span>
            </div>
            
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">
              Your{" "}
              <span className="gradient-text">Cognitive</span>
              <br />
              Operating System
            </h1>
            
            <p className="mb-10 text-lg text-muted-foreground md:text-xl">
              Synapse OS unifies AI agents, knowledge graphs, and adaptive interfaces 
              into a single intelligent layer that learns, predicts, and evolves with you.
            </p>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/register">
                <Button size="lg" className="gap-2">
                  Start Building
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container py-24">
          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard
              icon={<Brain className="h-10 w-10" />}
              title="Multi-Agent Hive Mind"
              description="Autonomous AI agents that collaborate to accomplish complex tasks across your workflow."
            />
            <FeatureCard
              icon={<Zap className="h-10 w-10" />}
              title="Context-Aware"
              description="Remembers everything and understands context across all your applications and activities."
            />
            <FeatureCard
              icon={<Sparkles className="h-10 w-10" />}
              title="Self-Evolving"
              description="Learns from your behavior, predicts your needs, and continuously optimizes itself."
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Synapse OS. Built with 🧠 by humans and AI.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-xl border border-border/50 bg-card p-8 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
      <div className="mb-4 text-primary">{icon}</div>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

