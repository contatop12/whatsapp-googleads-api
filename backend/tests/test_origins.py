import pytest

from app.utils.origins import normalize_origin, normalize_origins


def test_normalize_origin_accepts_https():
    assert normalize_origin("https://www.exemplo.com.br/") == "https://www.exemplo.com.br"


def test_normalize_origin_rejects_path():
    with pytest.raises(ValueError):
        normalize_origin("https://www.exemplo.com.br/pagina")


def test_normalize_origins_deduplicates():
    assert normalize_origins(
        ["https://a.com", "https://a.com/", "https://b.com"]
    ) == ["https://a.com", "https://b.com"]
