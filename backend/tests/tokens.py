"""Real signed tokens for tests, from a key pair made here instead of Supabase's."""

from datetime import datetime, timedelta, timezone

import jwt
from cryptography.hazmat.primitives.asymmetric import ec

from skinlog.auth import TokenVerifier

ISSUER = "https://test-project.supabase.co/auth/v1"
PRIVATE_KEY = ec.generate_private_key(ec.SECP256R1())  # what Supabase keeps secret
PUBLIC_KEY = PRIVATE_KEY.public_key()  # what it publishes

# auth_ids of the users conftest creates
USER_1 = "11111111-1111-1111-1111-111111111111"
USER_2 = "22222222-2222-2222-2222-222222222222"


def make_token(sub: str, email: str | None = "me@example.com", key=PRIVATE_KEY, **overrides) -> str:
    """A token shaped like Supabase's; pass overrides (exp, aud, iss…) to break it."""
    claims = {
        "sub": sub,
        "email": email,
        "aud": "authenticated",
        "iss": ISSUER,
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        **overrides,
    }
    return jwt.encode({k: v for k, v in claims.items() if v is not None}, key, algorithm="ES256")


def auth_header(sub: str, **kwargs) -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(sub, **kwargs)}"}


def fake_verifier() -> TokenVerifier:
    return TokenVerifier(ISSUER, lambda _token: PUBLIC_KEY)
