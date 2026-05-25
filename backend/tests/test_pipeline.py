import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone
from tests.helpers import patch_get_db, make_table_mock


def make_lead(stage: int, **kwargs):
    base = {
        "id": "lead-uuid",
        "tenant_id": "tenant-uuid",
        "phone": "+5511999999999",
        "gclid": "test_gclid",
        "stage": stage,
        "name": "Test Lead",
        "email": "test@gmail.com",
        "conversion_value": None,
        "first_message_at": datetime.now(timezone.utc).isoformat(),
        "qualified_at": None,
        "converted_at": None,
    }
    base.update(kwargs)
    return base


def make_tenant():
    return {
        "id": "tenant-uuid",
        "google_ads_customer_id": "123",
        "google_ads_conversion_new_lead": "lead",
        "google_ads_conversion_qualified": "qualified",
        "google_ads_conversion_converted": "converted",
        "conversion_value_qualified": 50.0,
        "conversion_value_converted": 500.0,
    }


@pytest.mark.asyncio
async def test_advance_stage_1_to_2_succeeds():
    lead = make_lead(1)
    tenant = make_tenant()
    updated = {**lead, "stage": 2, "qualified_at": datetime.now(timezone.utc).isoformat()}

    update_resp = MagicMock()
    update_resp.data = [updated]
    insert_resp = MagicMock()
    insert_resp.data = [{"id": "conv-uuid"}]
    mock_supabase = MagicMock()

    def table_router(name):
        if name == "leads":
            return make_table_mock(update_result=update_resp)
        return make_table_mock(insert_result=insert_resp)

    mock_supabase.table.side_effect = table_router

    with (
        patch("app.services.pipeline.get_db", patch_get_db(mock_supabase)),
        patch("app.services.pipeline.upload_conversion", return_value={"status": "accepted"}),
    ):
        from app.services.pipeline import advance_stage
        result = await advance_stage(lead=lead, new_stage=2, tenant=tenant, triggered_by="manual", conversion_value=None)

    assert result["stage"] == 2


@pytest.mark.asyncio
async def test_advance_stage_1_to_2_fails_without_email():
    from app.services.pipeline import advance_stage, StageValidationError
    lead = make_lead(1, email=None)
    with pytest.raises(StageValidationError, match="email"):
        await advance_stage(lead=lead, new_stage=2, tenant=make_tenant(), triggered_by="manual", conversion_value=None)


@pytest.mark.asyncio
async def test_advance_stage_1_to_2_fails_without_name():
    from app.services.pipeline import advance_stage, StageValidationError
    lead = make_lead(1, name=None)
    with pytest.raises(StageValidationError, match="name"):
        await advance_stage(lead=lead, new_stage=2, tenant=make_tenant(), triggered_by="manual", conversion_value=None)


@pytest.mark.asyncio
async def test_advance_stage_3_to_2_blocked():
    from app.services.pipeline import advance_stage, StageValidationError
    with pytest.raises(StageValidationError, match="cannot go back"):
        await advance_stage(lead=make_lead(3), new_stage=2, tenant=make_tenant(), triggered_by="manual", conversion_value=None)


@pytest.mark.asyncio
async def test_advance_stage_1_to_3_blocked():
    from app.services.pipeline import advance_stage, StageValidationError
    with pytest.raises(StageValidationError, match="must pass through stage 2"):
        await advance_stage(lead=make_lead(1), new_stage=3, tenant=make_tenant(), triggered_by="manual", conversion_value=None)


@pytest.mark.asyncio
async def test_advance_stage_3_to_3_blocked():
    from app.services.pipeline import advance_stage, StageValidationError
    with pytest.raises(StageValidationError, match="cannot go back"):
        await advance_stage(lead=make_lead(3), new_stage=3, tenant=make_tenant(), triggered_by="manual", conversion_value=None)


@pytest.mark.asyncio
async def test_advance_stage_2_to_3_auto_uses_tenant_value():
    lead = make_lead(2)
    tenant = make_tenant()
    updated = {
        **lead,
        "stage": 3,
        "converted_at": datetime.now(timezone.utc).isoformat(),
        "conversion_value": 500.0,
    }

    update_resp = MagicMock()
    update_resp.data = [updated]
    insert_resp = MagicMock()
    insert_resp.data = [{"id": "conv-uuid"}]
    mock_supabase = MagicMock()
    mock_supabase.table.side_effect = lambda name: (
        make_table_mock(update_result=update_resp)
        if name == "leads"
        else make_table_mock(insert_result=insert_resp)
    )

    with (
        patch("app.services.pipeline.get_db", patch_get_db(mock_supabase)),
        patch("app.services.pipeline.upload_conversion", return_value={"status": "accepted"}),
    ):
        from app.services.pipeline import advance_stage
        result = await advance_stage(
            lead=lead,
            new_stage=3,
            tenant=tenant,
            triggered_by="auto",
            conversion_value=None,
        )

    assert result["stage"] == 3
    assert result["conversion_value"] == 500.0


@pytest.mark.asyncio
async def test_record_first_message_fires_stage1_when_lead_from_track():
    lead = make_lead(1, first_message_at=None)
    tenant = make_tenant()
    updated_lead = {**lead, "first_message_at": datetime.now(timezone.utc).isoformat()}

    update_resp = MagicMock()
    update_resp.data = [updated_lead]
    insert_resp = MagicMock()
    insert_resp.data = [{"id": "conv-uuid"}]
    empty_select = MagicMock()
    empty_select.data = []
    mock_supabase = MagicMock()
    mock_supabase.table.side_effect = lambda name: (
        make_table_mock(update_result=update_resp)
        if name == "leads"
        else make_table_mock(insert_result=insert_resp, select_result=empty_select)
    )

    with (
        patch("app.services.pipeline.get_db", patch_get_db(mock_supabase)),
        patch("app.services.pipeline.upload_conversion", return_value={"status": "skipped", "reason": "no_gclid"}),
    ):
        from app.services.pipeline import record_first_message
        result = await record_first_message(
            lead=lead,
            tenant=tenant,
            first_message_at=updated_lead["first_message_at"],
        )

    assert result["first_message_at"] is not None
