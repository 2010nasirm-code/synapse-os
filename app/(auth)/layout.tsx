import Link from "next/link";
import { Brain } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="p-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <Brain className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">Synapse OS</span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-sm text-muted-foreground">
        <span className="px-2 py-1 rounded-full bg-orange-500/10 text-orange-500 text-xs font-medium">
          🧪 Beta Version
        </span>
      </footer>
    </div>
  );
}


