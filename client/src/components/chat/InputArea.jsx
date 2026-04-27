import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Mic, MicOff, X } from "lucide-react";
import { cn } from "@/utils/cn";

const getSpeechRecognition = () => {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

const InputArea = ({
  onSend,
  disabled,
  placeholder = "Ask about medical research...",
}) => {
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported] = useState(() => !!getSpeechRecognition());
  const [voiceState, setVoiceState] = useState("idle");
  const [voiceError, setVoiceError] = useState("");
  const [interimText, setInterimText] = useState("");

  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const baseMessageRef = useRef("");
  const silenceTimerRef = useRef(null);
  const errorTimerRef = useRef(null);

  // ── Auto resize textarea ──────────────────────────────────
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120,
      )}px`;
    }
  }, [message]);

  // ── Clear error after delay ───────────────────────────────
  const clearErrorAfterDelay = useCallback((delay = 3000) => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => {
      setVoiceError("");
      setVoiceState("idle");
    }, delay);
  }, []);

  // ── Setup speech recognition ──────────────────────────────
  useEffect(() => {
    if (!voiceSupported) return;

    const SpeechRecognition = getSpeechRecognition();
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceState("listening");
      setVoiceError("");
      setInterimText("");
    };

    recognition.onresult = (event) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      let finalTranscript = "";
      let interim = "";

      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }

      const base = baseMessageRef.current;
      if (finalTranscript) {
        const combined =
          `${base}${base && !base.endsWith(" ") ? " " : ""}${finalTranscript}`.trimStart();
        setMessage(combined);
        baseMessageRef.current = combined;
        setInterimText("");
      } else {
        setInterimText(interim);
      }

      // Auto stop after 2.5s silence
      silenceTimerRef.current = setTimeout(() => {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      }, 2500);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setVoiceState("error");
      setInterimText("");

      const errorMessages = {
        "not-allowed":
          "Microphone access denied. Please allow microphone in browser settings.",
        "no-speech": "No speech detected. Please try again.",
        network: "Network error. Please check your connection.",
        "audio-capture":
          "No microphone found. Please connect a microphone.",
        aborted: "",
      };

      const msg = errorMessages[event.error];
      if (msg) {
        setVoiceError(msg);
        clearErrorAfterDelay(4000);
      } else {
        setVoiceState("idle");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText("");
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setVoiceState((prev) => (prev === "error" ? prev : "idle"));
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, [voiceSupported, clearErrorAfterDelay]);

  // ── Start listening ───────────────────────────────────────
  const startListening = useCallback(() => {
    if (!voiceSupported || disabled || !recognitionRef.current) return;

    try {
      baseMessageRef.current = message;
      setVoiceError("");
      setVoiceState("idle");
      recognitionRef.current.start();
    } catch (error) {
      if (error.message?.includes("already started")) {
        try {
          recognitionRef.current.stop();
          setTimeout(() => {
            try {
              recognitionRef.current.start();
            } catch {
              setVoiceState("error");
              setVoiceError("Could not start voice input. Please try again.");
              clearErrorAfterDelay();
            }
          }, 300);
        } catch {
          setVoiceState("error");
          setVoiceError("Could not start voice input. Please try again.");
          clearErrorAfterDelay();
        }
      } else {
        setVoiceState("error");
        setVoiceError("Could not start voice input. Please try again.");
        clearErrorAfterDelay();
      }
    }
  }, [voiceSupported, disabled, message, clearErrorAfterDelay]);

  // ── Stop listening ────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
  }, []);

  // ── Toggle ────────────────────────────────────────────────
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // ── Clear error ───────────────────────────────────────────
  const clearError = useCallback(() => {
    setVoiceError("");
    setVoiceState("idle");
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
  }, []);

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (isListening) stopListening();

      const raw = (message + " " + interimText).trim();

      // ✅ Clean voice artifacts before sending to backend
      const text = raw
        .replace(/\s+/g, " ")      // collapse multiple spaces from voice
        .replace(/[.!?]+$/, "")    // remove trailing punctuation added by voice
        .trim();

      if (text && !disabled) {
        onSend(text);
        setMessage("");
        setInterimText("");
        setVoiceError("");
        baseMessageRef.current = "";
      }
    },
    [isListening, stopListening, message, interimText, disabled, onSend],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit],
  );

  const displayText = message + (interimText ? " " + interimText : "");
  const hasContent = displayText.trim().length > 0;

  return (
    <div className="px-4 pb-4 pt-2">

      {/* ── Voice error toast ──────────────────────────────── */}
      <AnimatePresence>
        {voiceError && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between gap-3 mb-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700"
          >
            <span>{voiceError}</span>
            <button
              type="button"
              onClick={clearError}
              className="flex-shrink-0 p-0.5 rounded-md hover:bg-red-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main form ─────────────────────────────────────── */}
      <motion.form
        onSubmit={handleSubmit}
        className={cn(
          "relative flex items-end gap-3 p-3 rounded-2xl transition-all duration-300",
          "bg-white/80 backdrop-blur-xl border-2 shadow-lg",
          isListening
            ? "border-red-400 shadow-red-100/50 shadow-xl"
            : isFocused
              ? "border-primary-400 shadow-primary-100/50 shadow-xl"
              : "border-slate-200 shadow-sm",
          disabled && "opacity-60",
        )}
      >
        {/* Sparkle indicator */}
        <div className="flex-shrink-0 self-end mb-0.5">
          <motion.div
            animate={disabled ? { rotate: [0, 360] } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center",
              disabled
                ? "bg-yellow-100"
                : "bg-gradient-to-r from-primary-100 to-trust-100",
            )}
          >
            <Sparkles
              className={cn(
                "w-4 h-4",
                disabled ? "text-yellow-600" : "text-primary-600",
              )}
            />
          </motion.div>
        </div>

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={displayText}
            onChange={(e) => {
              setMessage(e.target.value);
              setInterimText("");
              baseMessageRef.current = e.target.value;
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={
              isListening ? "Listening... speak now" : placeholder
            }
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full bg-transparent outline-none resize-none text-sm text-slate-800 placeholder:text-slate-400 disabled:cursor-not-allowed py-1.5",
              isListening && "placeholder:text-red-400",
            )}
          />

          {/* Interim underline */}
          {interimText && (
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-red-300 to-red-500 opacity-60 rounded-full" />
          )}
        </div>

        {/* Voice button */}
        {voiceSupported && (
          <div className="relative flex-shrink-0 self-end">
            {/* Pulse rings when listening */}
            <AnimatePresence>
              {isListening && (
                <>
                  <motion.div
                    key="ring1"
                    initial={{ scale: 1, opacity: 0.6 }}
                    animate={{ scale: 1.8, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                    className="absolute inset-0 rounded-xl bg-red-400 pointer-events-none"
                  />
                  <motion.div
                    key="ring2"
                    initial={{ scale: 1, opacity: 0.4 }}
                    animate={{ scale: 2.2, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      ease: "easeOut",
                      delay: 0.3,
                    }}
                    className="absolute inset-0 rounded-xl bg-red-300 pointer-events-none"
                  />
                </>
              )}
            </AnimatePresence>

            <motion.button
              type="button"
              onClick={toggleListening}
              disabled={disabled}
              whileHover={{ scale: disabled ? 1 : 1.08 }}
              whileTap={{ scale: disabled ? 1 : 0.92 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className={cn(
                "relative z-10 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
                isListening
                  ? "bg-red-500 text-white shadow-lg shadow-red-400/40"
                  : voiceState === "error"
                    ? "bg-red-50 text-red-400 border border-red-200"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700",
                disabled && "cursor-not-allowed opacity-50",
              )}
              aria-label={
                isListening ? "Stop listening" : "Start voice input"
              }
            >
              <AnimatePresence mode="wait">
                {isListening ? (
                  <motion.div
                    key="bars"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 90 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-0.5"
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ scaleY: [0.4, 1.2, 0.4] }}
                        transition={{
                          duration: 0.7,
                          repeat: Infinity,
                          delay: i * 0.15,
                          ease: "easeInOut",
                        }}
                        className="w-1 h-4 bg-white rounded-full"
                      />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="mic"
                    initial={{ scale: 0, rotate: 90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: -90 }}
                    transition={{ duration: 0.15 }}
                  >
                    {voiceState === "error" ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        )}

        {/* Send button */}
        <motion.button
          type="submit"
          disabled={!hasContent || disabled}
          whileHover={{ scale: !hasContent || disabled ? 1 : 1.08 }}
          whileTap={{ scale: !hasContent || disabled ? 1 : 0.92 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 self-end",
            hasContent && !disabled
              ? "bg-gradient-to-r from-primary-500 to-trust-500 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl"
              : "bg-slate-100 text-slate-400 cursor-not-allowed",
          )}
        >
          <motion.div
            animate={hasContent && !disabled ? { x: [0, 2, 0] } : {}}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Send className="w-4 h-4" />
          </motion.div>
        </motion.button>
      </motion.form>

      {/* ── Bottom status ─────────────────────────────────── */}
      <div className="flex items-center justify-between mt-2 px-1 gap-2">
        <AnimatePresence mode="wait">
          {isListening ? (
            <motion.p
              key="listening"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1.5 text-xs text-red-500 font-medium"
            >
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"
              />
              Listening — speak your query in English
            </motion.p>
          ) : voiceState === "error" ? (
            <motion.p
              key="error"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              className="text-xs text-red-400"
            >
              Voice input unavailable
            </motion.p>
          ) : (
            <motion.p
              key="hint"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              className="text-xs text-slate-400"
            >
              {voiceSupported
                ? "Enter to send • Mic for voice"
                : "Press Enter to send"}
            </motion.p>
          )}
        </AnimatePresence>

        <p className="text-xs text-slate-400 flex-shrink-0">
          Powered by LLaMA 3.1
        </p>
      </div>
    </div>
  );
};

export default InputArea;