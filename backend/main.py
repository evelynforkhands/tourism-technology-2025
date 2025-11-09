from typing import Union, List, Dict, Any
from agent_framework import ChatAgent, MCPStreamableHTTPTool
from agent_framework.openai import OpenAIChatClient

from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# enable CORS for any origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/agent")
async def agent_deprecated():
    return {"answer": "This endpoint is deprecated."}


@app.post("/agent")
async def agent(body: Any = Body(...)):
    """
    Accept either:
      - a top-level list: [ {role:..., content:...}, ... ]
      - or an object with messages: { "messages": [ ... ] }
    """
    # normalize incoming body to a list of message dicts
    if isinstance(body, dict) and "messages" in body and isinstance(body["messages"], list):
        messages = body["messages"]
    elif isinstance(body, list):
        messages = body
    else:
        raise HTTPException(status_code=400, detail="Request must be a list of message objects or an object with a 'messages' list")

    api_key = os.getenv("API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API_KEY not set in environment")

    # sanitize and normalize incoming messages
    normalized: List[Dict[str, Any]] = []
    for item in messages:
        if not isinstance(item, dict):
            continue
        role = item.get("role", "user")
        content = item.get("content") or item.get("message") or ""
        timestamp = item.get("timestamp")
        normalized.append({"role": role, "content": content, "timestamp": timestamp})

    if not normalized:
        raise HTTPException(status_code=400, detail="Request must contain a non-empty list of message objects")

    # sort by timestamp if present (ISO strings sort correctly); keep original order if not
    try:
        normalized.sort(key=lambda m: m.get("timestamp") or "")
    except Exception:
        pass

    # build a simple conversation history string for the agent
    history_lines = []
    for m in normalized:
        role = m["role"]
        content = m["content"].strip()
        if content:
            history_lines.append(f"{role}: {content}")
    conversation_history = "\n".join(history_lines)

    tools = MCPStreamableHTTPTool(
        name="Experience Booking MCP Server",
        url="https://ttf-mcp-server-665542325765.europe-central2.run.app/mcp",
    )

    agent = ChatAgent(
        chat_client=OpenAIChatClient(
            model_id="gpt-4.1-mini",
            base_url="https://oi.destination.one/api/v1/",
            api_key=api_key,
        ),
        instructions="You are a helpful assistant. Use the conversation history to continue the dialogue. Always respond in English.",
        name="Azure OpenAI Assistant",
    )
    
    prompt = (
        "Conversation history:\n"
        f"{conversation_history}\n\n"
        "Assistant: Please respond in English. First provide a concise, useful answer to the user's request. "
        "After that, explicitly ask whether the answer is specific enough or if the user has additional requirements. "
        "If the user's intent is unclear, ask clarifying questions about their goal, constraints (time, budget, location), "
        "desired output format, examples or preferences, and any other important details. "
        "If the intent is clear, give a concise, actionable response and suggest next steps or follow-up questions. "
        "If any of the tools returned images (URLs, image files, or base64-encoded images), include them after your text answer. "
        "Prefer displaying images as Markdown image links (e.g., ![alt text](image_url)). "
        "If a tool returned base64 image data, embed it as a data URL in a Markdown image tag. "
        "For each image include a short caption and the source/tool name. Always respond in English."
    )

    completion = await agent.run(prompt, tools=[tools])
    answer = completion.text

    return {"answer": answer}
