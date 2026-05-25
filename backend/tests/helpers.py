from unittest.mock import AsyncMock, MagicMock


def patch_get_db(mock_supabase):
    """Retorna patch target configurado para `await get_db()`."""
    return AsyncMock(return_value=mock_supabase)


def make_table_mock(*, update_result=None, insert_result=None, select_result=None):
    table = MagicMock()
    if update_result is not None:
        table.update.return_value.eq.return_value.execute = AsyncMock(return_value=update_result)
    if insert_result is not None:
        table.insert.return_value.execute = AsyncMock(return_value=insert_result)
    if select_result is not None:
        table.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute = AsyncMock(
            return_value=select_result
        )
    return table
