"""
MCP server exposing MARTi results to any MCP-capable LLM client
(Claude Desktop / claude.ai, ChatGPT, Open WebUI, LM Studio, custom agents...).

    MARTI_DIRS="/path/to/marti_output;/other/output" python server.py        # stdio (Claude Desktop, LM Studio)
    MARTI_DIRS=... MARTI_MCP_TOKEN=<secret> python server.py --http          # HTTP with an access token
    MARTI_DIRS=... MARTI_MCP_OAUTH_ISSUER=https://idp.example/ \
        python server.py --http --public-url https://marti.example.org        # HTTP with OAuth (ChatGPT)

MARTI_DIRS takes the same directories you pass to `marti_gui --marti`. See README "Running over HTTP".
Every tool but one only reads MARTi output, and is labelled read-only so clients can skip write-action
confirmations. The exception, save_narrative, writes narrative.json into a sample folder and is labelled as a write.
"""
from __future__ import annotations

import argparse
import inspect
import os
import sys
from pathlib import Path
from urllib.parse import urlparse

try:  # MCP Python SDK v2
    from mcp.server.mcpserver import MCPServer as _Server
except ImportError:  # SDK v1
    from mcp.server.fastmcp import FastMCP as _Server
from mcp.types import ToolAnnotations

from marti_llm.data import MartiStore
from marti_llm.tools import *  # noqa: F401,F403  the tool functions
from marti_llm import tools as _T
from marti_llm.tools import INSTRUCTIONS, READ_TOOLS

store = _T.configure(MartiStore.from_env())


# ------------------------------------------------------------------ prompts (question profiles)
PROFILE_DIR = Path(__file__).parent / "marti_llm" / "profiles"


def _profile(name: str, **kw) -> str:
    return (PROFILE_DIR / f"{name}.md").read_text().format(**kw)


def human_pathogen_screen(samples: str = "all samples") -> str:
    """Screen samples for organisms of human health relevance."""
    return _profile("human_pathogen_screen", samples=samples)


def food_spoilage_review(samples: str = "all samples", context: str = "not specified") -> str:
    """Assess spoilage-relevant organisms for a given product context."""
    return _profile("food_spoilage_review", samples=samples, context=context)


def food_environment_unusual(target: str, reference: str) -> str:
    """What is unusual about a food-manufacturing environment sample vs. the site baseline."""
    return _profile("food_environment_unusual", target=target, reference=reference)


def cross_sample_trends(samples: str = "all samples") -> str:
    """Differences, trends and co-occurrence across a set of samples."""
    return _profile("cross_sample_trends", samples=samples)


def write_narrative(sample: str) -> str:
    """Write a narrative analysis of a sample for the MARTi GUI dashboard."""
    return (f"Write a narrative analysis of MARTi sample {sample} for the MARTi GUI's dashboard.\n\n"
            "1. Call get_narrative_inputs for the sample. If the user has said what kind of sample it is (for "
            "example outdoor air), pass the matching profile; otherwise use auto and check profile_choice.\n"
            "2. Write the summary and each section using only its analysis_results, following its instructions "
            "exactly: quote numbers as given, mark weak evidence as presumptive, plain sentences, no markdown.\n"
            "3. Call save_narrative with the same sample and profile, and the name of the model you are, if known.\n"
            "4. If validation flags organisms, genes or numbers that are real errors, correct the text and save "
            "again. Organisms you named only as not detected are fine.\n"
            "5. Tell the user it has been saved, show them the summary, and mention any remaining flags.")


TOOLS = READ_TOOLS + [(get_narrative_inputs, "Get narrative inputs")]
# Tools that write; everything else in TOOLS only reads
WRITE_TOOLS = [(save_narrative, "Save narrative analysis")]
PROMPTS = [human_pathogen_screen, food_spoilage_review, food_environment_unusual, cross_sample_trends,
           write_narrative]


def create_server(oauth=None, transport_security=None, host: str = "127.0.0.1"):
    """Build the MCP server. oauth: marti_llm.auth.OAuthConfig to require OAuth access tokens."""
    kw = {"instructions": INSTRUCTIONS}
    params = inspect.signature(_Server.__init__).parameters
    if oauth is not None:
        from marti_llm.auth import JWTVerifier, auth_settings
        kw.update(auth=auth_settings(oauth), token_verifier=JWTVerifier(oauth))
    if "transport_security" in params and transport_security is not None:   # SDK v1 takes these at construction
        kw["transport_security"] = transport_security
    if "host" in params:
        kw["host"] = host
    srv = _Server("marti", **kw)
    for fn, title in TOOLS:
        # Every tool only reads files: clients can treat calls as safe, repeatable lookups.
        srv.tool(title=title, annotations=ToolAnnotations(
            title=title, readOnlyHint=True, destructiveHint=False, idempotentHint=True, openWorldHint=False))(fn)
    for fn, title in WRITE_TOOLS:
        # Writes narrative.json in a sample folder, replacing any existing one: clients should ask first.
        srv.tool(title=title, annotations=ToolAnnotations(
            title=title, readOnlyHint=False, destructiveHint=True, idempotentHint=True, openWorldHint=False))(fn)
    for fn in PROMPTS:
        srv.prompt()(fn)
    return srv


mcp = create_server()   # the default (stdio, no auth) server; also what the tests import


def _loopback(host: str) -> bool:
    return host in ("127.0.0.1", "localhost", "::1")


def run_http(args) -> None:
    import uvicorn
    from mcp.server.transport_security import TransportSecuritySettings
    from marti_llm.auth import OAuthConfig, StaticTokenMiddleware

    public_url = (args.public_url or os.environ.get("MARTI_MCP_PUBLIC_URL", "")).rstrip("/") or None
    token = os.environ.get("MARTI_MCP_TOKEN", "").strip()
    oauth = OAuthConfig.from_env(public_url)
    if token and oauth:
        sys.exit("Set either MARTI_MCP_TOKEN or MARTI_MCP_OAUTH_ISSUER, not both.")
    exposed = (not _loopback(args.host)) or bool(public_url) or bool(args.allowed_host)
    if exposed and not (token or oauth) and not args.allow_unauthenticated:
        sys.exit("Refusing to serve MARTi data beyond this computer without authentication.\n"
                 "Set MARTI_MCP_TOKEN (Open WebUI, LM Studio, scripts) or MARTI_MCP_OAUTH_ISSUER (ChatGPT), or pass\n"
                 "--allow-unauthenticated if you really mean it (e.g. a short test on MARTi's example data).")

    # Clients reaching the server through a tunnel or reverse proxy send that public host name; the SDK rejects
    # unknown Host headers (DNS-rebinding protection), so allow the public host explicitly.
    hosts = ["127.0.0.1:*", "localhost:*", "[::1]:*"]
    origins = ["http://127.0.0.1:*", "http://localhost:*", "http://[::1]:*"]
    for h in ([urlparse(public_url).netloc] if public_url else []) + list(args.allowed_host or []):
        hosts += [h, f"{h}:*"] if ":" not in h else [h]
        origins += [f"https://{h}", f"http://{h}"]
    origins += list(args.allowed_origin or [])
    security = TransportSecuritySettings(enable_dns_rebinding_protection=True,
                                         allowed_hosts=hosts, allowed_origins=origins)

    srv = create_server(oauth=oauth, transport_security=security, host=args.host)
    if "transport_security" in inspect.signature(srv.streamable_http_app).parameters:   # SDK v2
        app = srv.streamable_http_app(transport_security=security, host=args.host)
    else:                                                                                  # SDK v1
        app = srv.streamable_http_app()
    if token:
        app = StaticTokenMiddleware(app, token)

    mode = "OAuth (" + oauth.issuer + ")" if oauth else "access token" if token else "NO AUTHENTICATION"
    where = f"{public_url}/mcp" if public_url else f"http://{args.host}:{args.port}/mcp"
    print(f"MARTi MCP server: {where}  [{mode}]  serving {', '.join(map(str, store.directories))}",
          file=sys.stderr)
    uvicorn.run(app, host=args.host, port=args.port, log_level="warning", proxy_headers=True,
                forwarded_allow_ips="127.0.0.1")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="MARTi MCP server (stdio by default)")
    ap.add_argument("--http", action="store_true", help="serve streamable HTTP instead of stdio")
    ap.add_argument("--host", default="127.0.0.1", help="address to listen on (default: this computer only)")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--public-url", help="public https URL clients use, e.g. a tunnel or reverse-proxy address "
                                         "(or set MARTI_MCP_PUBLIC_URL)")
    ap.add_argument("--allowed-host", action="append", help="extra Host header to accept (repeatable)")
    ap.add_argument("--allowed-origin", action="append", help="extra browser Origin to accept (repeatable)")
    ap.add_argument("--allow-unauthenticated", action="store_true",
                    help="serve beyond this computer with no authentication (testing only)")
    args = ap.parse_args()
    if args.http:
        run_http(args)
    else:
        mcp.run()
