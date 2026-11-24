---
name: autonomous-run-preference
description: "When the user leaves the Mac and says \"full power ... sampe kelar\", run nonstop autonomously, keep the Mac awake, auto-resume after usage limits, no questions"
metadata:
  node_type: memory
  type: feedback
  originSessionId: a0f5735b-9a7f-477e-9b57-6de40ca5644b
  modified: 2026-11-14T14:53:37.302Z
---

On 2026-11-14 the user said: "ok full power fokus buat ini yaa, gw mau tinggal laptop lama, ini ensure always on terus yaa sampe bener bener kelar, kalo kepentok limit ensure otomatis lanjut pas udah selesai limit, sampe gw chat lagi kedepan, gassss".

**Why:** they leave the laptop for hours and want the work finished when they come back, not paused on a question or a usage limit.

**How to apply:** keep the Mac awake (`caffeinate -i -m -s` as a background task; it must stay on AC with the lid open), set the slot to full power while they are away (their design apps are closed then), schedule a recurring session cron heartbeat that runs a status script and resumes workflows with `resumeFromRunId` after a usage-limit cut-off, keep a binding state file (Retrux: `notes/round11/AUTOPILOT.md`), decide as the lead and log decisions instead of asking, still never commit / push / deploy without an explicit ask, and send one PushNotification when it is truly done. Go back to light mode when they return.

Related: [[retrux-round11-state]], [[retrux-mac-machine]].
