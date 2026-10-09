"""Tiny byte strings that pass (or fail) the image checks — real decoding isn't needed."""

JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 60
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 60
WEBP = b"RIFF\x00\x00\x00\x00WEBPVP8 " + b"\x00" * 60
TEXT = b"definitely not an image"


def upload(data: bytes = JPEG, content_type: str = "image/jpeg", name: str = "photo.jpg") -> dict:
    return {"file": (name, data, content_type)}
