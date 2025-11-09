import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, Send } from "lucide-react";
import { nanoid } from "nanoid";
import { sendChat } from "@/lib/api";

type ChatMessage = {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  isStreaming?: boolean;
};

const STORAGE_KEY = "ai-chat-conversation-v1";

export default function AIChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Load messages from localStorage on first render
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ChatMessage[];
        // Convert timestamps back to Date objects if needed
        const withDates = parsed.map((m) => ({
          ...m,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        }));
        setMessages(withDates);
      } else {
        // No stored chat -> set initial greeting
        setMessages([
          {
            id: nanoid(),
            content:
              "Servus! 🇦🇹 I’m here to help you find and book amazing experiences. What kind of adventure are you in the mood for today?",
            role: "assistant",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err) {
      console.error("Failed to load conversation from localStorage:", err);
      setMessages([
        {
          id: nanoid(),
          content:
            "Servus! 🇦🇹 I’m here to help you find and book amazing experiences. What kind of adventure are you in the mood for today?",
          role: "assistant",
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (err) {
      console.error("Failed to save conversation to localStorage:", err);
    }
  }, [messages]);

  // --- Typing animation for assistant message ---
  const simulateTyping = useCallback((messageId: string, fullText: string) => {
    let index = 0;

    // Initialize as empty streaming message
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, content: "", isStreaming: true } : m,
      ),
    );

    const interval = setInterval(() => {
      // Add some small randomness to make typing feel less robotic
      index += Math.random() > 0.05 ? 1 : 0;
      const partial = fullText.slice(0, index);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                content: partial,
                isStreaming: index < fullText.length,
              }
            : m,
        ),
      );

      if (index >= fullText.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 25);
  }, []);

  // --- Handle user submit (POST full convo via sendChat) ---
  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!inputValue.trim() || isTyping) return;

      const userMessage: ChatMessage = {
        id: nanoid(),
        content: inputValue.trim(),
        role: "user",
        timestamp: new Date(),
      };

      // Immediately push user message into UI
      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      setIsTyping(true);

      const assistantId = nanoid();

      // Add placeholder assistant message
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          content: "Thinking...",
          role: "assistant",
          timestamp: new Date(),
          isStreaming: true,
        },
      ]);

      // Build full conversation to send to backend:
      // use previous messages + this new user message
      const conversationForBackend = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Send to backend via helper (POST)
      const reply = await sendChat({ messages: conversationForBackend });

      // Animate assistant reply
      simulateTyping(assistantId, reply);
    },
    [inputValue, isTyping, messages, simulateTyping],
  );

  // --- Clear chat + localStorage ---
  const handleClear = useCallback(() => {
    const initial: ChatMessage = {
      id: nanoid(),
      content:
        "Servus! 🇦🇹 I’m here to help you find and book amazing experiences. What kind of adventure are you in the mood for today?",
      role: "assistant",
      timestamp: new Date(),
    };

    setMessages([initial]);
    setInputValue("");
    setIsTyping(false);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([initial]));
    } catch (err) {
      console.error("Failed to reset conversation in localStorage:", err);
    }
  }, []);

  return (
    <Card className="flex h-full w-full max-w-full flex-col overflow-hidden bg-background rounded-xl shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-sm font-medium">AI Assistant</span>
        </div>

        {/* Clear chat */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleClear}
          disabled={isTyping}
          title="Clear Chat"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {/* Conversation */}
      <ScrollArea className="flex-1 px-3 py-3 overflow-x-hidden">
        <div className="space-y-4">
          {messages.map((message) => {
            const isUser = message.role === "user";
            const isStreaming = !!message.isStreaming;

            return (
              <div key={message.id} className="space-y-2">
                <div
                  className={`flex min-w-0 items-start gap-2 ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isUser && (
                    <Avatar className="h-9 w-9 overflow-hidden rounded-full">
                      <AvatarImage
                        src="/ai-avatar.png"
                        alt="AI"
                        className="object-cover w-full h-full"
                      />
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={`max-w-[80%] min-w-0 overflow-hidden break-words rounded-md px-3 py-2 text-sm whitespace-pre-wrap ${
                      isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {isStreaming && !message.content ? (
                      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground" />
                        Thinking...
                      </span>
                    ) : (
                      message.content
                    )}
                  </div>

                  {isUser && (
                    <Avatar className="h-9 w-9 overflow-hidden rounded-full">
                      <AvatarImage
                        src="/user-avatar.png"
                        alt="User"
                        className="object-cover w-full h-full"
                      />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t bg-background/80 px-3 py-2"
      >
        <div className="flex items-center gap-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type and press Enter..."
            disabled={isTyping}
            className="flex-1 min-w-0 h-11 resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const form = e.currentTarget.closest("form");
                if (form) form.requestSubmit();
              }
            }}
          />

          <Button
            type="submit"
            size="icon"
            className="h-11 w-11 shrink-0"
            disabled={!inputValue.trim() || isTyping}
          >
            {isTyping ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-background border-t-transparent" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
