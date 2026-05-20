import { useState, useRef, useCallback } from "react";
import { Message, Citation } from "@/types";

interface UseRagChatOptions {
  focusSource?: "all" | "quran" | "hadith";
}

/**
 * Custom hook to manage real-time streaming RAG conversation state.
 * Leverages standard fetch and ReadableStream reader to parse Server-Sent Events.
 */
export function useRagChat(options: UseRagChatOptions = {}) {
  const { focusSource = "all" } = options;
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store active citations separate from text during generation
  const activeCitationsRef = useRef<Citation[]>([]);
  // Keep track of active network streams to support cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Clears the chat memory thread.
   */
  const clearChat = useCallback(() => {
    // Abort any active streaming processes
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setError(null);
    setIsLoading(false);
  }, []);

  /**
   * Sends a user query to the RAG backend and streams the grounded answer.
   */
  const sendMessage = useCallback(
    async (content: string) => {
      const trimmedContent = content.trim();
      if (!trimmedContent) return;

      // Abort previous calls if still running
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setError(null);
      setIsLoading(true);

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmedContent,
        timestamp: new Date().toISOString(),
      };

      const assistantMessageId = crypto.randomUUID();
      const initialAssistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        citations: [],
        timestamp: new Date().toISOString(),
        isStreaming: true,
      };

      // Pessimistically update the messages thread
      setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const payloadHistory = [...messages, userMessage];
        
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: payloadHistory,
            focusSource,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to establish stream connection.");
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Response body is not a readable stream.");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Decode text block and append to buffer
          buffer += decoder.decode(value, { stream: true });

          // SSE format: data: {...}\n\n
          const lines = buffer.split("\n\n");
          // Keep last incomplete block in buffer
          buffer = lines.pop() || "";

          for (const line of lines) {
            const cleanLine = line.replace(/^data:\s*/, "").trim();
            if (!cleanLine) continue;

            let streamError = null;
            try {
              const parsed = JSON.parse(cleanLine);

              if (parsed.type === "sources") {
                // Grounding references delivered first
                activeCitationsRef.current = parsed.data;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, citations: parsed.data }
                      : msg
                  )
                );
              } else if (parsed.type === "chunk") {
                // Real-time text token stream
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: msg.content + parsed.data }
                      : msg
                  )
                );
              } else if (parsed.type === "error") {
                streamError = parsed.data;
              } else if (parsed.type === "done") {
                // Finalize streaming flag
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, isStreaming: false }
                      : msg
                  )
                );
              }
            } catch (jsonErr) {
              // Gracefully handle partial chunks or parsing glitches
              console.warn("Error parsing chunk payload:", jsonErr, cleanLine);
            }

            if (streamError) {
              throw new Error(streamError);
            }
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          console.log("Stream parsing aborted by the user.");
          return;
        }

        const errorMessage = err.message || "Failed to receive AI generation.";
        setError(errorMessage);

        // Terminate streaming state on the last message
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: msg.content + `\n\n*Error: ${errorMessage}*`,
                  isStreaming: false,
                }
              : msg
          )
        );
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [messages, focusSource]
  );

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    activeCitations: activeCitationsRef.current,
  };
}
