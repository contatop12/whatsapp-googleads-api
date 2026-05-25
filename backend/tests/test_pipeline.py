import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime, timezone


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
    }


@pytest.mark.asyncio
async def test_advance_stage_1_to_2_succeeds():
    lead = make_lead(1)
    tenant = make_tenant()
    updated = {**lead, "stage": 2, "qualified_at": datetime.now(timezone.utc).isoformat()}

    with (
        patch("app.services.pipeline.get_db") as mock_db,
        patch("app.services.pipeline.upload_conversion", return_value={"status": "accepted"}),
    ):
        mock_supabase = AsyncMock()
        mock_db.return_value = mock_supabase

        update_resp = AsyncMock()
        update_resp.data = [updated]
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute = AsyncMock(return_value=update_resp)

        insert_resp = AsyncMock()
        insert_resp.data = [{"id": "conv-uuid"}]
        mock_supabase.table.return_value.insert.return_value.execute = AsyncMock(return_value=insert_resp)

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
