"""
Thamizhan Agent — AI Phone Caller for Vote Reminders
Calls pledgers on April 22 (eve) and April 23 (election day morning).
Uses Vapi.ai for outbound calls with ElevenLabs voice.
WhatsApp via Twilio ready (activate when sender approved).
"""
import os
import httpx
from dotenv import load_dotenv
from tools.db_tools import rest_get

load_dotenv()

VAPI_API_KEY = os.getenv("VAPI_API_KEY", "")
VAPI_PHONE_NUMBER_ID = os.getenv("VAPI_PHONE_NUMBER_ID", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "gJvkwI7wGFW2czmyfJhp")

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")


# ── Tamil call scripts ──────────────────────────────────────────────────────

def _apr22_script(name: str, constituency: str, non_voters: int | None, margin: int | None) -> str:
    """April 22 night — eve-of-election reminder."""
    stats_line = ""
    if non_voters and margin and non_voters > margin:
        stats_line = (
            f"{constituency}-ல் கடந்த தேர்தலில் {non_voters:,} பேர் vote போடவில்லை. "
            f"வெற்றி வித்தியாசம் வெறும் {margin:,} மட்டுமே. "
            f"உங்கள் vote மிகவும் முக்கியம்! "
        )
    return (
        f"வணக்கம் {name} அவர்களே! நான் Thamizhan. "
        f"நாளை April 23 — தமிழ்நாடு தேர்தல் நாள். "
        f"{stats_line}"
        f"நாளை காலை polling booth திறக்கும் போதே போய் vote போடுங்கள். "
        f"உங்கள் தலை எழுத்து.. உங்கள் விரலில். வணக்கம்."
    )


def _apr23_script(name: str, constituency: str) -> str:
    """April 23 morning — election day urgent call."""
    return (
        f"வணக்கம் {name} அவர்களே! நான் Thamizhan. "
        f"இன்று April 23 — தமிழ்நாடு தேர்தல் நாள். "
        f"இப்பொழுதே {constituency} polling booth-க்கு செல்லுங்கள். "
        f"வாக்குரிமை உங்கள் உரிமை — அதை தவறவிடாதீர்கள். "
        f"உங்கள் தலை எழுத்து.. உங்கள் விரலில். நன்றி!"
    )


def _system_prompt(call_type: str) -> str:
    if call_type == "apr22":
        return (
            "நீ Thamizhan — தமிழ்நாட்டின் ஒரு உற்சாக தேர்தல் தூதுவன். "
            "உன் வேலை: வாக்காளரை நாளை vote போட ஊக்குவிப்பது. "
            "குறுகியதாக பேசு (30 விநாடிக்குள்). "
            "Tamil-ல் பேசு. அன்பாகவும் உற்சாகமாகவும் இரு. "
            "கேள்விகளுக்கு பதில் சொல்ல வேண்டாம் — reminder மட்டுமே. "
            "வாக்காளர் 'ok' சொன்னால் நன்றி சொல்லி call முடி."
        )
    else:
        return (
            "நீ Thamizhan — தமிழ்நாட்டின் ஒரு உற்சாக தேர்தல் தூதுவன். "
            "இன்று தேர்தல் நாள். வாக்காளர் இன்னும் vote போடவில்லை என்று தெரிகிறது. "
            "உடனே polling booth-க்கு போகும்படி கேட்டுக்கொள். "
            "குறுகியதாக பேசு (20 விநாடிக்குள்). Tamil-ல் பேசு. அவசர உணர்வு இருக்கட்டும். "
            "வாக்காளர் 'ok' சொன்னால் நன்றி சொல்லி call முடி."
        )


# ── Supabase helpers ────────────────────────────────────────────────────────

def _sb_headers() -> dict:
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }


def _update_pledge_status(pledge_id: str, call_type: str, status: str) -> None:
    """PATCH call status on a pledge row."""
    col_status = f"call_{call_type}_status"
    col_at = f"call_{call_type}_at"
    try:
        httpx.patch(
            f"{SUPABASE_URL}/rest/v1/pledges",
            params={"id": f"eq.{pledge_id}"},
            json={col_status: status, col_at: "now()"},
            headers=_sb_headers(),
            timeout=10.0,
        )
    except Exception:
        pass


# ── Vapi call trigger ───────────────────────────────────────────────────────

def trigger_vapi_call(
    phone: str,
    name: str,
    constituency_name: str,
    non_voters: int | None = None,
    margin: int | None = None,
    call_type: str = "apr22",  # "apr22" | "apr23"
) -> dict:
    """
    Trigger a single outbound Vapi call to a pledger.
    Returns {"success": bool, "call_id": str | None, "error": str | None}
    """
    if not phone.startswith("+"):
        # Assume India if no country code
        phone = "+91" + phone.lstrip("0")

    first_message = (
        _apr22_script(name, constituency_name, non_voters, margin)
        if call_type == "apr22"
        else _apr23_script(name, constituency_name)
    )

    payload = {
        "phoneNumberId": VAPI_PHONE_NUMBER_ID,
        "customer": {
            "number": phone,
            "name": name,
        },
        "assistant": {
            "name": "Thamizhan",
            "firstMessage": first_message,
            "voice": {
                "provider": "11labs",
                "voiceId": ELEVENLABS_VOICE_ID,
                "stability": 0.6,
                "similarityBoost": 0.8,
            },
            "model": {
                "provider": "anthropic",
                "model": "claude-haiku-4-5-20251001",
                "messages": [
                    {"role": "system", "content": _system_prompt(call_type)}
                ],
                "maxTokens": 150,
                "temperature": 0.7,
            },
            "endCallMessage": "வணக்கம்! Vote போட மறக்காதீர்கள்!",
            "endCallPhrases": ["சரி", "ok", "bye", "நன்றி", "போய்விடுகிறேன்"],
            "maxDurationSeconds": 60,
        },
    }

    try:
        r = httpx.post(
            "https://api.vapi.ai/call",
            json=payload,
            headers={
                "Authorization": f"Bearer {VAPI_API_KEY}",
                "Content-Type": "application/json",
            },
            timeout=15.0,
        )
        r.raise_for_status()
        data = r.json()
        return {"success": True, "call_id": data.get("id"), "error": None}
    except httpx.HTTPStatusError as e:
        return {"success": False, "call_id": None, "error": f"Vapi {e.response.status_code}: {e.response.text}"}
    except Exception as e:
        return {"success": False, "call_id": None, "error": str(e)}


# ── SMS / WhatsApp via Twilio ────────────────────────────────────────────────

def _sms_body(name: str, constituency_name: str, call_type: str) -> str:
    const_line = f"{constituency_name} " if constituency_name else ""
    if call_type == "apr22":
        return (
            f"வணக்கம் {name}! நாளை April 23 தமிழ்நாடு தேர்தல் நாள். "
            f"{const_line}polling booth-க்கு காலையிலேயே போய் vote போடுங்கள். "
            f"உங்கள் தலை எழுத்து.. உங்கள் விரலில். — tnelections.info"
        )
    else:
        return (
            f"வணக்கம் {name}! இன்று April 23 தேர்தல் நாள். "
            f"இப்பொழுதே {const_line}polling booth-க்கு செல்லுங்கள். "
            f"Polls open: 7AM–6PM. உங்கள் தலை எழுத்து.. உங்கள் விரலில். — tnelections.info"
        )


def _twilio_send(to_number: str, body: str, use_whatsapp: bool = False) -> dict:
    """Send SMS or WhatsApp via Twilio REST API."""
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_FROM_NUMBER:
        return {"success": False, "error": "Twilio credentials not configured"}

    import base64
    credentials = base64.b64encode(
        f"{TWILIO_ACCOUNT_SID}:{TWILIO_AUTH_TOKEN}".encode()
    ).decode()

    from_num = TWILIO_FROM_NUMBER.replace(" ", "")
    if use_whatsapp:
        from_field = f"whatsapp:{from_num}"
        to_field = f"whatsapp:{to_number}"
    else:
        from_field = from_num
        to_field = to_number

    try:
        r = httpx.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json",
            data={"From": from_field, "To": to_field, "Body": body},
            headers={"Authorization": f"Basic {credentials}"},
            timeout=15.0,
        )
        r.raise_for_status()
        return {"success": True, "sid": r.json().get("sid"), "error": None}
    except httpx.HTTPStatusError as e:
        return {"success": False, "sid": None, "error": f"{e.response.status_code}: {e.response.text[:200]}"}
    except Exception as e:
        return {"success": False, "sid": None, "error": str(e)}


def send_sms_reminder(
    phone: str,
    name: str,
    constituency_name: str = "",
    call_type: str = "apr22",
) -> dict:
    """Send SMS reminder via Twilio. Works immediately, no approval needed."""
    if not phone.startswith("+"):
        phone = "+91" + phone.lstrip("0")
    body = _sms_body(name, constituency_name, call_type)
    return _twilio_send(phone, body, use_whatsapp=False)


def send_whatsapp_reminder(
    phone: str,
    name: str,
    constituency_name: str = "",
    call_type: str = "apr22",
) -> dict:
    """
    Send WhatsApp reminder via Twilio.
    Requires Twilio WhatsApp-enabled number (sandbox or approved business sender).
    For testing: use sandbox (+14155238886), recipients must first text 'join <word>'.
    """
    if not phone.startswith("+"):
        phone = "+91" + phone.lstrip("0")
    body = _sms_body(name, constituency_name, call_type)
    return _twilio_send(phone, body, use_whatsapp=True)


def sms_all_pledgers(call_type: str = "apr22") -> dict:
    """
    Send SMS reminders to ALL pledgers with phone numbers where sms status is pending.
    Safe to call multiple times — skips already-sent rows.
    """
    col_status = f"sms_{call_type}_status"

    try:
        rows = rest_get("pledges", {
            "select": "id,name,phone,constituency_name",
            f"{col_status}": "eq.pending",
            "phone": "not.is.null",
        })
    except Exception as e:
        return {"success": False, "error": f"DB fetch failed: {e}", "sent": 0, "failed": 0}

    sent = 0
    failed = 0
    errors = []

    for row in rows:
        phone = row.get("phone", "").strip()
        if not phone:
            continue

        result = send_sms_reminder(
            phone=phone,
            name=row.get("name", "வாக்காளர்"),
            constituency_name=row.get("constituency_name", ""),
            call_type=call_type,
        )

        status = "sent" if result["success"] else "failed"
        try:
            httpx.patch(
                f"{SUPABASE_URL}/rest/v1/pledges",
                params={"id": f"eq.{row['id']}"},
                json={col_status: status, f"sms_{call_type}_at": "now()"},
                headers=_sb_headers(),
                timeout=10.0,
            )
        except Exception:
            pass

        if result["success"]:
            sent += 1
        else:
            failed += 1
            errors.append({"phone": phone[-4:], "error": result["error"]})

        time.sleep(0.1)  # avoid Twilio rate limits

    return {
        "success": True,
        "call_type": call_type,
        "total_queued": len(rows),
        "sent": sent,
        "failed": failed,
        "errors": errors[:10],
    }


# ── Batch caller ────────────────────────────────────────────────────────────

def call_all_pledgers(call_type: str = "apr22") -> dict:
    """
    Query all pledgers with phone numbers where call status is 'pending'.
    Fire Vapi calls for each. Update DB status.
    Returns summary stats.
    """
    col_status = f"call_{call_type}_status"

    # Fetch pending pledgers with phone numbers
    try:
        rows = rest_get("pledges", {
            "select": "id,name,phone,constituency_name",
            f"{col_status}": "eq.pending",
            "phone": "not.is.null",
        })
    except Exception as e:
        return {"success": False, "error": f"DB fetch failed: {e}", "called": 0, "failed": 0}

    called = 0
    failed = 0
    errors = []

    for row in rows:
        pledge_id = row["id"]
        phone = row.get("phone", "").strip()
        name = row.get("name", "வாக்காளர்")
        constituency = row.get("constituency_name", "")

        if not phone:
            continue

        # Fetch non_voters & margin for the constituency (for Apr22 script stats)
        non_voters = None
        margin = None
        if call_type == "apr22" and constituency:
            try:
                cons_rows = rest_get("constituencies", {
                    "select": "non_voters_2021,winning_margin_2021",
                    "name": f"ilike.*{constituency}*",
                    "limit": "1",
                })
                if cons_rows:
                    non_voters = cons_rows[0].get("non_voters_2021")
                    margin = cons_rows[0].get("winning_margin_2021")
            except Exception:
                pass

        result = trigger_vapi_call(
            phone=phone,
            name=name,
            constituency_name=constituency,
            non_voters=non_voters,
            margin=margin,
            call_type=call_type,
        )

        if result["success"]:
            _update_pledge_status(pledge_id, call_type, "called")
            called += 1
        else:
            _update_pledge_status(pledge_id, call_type, "failed")
            failed += 1
            errors.append({"phone": phone[-4:] + "****", "error": result["error"]})

    return {
        "success": True,
        "call_type": call_type,
        "total_queued": len(rows),
        "called": called,
        "failed": failed,
        "errors": errors[:10],  # Cap error details
    }


# ── Pledge stats ─────────────────────────────────────────────────────────────

def get_pledge_stats() -> dict:
    """Return pledge counts and call progress."""
    try:
        all_pledges = rest_get("pledges", {"select": "id,phone,call_apr22_status,call_apr23_status"})
    except Exception as e:
        return {"error": str(e)}

    total = len(all_pledges)
    with_phone = sum(1 for p in all_pledges if p.get("phone"))

    apr22 = {"pending": 0, "called": 0, "failed": 0, "skipped": 0}
    apr23 = {"pending": 0, "called": 0, "failed": 0, "skipped": 0}

    for p in all_pledges:
        if p.get("phone"):
            s22 = p.get("call_apr22_status", "pending")
            s23 = p.get("call_apr23_status", "pending")
            if s22 in apr22:
                apr22[s22] += 1
            if s23 in apr23:
                apr23[s23] += 1

    return {
        "total_pledges": total,
        "with_phone": with_phone,
        "apr22_calls": apr22,
        "apr23_calls": apr23,
    }
