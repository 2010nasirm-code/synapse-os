"use client";

import { HelpCircle, Book, MessageSquare, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HelpPage() {
  const helpItems = [
    {
      icon: Book,
      title: "Getting Started",
      description: "Learn the basics of Synapse OS",
      items: [
        "Add items in the Tracker to start organizing",
        "Get AI suggestions based on your data",
        "Create automations to save time",
        "View analytics to track progress",
      ],
    },
    {
      icon: MessageSquare,
      title: "Features",
      description: "What you can do with Synapse OS",
      items: [
        "Track tasks and items with priorities",
        "Get AI-powered smart suggestions",
        "Automate repetitive workflows",
        "Analyze your productivity patterns",
      ],
    },
  ];

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Help Center</h1>
        <p className="text-muted-foreground">Get help and learn how to use Synapse OS.</p>
      </div>

      <div className="space-y-6">
        {helpItems.map((item) => (
          <div key={item.title} className="p-6 rounded-xl border bg-card">
            <div className="flex items-center gap-3 mb-4">
              <item.icon className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
            <ul className="space-y-2 ml-9">
              {item.items.map((text, i) => (
                <li key={i} className="text-sm text-muted-foreground">• {text}</li>
              ))}
            </ul>
          </div>
        ))}

        {/* Contact */}
        <div className="p-6 rounded-xl border bg-card">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="h-6 w-6 text-primary" />
            <div>
              <h3 className="font-semibold">Need More Help?</h3>
              <p className="text-sm text-muted-foreground">Use the feedback button to contact us</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Click the 💬 button in the bottom-right corner to send feedback or report issues.
          </p>
        </div>
      </div>
    </div>
  );
}


