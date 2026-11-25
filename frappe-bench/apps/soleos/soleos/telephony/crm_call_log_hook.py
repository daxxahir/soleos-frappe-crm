#!/usr/bin/env python3
"""
Soleos Telephony - CRM Call Log Finalization Hook
Receives call completion parameters from the autodialer-hangup context
and logs/syncs the result into Frappe CRM.
"""

import sys
import os
import json
from datetime import datetime

LOG_FILE = "/var/log/asterisk/crm_hook.log"

def log_call_completion():
    args = sys.argv[1:]
    uniqueid = args[0] if len(args) > 0 else "unknown"
    src = args[1] if len(args) > 1 else "unknown"
    dst = args[2] if len(args) > 2 else "unknown"
    duration = args[3] if len(args) > 3 else "0"
    billsec = args[4] if len(args) > 4 else "0"
    disposition = args[5] if len(args) > 5 else "UNKNOWN"
    userfield = args[6] if len(args) > 6 else ""

    record = {
        "timestamp": datetime.now().isoformat(),
        "uniqueid": uniqueid,
        "src": src,
        "dst": dst,
        "duration": int(duration) if duration.isdigit() else 0,
        "billsec": int(billsec) if billsec.isdigit() else 0,
        "disposition": disposition,
        "userfield": userfield,
    }

    try:
        with open(LOG_FILE, "a") as f:
            f.write(json.dumps(record) + "\n")
    except Exception as e:
        print(f"Failed to log CRM hook: {e}", file=sys.stderr)

if __name__ == "__main__":
    log_call_completion()
