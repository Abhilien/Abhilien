# The Production World

**Live demo: https://abhilien.github.io/production-world/**

A working test of one idea for AI filmmaking: **the world exists first, and events actually happen in it. Every shot is just a camera looking at that world**, so cameras can change without the story changing.

AI video tools today generate every shot from scratch, which is why continuity breaks between shots. This prototype removes that assumption. Consistency becomes true by construction, because there is one world and many cameras.

## What it shows

One room, two characters, ten objects, ten events, running in the browser in 3D.

- **Events are computed, not scripted.** When Tomas leans on the table, a rule tests every object's distance to the edge. The glass falls and breaks *because of where it was placed*, and the spilled milk stains the rug because the rug absorbs liquid.
- **Four cameras, one world.** Switching camera never changes the world state. A fingerprint of the full state is shown under the stage to prove it.
- **Coverage checks.** Each event declares what must be seen, and the app tests whether the current camera's frustum actually contains it.
- **"What if" branches.** Change one choice at step 2 (glass at the edge vs. the middle) and the rules work out everything that follows. The same intent at step 8 becomes sweeping up shards in one world and drinking the milk in the other.
- **Scale is part of the world.** Sizes are stored once in metres. Locked proportions keep ratios held across every shot; unlocking makes a deliberate story change, such as a giant in a normal room.
- **Master vs. production state.** What a thing *is* (its canonical definition) is kept apart from what *happens to it* (its current state, with the event that last set it).

## Run it

It is a single `index.html` plus a vendored copy of three.js r128 (`three.min.js`, MIT licence). Open it in a browser, or serve the folder:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Author

Concept and direction: Abhishek Nimesh ([@Abhilien](https://github.com/Abhilien)). Built by directing AI tools.
