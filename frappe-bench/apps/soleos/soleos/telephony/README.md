# Soleos PBX Telephony System: Core SIP Setup & Architecture Guide

This document covers the installation, configuration, testing, and security requirements for the internal VoIP / Telephony core within the custom **`soleos`** application.

---

## 1. System Overview & Architecture

The Soleos PBX telephony engine runs on Asterisk 22 LTS (compiled from source 22.12.0 with bundled pjproject and jansson) integrated with Frappe CRM:

```text
[ MicroSIP Agent (9101-9104) ]       [ Voice AI Engine / ARI ]
             │                                   │
             │ SIP / TCP/UDP :5060               │ HTTP/WS :8088 (ARI)
             ▼                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Asterisk PBX Core (Ubuntu 24.04 LTS / Stage D Bundle)                 │
│                                                                        │
│ • PJSIP Driver (Port 5060 UDP/TCP)                                     │
│ • LiveKit SIP Peer (127.0.0.1:5062) -> [pjsip_livekit.conf]           │
│ • Context: [soleos-internal]                                           │
│   ├── 9101, 9102, 9103, 9104 (Agent Extensions)                       │
│   ├── 9100 (Echo Audio Diagnostic Test)                                │
│   ├── 9200 (Support Queue with MOH) -> [queues.conf]                   │
│   ├── [soleos-crm-dialer] (Autodialer Outbound)                        │
│   └── [soleos-voice-ai] (ARI Stasis Route)                            │
│ • HTTP Server (:8088 localhost) -> RESTful ARI for Voice AI           │
│ • AMI Interface (:5038 localhost) -> Python Dialer / FastAPI           │
│ • RTP Range: 10000 - 20000 [rtp.conf]                                  │
│ • Modular Trunk: [soleos-outbound] -> pjsip_trunk.conf (Configurable) │
│ • CDR Logging: /var/log/asterisk/cdr-csv/Master.csv [cdr.conf]         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Automated CDR Watcher
                                    ▼
                      [ Frappe CRM Call Log / Deals ]
```

---

## 2. Core Extension Directory & Credentials

The core endpoints are pre-configured with standard development credentials:

| Extension | Display Name | Username | Password | Domain / Host | Context |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`9101`** | Agent 9101 | `9101` | `SoleosPass9101!` | `<YOUR_PC_IP>:5060` or `127.0.0.1:5060` | `soleos-internal` |
| **`9102`** | Agent 9102 | `9102` | `SoleosPass9102!` | `<YOUR_PC_IP>:5060` or `127.0.0.1:5060` | `soleos-internal` |
| **`9103`** | Agent 9103 | `9103` | `SoleosPass9103!` | `<YOUR_PC_IP>:5060` or `127.0.0.1:5060` | `soleos-internal` |
| **`9104`** | Agent 9104 | `9104` | `SoleosPass9104!` | `<YOUR_PC_IP>:5060` or `127.0.0.1:5060` | `soleos-internal` |
| **`9100`** | Echo Test | N/A | (System Audio Test) | N/A | `soleos-internal` |

---

## 3. MicroSIP Softphone Configuration (Step-by-Step)

To register and test calling using the free **MicroSIP** softphone on Windows:

1. Download and install **MicroSIP** (from [microsip.org](https://www.microsip.org)).
2. Open MicroSIP -> Click the top-right down arrow menu -> **Add Account...**
3. Enter the following parameters:
   * **Account Name:** `Soleos 9101` (or 9102)
   * **SIP Server:** `127.0.0.1:5060` *(or WSL IP `172.29.60.58:5060`)*
   * **SIP Proxy:** *(leave blank)*
   * **User:** `9101`
   * **Domain:** `127.0.0.1` *(or `172.29.60.58`)*
   * **Login:** `9101`
   * **Password:** `SoleosPass9101!`
   * **Display Name:** `Agent 9101`
   * **Transport:** Select **`TCP`** *(Important: Windows WSL2 localhost forwarding proxies TCP; if using UDP, set SIP Server to the WSL IP `172.29.60.58`)*
4. Click **Save**.
5. MicroSIP bottom status bar will turn green with status **"Online"**.

---

## 4. Testing Internal Calling

### Test A: Echo Audio Diagnostic Test (Extension 9100)
1. In MicroSIP, dial **`9100`** and press the green Call button.
2. Asterisk will answer, play the echo prompt, and echo your microphone audio back into your headset with zero latency.
3. Hang up when done.

### Test B: Agent-to-Agent Internal Calling
1. Open MicroSIP instance 1 (logged in as `9101`).
2. Open MicroSIP portable or second device (logged in as `9102`).
3. Dial **`9102`** from 9101.
4. Extension 9102 will ring. Answer to test bidirectional two-way talk.

---

## 5. Modular SIP Trunk Integration (Plugging in External Providers)

The system is designed so external SIP trunks (e.g., Tata Tele, Jio, Twilio, Exotel, Airtel) can be connected at any time without modifying core internal configs.

* **Configuration File:** `apps/soleos/soleos/telephony/config/pjsip_trunk.conf`
* **Dialplan File:** `apps/soleos/soleos/telephony/config/extensions_trunk.conf`

To activate a trunk:
1. Open `pjsip_trunk.conf` and fill in:
   ```ini
   [trunk-auth]
   type=auth
   auth_type=userpass
   username=YOUR_TRUNK_USER
   password=YOUR_TRUNK_PASS

   [trunk-aor]
   type=aor
   contact=sip:PROVIDER_SIP_HOST:5060

   [soleos-trunk]
   type=endpoint
   transport=transport-udp
   context=soleos-inbound
   disallow=all
   allow=ulaw,alaw,g729
   aors=trunk-aor
   auth=trunk-auth
   outbound_auth=trunk-auth
   ```
2. Run `sudo python3 /home/soleos/frappe-bench/apps/soleos/soleos/telephony/setup_asterisk.py` to reload.

---

## 6. Security Requirements & Hardening

1. **Firewall (UFW):**
   * Keep SIP port 5060 restricted to authorized local LAN subnets / VPN IPs.
   * `sudo ufw allow from 192.168.0.0/24 to any port 5060 proto udp`
2. **Fail2ban:**
   * Installed to automatically ban brute-force SIP register attempts.
3. **AMI Protection:**
   * Asterisk Manager Interface (`manager.conf`) is strictly bound to `127.0.0.1:5038` with strong authentication (`SoleosAmiSecret2026!`). Never bind AMI to public IP addresses.
4. **SIP Passwords:**
   * Before production use, rotate the default passwords (`SoleosPass910X!`) to randomly generated 24-character credentials.

---

## 7. Useful Operational Commands

| Action | Command |
| :--- | :--- |
| **Check Active Endpoints** | `sudo asterisk -rx 'pjsip show endpoints'` |
| **Check Active SIP Calls** | `sudo asterisk -rx 'core show channels'` |
| **View Internal Dialplan** | `sudo asterisk -rx 'dialplan show soleos-internal'` |
| **View Live Asterisk CLI** | `sudo asterisk -rvvv` |
| **View CDR Call Records** | `sudo tail -f /var/log/asterisk/cdr-csv/Master.csv` |
| **Redeploy Configurations** | `sudo python3 /home/soleos/frappe-bench/apps/soleos/soleos/telephony/setup_asterisk.py` |
