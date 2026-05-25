def classify_message(message: str, tenant: dict, lead: dict) -> int | None:
    text = message.lower()
    stage = lead["stage"]

    if stage == 1:
        for keyword in tenant.get("keywords_qualified", []):
            if keyword.lower() in text:
                return 2

    if stage == 2:
        for keyword in tenant.get("keywords_converted", []):
            if keyword.lower() in text:
                return 3

    return None
