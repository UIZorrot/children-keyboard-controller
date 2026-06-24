# Storybook World Visual Design

## Goal

Replace the current abstract canvas effects with a light, warm, child-friendly "storybook village" world. The canvas should read as a shallow ground scene on a pale white-beige background. Every key press plants or reveals a small world element such as a rounded house, tree, hill, cloud, flower, path stone, or soft sparkle.

## Visual Direction

The approved direction is "soft storybook village":

- Background: pale white-beige, warm and low contrast, not dark.
- Ground: gentle rolling land bands near the bottom half of the screen.
- Objects: rounded, minimal silhouettes with soft fills and subtle shaded edges.
- Palette: cream, sage green, muted peach, warm clay, soft blue, honey yellow.
- Motion: objects grow in with elastic ease, drift slightly, then settle or fade.
- Density: key mashing should build a pleasant little landscape, not a noisy particle cloud.

## Interaction Model

Each non-exit key press creates a small "scene item group" around a stable hashed location. A group contains one primary object and optional supporting items:

- House groups: rounded house, small roof, door/window glow, one nearby tree or bush.
- Nature groups: tree, hill bump, flowers, soft sparkle dots.
- Sky groups: small cloud or sun mote in the upper portion.
- Ground details: path stones, grass tufts, tiny flowers near the lower portion.

The app continues to swallow keyboard input and keep focus exactly as before. Long-press Escape for 3 seconds remains the exit path.

## Composition Rules

The renderer should treat the scene as layers:

1. Pale background wash.
2. Distant soft hills/clouds.
3. Ground bands and path hints.
4. Persistent/slow-fading world items.
5. Short-lived sparkles and press feedback.

Objects should be biased toward a ground baseline rather than fully random positions. Some objects may appear higher, but the main visual story is a growing village on a soft floor. New items should vary by key hash and seed, while staying inside bounded active counts and existing pooling/recycling constraints.

## Implementation Shape

Keep the current canvas architecture and object pooling. Add or adapt effect types so the engine can spawn world item roles instead of generic circle/square/triangle bursts. Rendering stays in 2D canvas with simple primitives, gradients, and rounded paths; no image assets are required.

Likely modules:

- `EffectEngine`: spawn bounded world-item groups, keep object caps and TTL cleanup.
- `types.ts`: add item kinds/roles needed for houses, trees, hills, clouds, flowers, sparkles.
- `CanvasRenderer`: render layered storybook primitives instead of abstract geometry.
- `AtmosphereField` and `palette.ts`: move to pale white-beige background and softer ambient washes.
- Tests: verify palette brightness, bounded spawning, object cleanup, and presence of world item roles after key presses.

## Performance Constraints

The visual upgrade must preserve the existing safety goals:

- Keep active object caps.
- Reuse pooled objects.
- Avoid unbounded arrays or per-frame allocations in hot loops where practical.
- Draw with canvas primitives and simple gradients only.
- Keep effects soft and moderately low-alpha so the screen is comfortable for children.

## Acceptance Criteria

- The idle screen is visibly pale white-beige, not dark.
- Pressing keys creates recognizable cute minimal objects: houses, trees, hills, clouds, or flowers.
- Repeated random key presses build a coherent little ground world instead of abstract scattered shapes.
- Escape long-press exit and Windows focus behavior remain unchanged.
- `npm test`, `npm run typecheck`, and `npm run pack` pass.
- A packaged exe smoke screenshot confirms the new visual direction.
