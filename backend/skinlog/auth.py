"""Checks the Supabase access token the browser sends with every /api request.

Supabase signs each token with its private key; we check the signature with the
matching public key, published at <SUPABASE_URL>/auth/v1/.well-known/jwks.json.
No call to Supabase per request, and no secret shared with this server.
"""

from dataclasses import dataclass
from functools import lru_cache

import jwt
from fastapi import HTTPException

from skinlog.config import get_config

# Supabase's signing keys are ES256 by default; RS256 is the other asymmetric option.
ALGORITHMS = ["ES256", "RS256"]


@dataclass(frozen=True)
class Claims:
    """What we use from a verified token."""

    sub: str  # the Supabase user's id, a UUID that never changes
    email: str | None


class TokenVerifier:
    def __init__(self, issuer: str, signing_key):
        """`signing_key(token)` returns the public key for that token."""
        self.issuer = issuer
        self.signing_key = signing_key

    def verify(self, token: str) -> Claims:
        """The token's claims, or 401 if it's forged, expired or not from our project."""
        try:
            payload = jwt.decode(
                token,
                self.signing_key(token),
                algorithms=ALGORITHMS,
                audience="authenticated",  # signed-in users, not the anonymous role
                issuer=self.issuer,
                options={"require": ["exp", "sub"]},
            )
        except jwt.PyJWTError:
            raise HTTPException(401, "Please sign in again")
        return Claims(sub=payload["sub"], email=payload.get("email"))


@lru_cache
def get_token_verifier() -> TokenVerifier:
    """The real verifier. Built once; PyJWKClient caches the keys it downloads."""
    url = get_config().supabase_url
    if not url:
        raise HTTPException(500, "SUPABASE_URL isn't set on the server.")
    issuer = f"{url}/auth/v1"
    keys = jwt.PyJWKClient(f"{issuer}/.well-known/jwks.json")

    def signing_key(token: str):
        try:
            return keys.get_signing_key_from_jwt(token).key
        except jwt.PyJWKClientError:
            # An unknown key id, or Supabase unreachable: either way we can't trust it.
            raise HTTPException(401, "Please sign in again")
        except jwt.PyJWTError:
            raise HTTPException(401, "Please sign in again")

    return TokenVerifier(issuer, signing_key)
