"""Image prompt assembly. The identity lock and style are pasted into every prompt, in the
same order, so the model sees the same "character sheet" every time."""

from __future__ import annotations

from .persona import Persona

ASPECT = {"single": "4:5", "carousel": "4:5", "story": "9:16"}
SIZE = {"4:5": (1080, 1350), "9:16": (1080, 1920), "1:1": (1080, 1080)}


def image_prompt(persona: Persona, scene: str, kind: str) -> dict:
    """Return {prompt, negative, aspect_ratio, seed, references} for one frame."""
    parts: list[str] = []
    if persona.persona_type == "ai_character" and persona.identity:
        idt = persona.identity
        parts.append(f"photo of {persona.name} ({persona.age}): {idt.prompt_fragment()}")
        if idt.wardrobe_signature:
            parts.append(f"signature style: {idt.wardrobe_signature}")
    else:
        parts.append("faceless composition, no identifiable people, no faces")
    parts.append(scene.strip())
    style = persona.style.prompt_fragment()
    if style:
        parts.append(style)
    parts.append("photorealistic, Instagram-native, candid, high detail")
    negative = persona.style.negative
    if persona.persona_type == "faceless":
        negative = f"{negative}, visible face, portrait".strip(", ")
    idt = persona.identity
    return {
        "prompt": ". ".join(parts),
        "negative": negative,
        "aspect_ratio": ASPECT.get(kind, "4:5"),
        "seed": idt.seed if idt else None,
        "references": list(idt.reference_images) if idt else [],
    }
