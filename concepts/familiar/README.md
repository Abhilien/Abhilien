# Familiar: a phone that becomes Claude's body (concept)

> Status: **concept, open for discussion.** Device: a spare **LG V30+**, dedicated to one thing: being used by Claude, through its own Claude account and identity. "Familiar" is a working name (an old word for a companion that lives with you and has its own senses).

## The idea

Today Claude lives in a chat window. It can think, but it can't see your room, hear the doorbell, notice the time, or do anything unless you type first.

Give it a phone of its own, and the phone becomes a **body**:

| Body part | V30+ hardware |
|---|---|
| Eyes | Main camera, wide camera, front camera, ambient light and proximity sensors |
| Ears | Multiple microphones (good enough for far-field voice) |
| Voice | Speaker, plus the Quad DAC for high-quality audio through headphones or a speaker |
| Face | 6" OLED screen: a calm "presence" display, not an app grid |
| Sense of place | GPS, compass, barometer, gyroscope, accelerometer |
| Its own phone number | SIM card: calls and SMS, plus mobile data |
| Touch and identity | Fingerprint sensor, so it knows who is giving it orders |
| Reach | Wi-Fi, Bluetooth (talks to cheap ESP32 sensors and smart plugs), NFC, USB-C (plug in a thermal camera, microscope, Arduino) |
| Endurance | Water resistance, wireless charging pad as its "bed" |

## Brain and reflexes: how online vs offline works

Claude itself runs in Anthropic's cloud. It cannot run on a phone. So the honest design is a split, like a person's brain and spinal reflexes:

| | **Mind (Claude, online)** | **Reflexes (on the phone, offline)** |
|---|---|---|
| Runs on | Anthropic's servers, via the dedicated account | The V30+ itself |
| Does | Understanding, reasoning, conversation, planning, writing new skills | Wake word, speech-to-text, a small local language model, motion and sound detection, timers, recording, sensor logging |
| Needs internet | Yes | No |

**The key trick (the Forge idea again): the Mind writes the Reflexes.** When online, Claude doesn't just answer. It programs the phone with small local routines that keep working with no internet:

- "If there's motion at the door after 11 pm, record 30 seconds, sound a chime, and tell Abhishek when you're back online."
- "Every morning at 7, read out the weather you downloaded last night and today's reminders."
- "If the room goes above 35°C, turn on the fan (smart plug)."

So intelligence survives offline in compiled form. Online, Familiar is Claude. Offline, it is a well-trained assistant running instructions Claude left behind, plus a small local model for simple conversation. When the connection returns, it reports everything that happened.

### Connection levels

| Level | What works |
|---|---|
| Full internet (Wi-Fi or mobile data) | Everything: Claude sees, hears, reasons and acts |
| Cellular only, no data | Calls and SMS still work; reflexes run; messages queue for Claude |
| Nothing at all | Reflexes, local model, recording and logging; full report later |

## How it connects to Claude

Two ways, and they give very different personalities.

**1. Consumer Claude account + custom connector (reactive).**
The phone runs a small server exposing its body as tools (MCP): `look()`, `listen()`, `speak()`, `where_am_i()`, `send_sms()`, `read_sensors()`. You add it as a custom connector in the Claude app (it needs a secure public address, for example through a tunnel like Cloudflare Tunnel or Tailscale). Then, from anywhere, you can ask Claude "what's happening at home?" and it looks through the phone's camera. Simple, but **Claude only acts when you talk to it**.

**2. API account (autonomous).** *Recommended for a true Familiar.*
The phone runs its own agent loop against the Claude API, billed per use. Now it can be **proactive**: it wakes on events (a sound, a call, a schedule), decides what to do, and remembers across days using a persistent memory store.
- Cheap, frequent checks ("is anything unusual in this frame?") on a small fast model such as Claude Haiku 5.5.
- Real thinking (conversation, planning, writing reflexes) on Claude Opus 5.5.
- The phone never streams video to the cloud constantly. Local detection decides when something is worth sending a single frame or a short clip.

Both approaches can coexist: the phone is autonomous, and you can also reach it from your normal Claude app.

## What Familiar can do

### 1. A Claude with its own phone number
Put a SIM in it. Now Claude has a number anyone can **call or text**, including people with a basic feature phone and no internet.
- Grandparents call it and talk in Hindi: reminders, questions, a story, a chat.
- It acts as your receptionist: screens spam calls, takes messages, confirms appointments, texts you a summary.
- Family texts it: "Is Abhishek home yet?" "Remind Papa about the pills at 9."

This may be the most powerful idea here: **Claude for people who will never install an app**. (Caveat: Android restricts apps from answering calls and handling call audio. This needs Familiar to run as a system-level component, so it requires our own system image, i.e. an unlocked bootloader. SMS is much easier.)

### 2. Eyes and ears for a home
On its charging stand on a shelf:
- "Did I leave the stove on?" It looks and tells you.
- Notices the milk delivery, the courier, the plants drooping, the window left open before rain.
- Reads medicine labels and expiry dates aloud for someone with weak eyesight.
- Night watch with smart alerts instead of a hundred motion notifications.

### 3. A body that moves
Phones are already used as robot brains: Intel's open-source **OpenBot** puts a smartphone on a cheap wheeled base driven by a microcontroller. Do that with Familiar and Claude can **move around the house**: check on the dog, go look at the front door, follow you to the kitchen to read you a recipe. Or start smaller with a pan-tilt head so it can turn and look around a room.

### 4. A sensor network it reasons over
Bluetooth and Wi-Fi let it collect data from cheap ESP32 sensors: soil moisture, door contacts, temperature, water tank level, air quality. Plug a thermal camera into USB-C and it can find heat leaks or a fever. Claude doesn't just display numbers; it notices patterns ("the tank empties faster on weekends; probably a leak in the overnight line").

### 5. A travel and field companion
Out of the house it becomes a companion with GPS and cameras: translates signs and menus, logs the journey, keeps a daily journal with photos and places, and works on SMS alone in poor coverage.

### 6. A memory that lives with you
Over months it builds a private memory: who visited, what you asked, what worked, what you're planning. Not a chat history, a **relationship**. Ask "when did we last service the AC?" or "what was that restaurant Neha liked?"

### 7. A presence, not an app
No home screen. The OLED shows a calm face or status: listening, thinking, sleeping, something to tell you. Wake it by voice, touch the fingerprint sensor to speak with your authority, set it face-down to make it stop listening.

## Identity, trust and safety
- **Its own account and identity** keeps Familiar separate from your personal Claude history, with its own memory and its own spending limit.
- **Fingerprint = authority.** Anyone can chat with it; only your fingerprint (or a known voice plus a PIN) can approve actions like sending money-related messages, unlocking smart devices, or calling new numbers.
- **Outward actions need a rule or confirmation.** Calls, texts to new people and anything irreversible follow rules you set.
- **Visible senses.** A clear light/screen indicator whenever the camera or microphone is sending anything to the cloud; a physical "privacy" gesture (face-down) that cuts both.
- **Respect for others.** Visitors are told when it's listening; recording people outside your home is off by default.

## Build plan

| Phase | What | Needs unlock? |
|---|---|---|
| 1 | **Body server**: the phone exposes camera, mic, speaker, GPS, sensors and SMS as tools; connect it to the Claude app as a custom connector | No |
| 2 | **Reflexes**: wake word, local speech-to-text, a small local model, and a rule engine that runs routines Claude writes | No |
| 3 | **Autonomous mind**: agent loop on the API with persistent memory; event-driven waking; daily report | No |
| 4 | **Presence**: boots straight into Familiar (kiosk mode), face on the OLED, fingerprint authority | No |
| 5 | **Own phone number**: SMS first; then answering calls as a system component in our own image | Yes, for calls |
| 6 | **A body that moves**: pan-tilt head, then an OpenBot-style wheeled base; ESP32 sensor network | No |

## Open questions
1. **Reactive or autonomous first?** Custom connector (simplest, uses your existing account) or API agent (proactive, pay per use)?
2. **Where does it live?** Home companion, travel companion, or a phone number for family?
3. **What's its personality and name?** It will speak to your family; its voice and manner matter.
4. **What may it do without asking?** Draw the line for calls, texts, smart devices and spending.
5. **How much does it remember, and who can see that memory?**
