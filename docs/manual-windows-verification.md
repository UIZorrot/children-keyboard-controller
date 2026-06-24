# Manual Windows Verification

Run these checks on the Windows machine that will run the app.

## Launch

- Run `npm run dev`.
- Confirm the app opens full-screen with no border or menu.
- Confirm the cursor is hidden over the app.

## Keyboard Suppression

- Press letters, numbers, arrows, and space repeatedly. Expected: the app only shows soft geometry effects.
- Press `Alt+F4`. Expected: the app stays open.
- Press `Alt+Tab`. Expected: switching is blocked or focus returns immediately to the app.
- Press the left and right Windows keys. Expected: the Start menu does not remain open.
- Press `Ctrl+L`, `Ctrl+R`, `Ctrl+W`, and `Ctrl+Shift+I`. Expected: no browser location bar, reload, close, or devtools action occurs.
- Press `Ctrl+Alt+Del`. Expected: Windows security screen may appear; this is outside normal app control.

## Exit

- Tap `Esc` briefly. Expected: the app does not exit and no exit progress ring remains visible.
- Hold `Esc` for 2 seconds and release. Expected: progress cancels and the app remains open.
- Hold `Esc` for 3 seconds. Expected: the app exits cleanly.
- After exit, press normal keys in another app. Expected: the keyboard works normally.

## Resource Use

- Mash keys continuously for 60 seconds.
- Confirm the visual density remains bounded.
- Confirm memory does not grow continuously after effects fade.
- Confirm CPU returns to a stable idle level after input stops.

## Visual Upgrade

- Confirm the background reads as deep warm beige / taupe, not pure black.
- Press keys slowly. Expected: each press creates a soft burst with a ripple and main shape.
- Press keys repeatedly. Expected: recent shapes form gentle constellation links.
- Mash keys for 60 seconds. Expected: visual density remains bounded and no bright flashing appears.
- Hold `Esc` for 3 seconds. Expected: exit behavior is unchanged.
