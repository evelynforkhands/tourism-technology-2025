// src/lib/api.ts

// This should be the FULL endpoint, e.g.
// VITE_AGENT_URL=https://ttf-backend-665542325765.europe-central2.run.app/agent
const API_URL =
  import.meta.env.VITE_AGENT_URL || "http://localhost:8000/agent";

type ConversationPayload = {
  messages: { role: "user" | "assistant"; content: string }[];
};

export async function sendChat(payload: ConversationPayload): Promise<string> {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("Backend error:", response.status, await response.text());
      return "Sorry, I couldn’t reach the server. Please try again.";
    }

    const data = await response.json();
    console.log("Backend raw response:", data);

    // Your backend: { "answer": "Hello!" }
    return data.answer ?? "Sorry, I didn’t catch that.";
  } catch (error) {
    console.error("Network / fetch error:", error);
    return "Oops, something went wrong while contacting the server.";
  }
}
