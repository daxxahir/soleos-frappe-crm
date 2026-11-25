#!/usr/bin/env python3
"""
Soleos PBX Setup & Configuration Manager
Deploys and activates core SIP endpoints (9101-9104) and dialplan from apps/soleos into Asterisk.
"""

import os
import shutil
import subprocess
import time

SOURCE_CONFIG_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "config"))
TARGET_ASTERISK_DIR = "/etc/asterisk"
REQUIRED_DIRECTORIES = [
    "/var/recordings",
    "/var/spool/asterisk/outgoing",
    "/var/spool/asterisk/staging",
    "/var/spool/asterisk/monitor",
    "/var/spool/asterisk/autodialer_agent_reservations",
    "/var/spool/asterisk/autodialer_agent_occupied",
    "/var/log/asterisk/cdr-csv",
    "/var/log/asterisk/cdr-custom",
    "/var/lib/asterisk/sounds/custom",
    "/var/lib/asterisk/moh/autodialer-hold",
]

CONFIG_FILES = [
    "asterisk.conf",
    "modules.conf",
    "pjsip.conf",
    "pjsip_trunk.conf",
    "pjsip_livekit.conf",
    "extensions.conf",
    "extensions_trunk.conf",
    "rtp.conf",
    "http.conf",
    "ari.conf",
    "manager.conf",
    "cdr.conf",
    "logger.conf",
    "queues.conf",
    "musiconhold.conf",
]

def run_cmd(cmd, check=True):
    print(f">> {cmd}")
    res = subprocess.run(cmd, shell=True, text=True, capture_output=True)
    if check and res.returncode != 0:
        print(f"Error ({res.returncode}): {res.stderr}")
    return res

def backup_and_deploy():
    print("=== 1. Deploying Soleos Telephony Configurations & Directories ===")
    for directory in REQUIRED_DIRECTORIES:
        os.makedirs(directory, exist_ok=True)
        print(f"Ensured directory: {directory}")

    timestamp = int(time.time())
    for cfg in CONFIG_FILES:
        src = os.path.join(SOURCE_CONFIG_DIR, cfg)
        dst = os.path.join(TARGET_ASTERISK_DIR, cfg)
        if not os.path.exists(src):
            continue
        if os.path.exists(dst):
            bak = f"{dst}.bak.{timestamp}"
            shutil.copy2(dst, bak)
            print(f"Backed up {dst} -> {bak}")
        shutil.copy2(src, dst)
        print(f"Deployed {cfg} -> {TARGET_ASTERISK_DIR}/")

    print("\n=== 2. Setting Permissions (Group-Write Access for Integration) ===")
    run_cmd(f"chown -R asterisk:asterisk {TARGET_ASTERISK_DIR} /var/spool/asterisk /var/log/asterisk /var/recordings /var/lib/asterisk")
    run_cmd(f"chmod 644 {TARGET_ASTERISK_DIR}/*.conf")
    run_cmd("chmod 2775 /var/log/asterisk /var/recordings /var/spool/asterisk/staging /var/spool/asterisk/outgoing /var/spool/asterisk/autodialer_agent_reservations /var/spool/asterisk/autodialer_agent_occupied")
    if os.path.exists("/var/run/asterisk/asterisk.ctl"):
        run_cmd("chmod 666 /var/run/asterisk/asterisk.ctl")

    # Populate hold music if empty
    moh_src = "/var/lib/asterisk/moh/macroform-cold_day.wav"
    moh_dst = "/var/lib/asterisk/moh/autodialer-hold/macroform-cold_day.wav"
    if os.path.exists(moh_src) and not os.path.exists(moh_dst):
        shutil.copy2(moh_src, moh_dst)
        run_cmd(f"chown asterisk:asterisk {moh_dst}")

def reload_asterisk():
    print("\n=== 3. Restarting & Reloading Asterisk ===")
    # Restart to guarantee HTTP, ARI, PJSIP, and RTP reload cleanly
    print("Restarting Asterisk service via systemd...")
    run_cmd("systemctl restart asterisk")
    time.sleep(2)
    if os.path.exists("/var/run/asterisk/asterisk.ctl"):
        run_cmd("chmod 666 /var/run/asterisk/asterisk.ctl")

def verify_endpoints():
    print("\n=== 4. Verifying Stage D Subsystems ===")
    print("\n--- HTTP & ARI Server (:8088) ---")
    print(run_cmd("asterisk -rx 'http show status'").stdout)
    print(run_cmd("asterisk -rx 'ari show status'").stdout)

    print("\n--- AMI Manager (:5038) ---")
    print(run_cmd("asterisk -rx 'manager show settings'").stdout)

    print("\n--- Agent Queues & MOH ---")
    print(run_cmd("asterisk -rx 'queue show'").stdout)

    print("\n--- PJSIP Endpoints (:5060) ---")
    print(run_cmd("asterisk -rx 'pjsip show endpoints'").stdout)

    print("\n--- Dialplan ([soleos-internal]) ---")
    print(run_cmd("asterisk -rx 'dialplan show soleos-internal'").stdout)

if __name__ == "__main__":
    if os.geteuid() != 0:
        print("This setup script requires root/sudo privileges.")
        exit(1)
    backup_and_deploy()
    reload_asterisk()
    verify_endpoints()
