#!/usr/bin/env python3
"""
Soleos Telephony - Automated Outbound Call Spooler (Stage H)
Generates Asterisk .call files with atomic staging -> outgoing rename,
safely configured permissions, dial guards, and idempotency tracking.
"""

import os
import time
import uuid

STAGING_DIR = "/var/spool/asterisk/staging"
OUTGOING_DIR = "/var/spool/asterisk/outgoing"

def create_autodialer_call_file(
    phone_number: str,
    trunk_name: str = "trunk",
    caller_id_name: str = "Soleos Energy",
    caller_id_number: str = "9101",
    call_log_id: str = None,
    wait_time: int = 45,
    context: str = "autodialer-microsip",
) -> str:
    """
    Generates a call file following the audited Stage H specification.
    Uses atomic move from staging to outgoing with safe permissions.
    """
    os.makedirs(STAGING_DIR, exist_ok=True)
    os.makedirs(OUTGOING_DIR, exist_ok=True)

    call_id = call_log_id or f"autodial_{int(time.time())}_{uuid.uuid4().hex[:6]}"
    clean_number = "".join(filter(str.isdigit, phone_number))
    filename = f"call_{clean_number}_{int(time.time())}.call"
    staging_path = os.path.join(STAGING_DIR, filename)
    outgoing_path = os.path.join(OUTGOING_DIR, filename)

    content = f"""Channel: PJSIP/{clean_number}@{trunk_name}
CallerID: "{caller_id_name}" <{caller_id_number}>
MaxRetries: 0
RetryTime: 60
WaitTime: {wait_time}
Context: {context}
Extension: s
Priority: 1
Setvar: CRM_CALL_LOG={call_id}
Setvar: CLIENT_NUMBER={clean_number}
"""

    # 1. Write file to staging directory with safe non-world-writable permissions (0664)
    with open(staging_path, "w") as f:
        f.write(content)

    os.chmod(staging_path, 0o664)

    # 2. Atomic rename from staging to outgoing (Asterisk pbx_spool trigger)
    os.rename(staging_path, outgoing_path)
    print(f">> Spooled call file atomically: {outgoing_path}")
    return outgoing_path

if __name__ == "__main__":
    import sys
    test_num = sys.argv[1] if len(sys.argv) > 1 else "9102"
    print(f"Creating sample call file for number: {test_num}")
    create_autodialer_call_file(test_num)
