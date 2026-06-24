# Visual Upgrade Design

## Goal

Improve the child-facing visual experience so key presses feel richer, calmer, and more composed while preserving the current Windows keyboard-control behavior, low-brightness safety, and bounded CPU/memory use.

The selected direction combines:

- Atmospheric Depth: soft background depth, slow low-brightness motion, and gentle glow.
- Generative Constellation: recent key responses connect into calm geometric compositions.

The selected implementation strength is Balanced Upgrade: improve the existing Canvas renderer without turning it into a large visual engine.

## Visual Style

The background should move away from pure black into a deep beige / warm taupe base. It must remain dark enough for a soft night-mode feeling and must not become bright cream, sand, or a one-note beige palette.

Suggested palette direction:

- Base background: deep warm beige / taupe, close to `#15110d` or `#1a1610`.
- Atmosphere colors: muted sage, blue-gray, dusty lavender, and low-saturation amber.
- Geometry colors: desaturated green, gray-blue, mauve, and warm brass.
- No pure white flashes, high-saturation neon, or fast strobing.

## Rendering Model

Keep one visible full-screen Canvas for the first upgrade, but split renderer responsibilities into focused modules:

- `AtmosphereField`: persistent background field with slow drifting radial gradients.
- `EffectEngine`: burst shapes, particles, ripples, and anchor lifecycle.
- `ConstellationRenderer`: low-opacity connecting lines between recent anchors.
- `CanvasRenderer`: orchestration, resize handling, frame loop, and draw order.

Draw order:

1. Fill deep beige base background.
2. Draw low-frequency atmosphere field.
3. Draw constellation links behind active shapes.
4. Draw ripples and soft burst halos.
5. Draw primary geometry.
6. Draw small particles.
7. Keep the existing CSS exit progress ring above the canvas.

## Key Press Response

Each non-exit key press creates a burst group rather than isolated particles:

- 1 primary anchor shape.
- 1 to 2 secondary shapes.
- 1 ripple ring.
- A small number of muted particles.
- The anchor is stored for temporary constellation linking.

Repeated key presses should build visual composition. Nearby anchors connect with low-opacity lines, giving the impression of a growing constellation. Old anchors fade out and are removed so the composition stays readable.

## Richness Without Noise

The richer look should come from layering and composition, not high object counts:

- Use radial gradients for soft fill and halo effects.
- Use slow background drift to avoid static emptiness.
- Use alpha fading and size easing rather than fast movement.
- Use line links only when anchor distance is within a readable range.
- Cap active objects and skip or reuse objects when caps are reached.

The app should feel responsive to chaotic keyboard input without becoming visually chaotic.

## Performance Constraints

Continue following the existing performance approach:

- Use `requestAnimationFrame`.
- Keep `canvas.getContext("2d", { alpha: false })`.
- Keep DPR capped to avoid excessive pixel work.
- Keep object pooling for shapes, particles, ripples, and anchors.
- Avoid per-key DOM node creation.
- Avoid heavy `shadowBlur` in the hot path.
- Batch line drawing where practical.
- Keep CSS animations limited to cheap `opacity`/`transform` cases such as the exit ring.

Suggested caps for the upgraded system:

- Active primary/secondary shapes: 90.
- Active particles: 130.
- Active ripples: 40.
- Active anchors: 48.
- Link rendering: only between nearby anchors, with a maximum rendered link count of 80 per frame.

These values can be adjusted after visual testing.

## Testing

Automated tests should cover behavior that is independent of Canvas pixels:

- Burst creation respects shape, particle, ripple, and anchor caps.
- Expired ripples and anchors are removed or returned to pools.
- Constellation link generation respects distance and link count limits.
- Resize updates renderer dimensions without resetting active effects unexpectedly.

Manual visual verification should cover:

- Background is deep beige / warm taupe, not black and not bright cream.
- Visuals remain soft under rapid key mashing.
- Presses build visible composition through gentle links.
- No flashing, pure white bursts, or high-frequency motion.
- Density remains bounded after 60 seconds of repeated input.
- `Esc` long-press exit behavior remains unchanged.

## Non-Goals

This upgrade does not change:

- Windows keyboard blocking behavior.
- `Esc` long-press exit behavior.
- Packaging scripts.
- Sound behavior.
- Kiosk or assigned-access setup.
- Three.js or WebGL adoption.

## References

- MDN Canvas optimization guidance supports offscreen/pre-rendering, layered responsibilities, integer-aware drawing, `alpha:false`, DPR handling, `requestAnimationFrame`, batching calls, and avoiding expensive hot-path effects such as heavy `shadowBlur`.
- web.dev animation guidance supports keeping CSS animation work to compositor-friendly properties such as transform and opacity. In this app, CSS should remain limited to the exit ring and other small UI overlays.
