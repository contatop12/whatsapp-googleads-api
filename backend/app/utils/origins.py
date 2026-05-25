import re

_ORIGIN_RE = re.compile(r"^https?://[^\s/]+$", re.IGNORECASE)


def normalize_origin(value: str) -> str:
    origin = value.strip().rstrip("/")
    if not _ORIGIN_RE.match(origin):
        raise ValueError(
            "Informe a URL completa da origem (ex: https://www.seusite.com.br), sem caminho no final."
        )
    return origin


def normalize_origins(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        origin = normalize_origin(value)
        if origin not in seen:
            seen.add(origin)
            result.append(origin)
    return result
