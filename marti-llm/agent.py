"""
Provider-agnostic question answering over MARTi, using the MCP server's tools.

    export MARTI_DIRS=/path/to/marti_output
    python agent.py --provider anthropic --model claude-sonnet-5-5 "What human pathogens are in project bambi?"
    python agent.py --provider openai    --model <model>            "..."
    python agent.py --provider openai    --base-url http://localhost:11434/v1 --model qwen3:32b "..."   # Ollama
    python agent.py --provider openai    --base-url http://localhost:8000/v1  --model <model> "..."     # vLLM / llama.cpp

Any OpenAI-compatible endpoint works with --provider openai. Keys come from ANTHROPIC_API_KEY /
OPENAI_API_KEY (not needed for local servers). Add --profile to start from a question profile.

The tools, data and analysis are identical for every provider; only the ~30-line adapters differ.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path

import httpx
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

HERE = Path(__file__).parent


@dataclass
class ToolCall:
    id: str
    name: str
    args: dict


# ---------------------------------------------------------------------------- adapters
class AnthropicProvider:
    def __init__(self, model: str, max_tokens: int = 4096):
        self.model, self.max_tokens = model, max_tokens
        self.url = "https://api.anthropic.com/v1/messages"
        self.headers = {"x-api-key": os.environ.get("ANTHROPIC_API_KEY", ""),
                        "anthropic-version": "2023-06-01", "content-type": "application/json"}
        self.messages: list[dict] = []

    def start(self, system: str, user: str, tools: list[dict]):
        self.system = system
        self.tools = [{"name": t["name"], "description": t["description"], "input_schema": t["schema"]}
                      for t in tools]
        self.messages = [{"role": "user", "content": user}]

    async def step(self, client: httpx.AsyncClient) -> tuple[str, list[ToolCall]]:
        r = await client.post(self.url, headers=self.headers, json={
            "model": self.model, "max_tokens": self.max_tokens, "system": self.system,
            "tools": self.tools, "messages": self.messages})
        r.raise_for_status()
        content = r.json()["content"]
        self.messages.append({"role": "assistant", "content": content})
        text = "".join(b.get("text", "") for b in content if b["type"] == "text")
        calls = [ToolCall(b["id"], b["name"], b.get("input") or {}) for b in content if b["type"] == "tool_use"]
        return text, calls

    def add_results(self, results: list[tuple[ToolCall, str]]):
        self.messages.append({"role": "user", "content": [
            {"type": "tool_result", "tool_use_id": c.id, "content": out} for c, out in results]})


class OpenAICompatibleProvider:
    """OpenAI Chat Completions format: OpenAI, Ollama, vLLM, llama.cpp server, LM Studio, LiteLLM proxy..."""

    def __init__(self, model: str, base_url: str | None = None):
        self.model = model
        self.url = (base_url or "https://api.openai.com/v1").rstrip("/") + "/chat/completions"
        key = os.environ.get("OPENAI_API_KEY", "not-needed-for-local")
        self.headers = {"Authorization": f"Bearer {key}", "content-type": "application/json"}

    def start(self, system: str, user: str, tools: list[dict]):
        self.tools = [{"type": "function", "function": {"name": t["name"], "description": t["description"],
                                                         "parameters": t["schema"]}} for t in tools]
        self.messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]

    async def step(self, client: httpx.AsyncClient) -> tuple[str, list[ToolCall]]:
        r = await client.post(self.url, headers=self.headers, json={
            "model": self.model, "messages": self.messages, "tools": self.tools})
        r.raise_for_status()
        msg = r.json()["choices"][0]["message"]
        self.messages.append({k: v for k, v in msg.items() if k in ("role", "content", "tool_calls")})
        calls = []
        for tc in msg.get("tool_calls") or []:
            try:
                args = json.loads(tc["function"].get("arguments") or "{}")
            except json.JSONDecodeError:
                args = {}
            calls.append(ToolCall(tc["id"], tc["function"]["name"], args))
        return msg.get("content") or "", calls

    def add_results(self, results: list[tuple[ToolCall, str]]):
        for c, out in results:
            self.messages.append({"role": "tool", "tool_call_id": c.id, "content": out})


# ---------------------------------------------------------------------------- loop
SYSTEM = """You answer questions about metagenomic sequencing results produced by MARTi, using the tools provided.
{instructions}
Be concise and specific. Cite read counts and percentages from tool results. Separate well-supported findings
from presumptive ones, and state the main limitations. If the question is ambiguous about which samples to use,
call list_samples first."""


async def ask(provider, question: str, max_turns: int = 15, log=print) -> str:
    params = StdioServerParameters(command=sys.executable, args=[str(HERE / "server.py")], env=dict(os.environ))
    async with stdio_client(params) as (r, w), ClientSession(r, w) as mcp:
        init = await mcp.initialize()
        # field names differ between MCP SDK v1 (camelCase) and v2 (snake_case)
        tools = [{"name": t.name, "description": t.description or "",
                  "schema": getattr(t, "input_schema", None) or getattr(t, "inputSchema")}
                 for t in (await mcp.list_tools()).tools]
        provider.start(SYSTEM.format(instructions=getattr(init, "instructions", "") or ""), question, tools)
        async with httpx.AsyncClient(timeout=300) as http:
            for _ in range(max_turns):
                text, calls = await provider.step(http)
                if not calls:
                    return text
                results = []
                for c in calls:
                    log(f"  -> {c.name}({json.dumps(c.args)[:120]})")
                    res = await mcp.call_tool(c.name, c.args)
                    results.append((c, "\n".join(getattr(b, "text", "") for b in res.content)))
                provider.add_results(results)
        return "Stopped: reached max_turns without a final answer."


def build_provider(args):
    if args.provider == "anthropic":
        return AnthropicProvider(args.model)
    return OpenAICompatibleProvider(args.model, args.base_url)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("question")
    ap.add_argument("--provider", choices=["anthropic", "openai"], required=True)
    ap.add_argument("--model", required=True)
    ap.add_argument("--base-url", help="OpenAI-compatible endpoint, e.g. http://localhost:11434/v1 for Ollama")
    ap.add_argument("--profile", help="prepend a question profile from marti_llm/profiles (e.g. human_pathogen_screen)")
    args = ap.parse_args()
    q = args.question
    if args.profile:
        tmpl = (HERE / "marti_llm" / "profiles" / f"{args.profile}.md").read_text()
        q = tmpl.replace("{samples}", "the samples named in the question").replace(
            "{context}", "see question").replace("{target}", "see question").replace(
            "{reference}", "see question") + "\n\nQuestion: " + args.question
    print(asyncio.run(ask(build_provider(args), q)))
