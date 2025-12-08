'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        onDismiss(toast.id);
      }, toast.duration || 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onDismiss]);

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const Icon = icons[toast.type];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl shadow-lg animate-slide-in',
        'bg-zinc-900 border border-zinc-800',
        'max-w-sm w-full'
      )}
    >
      <Icon
        className={cn(
          'w-5 h-5 flex-shrink-0',
          toast.type === 'success' && 'text-emerald-500',
          toast.type === 'error' && 'text-red-500',
          toast.type === 'warning' && 'text-amber-500',
          toast.type === 'info' && 'text-blue-500'
        )}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-100">{toast.title}</p>
        {toast.message && (
          <p className="mt-1 text-xs text-zinc-400">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Toast container component
interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

// Global toast state
let toastListeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

function notifyListeners() {
  toastListeners.forEach(listener => listener([...toasts]));
}

export function addToast(toast: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { ...toast, id }];
  notifyListeners();
  return id;
}

export function removeToast(id: string) {
  toasts = toasts.filter(t => t.id !== id);
  notifyListeners();
}

export function ToastContainer({ position = 'top-right' }: ToastContainerProps) {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

  useEffect(() => {
    toastListeners.push(setCurrentToasts);
    return () => {
      toastListeners = toastListeners.filter(l => l !== setCurrentToasts);
    };
  }, []);

  const handleDismiss = useCallback((id: string) => {
    removeToast(id);
  }, []);

  if (currentToasts.length === 0) return null;

  return (
    <div
      className={cn(
        'fixed z-[100] flex flex-col gap-2 pointer-events-none',
        position === 'top-right' && 'top-4 right-4',
        position === 'top-left' && 'top-4 left-4',
        position === 'bottom-right' && 'bottom-4 right-4',
        position === 'bottom-left' && 'bottom-4 left-4'
      )}
    >
      {currentToasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={handleDismiss} />
        </div>
      ))}
    </div>
  );
}

// Hook for using toasts
export function useToast() {
  return {
    success: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'success', title, message, duration }),
    error: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'error', title, message, duration }),
    warning: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'warning', title, message, duration }),
    info: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'info', title, message, duration }),
    dismiss: removeToast,
  };
}


