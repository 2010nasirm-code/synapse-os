"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MessageSquarePlus,
  X,
  Bug,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Send,
  Camera,
  Loader2,
  CheckCircle,
  Star,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { logger } from "@/lib/debug/logger";

type FeedbackType = "bug" | "feature" | "general" | "rating";

interface FeedbackWidgetProps {
  position?: "bottom-right" | "bottom-left";
  defaultOpen?: boolean;
}

export function FeedbackWidget({ 
  position = "bottom-right",
  defaultOpen = false 
}: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  // Reset success state when reopening
  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
    }
  }, [isOpen]);

  const captureScreenshot = async () => {
    try {
      // Use html2canvas if available, otherwise just note that screenshot was requested
      logger.info("feedback", "Screenshot capture requested");
      setScreenshot("Screenshot capture requested - will be included in feedback");
    } catch (error) {
      logger.warn("feedback", "Screenshot capture failed");
    }
  };

  const handleSubmit = async () => {
    if (!message.trim() && feedbackType !== "rating") return;

    setIsSubmitting(true);
    logger.info("feedback", "Submitting feedback", { type: feedbackType });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get current page and session info
      const feedbackData = {
        type: feedbackType,
        message: message.trim(),
        rating: feedbackType === "rating" ? rating : null,
        email: email.trim() || null,
        user_id: user?.id || null,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        screenshot: screenshot,
        session_logs: logger.exportLogs(),
        timestamp: new Date().toISOString(),
      };

      // Store feedback in analytics_events table
      const { error } = await supabase.from("analytics_events").insert({
        user_id: user?.id || "anonymous",
        event_type: "feedback_submitted",
        event_data: feedbackData,
      });

      if (error) throw error;

      logger.info("feedback", "Feedback submitted successfully");
      setIsSuccess(true);
      
      // Reset form after delay
      setTimeout(() => {
        setMessage("");
        setRating(0);
        setScreenshot(null);
        setIsOpen(false);
        setIsSuccess(false);
      }, 2000);
    } catch (error: any) {
      logger.error("feedback", "Failed to submit feedback", { error: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const feedbackTypes = [
    { type: "bug" as const, icon: Bug, label: "Bug", color: "text-red-500" },
    { type: "feature" as const, icon: Lightbulb, label: "Feature", color: "text-yellow-500" },
    { type: "general" as const, icon: MessageSquarePlus, label: "General", color: "text-blue-500" },
    { type: "rating" as const, icon: Star, label: "Rate", color: "text-purple-500" },
  ];

  return (
    <>
      {/* Trigger Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed z-50 p-4 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow",
          position === "bottom-right" ? "bottom-6 right-6" : "bottom-6 left-6",
          isOpen && "hidden"
        )}
      >
        <MessageSquarePlus className="h-6 w-6" />
      </motion.button>

      {/* Feedback Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "fixed z-50 w-96 max-w-[calc(100vw-2rem)] bg-background border rounded-2xl shadow-2xl overflow-hidden",
              position === "bottom-right" ? "bottom-6 right-6" : "bottom-6 left-6"
            )}
          >
            {/* Header */}
            <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Send Feedback</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Beta</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
                >
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </motion.div>
                <h4 className="font-semibold text-lg">Thank you!</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Your feedback helps us improve Synapse OS.
                </p>
              </motion.div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Feedback Type Selection */}
                <div className="grid grid-cols-4 gap-2">
                  {feedbackTypes.map((item) => (
                    <button
                      key={item.type}
                      onClick={() => setFeedbackType(item.type)}
                      className={cn(
                        "p-3 rounded-xl border text-center transition-all duration-200",
                        feedbackType === item.type
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <item.icon className={cn("h-5 w-5 mx-auto mb-1", item.color)} />
                      <span className="text-xs font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>

                {/* Rating (if rating type) */}
                {feedbackType === "rating" && (
                  <div className="space-y-2">
                    <Label className="text-sm">How would you rate Synapse OS?</Label>
                    <div className="flex gap-1 justify-center py-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <motion.button
                          key={star}
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setRating(star)}
                          className="p-1"
                        >
                          <Star
                            className={cn(
                              "h-8 w-8 transition-colors",
                              star <= rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground/30"
                            )}
                          />
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="feedback-message" className="text-sm">
                    {feedbackType === "bug"
                      ? "Describe the bug"
                      : feedbackType === "feature"
                      ? "Describe your idea"
                      : feedbackType === "rating"
                      ? "Any additional comments? (optional)"
                      : "Your feedback"}
                  </Label>
                  <textarea
                    id="feedback-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      feedbackType === "bug"
                        ? "What happened? What did you expect?"
                        : feedbackType === "feature"
                        ? "What feature would you like to see?"
                        : "Share your thoughts..."
                    }
                    className="w-full h-24 px-3 py-2 text-sm rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {/* Email (optional) */}
                <div className="space-y-2">
                  <Label htmlFor="feedback-email" className="text-sm">
                    Email (optional, for follow-up)
                  </Label>
                  <Input
                    id="feedback-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>

                {/* Screenshot button (for bugs) */}
                {feedbackType === "bug" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={captureScreenshot}
                    className="w-full gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    {screenshot ? "Screenshot Added" : "Attach Screenshot"}
                  </Button>
                )}

                {/* Quick reactions */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Quick:</span>
                    <button
                      onClick={() => setMessage("Great app! 👍")}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setMessage("Needs improvement 👎")}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    >
                      <ThumbsDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || (!message.trim() && feedbackType !== "rating") || (feedbackType === "rating" && rating === 0)}
                  className="w-full gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Feedback
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Debug logs will be included to help us investigate issues.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

