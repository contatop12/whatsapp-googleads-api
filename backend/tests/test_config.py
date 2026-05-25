from app.config import Settings, _resolve_env_files


def test_resolve_env_files_includes_repo_root():
    files = _resolve_env_files()
    assert len(files) >= 1
    assert any(".env" in f for f in files)


def test_settings_reads_supabase_aliases(monkeypatch):
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "jwt-secret")
    s = Settings(_env_file=None)
    assert s.supabase_url == "https://test.supabase.co"
    assert s.supabase_service_role_key == "service-key"
    assert s.is_configured()["supabase"] is True
    assert s.is_configured()["supabase_auth"] is True
