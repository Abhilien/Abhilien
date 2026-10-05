# Keeping an AI character's face consistent

The hardest technical problem for an AI celeb is that the face drifts from image to image. If
it drifts, followers stop believing in the character. Use these layers, from cheapest to strongest.

## Layer 1: the identity lock (built in)

Every persona has an `identity` block (face, hair, build, signature details). `studio/prompts.py`
pastes it **verbatim and in the same order** into every image prompt, and the agent is told never
to re-describe the face in scene text. On its own this gets you "same type of person", not
"same person".

Make it specific: "oval face, light olive skin, hazel-green eyes, faint freckles across the nose
bridge, tiny mole above the left lip" holds far better than "beautiful woman with red hair".
**Signature details** (a single gold hoop, a scar, a coloured streak) do a lot of the
recognition work, because viewers recognise characters by distinctive marks.

## Layer 2: a reference image (no training)

1. Generate 50–100 portraits from the identity lock and pick **one** perfect, front-facing,
   evenly lit headshot. This is the character's "passport photo".
2. Host it (any public URL) and add it to `identity.reference_images`.
3. Use an image model that accepts a reference or identity image, and set
   `REPLICATE_REFERENCE_FIELD` to that model's input name (for example `input_image` or
   `image_prompt`; check the model's API page on Replicate).

Image-editing and identity-reference models (instruction-based editing models, and
InstantID / PuLID / IP-Adapter-style face adapters) are good at "this same person, now in
this scene". Expect roughly 80–90% usable shots.

## Layer 3: a LoRA (strongest)

Train a small LoRA on your chosen face:

1. Build a dataset of 15–30 images of the character from Layer 2: varied angles, expressions,
   lighting and outfits, with the **same face**. Discard any image where the face drifted.
2. Train a LoRA on a FLUX- or SDXL-family base model. Replicate, fal.ai and similar hosts have
   one-click trainers; locally, use kohya_ss or ai-toolkit. Pick a rare trigger word such as `lnvss`.
3. Put the trigger word in `identity.lora_trigger` and point `REPLICATE_MODEL` at your trained
   model. The trigger is prepended to every prompt.

This is how most serious AI-influencer operators work. Expect over 90% usable shots.

## Layer 4: the human eye (always)

The approval queue exists for this. Reject any image with:

- a different face, eye colour or missing signature detail
- hands with the wrong number of fingers, melted jewellery, garbled text
- real brand logos you don't have a deal with
- anything that looks sexualised or makes the character look younger than their age

Keep a `references/` folder of the 10 best approved shots per character and compare against
it when reviewing.

## Faceless channels

Faceless channels avoid this problem entirely. Consistency there comes from the **style** block:
the same palette, lighting, lens and grade on every post. Keep a fixed `seed` in the identity block
(faceless personas can have one too) if your model supports it, so that colour stays stable.
