"""
Exercise agent.py's Anthropic and OpenAI-compatible adapters against mocked HTTP endpoints, with real
MCP tool calls in between. No API keys needed.

    MARTI_DIRS=/path/to/MARTi/gui/output python tests/agent_mock_test.py
"""
import asyncio
import json
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import agent  # noqa: E402

seen = []


def anthropic_handler(request: httpx.Request) -> httpx.Response:
    body = json.loads(request.content)
    seen.append(body)
    last = body["messages"][-1]
    if isinstance(last["content"], str):  # first turn: ask for two tools
        assert {t["name"] for t in body["tools"]} >= {"screen_samples", "list_samples"}
        return httpx.Response(200, json={"content": [
            {"type": "text", "text": "Let me check."},
            {"type": "tool_use", "id": "tu_1", "name": "screen_samples",
             "input": {"list_id": "human_pathogens", "samples": ["BAMBI_P8_1D_19092017"]}},
            {"type": "tool_use", "id": "tu_2", "name": "sample_overview", "input": {"sample": "BAMBI_P8"}}]})
    results = {b["tool_use_id"]: json.loads(b["content"]) for b in last["content"]}
    hits = results["tu_1"]["results"][0]["hits"]
    top = hits[0]
    return httpx.Response(200, json={"content": [{"type": "text", "text":
        f"FINAL: {top['taxon']} {top['reads_in_clade']} reads; status {results['tu_2']['marti_status']}"}]})


def openai_handler(request: httpx.Request) -> httpx.Response:
    body = json.loads(request.content)
    seen.append(body)
    assert str(request.url).endswith("/v1/chat/completions")
    if body["messages"][-1]["role"] == "user":
        return httpx.Response(200, json={"choices": [{"message": {"role": "assistant", "content": None,
            "tool_calls": [{"id": "c1", "type": "function", "function": {
                "name": "unusual_features",
                "arguments": json.dumps({"target": "BAMBI_P8_1D_19092017", "reference": [
                    "BAMBI_P103M_400ng_RAD4_20122017", "BAMBI_P106I_LSQK108_02022018",
                    "BAMBI_P116I_SQK108_02022018", "BAMBI_P205G_1D_12012018"]})}}]}}]})
    res = json.loads(body["messages"][-1]["content"])
    return httpx.Response(200, json={"choices": [{"message": {"role": "assistant",
        "content": f"FINAL: elevated {[r['taxon'] for r in res['elevated_vs_reference'][:3]]}"}}]})


async def run(provider, handler):
    real = httpx.AsyncClient
    agent.httpx.AsyncClient = lambda **kw: real(transport=httpx.MockTransport(handler), **kw)
    try:
        return await agent.ask(provider, "test question")
    finally:
        agent.httpx.AsyncClient = real


async def main():
    out = await run(agent.AnthropicProvider("claude-test"), anthropic_handler)
    print("anthropic:", out)
    assert out.startswith("FINAL: Klebsiella pneumoniae")
    out = await run(agent.OpenAICompatibleProvider("local-model", "http://localhost:11434/v1"), openai_handler)
    print("openai-compatible:", out)
    assert "Klebsiella" in out
    print("ALL OK")


asyncio.run(main())
