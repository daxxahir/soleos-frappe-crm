#!/usr/bin/env bash
# ==============================================================================
# Soleos Telephony - Originate Autodialer Agent Bridge (Stage H)
# Rings available MicroSIP 91xx agents or queues call when human is answered
# ==============================================================================

AGENT_EXTEN=${1:-9101}
CALL_LOG_ID=${2:-unknown}

echo "[$(date -Iseconds)] Bridging autodialer call to agent: ${AGENT_EXTEN} (CallLog: ${CALL_LOG_ID})" >> /var/log/asterisk/autodialer_agent.log

# Command to originate call to agent via Asterisk CLI
/usr/sbin/asterisk -rx "channel originate PJSIP/${AGENT_EXTEN} application Queue soleos-support-queue"
