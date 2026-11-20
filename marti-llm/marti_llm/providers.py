"""
Minimal, dependency-light access to LLM providers for single requests (no tool use): Anthropic, OpenAI, and any
OpenAI-compatible server (LM Studio, Ollama, vLLM, llama.cpp, LiteLLM...).

The API key is passed in by the caller (the MARTi GUI hands it over in an environment variable, never on the
command line). Nothing here logs or stores it.
"""
from __future__ import annotations

from dataclasses import dataclass

import httpx

PROVIDERS = ("anthropic", "openai", "openai-compatible")
DEFAULT_BASE = {"anthropic": "https://api.anthropic.com", "openai": "https://api.openai.com/v1"}


class ProviderError(RuntimeError):
    """A failure worth showing to the user as-is (no secrets in the message)."""


@dataclass
class LLMConfig:
    provider: str
    model: str
    api_key: str = ""
    base_url: str = ""
    timeout: float = 300.0

    def __post_init__(self):
        if self.provider not in PROVIDERS:
            raise ProviderError(f"Unknown provider '{self.provider}'. Use one of: {', '.join(PROVIDERS)}.")
        if not self.model:
            raise ProviderError("No model is set.")
        if self.provider == "openai-compatible" and not self.base_url:
            raise ProviderError("An OpenAI-compatible provider needs a base URL, e.g. http://localhost:1234/v1.")
        if self.provider != "openai-compatible" and not self.api_key:
            raise ProviderError(f"No API key is set for {self.provider}.")
        self.base_url = (self.base_url or DEFAULT_BASE.get(self.provider, "")).rstrip("/")

    @property
    def label(self) -> str:
        return {"anthropic": "Anthropic", "openai": "OpenAI"}.get(self.provider, "local/OpenAI-compatible server")


def _raise_for(r: httpx.Response, cfg: LLMConfig) -> None:
    if r.status_code < 400:
        return
    try:
        body = r.json()
        msg = (body.get("error") or {}).get("message") if isinstance(body.get("error"), dict) else body.get("error")
        msg = msg or body.get("message") or r.text[:300]
    except ValueError:
        msg = r.text[:300]
    hint = {401: " Check the API key.", 403: " The key may not have access to this model.",
            404: " Check the model name and base URL.", 429: " Rate limit or quota reached; try again later."}
    raise ProviderError(f"{cfg.label} returned HTTP {r.status_code}: {msg}{hint.get(r.status_code, '')}")


def _headers(cfg: LLMConfig) -> dict:
    if cfg.provider == "anthropic":
        return {"x-api-key": cfg.api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"}
    h = {"content-type": "application/json"}
    if cfg.api_key:
        h["authorization"] = f"Bearer {cfg.api_key}"
    return h


def complete(cfg: LLMConfig, system: str, user: str, max_tokens: int = 2500) -> tuple[str, dict]:
    """One request, one text answer. Returns (text, usage)."""
    try:
        with httpx.Client(timeout=cfg.timeout) as client:
            if cfg.provider == "anthropic":
                r = client.post(f"{cfg.base_url}/v1/messages", headers=_headers(cfg), json={
                    "model": cfg.model, "max_tokens": max_tokens, "system": system,
                    "messages": [{"role": "user", "content": user}]})
                _raise_for(r, cfg)
                body = r.json()
                text = "".join(b.get("text", "") for b in body.get("content", []) if b.get("type") == "text")
                u = body.get("usage") or {}
                return text, {"input_tokens": u.get("input_tokens"), "output_tokens": u.get("output_tokens")}
            payload = {"model": cfg.model, "messages": [{"role": "system", "content": system},
                                                        {"role": "user", "content": user}]}
            # OpenAI's newer models take max_completion_tokens; most compatible servers take max_tokens
            payload["max_completion_tokens" if cfg.provider == "openai" else "max_tokens"] = max_tokens
            r = client.post(f"{cfg.base_url}/chat/completions", headers=_headers(cfg), json=payload)
            _raise_for(r, cfg)
            body = r.json()
            msg = (body.get("choices") or [{}])[0].get("message") or {}
            u = body.get("usage") or {}
            return msg.get("content") or "", {"input_tokens": u.get("prompt_tokens"),
                                              "output_tokens": u.get("completion_tokens")}
    except httpx.TimeoutException:
        raise ProviderError(f"{cfg.label} did not answer within {int(cfg.timeout)} seconds.") from None
    except httpx.HTTPError as e:
        raise ProviderError(f"Could not reach {cfg.label} at {cfg.base_url}: {e.__class__.__name__}.") from None


def check(cfg: LLMConfig) -> dict:
    """Connection test without generating text: list the provider's models and look for the configured one."""
    try:
        with httpx.Client(timeout=30) as client:
            url = f"{cfg.base_url}/v1/models" if cfg.provider == "anthropic" else f"{cfg.base_url}/models"
            r = client.get(url, headers=_headers(cfg))
            _raise_for(r, cfg)
            ids = sorted({m.get("id") for m in (r.json().get("data") or []) if m.get("id")})
    except httpx.HTTPError as e:
        raise ProviderError(f"Could not reach {cfg.label} at {cfg.base_url}: {e.__class__.__name__}.") from None
    found = cfg.model in ids
    return {"ok": True, "model_found": found, "models": ids[:200],
            "message": (f"Connected to {cfg.label}. Model '{cfg.model}' is available." if found else
                        f"Connected to {cfg.label}, but model '{cfg.model}' is not in its list"
                        + (f" (e.g. {', '.join(ids[:5])})." if ids else "."))}
