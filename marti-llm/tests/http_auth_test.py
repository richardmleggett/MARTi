"""
HTTP transport security, tested against real server processes:
  - tools carry read-only annotations and titles
  - refuses to serve beyond this computer without authentication
  - static access token (MARTI_MCP_TOKEN)
  - public host names (tunnels / reverse proxies) are rejected unless allowed with --public-url
  - OAuth resource-server mode, against a stand-in identity provider with its own signing key:
    valid, expired, wrong-audience, wrong-issuer, missing-scope and disallowed-user tokens

    MARTI_DIRS=/path/to/MARTi/gui/output python tests/http_auth_test.py          # needs pyjwt[crypto], httpx
"""
import json
import os
import socket
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import logging

import httpx

logging.getLogger("httpx").setLevel(logging.WARNING)
import jwt
from cryptography.hazmat.primitives.asymmetric import rsa

ROOT = Path(__file__).resolve().parents[1]
PY = sys.executable
failures = 0


def check(label, ok, detail=""):
    global failures
    failures += not ok
    print(("PASS " if ok else "FAIL ") + label + (f"  [{detail}]" if detail and not ok else ""))


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def start(args, env_extra):
    port = free_port()
    env = {**os.environ, **env_extra}
    p = subprocess.Popen([PY, str(ROOT / "server.py"), "--http", "--port", str(port), *args], env=env,
                         stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    for _ in range(100):
        if p.poll() is not None:
            return p, port
        try:
            socket.create_connection(("127.0.0.1", port), timeout=0.2).close()
            return p, port
        except OSError:
            time.sleep(0.1)
    return p, port


INIT = {"jsonrpc": "2.0", "id": 1, "method": "initialize",
        "params": {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "t", "version": "1"}}}
HDR = {"content-type": "application/json", "accept": "application/json, text/event-stream"}


def rpc_json(r):
    if r.headers.get("content-type", "").startswith("text/event-stream"):
        for line in r.text.splitlines():
            if line.startswith("data:"):
                return json.loads(line[5:])
    return r.json()


def session(base, headers=None, host=None):
    """initialize + tools/list over raw streamable HTTP. Returns (init status, tools or None)."""
    h = {**HDR, **(headers or {})}
    if host:
        h["host"] = host
    r = httpx.post(base, json=INIT, headers=h, timeout=10)
    if r.status_code != 200:
        return r.status_code, None, r
    sid = r.headers.get("mcp-session-id")
    h2 = {**h, **({"mcp-session-id": sid} if sid else {}), "mcp-protocol-version": "2025-06-18"}
    httpx.post(base, json={"jsonrpc": "2.0", "method": "notifications/initialized"}, headers=h2, timeout=10)
    r2 = httpx.post(base, json={"jsonrpc": "2.0", "id": 2, "method": "tools/list"}, headers=h2, timeout=10)
    return 200, rpc_json(r2)["result"]["tools"], r


# ------------------------------------------------------------------------- 1. annotations (stdio default server)
sys.path.insert(0, str(ROOT))
import asyncio  # noqa: E402

import server  # noqa: E402


async def _tools():
    return await server.mcp.list_tools()

tools = asyncio.run(_tools())


def ann(t):
    a = getattr(t, "annotations", None)
    return a.model_dump(by_alias=True, exclude_none=True) if a else {}


readers = [t for t in tools if t.name != "save_narrative"]
check(f"all {len(readers)} reading tools labelled read-only, non-destructive, idempotent, closed-world",
      all(ann(t).get("readOnlyHint") is True and ann(t).get("destructiveHint") is False
          and ann(t).get("idempotentHint") is True and ann(t).get("openWorldHint") is False for t in readers))
writer = next(t for t in tools if t.name == "save_narrative")
check("save_narrative, the one tool that writes, is labelled as a write that replaces a file",
      ann(writer).get("readOnlyHint") is False and ann(writer).get("destructiveHint") is True)
check("all tools have human-readable titles", all(getattr(t, "title", None) or ann(t).get("title") for t in tools))

# ------------------------------------------------------------------------- 2. refuse unauthenticated exposure
for args in (["--host", "0.0.0.0"], ["--public-url", "https://marti.example.org"]):
    p, _ = start(args, {"MARTI_MCP_TOKEN": "", "MARTI_MCP_OAUTH_ISSUER": ""})
    p.wait(timeout=20)
    check(f"refuses {' '.join(args)} without authentication", p.returncode != 0 and "Refusing" in p.stderr.read())

p, port = start([], {"MARTI_MCP_TOKEN": "", "MARTI_MCP_OAUTH_ISSUER": ""})
st, tl, _ = session(f"http://127.0.0.1:{port}/mcp")
check("local-only (127.0.0.1) without auth still works, as before", st == 200 and tl and len(tl) == len(tools))
st, _, r = session(f"http://127.0.0.1:{port}/mcp", host="marti.example.org")
check("public Host header rejected when not allowed (tunnel without --public-url)", st == 421, st)
p.terminate()

# ------------------------------------------------------------------------- 3. static token
TOKEN = "x" * 8 + "S3cr3t-T0ken-For-Testing-Only"
p, port = start(["--public-url", "https://marti.example.org"], {"MARTI_MCP_TOKEN": TOKEN})
base = f"http://127.0.0.1:{port}/mcp"
check("token: request without token -> 401", session(base, host="marti.example.org")[0] == 401)
check("token: wrong token -> 401",
      session(base, {"authorization": "Bearer " + TOKEN[:-1] + "!"}, host="marti.example.org")[0] == 401)
st, tl, _ = session(base, {"authorization": "Bearer " + TOKEN}, host="marti.example.org")
check("token: correct token via public host -> tools listed", st == 200 and tl and len(tl) == len(tools))
st, tl, _ = session(base, {"authorization": "Bearer " + TOKEN}, host="evil.example.com")
check("token: correct token but unknown Host -> 421", st == 421, st)
p.terminate()
p, _ = start([], {"MARTI_MCP_TOKEN": "short"})
p.wait(timeout=20)
check("token: too-short token refused at startup", p.returncode != 0)

# ------------------------------------------------------------------------- 4. OAuth with a stand-in IdP
key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
pub = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(key.public_key()))
pub.update(kid="k1", use="sig", alg="RS256")
idp_port = free_port()
ISS = f"http://127.0.0.1:{idp_port}/"


class IdP(BaseHTTPRequestHandler):
    def do_GET(self):
        body = {"/.well-known/openid-configuration": {"issuer": ISS, "jwks_uri": ISS + "jwks"},
                "/jwks": {"keys": [pub]}}.get(self.path)
        self.send_response(200 if body else 404)
        self.send_header("content-type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(body or {}).encode())

    def log_message(self, *a):
        pass


idp = HTTPServer(("127.0.0.1", idp_port), IdP)
threading.Thread(target=idp.serve_forever, daemon=True).start()

PUBLIC = "https://marti.example.org"
RESOURCE = PUBLIC + "/mcp"
p, port = start(["--public-url", PUBLIC], {"MARTI_MCP_OAUTH_ISSUER": ISS, "MARTI_MCP_TOKEN": "",
                                          "MARTI_MCP_OAUTH_SCOPES": "marti:read",
                                          "MARTI_MCP_ALLOWED_USERS": "alice@example.org"})
base = f"http://127.0.0.1:{port}/mcp"
if p.poll() is not None:
    print(p.stderr.read())


def tok(**over):
    claims = {"iss": ISS, "aud": RESOURCE, "sub": "auth0|alice", "email": "alice@example.org",
              "scope": "openid marti:read", "exp": int(time.time()) + 600, "iat": int(time.time()), "azp": "chatgpt"}
    claims.update(over)
    claims = {k: v for k, v in claims.items() if v is not None}
    return jwt.encode(claims, key, algorithm="RS256", headers={"kid": "k1"})


def status(t):
    return session(base, {"authorization": "Bearer " + t} if t else {}, host="marti.example.org")


st, _, r = status(None)
www = r.headers.get("www-authenticate", "")
check("oauth: no token -> 401 pointing clients at the protected-resource metadata",
      st == 401 and "resource_metadata" in www, f"{st} {www}")
meta_paths = ["/.well-known/oauth-protected-resource/mcp", "/.well-known/oauth-protected-resource"]
meta = None
for mp in meta_paths:
    m = httpx.get(f"http://127.0.0.1:{port}{mp}", headers={"host": "marti.example.org"})
    if m.status_code == 200:
        meta = m.json()
        break
check("oauth: protected-resource metadata names the identity provider and resource",
      bool(meta) and ISS.rstrip("/") in [s.rstrip("/") for s in meta.get("authorization_servers", [])]
      and meta.get("resource", "").rstrip("/") in (RESOURCE, PUBLIC), meta)
st, tl, _ = status(tok())
check("oauth: valid token -> tools listed", st == 200 and tl and len(tl) == len(tools), st)
for label, t in [("expired token", tok(exp=int(time.time()) - 3600)),
                 ("token for another audience", tok(aud="https://other.example.org/mcp")),
                 ("token from another issuer", tok(iss="https://evil.example.com/")),
                 ("token missing the required scope", tok(scope="openid")),
                 ("token for a user not on the allow-list", tok(sub="auth0|mallory", email="mallory@example.org"))]:
    check(f"oauth: {label} -> 401", status(t)[0] == 401)
other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
forged = jwt.encode(jwt.decode(tok(), options={"verify_signature": False}), other, algorithm="RS256",
                    headers={"kid": "k1"})
check("oauth: token signed with the wrong key -> 401", status(forged)[0] == 401)
p.terminate()
idp.shutdown()

print("\nALL HTTP AUTH CHECKS PASSED" if not failures else f"\n{failures} HTTP AUTH CHECK(S) FAILED")
sys.exit(1 if failures else 0)
