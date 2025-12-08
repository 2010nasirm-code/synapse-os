"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Brain,
  LayoutDashboard,
  ListTodo,
  Sparkles,
  Workflow,
  BarChart3,
  Settings,
  User,
  HelpCircle,
  Network,
  Bot,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  Shield,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/debug/logger";
import { useInteractionTracker } from "@/hooks/use-interaction-tracker";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Nexus", href: "/nexus", icon: Zap },
  { name: "Tracker", href: "/tracker", icon: ListTodo },
  { name: "Suggestions", href: "/suggestions", icon: Sparkles },
  { name: "Automations", href: "/automations", icon: Workflow },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Knowledge", href: "/knowledge", icon: Network },
  { name: "Agents", href: "/agents", icon: Bot },
  { name: "Admin", href: "/admin", icon: Shield },
];

const secondaryNav = [
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Profile", href: "/profile", icon: User },
  { name: "Help", href: "/help", icon: HelpCircle },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const supabase = getSupabaseClient();
  const { track } = useInteractionTracker("dashboard-layout");

  useEffect(() => {
    setMounted(true);
    logger.info("ui", "Dashboard layout mounted");
  }, []);

  const handleSignOut = async () => {
    track("sign_out_clicked");
    logger.info("auth", "User signing out");
    await supabase.auth.signOut();
    router.push("/login");
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    track("theme_toggled", { newTheme });
    setTheme(newTheme);
  };

  const NavLink = ({ item, onClick }: { item: typeof navigation[0]; onClick?: () => void }) => {
    const isActive = pathname === item.href;
    return (
      <Link href={item.href} onClick={onClick}>
        <motion.div
          whileHover={{ scale: 1.02, x: 4 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
            isActive
              ? "bg-primary/10 text-primary font-medium shadow-sm"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
          <span className={cn("transition-opacity duration-200", !isSidebarOpen && "lg:opacity-0 lg:w-0")}>
            {item.name}
          </span>
          {isActive && (
            <motion.div
              layoutId="activeIndicator"
              className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
            />
          )}
        </motion.div>
      </Link>
    );
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 256 : 72 }}
        className={cn(
          "hidden lg:flex flex-col border-r border-border/50 bg-card/50 backdrop-blur-xl fixed top-0 left-0 h-full z-40"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border/50">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <motion.span
              animate={{ opacity: isSidebarOpen ? 1 : 0, width: isSidebarOpen ? "auto" : 0 }}
              className="font-bold text-lg overflow-hidden whitespace-nowrap"
            >
              Synapse OS
            </motion.span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="h-8 w-8"
          >
            {isSidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto relative">
          {navigation.map((item) => (
            <NavLink key={item.name} item={item} />
          ))}
        </nav>

        {/* Secondary Navigation */}
        <div className="p-4 border-t border-border/50 space-y-1">
          {secondaryNav.map((item) => (
            <NavLink key={item.name} item={item} />
          ))}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-200"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span className={cn("transition-opacity duration-200", !isSidebarOpen && "opacity-0 w-0")}>
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </span>
          </button>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
          >
            <LogOut className="h-5 w-5" />
            <span className={cn("transition-opacity duration-200", !isSidebarOpen && "opacity-0 w-0")}>
              Sign Out
            </span>
          </button>
        </div>

        {/* Beta Badge */}
        <div className={cn(
          "p-4 border-t border-border/50",
          !isSidebarOpen && "flex justify-center"
        )}>
          <div className="px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-500 text-xs font-medium text-center">
            {isSidebarOpen ? "🧪 Beta Testing Mode" : "🧪"}
          </div>
        </div>
      </motion.aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b border-border/50 bg-background/95 backdrop-blur-xl z-40 flex items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          <span className="font-bold">Synapse OS</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-50"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="lg:hidden fixed right-0 top-0 h-full w-72 bg-card border-l border-border/50 z-50 flex flex-col"
            >
              <div className="h-16 flex items-center justify-between px-4 border-b border-border/50">
                <span className="font-semibold">Menu</span>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navigation.map((item) => (
                  <NavLink key={item.name} item={item} onClick={() => setIsMobileMenuOpen(false)} />
                ))}
                <div className="pt-4 mt-4 border-t border-border/50 space-y-1">
                  {secondaryNav.map((item) => (
                    <NavLink key={item.name} item={item} onClick={() => setIsMobileMenuOpen(false)} />
                  ))}
                </div>
              </nav>
              <div className="p-4 border-t border-border/50">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300",
        isSidebarOpen ? "lg:ml-64" : "lg:ml-[72px]",
        "pt-16 lg:pt-0"
      )}>
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}

