'use client';

/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - VOICE CONTROL (OPTIONAL)
 * ============================================================================
 * 
 * Voice input/output component using Web Speech API.
 * 
 * @component VoiceControl
 * @version 3.0.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ============================================================================
// TYPES
// ============================================================================

interface VoiceControlProps {
  onTranscript: (text: string) => void;
  textToSpeak?: string;
  enabled?: boolean;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function VoiceControl({
  onTranscript,
  textToSpeak,
  enabled = true,
  className,
}: VoiceControlProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  // Check browser support
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const result = event.results[current];
      const text = result[0].transcript;
      
      setTranscript(text);

      if (result.isFinal) {
        onTranscript(text);
        setTranscript('');
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[VoiceControl] Recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [onTranscript]);

  // Speak text when provided
  useEffect(() => {
    if (!textToSpeak || !ttsEnabled || typeof window === 'undefined') return;

    const synth = window.speechSynthesis;
    if (!synth) return;

    // Cancel any ongoing speech
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synth.speak(utterance);

    return () => {
      synth.cancel();
    };
  }, [textToSpeak, ttsEnabled]);

  // Toggle listening
  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Toggle TTS
  const toggleTTS = () => {
    if (isSpeaking && typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    }
    setTtsEnabled(!ttsEnabled);
  };

  if (!enabled || !isSupported) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Mic button */}
      <Button
        variant="outline"
        size="icon"
        onClick={toggleListening}
        className={cn(
          'relative',
          isListening && 'bg-red-500/10 border-red-500 text-red-500'
        )}
      >
        {isListening ? (
          <>
            <MicOff className="h-4 w-4" />
            <motion.span
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute inset-0 rounded-md border-2 border-red-500"
            />
          </>
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>

      {/* TTS toggle */}
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTTS}
        className={cn(
          ttsEnabled && 'bg-purple-500/10 border-purple-500 text-purple-500'
        )}
      >
        {ttsEnabled ? (
          <Volume2 className="h-4 w-4" />
        ) : (
          <VolumeX className="h-4 w-4" />
        )}
      </Button>

      {/* Transcript display */}
      <AnimatePresence>
        {isListening && transcript && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-sm"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="max-w-[200px] truncate">{transcript}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speaking indicator */}
      <AnimatePresence>
        {isSpeaking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-500 text-sm"
          >
            <motion.div
              animate={{ scaleY: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className="w-1 h-3 bg-purple-500 rounded-full"
            />
            <motion.div
              animate={{ scaleY: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className="w-1 h-3 bg-purple-500 rounded-full"
            />
            <motion.div
              animate={{ scaleY: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }}
              className="w-1 h-3 bg-purple-500 rounded-full"
            />
            <span>Speaking...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default VoiceControl;

