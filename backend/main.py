from typing import Union
from agent_framework import ChatAgent
from agent_framework.openai import OpenAIChatClient

from fastapi import FastAPI, HTTPException
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()


@app.get("/")
def read_root():
    return {"Hello": "World 2"}

@app.get("/agent")
async def read_agent():
    api_key = os.getenv("API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API_KEY not set in environment")

    agent = ChatAgent(
        chat_client=OpenAIChatClient(
            model_id="gpt-4.1-mini",
            base_url="https://oi.destination.one/api/v1/",
            api_key=api_key
        ),
        instructions="You are a helpful assistant.",
        name="Azure OpenAI Assistant"
    )

    completion = await agent.run("Hello, how can you assist me today?")
    answer = completion.text

    return {"answer": answer}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}
