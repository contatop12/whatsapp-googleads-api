from pydantic import BaseModel, Field


class WhatsAppLinkRequest(BaseModel):
    instance_name: str = Field(min_length=1, max_length=128)


class EvolutionInstanceItem(BaseModel):
    instance_name: str
    instance_id: str | None = None
    phone: str | None = None
    profile_name: str | None = None
    status: str
    evolution_status: str
    linked_tenant: dict | None = None
