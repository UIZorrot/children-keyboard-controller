# Children Keyboard Controller Design

## Goal

Build a Windows-only Electron app that turns keyboard mashing into a calm full-screen visual experience while making normal keyboard input and common shortcuts ineffective.

The first version is a local desktop app for home use. It prioritizes strong keyboard suppression inside a full-screen app, gentle visuals, predictable exit behavior, and bounded resource use.

## Scope

Included in the first version:

- Windows-only Electron application.
- Full-screen, borderless, always-on-top visual surface.
- Keyboard input suppression in the Electron window.
- Windows low-level keyboard hook in the main process to block most global keys and shortcuts while the app is active.
- Soft abstract geometry animation on key press.
- Object pooling, lifetime limits, and active effect caps to prevent runaway memory or CPU use.
- Long-press `Esc` for 3 seconds to exit.
- Development, build, and packaging scripts.
- Tests for non-OS-specific logic and a manual Windows verification checklist.

Explicitly excluded from the first version:

- macOS or Linux support.
- Parent password flow.
- Usage schedules or time limits.
- Background daemon/watchdog process.
- Automatic Windows kiosk or assigned-access configuration.
- Custom Windows shell replacement.
- Sound effects.
- Network features.

## Platform Limits

The app will block as much keyboard behavior as practical from a normal Windows desktop application, but it will not claim to block Windows security paths such as `Ctrl+Alt+Del`. Those require operating-system policy or kiosk configuration.

The app should try to block common combinations such as:

- `Alt+Tab`
- `Alt+F4`
- `Win`
- `Win` combinations
- `Ctrl` combinations
- Function keys that trigger application behavior
- Browser/Electron shortcuts while the window is focused

If stronger lockdown is required later, the next step is to document or automate Windows kiosk/assigned-access setup for a dedicated child account.

## Architecture

### Electron Main Process

The main process owns app lifecycle and system-level behavior:

- Create one full-screen, borderless `BrowserWindow`.
- Set the window always on top where Windows allows it.
- Keep the app focused while active.
- Disable standard Electron menus.
- Register the Windows keyboard blocking layer.
- Receive the renderer's confirmed long-press exit signal and quit cleanly.

The main process should keep OS-specific code isolated behind a small interface, for example:

```ts
interface KeyboardBlocker {
  start(): Promise<void>;
  stop(): Promise<void>;
}
```

The first implementation can use a Windows-native keyboard hook package or a small native Node addon. The implementation must be easy to remove or replace if the first chosen hook library is unreliable.

### Renderer Process

The renderer process owns the full-screen visual experience:

- Draw all animation on one full-screen `canvas`.
- Listen for key events and call `preventDefault`.
- Treat every non-exit key event as an animation trigger.
- Track `Esc` long-press progress.
- Send a quit request to the main process only after `Esc` has been held continuously for 3 seconds.

The renderer should not expose text inputs, menus, links, or ordinary controls in the child-facing screen.

### IPC

IPC should stay minimal:

- Renderer to main: `request-exit` after confirmed `Esc` long-press.
- Main to renderer, optional: `keyboard-blocker-status` for development diagnostics.

No untrusted external content is loaded, so the app can keep a narrow local attack surface.

## Visual Design

The selected visual direction is "Calm Geometry":

- Very dark background.
- Large geometric shapes.
- Slow movement.
- Low density.
- Muted colors.
- No flashes, pure white bursts, strobing, or high-frequency motion.

Each key press should create a small response, such as:

- 2 to 4 large geometric shapes.
- A few soft particles.
- Gentle expansion, drift, fade, or rotation.

The experience should feel responsive without becoming bright or chaotic when many keys are pressed quickly.

## Animation And Resource Control

The renderer uses a single `requestAnimationFrame` loop and a bounded effect system:

- Effects have a fixed time-to-live.
- Expired effects are returned to object pools.
- Active shapes and particles have hard caps.
- When caps are reached, new effects should reuse the oldest inactive object or skip spawning.
- No per-key DOM nodes are created.
- Canvas dimensions are updated on resize and device pixel ratio changes.

Suggested first caps:

- Maximum active shapes: 80.
- Maximum active particles: 120.
- Effect lifetime: 1.5 to 4 seconds depending on type.

These values can be adjusted after manual testing on the target machine.

## Exit Behavior

Exit is intentionally simple and hard to trigger accidentally:

- `Esc` must be held continuously for 3 seconds.
- Releasing `Esc` before 3 seconds cancels the exit.
- A subtle low-brightness progress ring appears only while `Esc` is held.
- Other key presses do not affect exit progress.
- After 3 seconds, the renderer sends `request-exit` to the main process.
- The main process stops the keyboard blocker and quits the app.

Short `Esc` presses do not exit and do not show the exit progress UI.

## Error Handling

If the keyboard hook fails to start:

- The app should still open the full-screen visual surface.
- Development mode should log the failure.
- Production mode should avoid showing technical text to the child.

If the renderer crashes or the window closes unexpectedly:

- The main process must stop the keyboard blocker before exit.

If the keyboard hook cannot block a specific Windows shortcut:

- The limitation should be recorded in the manual verification checklist.
- The app should not present that shortcut as guaranteed blocked.

## Testing

Automated tests should cover logic that can be tested reliably outside Windows shell behavior:

- Effect object lifecycle.
- Object pool reuse.
- Active effect caps.
- `Esc` long-press timer success.
- `Esc` long-press cancellation.

Manual Windows verification should cover:

- App launches full-screen.
- Common letter/number keys do not type anywhere.
- Repeated key mashing keeps CPU and memory stable.
- `Alt+Tab` is blocked or immediately recovered where possible.
- `Alt+F4` does not close the app.
- `Win` and `Win` combinations are blocked where possible.
- `Ctrl` shortcuts do not affect the app.
- `Esc` short press does not exit.
- `Esc` held for 3 seconds exits cleanly.
- Keyboard blocker stops after app exit.

## Implementation Preference

Start with Electron plus a replaceable Windows keyboard hook adapter. Avoid kiosk setup, shell replacement, and parent-account features in the first implementation. This keeps the first version focused while preserving a clear path to stronger Windows lockdown later.
