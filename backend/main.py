from typing import Union
from agent_framework import ChatAgent, MCPStreamableHTTPTool
from agent_framework.openai import OpenAIChatClient

from fastapi import FastAPI, HTTPException
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
async def agent():
    api_key = os.getenv("API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API_KEY not set in environment")

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
        instructions="You are a helpful assistant.",
        name="Azure OpenAI Assistant",
    )

    completion = await agent.run("Tell me about all experiences", tools=[tools])
    answer = completion.text

    return {"answer": answer}
