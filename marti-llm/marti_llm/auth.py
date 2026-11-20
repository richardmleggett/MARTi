"""
Authentication for the HTTP transport. stdio (Claude Desktop, LM Studio launching the server itself) needs none:
only the program that started the server can talk to it.

Two modes, chosen by environment variables (kept out of the command line so secrets don't show in `ps`):

1. Static access token - MARTI_MCP_TOKEN
   Every request must send "Authorization: Bearer <token>". For clients where you can set a header or API key:
   Open WebUI, LM Studio (remote server entry), agent scripts, a private network. Not usable from ChatGPT,
   which only offers OAuth or no authentication.

2. OAuth 2.1 resource server - MARTI_MCP_OAUTH_ISSUER (+ MARTI_MCP_PUBLIC_URL)
   The server does NOT log users in itself. An identity provider you already trust (Auth0, Okta, Keycloak,
   Microsoft Entra ID, ...) does that, and this server only checks the signed access tokens it issues:
   signature (against the provider's published keys), issuer, audience, expiry, scopes, and optionally which
   users are allowed. The SDK also publishes the OAuth "protected resource" metadata that ChatGPT and other
   clients use to find the provider. This is what ChatGPT's "OAuth" connector option expects.
"""
from __future__ import annotations

import hmac
import json
import os
import urllib.request
from dataclasses import dataclass, field

import anyio


# --------------------------------------------------------------------------------------------- static token
class StaticTokenMiddleware:
    """Pure ASGI middleware: reject HTTP requests without the right bearer token. Constant-time comparison."""

    def __init__(self, app, token: str, exempt_paths: tuple[str, ...] = ()):
        if len(token) < 24:
            raise ValueError("MARTI_MCP_TOKEN is too short - use at least 24 random characters "
                             "(e.g. `python -c \"import secrets; print(secrets.token_urlsafe(32))\"`).")
        self.app, self.token, self.exempt = app, token.encode(), exempt_paths

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("path", "") in self.exempt:
            return await self.app(scope, receive, send)
        header = dict(scope.get("headers") or []).get(b"authorization", b"")
        scheme, _, supplied = header.partition(b" ")
        if scheme.lower() == b"bearer" and hmac.compare_digest(supplied.strip(), self.token):
            return await self.app(scope, receive, send)
        body = b'{"error":"unauthorized","error_description":"missing or invalid access token"}'
        await send({"type": "http.response.start", "status": 401,
                    "headers": [(b"content-type", b"application/json"),
                                (b"www-authenticate", b'Bearer realm="marti"'),
                                (b"content-length", str(len(body)).encode())]})
        await send({"type": "http.response.body", "body": body})


# --------------------------------------------------------------------------------------------- OAuth
@dataclass
class OAuthConfig:
    issuer: str                          # e.g. https://your-tenant.eu.auth0.com/
    resource_url: str                    # public URL of the MCP endpoint, e.g. https://marti.example.org/mcp
    audience: str | None = None          # expected "aud"; defaults to resource_url
    jwks_url: str | None = None          # defaults to the issuer's OIDC discovery document
    required_scopes: list[str] = field(default_factory=list)
    allowed_users: list[str] = field(default_factory=list)   # match "sub" or "email"; empty = any user the IdP admits
    algorithms: tuple[str, ...] = ("RS256", "ES256", "PS256")

    @classmethod
    def from_env(cls, public_url: str | None) -> "OAuthConfig | None":
        issuer = os.environ.get("MARTI_MCP_OAUTH_ISSUER", "").strip()
        if not issuer:
            return None
        if not public_url:
            raise ValueError("OAuth needs the server's public URL: set MARTI_MCP_PUBLIC_URL or --public-url "
                             "(e.g. https://marti.example.org).")
        split = lambda v: [x.strip() for x in os.environ.get(v, "").replace(",", " ").split() if x.strip()]
        return cls(issuer=issuer, resource_url=public_url.rstrip("/") + "/mcp",
                   audience=os.environ.get("MARTI_MCP_OAUTH_AUDIENCE") or None,
                   jwks_url=os.environ.get("MARTI_MCP_OAUTH_JWKS_URL") or None,
                   required_scopes=split("MARTI_MCP_OAUTH_SCOPES"),
                   allowed_users=split("MARTI_MCP_ALLOWED_USERS"))


class JWTVerifier:
    """MCP TokenVerifier for JWT access tokens from an external identity provider."""

    def __init__(self, cfg: OAuthConfig):
        try:
            import jwt  # PyJWT
        except ImportError as e:  # pragma: no cover
            raise ImportError("OAuth needs PyJWT: pip install 'pyjwt[crypto]'") from e
        self.jwt, self.cfg = jwt, cfg
        self._jwks_client = None

    def _client(self):
        if self._jwks_client is None:
            url = self.cfg.jwks_url
            if not url:
                disc = self.cfg.issuer.rstrip("/") + "/.well-known/openid-configuration"
                with urllib.request.urlopen(disc, timeout=10) as r:   # noqa: S310 (https URL from config)
                    url = json.load(r)["jwks_uri"]
            self._jwks_client = self.jwt.PyJWKClient(url, cache_keys=True, lifespan=3600)
        return self._jwks_client

    def _verify_sync(self, token: str):
        from mcp.server.auth.provider import AccessToken
        key = self._client().get_signing_key_from_jwt(token).key
        claims = self.jwt.decode(
            token, key, algorithms=list(self.cfg.algorithms),
            audience=self.cfg.audience or self.cfg.resource_url,
            issuer=self.cfg.issuer, leeway=30,
            options={"require": ["exp", "iss", "aud"]})
        scopes = claims.get("scope", "")
        scopes = scopes.split() if isinstance(scopes, str) else list(claims.get("scp") or [])
        if any(s not in scopes for s in self.cfg.required_scopes):
            return None
        if self.cfg.allowed_users:
            who = {str(claims.get("sub", "")), str(claims.get("email", "")).lower()}
            if not who & {u.lower() if "@" in u else u for u in self.cfg.allowed_users}:
                return None
        # audience was checked by jwt.decode, so the token was issued for this server
        return AccessToken(token=token, client_id=str(claims.get("azp") or claims.get("client_id") or ""),
                           scopes=scopes, expires_at=int(claims["exp"]), subject=claims.get("sub"),
                           resource=self.cfg.resource_url)

    async def verify_token(self, token: str):
        try:
            return await anyio.to_thread.run_sync(self._verify_sync, token)
        except Exception:   # bad signature, expired, wrong issuer/audience, unreachable key server ...
            return None


def auth_settings(cfg: OAuthConfig):
    from mcp.server.auth.settings import AuthSettings
    return AuthSettings(issuer_url=cfg.issuer, resource_server_url=cfg.resource_url,
                        required_scopes=cfg.required_scopes or None)

