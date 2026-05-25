import pytest
from app.services.classifier import classify_message


def make_tenant(kw_qualified=None, kw_converted=None):
    return {
        "keywords_qualified": kw_qualified or ["interessado", "quero contratar"],
        "keywords_converted": kw_converted or ["fechado", "venda feita"],
    }


def make_lead(stage: int):
    return {"stage": stage}


def test_keyword_advances_stage_1_to_2():
    result = classify_message("Olá, estou interessado no produto!", make_tenant(), make_lead(1))
    assert result == 2


def test_keyword_advances_stage_2_to_3():
    result = classify_message("Negócio fechado, pode prosseguir.", make_tenant(), make_lead(2))
    assert result == 3


def test_no_keyword_returns_none():
    result = classify_message("Oi, tudo bem?", make_tenant(), make_lead(1))
    assert result is None


def test_stage_3_lead_never_advances():
    result = classify_message("interessado fechado", make_tenant(), make_lead(3))
    assert result is None


def test_stage_2_qualified_keyword_ignored():
    result = classify_message("interessado", make_tenant(), make_lead(2))
    assert result is None


def test_case_insensitive():
    result = classify_message("INTERESSADO NO PRODUTO", make_tenant(), make_lead(1))
    assert result == 2


def test_multi_word_keyword():
    result = classify_message("sim, quero contratar agora", make_tenant(), make_lead(1))
    assert result == 2
