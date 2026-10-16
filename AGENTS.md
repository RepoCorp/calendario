# Advent calendar agent instructions

These instructions apply throughout this repository. Follow the user's latest
instructions when they update an agreement below.

## What we are doing

The user is making a personal Christmas Advent calendar for their kids. Each
day opens a little experience: a Christmas scene, a message from their parent,
and something the children can do. Together, the pages should make the countdown
to Christmas feel warm, playful, and personal, with a new surprise to discover
each day.

Every day should bring together three things:

- **A Christmas theme.** Build the scene around Christmas imagery, traditions,
  or stories: snow, bells, gingerbread, a sleigh, decorations, lights, or a cozy
  cup of chocolate. The setting can be imaginative, such as a sleigh adventure
  on the Moon. Personal occasions, like the birthday on day 7, also belong in
  this family calendar and should keep their special meaning.
- **A message for the kids.** The words are part of the gift. Preserve the user's
  personal voice, names, and existing messages, and make the message a central
  part of the experience. Work with the user on missing messages; do not invent
  family memories or replace personal wording with generic holiday copy.
- **An interaction that brings the scene to life.** Give the children something
  understandable and satisfying to try on a phone: touch, drag, draw, listen,
  blow, tilt, reveal, or play. The action and its response should belong to that
  day's scene. Some days can be quiet discoveries, others creative activities
  or small games; every day does not need a score or a win/lose condition.

### Examples we have implemented

- **Day 1 — playing in the snow:** touching or moving a finger through the scene
  pushes the falling snowflakes away, letting the children play with the snowfall.
- **Day 5 — making music with a Christmas bell:** hold the bell to sustain a
  note and release to let it fade; repeated presses continue the melody.
- **Day 6 — decorating gingerbread:** drag sweets onto a gingerbread cookie,
  move or remove decorations, and draw icing to make a personal creation.
- **Day 7 — blowing out birthday candles:** blow toward the phone's microphone
  to move the flames and extinguish candles, with confetti when they are all out.
- **Day 8 — a sleigh adventure on the Moon:** steer the Christmas sleigh left
  and right to avoid craters as the lunar ground passes beneath it, with Earth
  in the sky and the ride gradually getting faster.
- **Day 9 — keeping hot chocolate in the cup:** tilt the phone to balance the
  cup; losing balance pours chocolate onto the saucer and leaves little puddles.

We build and refine these experiences together, one day at a time. The user and
agent establish the scene, message, appearance, and intended interaction; the
user then tries it and gives feedback on how it looks and feels. Use that
feedback for the next focused adjustment, followed by the bounded checks below.
A clear follow-up request is enough direction to make that adjustment without
restarting design discovery or asking for approval of routine, reversible work.

## Project scope

- Work directly in this Advent calendar repository.
- The separate `welearnsmart-agent-lab` Python project is paused. Do not resume it
  or move this work there unless the user asks.
- Begin by inspecting the repository instructions, relevant code, and working
  tree. Preserve existing uncommitted changes; do not assume they are yours.
- Other tasks may be changing this checkout at the same time. Re-read shared
  files before editing, make targeted patches, and never restore a whole file
  from an earlier snapshot over someone else's changes.
- When the next page or issue has not been chosen, summarize the current state
  and help the user choose a focused next step before implementing changes.
- When a page has been chosen, continue that scope until the user moves to
  another page. Carry earlier agreements forward without reopening finished work.

## Design and content agreement

- Do not show hints or instructions explaining how a page works. Let children
  discover the interactions. Apply this rule to every day as it is worked on;
  preserve accessible control names and necessary permission/error feedback.
- Each day needs a Christmas theme, a personal message for the user's kids, and
  an interaction that fits the scene. Keep these three elements connected when
  proposing or refining a page.
- The application is mobile-first. Prioritize phone layouts and touch
  interactions, then adapt to larger screens without compromising the mobile
  experience.
- Disable the browser's native tap highlight throughout the application while
  preserving keyboard focus indicators and each control's intended feedback.
- Disable native long-press text selection and touch callouts globally. Preserve
  selection and copy/paste inside inputs, textareas, and editable content.
  Coordinator checked nonselectable Day 9 text and Day 20 textarea typing,
  selection, and deletion at 390 × 844; build passed. Native phone long-press
  behavior still needs physical-device verification.
- Safari magnifier trial: `useTouchMagnifierGuard` adds non-passive touchstart
  cancellation on fixed, non-control content and explicit touch-action:none game
  areas. Native controls and scrollable content are exempt to preserve clicks,
  permissions, editing, and scrolling. Selection/context menus are canceled outside
  editable fields. Do not disable viewport zoom or blanket-cancel all touch events.
  Coordinator checked 12 synthetic event cases, button/field interactions, and
  live Day 9 restart/layout at 390 × 844; build passed. Temporary fixture removed.
  This does not verify native iPhone loupe suppression; user phone test is pending.
- The user and coordinating agent establish the page's main components,
  appearance, and intended behavior before implementation and UX review.
- Preserve the agreed design, personal wording, and content. Do not rewrite copy
  or redesign a page unless the user requests it.
- Make small, evidence-based fixes within the agreed scope. A QA observation is
  not permission for a broader redesign.
- Carry forward decisions already made in the conversation; do not repeatedly
  ask the user to approve work they have already authorized.
- Treat requests to try stronger sensitivity, speed, or acceleration as authorized
  experiments. Make the change easy to tune again, state concrete effects when
  measurable, and do not silently soften an explicitly requested setting.
- Keep visual feedback consistent with actual behavior: a dragged object's
  release position, a spill's origin and landing, and a danger meter must match
  what the game is doing. Preserve keyboard focus.
- Per the user's latest instruction, every page uses its full animations regardless
  of the device's reduced-motion preference. Do not add reduced-motion overrides.
  Preserve explicit activity controls such as the balloon pause button.

## Page decisions to preserve

These record decisions from this collaboration, not a complete inventory of all
pages or other tasks. The latest user request may revise them. Code constants
below are the current tuning as of 2026-10-03, not permanent product limits.

### Message reveal direction (2026-10-06)

- Each day should have one personal message box. Start with the message hidden,
  reveal it gradually as the child advances in the activity, and show it fully
  when the task is completed. Preserve the existing personal wording.
- Every day's date must stay visible throughout the activity, outside any hidden
  or revealed message content.
- Day 1 is the first trial; do not roll the change out to other days until the
  user chooses them. Its current trial lets the child sweep a black cover off
  the message, with falling snow visible in front, including after completion
  (no layer change when the message is fully revealed). Cleared patches persist;
  completion requires 98% coverage, including the edges. Keep the introductory,
  instructional, and completion labels removed. This trial still awaits the
  user's phone feedback.

### Day 1: persistent cleared boundaries (`/nieve-8k2f`)

- Cleared message patches remain collision boundaries after the finger moves or
  lifts, including after completion. Keep normal finger repulsion elsewhere.
- Latest trial: one in ten flakes passes over the message without colliding
  with revealed patches. Keep that assignment stable through recycling; all
  flakes still respond to the finger. The other nine retain boundary behavior.
- Latest gravity-driven trial removes the imposed 1.8 rolling speed and crest
  nudge. Project actual incoming velocity onto the local tangent, with gentle
  rolling friction (0.022). After first contact, apply gravity 0.045 and air drag
  0.008 in nominal 60 Hz units, using elapsed time. Flakes accelerate more on
  steeper slopes and retain momentum when leaving the edge, rather than returning
  to their original snowfall speed. Preserve signed velocity after finger pushes.
  Use only 0.04 outward separation on normal contact, excluded from velocity so
  it cannot add a rebound impulse. Newly revealed patches still allow gradual escape.
  Rest/wake retains zero actual velocity; recycling restores ordinary snowfall.
  No agents or validation run for this trial, per the user's current instructions.
- Blocked rolling tries smaller steps along the same tangent. Rest only after
  400 ms of repeated blockage within 0.75 px, with boundary contact within 3 px.
  Recheck a short gravity/downhill path for resting flakes on every frame;
  an open route, loss of support, finger interaction, or a changed reveal field
  wakes them. No corner-search kicks or spin while resting.
- No side bands inside the message. Clip boundary padding at its top/left/right
  borders so flakes can pass immediately outside the sides, partially onscreen.
  Use 27 px padding around partial revealed patches: approximately 15 px brush
  feather plus 12 px flake arms. The previous 42 px partial padding left flakes
  visibly too far away. Retain 42 px only for the completed field; preserve the
  raised analytic crown independently. No validation run for this refinement.
  Flakes drift offscreen
  without horizontal wrapping and recycle only below the bottom.
- Latest top-boundary trial undoes the extra cubic edge drop. Restore the old
  endpoint height, but lift the center from 3 px to 11 px above the top border:
  depth is min(36, height * 0.12) + 8. This modestly steepens the original ellipse
  without lowering its sides. Smooth the occupied reveal field with a cached
  separable five-cell kernel and bilinear sampling (threshold 0.4), using its
  gradient for normals. Keep the analytic crown and side clearance. Refine swept
  collisions to the actual contour instead of stopping at the previous grid step.
  Together with downhill wake checks, this addresses artificial ledges and
  permanent resting on slopes. No validation or agents run for this adjustment.
- Collision correction stays on the actual incoming path instead of snapping to
  an empty grid cell. Flakes caught inside newly revealed patches glide out over
  successive frames. Contact movement is applied immediately.
- Prior to the gravity-driven trial, eleven focused tests covered downhill contact without rebound, curved crown,
  persistence, fast crossings, resizing, outside-edge clearance, no snapping,
  and a 27-flake curved-patch simulation. Build passed; coordinator checked the
  completed page screenshot at 390 × 844. Rolling feel awaits user phone testing.

### Day 2: star melody (`/estrella-q9m1`)

- Keep one message box with the existing personal wording. The text starts
  invisible, then fades in and becomes less blurred through the first 14 notes
  (the opening section) of the 42-note melody. Those 14 notes fully reveal it;
  the remaining song can still be played afterward. Stars stay in front
  throughout, at 40% opacity over the message
  to keep it readable, with a gradual fade at the card's edges. Exhausted stars
  retain their additional dimming.
- Only consecutive taps on the same star reset the unfinished melody and reveal.
  The next different star starts the melody again. Count actual primary taps,
  not hover or stars drifting underneath a held finger. Preserve the phone hit
  coordinates and minimum 28 px touch radius.
- Completing the opening section leaves the message fully visible, including during later
  star taps. This interaction still awaits the user's phone feedback.
- Each star can play at most four notes per song attempt. It then dims and ignores
  taps, without changing progress or the last played star. Usage counts reset
  when a consecutive repeat restarts the melody or a full song pass finishes.

### Day 3: gift (`/regalo-r3v7`)

- Current first adjustment: hide the regular message and remove the instruction.
  Keep the date visible above the gift at all times, and lift the closed gift
  slightly for a centered phone layout. Preserve the established lid and confetti
  behavior. The opened note uses the same red rounded-card formatting as regular
  day messages while retaining its current wording and open/close behavior.
- Keep keyboard opening/closing.
- Lid seats lower over the rim (26% image-height offset). Removal takes 1400 ms:
  latest authorized trial halves the lift from 22% to 11% of image height:
  lift to 15% offset through 30%, then follow a continuous cubic arc farther
  right, settling at translate(53%, calc(42% - 10px)) and rotate(25deg), full size throughout.
  The arc's control points are (0, 6.444%), (66%, 24%), and (53%, 42%).
  Latest trial lowers the upper end to the rim and moves the bottom farther right,
  with a flatter 25-degree lean. Latest refinement lifts the resting lid by 3%
  of image height (about 13 px on a 390 px phone), plus a further exact 10 px
  on every viewport to meet the top rim. The additional lift follows the cubic
  endpoint weight so opening and closing remain smooth.
  Only a small tip should rise above the box
  where they meet, leaving the card and confetti clear. The bottom is no longer fixed.
  Starting at (0, 15%), its initial vertical velocity matches the lift, and it
  eases to rest. Rotation accelerates and decelerates smoothly. CSS keyframes
  sample the curve every 2.5% with linear interpolation, avoiding separate
  easing restarts at waypoints. Keep the opened lid below the message card.
  Closing waits 400 ms then retraces the same path over 1000 ms, without a hold.
  Keep reopening blocked until the sequence finishes. This motion is a user trial.
  Confetti launches at 1000–1280 ms while the lid is departing; the card starts
  appearing at 2400 ms after the initial burst. No lid fade.
- The card stays fully opaque, including hover and closing. It grows from
  behind the box's front face, starting at 28% size with only its top emerging.
  The front face masks its lower portion during ascent; at the peak the card
  moves in front, then settles downward into its reading position. Keep it hidden
  during the 2400 ms delay and keep the lid above the added front-face layer.
  The extraction takes 1200 ms with the same up/down path on every device.
  The card does not rotate.
  Reach full size at 75%, shortly after the 65% peak and outside the box; retain
  full size through the remaining descent.
  Animate position and scale independently so reaching full size does not
  interrupt the center's continuous rise to the peak.

### Day 4: Rodolfo (`/reno-z2b4`)

- Current night-scene trial: pure black background and the unlit portrait at
  22% brightness, just visible in darkness. Switching off returns to this state.
- Fade the lit portrait and halo in over five seconds, starting immediately.
  Begin the background and message fade two seconds later; that fade also takes
  five seconds (seven seconds total). Both use the same smooth ease-in-out curve
  and a shared clock. No growing circle, spatial
  reveal, text blur, or golden overlay. This opacity-only effect has no movement.
  The user likes this five-second whole-scene fade; preserve it.
- Current trial: one phone-height scene, with the date always visible, a reserved
  message box above, and the existing reindeer portrait sized to the remaining
  height. Preserve the personal wording and prevent layout shifts during reveal.
- One tap starts lighting the whole scene; a second tap switches both
  lights off and hides the message card and words. No hold is needed. The reveal
  takes 7 seconds including the background delay. Switching off resets progress, so the next tap restarts the
  lighting and message reveal from the beginning. At completion,
  the reveal covers the entire screen and the lighting retains its full final
  strength without dimming. Space/Enter activate the same toggle.
- Use `day04-reindeer-lit-transparent-halo.png`: Rodolfo with the lit nose and
  soft halo, genuine alpha transparency, and a small static edge fade to prevent
  the glow ending at a visible rectangle. Fade it in over five seconds with a
  two-second head start over the background; do not round its corners. Preserve
  both the original lit image and the nose-only transparent alternative. The dim
  unlit portrait remains the base and returns when switched off.
- Latest halo adjustment: give the lit portrait a stronger, broader golden glow
  following its transparent silhouette (10 px warm inner glow and 26 px amber
  outer glow). Apply it outside the image's edge mask so it fades naturally
  beyond the canvas bounds. The portrait and halo share the five-second fade.
- The original green/red background colors emerge from black uniformly across
  the screen. Preserve fixed layout bounds and the always-visible date.
- The user accepted the stronger halo and whole-scene fade. The latest timing
  adjustment passed the build; the user is performing visual tests, with no
  helper agent. The user accepted the two-second head start and prefers it to
  the simultaneous fade. Preserve this timing.
- Browser verification used clicks at 390 × 844 with reduced motion enabled;
  earlier layout checks also covered 320 × 568. Physical-device testing was not
  performed by the agent.

### Day 5: bell (`/campana-x5d8`)

- Start with an “Empezar” audio gate. Unlock the audio context from that gesture,
  showing “Preparando el sonido…” while pending; enable/focus the bell only when
  audio is running. No artificial delay. Offer retry if startup fails or times
  out after eight seconds. Starting does not consume a melody note.
- Coordinator checked phone-size start/loading/ready states, using a temporary
  two-second delayed-resume fixture for loading; removed afterward. Build passed.
  Physical-phone first-note playback still needs user confirmation.

- The user authorized shortening the copy to match Day 4's proportions. Current
  centered title: "Campanita." Message: "Cada tintineo es una invitacion a seguir
  celebrando juntos." Use Day 4's title size; keep the bulbs inside the smaller
  reserved area. At 390 × 844 this area including bulbs measured about 236 px
  (Day 4's message about 223 px), leaving about 530 px for the bell scene.
  Coordinator-only change passed the build and hidden/revealed screenshot checks
  at 390 × 844 and 320 × 568 without scrolling. Rhythm tuning is unchanged.
- Latest message-size adjustment: increase body text slightly to
  clamp(1.1rem, 2.4svh, 1.25rem), retaining the short copy and title size.
  Coordinator verified the revealed layout at 390 × 844 and 320 × 568 without
  scrolling, and the build passed.
- Fit the date, reserved message space, and bell into one phone-height scene.
  Keep the date outside the hidden message and preserve the existing wording.
  Keep the separate instruction absent.
- Current authorized trial: loop four bars of Bb4–A4–Bb4–G4 followed by four
  bars of D5–C5–D5–Bb4, from Shchedryk bars 13–20. The score's rhythm is
  long-short-short-long (2:1:1:2), correcting the earlier discussion shorthand.
  Require four consecutive bars (16 notes) using held-note durations, without demonstrations
  or accompaniment. Any bar's first note can start an attempt; mistakes clear
  progress while the melody continues. A failed hold at a new bar can establish
  a new pace immediately.
- Eight red, green, and warm gold Christmas bulbs hang on a curved string inside
  the message area. The user found CSS glass too plasticky. Latest trial uses
  generated photographic vintage glass and aged brass sockets from
  `day05-photographic-bulbs-web.png`, with genuine transparency and aligned
  unlit/lit sprites. Preserve the two-step lighting feedback (45% lit crossfade
  for warming, fully lit for each completed pair), and the dark dimensional wire.
  Coordinator checked unlit and fully lit screenshots at 390 × 844, completed
  the reveal with simulated holds, and passed the build. User visual feedback pending.
  Latest placement: lift the string 14 px so its ends appear attached to the
  outer frame's top border, with the bulbs hanging down inside. Retain the
  compact message spacing. Latest refinement makes the red card 24 px taller
  upward behind the bulb tips: 24 px extra top padding and a -38 px string
  bottom margin keep the text and bell positions unchanged. Coordinator checked
  revealed screenshots at 390 × 844 and 320 × 568 and the build passed.
  Constrain the portrait layout to a minmax(0, 1fr) column
  so the larger bell cannot expand it horizontally; preserve the landscape
  override. Coordinator checked the 390 × 844 screenshot and screen-width fit;
  the build passed. Prior reveal checks also covered 320 × 568.
  Each bulb represents two notes: a soft glow
  on the first, full brightness on the second. The first soft glow appears
  provisionally on press. Keep all words hidden
  until sixteen notes succeed, then reveal the full message and retain it during
  later playing. Cancellation clears unfinished progress without committing a
  held note.
- The user found the first rhythm trial too strict even knowing the pattern.
  The subsequent 95% short/35% final-long trial was too loose: nearly even holds
  passed. Current contrast trial: each bar's first long hold sets a fresh pace
  (minimum 100 ms), retaining earned lights. Short holds may last 25 ms through
  75% of that opening hold. The final long must be at least the longest actual
  short hold divided by 0.75, and at least 35% of the opening hold; no upper limit.
  Pauses between holds do not count. Tune in `bellRhythm.js`.
- Coordinator implemented the UI and browser checks; one helper implemented the
  rhythm checker and 17 passing tests. Browser screenshots covered 390 × 844 and
  320 × 568 with reduced motion. Simulated held keyboard events verified failure,
  retry, progressive lights, and completed-message persistence; physical-phone
  feel and full-motion animation remain unverified.
- The coordinator alone made the easier-timing and bulb refinements. All 18
  focused tests and the build passed. Simulated holds approximately
  600/520/80/240 then 300/260/60/180 ms completed successfully in the browser;
  words stayed hidden through seven lights. Screenshots at 390 × 844 and
  320 × 568 showed the new bulbs inside the card and the page fitting without
  scrolling. This easier setting still awaits the user's phone feedback.
- Touching the bell should not produce native selection, image dragging, or a
  tap-highlight shadow. Keep its intended interaction feedback.
- The user found the repeated oscillations shaky. Current trial follows the hold:
  lean the artwork 10 degrees over 180 ms on press, alternating direction with
  each new press, hold that angle, and return
  upright over 420 ms on release. Continue from the visible angle when interrupted.
  Keep the pointer-capture button stationary and cancel animation on unmount.
  Coordinator inspected a held-position screenshot at 390 × 844 and verified
  simulated keyboard hold/release reaches 10 degrees and returns upright.
  The alternating-direction follow-up passed the build; coordinator inspected
  both held positions at 390 × 844 and measured -10 and +10 degree rotations.
  Phone feel remains pending.
- Latest extension to four cycles preserves the easier timing. Coordinator-only
  changes passed 19 tests and the build. At 390 × 844 with reduced motion,
  simulated holds showed seven full bulbs plus one soft bulb and hidden words
  after note 15, then eight full bulbs and the message after note 16. Phone
  feedback on the longer challenge is pending.
- The coordinator alone added the contrast check. All 22 tests and the build
  passed. At 390 × 844, simulated nearly even holds around 400/370/360/390 ms
  reset progress, while four varied long-short-short-long cycles completed.
  Screenshots confirmed hidden words after the rejected pattern and the revealed
  message at note 16. Physical-phone feedback on this balance is pending.

### Day 6: sweets (`/dulce-j7p2`)

- Prevent native long-press callouts, selection, and image dragging throughout
  the decorating scene (including WebKit properties). Suppress contextmenu and
  dragstart there; cookie art and palette candy images do not receive pointer events.
  Coordinator verified candy placement, icing, and right-click behavior at 390 × 844;
  build passed. Physical-phone long-press behavior still needs user verification.
- Current compact-layout trial: one phone-height page, date outside a message
  card matching Day 4's reserved height, six unlabelled candy buttons in one row,
  icon-only icing toggle and trash target. Accessible names remain. Remove the
  decorating instructions and candy captions; preserve the remaining message.
  Cookie scales into the available space without distorting its 3:4 stage.
  Coordinator checked 390 × 844 and 320 × 568 screenshots without scrolling,
  actual candy dragging and icing drawing; build passed.
- The user chose gradual message reveal as decorations are placed. Current trial:
  start the whole card invisible; use 1.5%, 3%, 5%, and 8% opacity for the first
  four placements, with 5px blur on the words so they cannot be read early.
  The fifth placement fades to full opacity and removes the blur over 400ms.
  Keep words hidden from accessibility until the fifth placement. Coordinator
  checked fourth/fifth-placement screenshots at 390 × 844 and the build passed.
  Moves, cancellations, and rejected drops
  do not advance progress; removal does not reduce earned reveal. Keep date visible
  and card space reserved. Coordinator verified initial/partial/full screenshots,
  five actual drags and a move without extra progress at 390 × 844; the cookie
  stayed fixed and the build passed. Five placements is the implementation's
  initial tuning, not a user-specified difficulty threshold.
- A grabbed sweet floats gently above the finger so it remains visible. Preserve
  the accepted smooth lift; do not replace it with an abrupt positional jump.
  Current lift is 52 px over 320 ms with gradual easing.
- The placed sweet must rest where its visible preview was at release. Include
  the lift offset, including release during the lift animation, in drop placement;
  pointer cancellation must not commit a move.
- Show the trash target only when moving an already placed sweet, never when
  taking a new sweet from the drawer. Use the visible sweet's center consistently
  for trash feedback and deletion. Dropping on it removes that placed sweet.

### Day 7: birthday cake

- Keep the whole message card hidden until all five candles are extinguished,
  then fade it in over 500 ms. Reserve its full space and keep the date visible.
  Relighting hides the message again. Coordinator verified initial/one-candle
  hidden states, final reveal, and reset using simulated blows at 390 × 844;
  cake position remained unchanged and the build passed.
- Use Day 4's compact message proportions with the date outside the card and a
  phone-height composition. Keep the birthday name and existing wish; remove
  interaction instructions. The cake remains square as available space changes.
  Reserve the message height independently of its short text: min-height
  clamp(210px, 26.4svh, 230px), with vertically centered words. Coordinator measured
  223px at 390 × 844 and 210px at 320 × 568, matching Day 4 within 1px at those
  sizes. Screenshots confirmed the cake and controls still fit without scrolling.
- Request microphone permission immediately on mount, before awaiting AudioContext
  resume. Remove the regular microphone activation button. Keep an error-only
  retry control and a tap-to-resume notice if the browser requires a gesture.
  Clean up streams/context on unmount, including permission resolving afterward.
- Render flames only after the cake image's load event, and do not evaluate blows
  before the cake is ready. Keep the accepted detector thresholds unchanged.
- Coordinator checked screenshots at 390 × 844 and 320 × 568: no scrolling,
  aligned flames, and no flames before simulated image loading. A temporary
  StrictMode fixture verified one automatic permission request, five simulated
  sustained blows, relighting, denied-permission retry, suspended-audio recovery,
  and stream/context cleanup. Physical microphone/phone testing remains pending.
- Keep the generated cake illustration with separately controlled candle flames.
- The user accepted the sustained-blow detection. Do not weaken it into a generic
  loud-sound trigger or retune it as part of an unrelated visual change. Current
  Day 7 tuning corrected on 2026-10-09: shorten only sustained input to 200 ms
  (previously 400 ms). Preserve the original RMS threshold 0.085, 900 ms cooldown,
  and spectral/noise checks. The lower 0.055 threshold was rejected because loud
  sounds triggered candles. Other days retain the shared defaults.
- Flames flicker/lean when a candidate blow starts; a confirmed blow extinguishes
  a randomly selected lit candle. Visual feedback must not change detection rules.
- Keep the "soplido" bar and the removed status/instruction messages above the
  cake absent. Celebrate once when all candles go out; relighting resets this.
  Retain actionable microphone permission/error feedback.

### Day 8: lunar sleigh (`/luna-u6h3`)

- Latest visibility adjustment: raise the logical lunar horizon from 180 to 125
  and lower the sleigh center from 442 to 478 on the 360 × 560 canvas. Leave a
  modest gap beneath the artwork for the finger; pointer capture still permits
  steering below the game area. Earth moves from y=82 to y=52 and scales down
  only when needed to stay above the horizon on shorter layouts. Speed,
  steering, crater sizes/pattern, and reveal goal are unchanged. The approach
  distance grows from 262 to 353 units (about 35% more anticipation distance).

- Keep the generated sleigh seen from behind, horizontal steering, and lunar
  ground/craters moving toward it. The sky shows Earth, not another Moon.
- Preserve the accepted lunar surface. The horizon is mostly flat with subtle,
  gentle irregular rises. Craters retain their sizes as they approach; no
  perspective growth. Crater shading/texture should match the ground.
- Crater placement should prevent indefinite safe travel along an edge or one
  easy repeating path while retaining maneuvering space. Craters lock their
  positions when spawned; do not add homing behavior as an incidental fix.
- The user now wants a learnable route that repeats on every run. Use the same
  resettable seed for crater zones, sizes, depths, and gaps; no player-position
  targeting. Spawn at scheduled world distances rather than the current frame's
  travel, so different frame rates do not shift the course. Preserve the speed
  schedule and reveal goal. Coordinator simulated the actual update at 60/120 Hz
  and opposite steering positions: 86 craters matched exactly, as did a restart.
- Current speed trial: start at 150, accelerate at 40 to a cruising cap of 300,
  then at five seconds accelerate at 80 to 420. Maximum occurs at 6.5 seconds.
  Coordinator simulated the actual update function to verify the cruising cap,
  delayed boost, and 10-second reveal; build passed. Crater travel
  gaps are 70–100 instead of 120–160, about 65% more craters per unit distance.
  Preserve stationary spawn positions, crater sizes, and steering responsiveness.
- The user finished previewing the message animation and requested normal speed
  again. The temporary slowdown is removed; the speed schedule above is restored.
- Current cleanup: phone-height layout with Day 4's reserved message proportions,
  date outside the hidden message, no instruction paragraphs or start prompts,
  a small distance counter, and an icon for restarting after a collision.
  Per the user's width correction, expand the lunar panel to the full message
  width; never shrink the message to match a narrow game. The game fills the
  remaining height, with Earth and sleigh artwork corrected for viewport aspect
  ratio. Coordinator verified matching widths of 362px at 390 × 844 and 292px
  at 320 × 568 without scrolling; screenshots and build passed.
  The user replaced the postcard with a side-view Christmas sleigh pulling the
  message into place from left to right. Current goal is 10 seconds of
  collision-free game time. The card and pulling sleigh now move at a constant
  speed from the start: 10% of the journey each second, fully revealed at ten seconds.
  Collision sends the unfinished message back offscreen; once earned, it stays
  visible on later crashes/restarts. Keep dimensions fixed and existing wording.
- Coordinator implemented the sleigh reveal and checked actual screenshots of
  initial, partial, and complete states in an isolated component preview at
  390 × 844 and complete state at 320 × 568. Live game screenshots at both sizes
  and a collision/reset interaction passed; build passed. The preview supplied
  progress directly, so a full successful ride and physical-phone play remain
  untested. Temporary preview was removed.
- Coordinator checked screenshots at 390 × 844 and 320 × 568, steering, collision,
  and restart; no scrolling and build passed. Source-based tuning calculations
  give about 4.94 crater spawns/second at the current maximum speed. A sampled placement simulation
  retained open space but does not establish phone playability; user trial pending.

### Day 9: cocoa balance (`/cacao-s1n5`)

- Latest Three.js balancing trial supersedes the older SVG cup and periodic-sway
  implementation below. `CocoaGame` mounts the shared `mountCocoaGame` runtime;
  the standalone cup preview uses that same runtime. Keep the approved mug,
  gravity-relative liquid mesh, and spill geometry. The mug floats around its
  center with no saucer, floor, or visible environment. Keep the existing title,
  timer, and spill meter; do not add scoring systems or instructions.
- Counter-tilting combines player input and two-axis disturbance pulses before
  a damped spring determines actual mug orientation. Start after valid sensor
  input or desktop interaction, with two calm seconds. Pulses grow from about
  5 to 14 degrees over 65 seconds, shorten from roughly 7 to 4.3 seconds, and
  retain two-second recovery gaps. Bounded direction variations never exceed
  the available counter-tilt range. Restart repeats the disturbance sequence.
  Temporary debug controls adjust strength, frequency, recovery, and the liquid;
  a subtle moving gold dot indicates disturbance direction. Preserve mouse drag,
  sensor permission/recalibration, and background-tab suspension.

- Request motion access automatically on page opening, once per mount even in
  Strict Mode. Keep the activation button as a fallback when a browser requires
  a user gesture; granted access enables the existing calibration behavior.
  Coordinator verified a single automatic request, simulated grant, and simulated
  gesture-required rejection followed by successful tap retry at 390 × 844.
  Build passed; real phone permission prompts remain untested.
- Initial cleanup: one phone-height layout, date outside a reserved 210–230px
  message area, existing title retained. Removed the instructional message body,
  changing coaching text, best-time panels, and tilt readouts. Keep a small timer,
  compact spill meter, activation/recalibration button, and accessible restart
  icon. No new reveal goal or personal message was invented; those remain to be
  chosen. Title remains visible for this first layout pass.
- Coordinator implemented and checked screenshots at 390 × 844 and 320 × 568,
  with no scrolling at the smaller size. Activation, recalibration, and restart
  controls worked in the browser; build passed. Physical orientation and device
  permission prompts were not tested in this cleanup pass.
- Keep the shaded ceramic cup, centered on a stationary, shallow concave saucer
  with a clear rim and contact shadow. Avoid ambiguous domed-plate shading.
- Handle correction: a single filled ceramic contour in the cup's red palette,
  with an inner shadow and restrained upper highlight. Replaces two mismatched
  gold/red stroked loops that produced a doubled edge. Coordinator implemented
  and checked the live 390 × 844 layout and both tilt directions in a temporary
  component preview; build passed. Preview removed; balance behavior unchanged.
- Chocolate pours from the rim reached by the liquid, falls vertically, and lands on the
  saucer. Keep front/back layering correct and clip deposits to the saucer.
  Correcting the liquid imbalance stops fresh flow; existing puddles stay where
  they landed until reset.
- Keep sensor permission, initial-position calibration, recalibration, and restart
  behavior. Use the shared `src/components/cocoaBalance.js` calculation for both
  gameplay loss and visible pouring so their thresholds cannot drift apart.
- The user tried the 2-degree/200 ms experiment and found it impossible to avoid
  spilling. Do not restore that setting as an accepted difficulty target.
- **Current active-balancing trial:** the user rejected the stillness-versus-steep
  loss behavior and agreed to try predictable chocolate sways that need gentle
  counter-tilts. Wait for the first valid sensor reading, give two calm seconds,
  then introduce a smooth sway over three seconds. Sway is primarily sideways
  (14-second cycle), with a smaller front/back movement (28-second cycle).
  Filter hand input and liquid response; allow 0.8 degrees of hand noise and
  apply 0.8 input gain. Effective liquid imbalance includes the sway and phone
  tilt. Warning grows from 3 to 7 degrees; require 0.7 seconds continuously above
  7 before spilling, capped at 12 percentage points/second. Correction stops new
  loss; spilled chocolate and meter do not refill. Restart resets the cup and
  sway. Recalibration retains elapsed time and existing spill.
- CocoaCup receives actual filtered tilt separately from effective liquid tilt,
  warning, and actual spill rate. Liquid rises toward the rim before overflow;
  the warning crest and stream use the same rim position. Keep stationary saucer
  deposits and vertical streams. No new goal, message, or reveal added in this trial.
- Coordinator implemented simulation and integration; one helper updated the cup
  animation. Coordinator's four simulation tests and build passed. Simulation
  at 60 Hz warned at about 3.7s and began spilling at 5.1s while motionless;
  counter-tilts held 60s without loss. Browser QA at 390 × 844 used simulated
  orientation to check spill, correction (meter stayed at 12% for about 20s), and
  restart. Isolated warning/rear-crest screenshots and live 320 × 568 layout
  passed. Temporary fixtures removed. Physical-phone feel and sensor readings
  still await the user's test; simulations do not establish real-device playability.

### Day 10: lantern (`/farol-t8e2`)

- Keep only the personal message inside the dark scene, preserving its wording
  and the existing lantern/light reveal. Remove the introductory top message and
  instruction subtitle. Keep Diciembre 10 visible outside the darkness.
- Fit the scene into one phone screen. During a drag, the lantern and light rise
  together 52px above the finger over 320ms with smooth easing. On release, keep
  the last rendered position, including early release during the lift; cancel
  restores the pre-drag position. Preserve the artwork and existing scene bounds.
- Coordinator implemented and checked screenshots at 390 × 844 and 320 × 568,
  plus an actual browser drag. A temporary synthetic-pointer fixture measured
  14.9px at the early sample, 52.1px after the lift, no release jump, and correct
  cancellation. Fixture removed. Build passed; physical-phone feel untested.

### Day 11: music box (`/musica-k9c6`)

- Latest two targeted adjustments: diameter increased 12% (radius 0.3136),
  retaining the same length. Center height increases by the radius difference
  to preserve bottom clearance; shared shaft/bearing calculations follow it.
  Pins and end-cap bevel details scale proportionally. The far-end length-light
  overlay now fades gently from 10% shadow through 7.5% to 5%, replacing its
  abrupt 48%-dark-to-highlight transition. Rotation and surrounding box/comb/crank
  are unchanged. No validation or helper agents, per the ongoing user request.
- Latest cylinder-only pass preserves all geometry constants, placement, barrel
  silhouette, pin positions/height, and rotation. Adds a restrained irregular
  upper reflection, deeper curved-edge shadows, softer reflected light, projected
  pin shadows clipped to the barrel, foreshortened pin caps and tiny highlights,
  and inset end-cap bevels with hub contact shading. Keep the aged brass texture
  and accepted box. Per user request, no agents, browser validation, build, or
  other checks were run for this pass; the user will assess the result.
- Reference-material trial: match the user's vintage starry wooden music box
  with photographic walnut grain, burgundy velvet and gold stars, aged brass,
  and brushed steel from `day11-antique-materials.png`. The generated four-part
  atlas is projected onto the existing SVG planes by `Day11Materials.jsx`.
  Keep the geometry and moving mechanism, with corner hardware, front inlay,
  joinery, recessed lining shadows and wood edge shading. The brass cylinder
  radius is 0.28 at height 1.14, with 76 pins, rotating wear marks and a textured
  surface. All 19 steel teeth retain their note-driven flex, including their
  texture layer. Preserve melody, reveal, crank projection and controls.
  User rejected the shiny gold cylinder. Current cylinder-only trial uses darker,
  muted aged brass, broad soft lighting without bright reflection stripes,
  stronger multiply-blended patina, darker irregular scratches, and subdued pin
  and end-cap highlights. Aim for rugged, old, less shiny metal. Retain pin and
  scratch motion. Phone-size screenshot and build passed; wooden box styling
  stays as accepted by the user.
  Coordinator checked screenshots at 390 × 844 and 320 × 568, click/keyboard
  turning, 19 teeth and no small-screen overflow; build passed. Phone touch feel
  and a full-song listening test were not repeated for this material change.
- Phone-height layout with Diciembre 11 always visible above a rolled-paper message
  and the existing music box. Remove instructions, coaching text, and
  the melody status panel. Preserve the box artwork, crank projection, melody,
  tap, drag, and keyboard controls.
- User authorized placeholder wording to adjust later. Current cylinder message:
  "Que cada nota llene la casa de calma, alegría y un poquito de magia. Lo más
  bonito de esta Navidad es compartirla juntos."
- Cylinder rotates visibly from the first turns; curved text starts entering
  after 60% of the song. Full opacity and forward reading position occur only
  after one whole melody, including the last note's duration. Keep the earned
  message visible and stationary during later turns. Use maximum forward crank
  travel; reversing/retracing adds no progress or notes. Current 46-note melody
  has 144 duration units plus one initial pickup; completion at 145 * PI/7 rad.
  Notes advance mechanically even when audio is unavailable.
- Latest visual adjustment replaces the message's brass, pins, and axle with
  matte cream paper, faint fibers, sheet seams, and layered rolled edges. Preserve
  rotation/reveal timing and the separate brass cylinder inside the music box.
  Coordinator checked live 390 × 844 and partial/full component previews including
  320 × 568; build passed. Preview removed.
- Coordinator handled cleanup/progress/integration and one helper built the new
  Day11MessageCylinder artwork. Coordinator checked live phone screenshots and
  click/keyboard controls at 390 × 844 and 320 × 568. A synthetic crank/audio
  fixture verified no text at 50%, partial text at 80%, incomplete after the
  46th note starts, full reveal after its tail, and no extra notes from reverse/
  retracing. Complete message fits the small screen. Fixture removed; build
  passed. Physical-phone dragging and listening through a full song are untested.

### Day 24: Colombian Christmas (`/navidad-e3n7`)

- Build multiple scenes incrementally. The user requires discussion and explicit
  green light before implementation of new scene ideas. First approved step is
  the main scene plus animated golden glints. The user subsequently authorized
  the songbook activity's first step: a looping music-box video.
- Current scene is the user-provided `December 24_ Colombian Christmas Evening.png`,
  copied unchanged to `day24-colombian-evening.png` (958 × 1641). Preserve the
  earlier image as an unused asset. The glow reference is styling guidance only;
  do not use its image, altered composition, or instructions.
- Day 24 explicitly follows its own layout rather than the other days' template.
  Remove the separate date header and its reserved space; the date is part of
  the new artwork. Do not reintroduce the shared external-date requirement here.
- Four warm star glints sit on the natilla, buñuelos, songbook, and nativity.
  Fine rays and a soft aura brighten and soften independently over 4.8–6.3 seconds.
  Keep their positions attached to the original image at all viewport sizes.
  The letter has no animated glow initially. Preserve the full composition,
  including the letter and the date within the artwork. No visible interaction hints.
- Coordinator checked 390 × 844 and 320 × 568 screenshots, complete-image fit
  without scrolling, four glints, and changing independent opacities. Build passed.
  Other interactions, additional scenes and message content remain to be agreed.
- The songbook hotspot follows its shape on the image and opens `?scene=songbook`.
  Play the supplied 786 × 1178, 7.792-second trimmed H.264 video unchanged from
  `public/videos/day24-music-box-trimmed.mp4`, looping, muted and inline for this preview.
  This replaces the first video after the user noticed a jump at the loop seam;
  preserve the original as an unused asset. The trimmed file has no audio track.
  Keep the whole video visible in the phone viewport, with an accessible icon-only
  back control. Browser Back also returns to the main scene. Unmount the video
  on exit. No advancement interaction or additional music is implemented yet;
  controlling video advancement will be a later agreed step.
  Coordinator verified click and keyboard entry, active looping playback, icon
  and browser-back navigation, video removal on exit, and phone layouts at
  390 × 844 and 320 × 568 without scrolling. Build passed; physical-phone
  autoplay was not tested.
- Playback now starts manually: show an accessible icon-only play button from
  entry and call play directly from its tap. No autoplay or automatic resume.
  Hide the button on actual playback and show it again if paused. Keep explicit
  muted/inline DOM properties, retry playback, looping, and cleanup on exit.
  Original video is unchanged (H.264 High, yuv420p). Build passed; physical-iPhone
  playback still needs retesting. Wait for the user's melody and game instructions.
- Music asset preview: `/day24-melody-preview.html`, separate from the activity.
  Soprano transcribed from `Anton-Tiruriru-SATB.pdf` (Alejandro Zuleta), starting
  with C5 quarter-note “An-” on beat 3 of measure 16. User explicitly chose
  pickup → 17–32 → 17–30 → 33–34, stopping after the second ending and omitting
  D.C. Introductory measures are excluded. Fixed 120 BPM chosen because the PDF
  says Allegro without a numeric tempo; final fermata uses its written 3 beats.
  110 notes, 48.5 seconds plus 2.5-second decay tail. No uncertain notes found
  during visual score review. Editable transcription and reproducible builders
  are in `scripts/music`; MIDI, sampled-celesta WAV, MIDI-derived timing JSON,
  validation report and provenance are in `public/audio/day24`.
  All 220 note on/off renderer events checked at exact PCM frames, no clipping.
  Build passed; preview inspected at 390 × 844. Regular Chrome playback and
  the second-pass indicator worked; the in-app browser crashed on audio playback.
  Physical-iPhone playback and subjective listening feedback remain with the user.
- User authorized the Day 24 rhythm game after discussing it. Current trial:
  steady quarter-note beat (not melody-note rhythm), eight full measures audible
  after the pickup, four silent measures: mute at 12.5 s, return at 18.5 s.
  Tune LISTEN_MEASURES/SILENT_MEASURES in useDay24Rhythm.js. The audio source
  continues through scheduled gain muting; video keeps looping; the tap circle
  stops pulsing during silence but accepts input. Evaluate the nearest tap
  within half a beat (250 ms) before/after return, display signed whole milliseconds
  and early/late text; ignore inputs less than 225 ms apart. Missing tap shows
  “Sin toque”. One return per song for this initial trial. Restart available at end.
  Use the audio output timestamp mapping for both glow and input timestamps;
  latency estimates are a fallback where unavailable. No fractions of milliseconds
  or claim of physical-device timing accuracy. User authorized the small note:
  “Para mayor precisión, juega sin audífonos ni altavoces Bluetooth.”
  Leaving/backgrounding interrupts the attempt so it can be restarted manually.
  Latest user instruction pauses all agents and validation. This implementation
  was not built, browser-tested, or reviewed by another agent; user tests it.

### Day 16: snowman memory (`/sonrisa-h8q2`)

- Testing paused at the user's request on 2026-10-09: both
  `ALLOW_TEST_MISTAKES` and `TEST_MELT_ON_TAP` are false in `Day16.jsx`.
  Normal sequence playback, answer checking, and rounds are restored.
  Keep the separate snow preview and assets saved for future experiments.

- Keep the date outside the message, with the snowman game and reserved message
  area fitting one phone screen. Remove visible instructions; preserve accessible
  turn feedback, the snowman artwork, accessory highlights, and laugh sounds.
- Completing six sequences reveals the message, but the game continues without
  a round limit. Show only the current round count; never display the reveal
  target, a fraction, or six progress markers. A wrong answer resets the attempt.
- Current user-requested trial replaces cracks with generated, overflowing snow.
  Generated transparent snow keyframes crossfade through the first five steps,
  from a full blanket to wet patchy snow and finally sparse edge remnants.
  Use the original blanket plus day16-snow-melt-early/middle/last.png; keyframes
  are at steps 0, 2, 4, 5. No procedural hole masks. The winter-blue card (#173f59)
  matches the snowman scene's top blue and width, and stays blue after completion.
  Text shows softly through thinning areas but stays blurred beneath the snow.
  After the sixth, snow fades away and the text becomes sharp. Keep the text
  editable HTML, separate from the snow asset.
  An earned message remains visible when playing again.
- Days 12 and 16 explicitly use one centered grid column at every viewport size;
  do not let the old shared desktop two-column rules split their date and activity.
- User authorized temporary message wording to replace later. Current text is
  “Que nunca les falten motivos para reír. Sus risas llenan de alegría esta Navidad.
  Los quiero muchísimo.”
- Melting trial: coordinator checked 390 × 844 and 320 × 568 screenshots and
  completed six rounds through the actual game with the existing forgiving test
  mode. Verified progressive CSS mask translucency and continued play into round
  seven. Build passed. Physical-phone testing remains with the user.
- Coordinator verified 390 × 844 and 320 × 568 layouts, all six rounds using a
  temporary fixed-sequence fixture, cracks while text stayed hidden, falling snow,
  readable completion, replay persistence, and wrong-answer feedback. Fixture
  removed; production sequences remain random. Build passed; no physical-phone
  or real-audio listening verification.
- Latest adjustment removes the snowman stage border and continues beyond the
  reveal. Coordinator verified arrival at round eight with the message revealed
  using a temporary accelerated, fixed-sequence fixture; production timing and
  random sequences remain unchanged.

## Agent budget: selective one-helper default

The user is trying this default to conserve their Codex allowance while keeping
the benefits of focused orchestration:

- **Small fixes, tuning, copy, and documentation:** the coordinating agent does
  the work and targeted verification directly. Do not delegate routine arithmetic,
  parameter checks, or documentation reviews.
- **A new page or substantial interaction change:** use at most one helper for
  the focused piece of work, and only when its contribution has clear value.
  Briefly state its purpose. This is permission to use one useful helper, not
  a requirement to use one on every page or follow-up message.
- Choose either delegated implementation or independent review according to
  what the task needs. Do not automatically create both roles or cycle through
  multiple reviewers. The coordinator retains integration and verification.
- **Deeper review is available when the user asks.** Treat that request as
  authorization to expand review within its stated scope; describe a bounded
  review plan and avoid asking again for permission already given. Return to
  the selective one-helper default afterward.
- If the agent believes more helpers are necessary without such a request,
  explain the concrete benefit and agree on scope and budget with the user
  before expanding. Do not silently escalate orchestration.
- No nested delegation. Give helpers short, task-specific briefs with relevant
  files and constraints instead of inheriting the entire conversation by default.
- Reuse findings and an existing helper within the same focused task when useful.
  Do not start fresh agent runs or duplicate reviews for each small adjustment.

## Bounded implementation and QA workflow

1. Establish the target page or issue and the behavior to preserve or achieve.
2. Perform one focused UX review of that scope, directly or with the budgeted
   helper. A review does not require a separate agent.
3. Complete one fix round addressing supported findings.
4. Perform one browser recheck of the affected behavior.
5. Report the result and any remaining uncertainty. Do not automatically start
   more review/fix cycles or expand into a whole-site audit.

- Keep runs bounded to conserve the user's Codex allowance. Prefer a few
  relevant interactions and viewports over exhaustive exploration.
- For a small tuning request, use a small patch and targeted checks; do not
  launch a helper or a fresh whole-page audit. Reuse relevant findings.
- Preserve actual mobile screenshots and interaction checks for affected visual
  behavior, but check only what changed. Avoid repeating successful checks for
  reassurance; repeat when a new change, failure, or concrete unresolved issue
  warrants it. Report verification briefly.
- Give concise progress updates about decisions and evidence. Ask only for
  information that is genuinely missing and blocks useful work; otherwise proceed
  with a reasonable, stated assumption.
- Begin UX reviews and browser rechecks at a representative phone viewport,
  prioritizing readable content, reachable controls, and touch interactions.
  Desktop checks supplement mobile coverage. Distinguish viewport emulation
  from verified touch behavior or testing on a physical device.
- Within the agent budget above, a helper may receive a concrete, bounded
  implementation or QA task. The coordinating agent owns scope, integration,
  and the final report.
- Give implementation agents explicit file ownership. A read-only source review
  can run in parallel, but it does not replace browser QA. The coordinating agent
  may perform the screenshot and interaction checks itself.
- QA agents remain read-only: they may inspect the UI and exercise local
  interactions, but must not edit application code or configuration, install
  tooling, or deploy changes.
- QA must inspect actual screenshots and interactions. Source inspection or DOM
  assertions alone do not establish that the visual experience works.
- Separate observed application bugs from browser automation failures. A launch
  crash, disconnected tool, or unsupported automation action is not by itself
  evidence of an application defect.
- Record the route, viewport, actions, and observed result for meaningful
  findings. Label source-only concerns and untested behavior as such.
- For microphone or orientation behavior, temporary local fixtures may supply
  simulated inputs to the actual component. Do not alter production permissions
  or sensor code just to make QA easier. Report simulated input separately from
  real microphone/phone testing, including timing measurements and their limits.
- Verify animations remain active even when the browser reports reduced motion.
- Keep temporary fixtures through the final dependent recheck, then remove them.
  Close agent-created test tabs and reset temporary viewport overrides. Do not
  leave QA controls, mock sensors, or test-only pages in the application.
- Email sending and photo uploads have external effects. Keep read-only QA to
  non-submitting interactions unless the user explicitly authorizes those actions.

## Code and verification

- Follow the existing React and Vite structure. Day components live in
  `src/days/Day01.jsx` through `Day24.jsx`; most styles are in `src/styles.css`.
  Focused components/helpers and scoped styles may live in `src/components`
  when that keeps a page change contained, as with `CocoaCup`.
- Keep page-specific fixes scoped to that page. Check whether a shared selector
  or component affects other days before changing it.
- Preserve configured slugs, unlock dates, and the `Europe/Berlin` date-gating
  behavior unless the chosen task calls for changing them. Inspect local
  configuration before diagnosing a locked page; do not silently change the
  calendar year to make a test pass.
- Avoid unrelated refactoring, dependency upgrades, new test infrastructure, or
  formatting churn during a focused UX fix.
- Use generated images where they improve an illustration or texture; preserve
  accepted assets. Keep generated assets and their prompt/provenance files in
  `public/images`, verify transparency and composition in the actual page, and
  consider phone loading/rendering costs. Code-native SVG/canvas remains suitable
  for visuals whose geometry must respond to interaction.
- Use checks appropriate to the change. `npm run build` is the existing build
  check; inspect `package.json` for available scripts rather than assuming a
  test suite exists. Documentation-only edits do not require browser QA or a build.
- Run the build after the patch is ready. Reuse a helper's verified result when
  it covers the final code; do not repeat it unless subsequent changes or a
  concrete concern justify another run.
- A passing build does not replace the agreed screenshot and interaction recheck.
- Keep deployment separate from local verification; deploy only when requested.

## Browser setup: recheck instead of assuming

- The snow page used in earlier experiments is
  `http://localhost:5173/nieve-8k2f`.
- Earlier experiments succeeded with WebKit through Playwright MCP, while direct
  browser launches crashed. Treat these as historical observations, not fixed
  constraints; inspect the tools and running server available in the current session.
- On 2026-10-02, this repository's Vite server was running on port 5173 and the
  in-app browser loaded the snow page successfully. The local Advent year was
  2025, while the source default was 2026. These are temporary setup observations,
  not required configuration.
- On 2026-10-03, the in-app browser worked for 390 x 844 mobile screenshots and
  simulated-input checks. It reported reduced motion. The earlier, subsequently
  rejected Day 9 experiment measured 197 ms sideways and 214 ms backward at
  2 degrees using simulated sensor events; these describe that old setting only.
- Reuse a suitable existing local server. Do not assume an earlier server or
  browser session still exists, or repeatedly retry a failing launch path.

## Reporting

- Clearly state who made changes and who performed QA, including delegated agents.
- Explain what changed, why, and which screenshots, interactions, viewports, and
  checks were actually verified.
- Distinguish pre-existing changes from changes made during the current task.
- Distinguish user-approved results from requested experiments and implementation
  assumptions. Passing QA or the user moving on does not establish physical-device
  acceptance. Separate calculated timing from measured browser/device timing.
- State what remains uncertain, untested, or blocked by tooling. Never report an
  intended or attempted check as a verified result.

### Day 13: moving cloud paddle trial (2026-10-14)

- Use the supplied Day 13 valley, tree, cloud and red/gold ornament artwork.
  The source baubles contain a baked checkerboard; SVG silhouette clipping hides
  it without changing the original image files. Physics uses a fixed 360 × 500
  logical world with uniform SVG scaling and inverse screen-coordinate mapping.
- Drag only the horizontal cloud, in both axes within the lower region. Its
  actual smoothed travel supplies collision velocity. Touch releases the current
  ornament; releasing places it only inside the tree after a valid bounce and
  free separation. Cancellation or release elsewhere resets only that attempt.
  Keep free placement, the same ornament size, multiple ornaments and undo.
- Use gravity, restitution .85, relative-motion swept collisions at 240 Hz, and
  friction-limited horizontal transfer. No prescribed bounce height. A five-unit
  separation is needed to rearm contact; trying to catch the same contact before
  separation resets the attempt rather than letting the cloud carry the ball.
- The user requested temporary physics controls: the gear exposes gravity,
  restitution, friction, maximum cloud speed, vertical bounds and live velocities.
  Defaults live in `src/components/ornamentBounce.js`.
- Coordinator implemented and checked this trial without helpers. Eleven focused
  physics tests and the build passed. Browser checks at 390 × 844 covered x/y
  dragging, failed release, a live rebound, keyboard release placement and undo;
  320 × 568 screenshot also checked. Real-phone control feel is still unverified.
- Latest Day 13 refinement: fixed drop/reset point (90, 180), independent of
  cloud movement. Tap a placed ornament to remove it; undo remains available.
  Tree centered at x=180 with its trunk on the new supplied nightscape snow;
  background and tree share SVG coordinates to preserve ground alignment.
  Twelve physics tests and build passed. Coordinator checked the centered scene,
  placed then tapped an ornament to delete it, and dragged/released the cloud to
  verify the ball returned to the same fixed point at 390 × 844.

### Day 9 control/spill repair (2026-10-15)

- Canvas touches no longer disable active phone orientation controls. Explicit
  debug tilt controls still choose manual input. Calibration uses relative
  quaternions rather than independent beta/gamma subtraction, preserving small
  counter-tilts near an upright phone and mapping landscape axes correctly.
- Current torque model retains angular momentum and has no centering spring.
  Player torque gain is now 10 (was 3); disturbances, damping .28 and 32°/s cap
  remain unchanged. An 8° counter-tilt brakes max spin in about .38 s / 5.82°
  in simulation, previously 1.13 s / 17.04°. Combined roll/pitch magnitude is
  capped at 60°, replacing separate 65° stops that allowed almost horizontal
  diagonal poses. Remove only outward velocity at the limit.
- Overflow drains only at its visible current rate (up to .32 volume units/s),
  without a queued reservoir pouring from a stale source. The wet head follows
  the current rim crest; a small world-space release history keeps already
  emitted chocolate falling independently of later cup rotation. Stopped heads
  detach instead of staying attached. At steep angles the rendered liquid is
  constrained to the rim, inner walls and floor; spring/wave simulation unchanged.
- One helper handled torque tuning/tests; coordinator handled sensor mapping,
  spill/surface rendering and browser checks. All 19 focused tests and build
  passed. Temporary browser sensor fixture verified ±8° input, recalibration,
  sensors surviving a canvas touch, and visible live-rim overflow at phone size.
  Fixture and temporary tabs removed. Real iPhone control feel remains untested.
- Latest cocoa difficulty trial: 3 calm seconds, then torque peaks ramp from
  7 to 38 deg/s² over 75 seconds; pulse duration shortens from 2.2 to 1.2 s,
  and recovery multiplier from 2.2 to .3. Existing randomized variation and
  tuning controls remain. Correction strength and no-centering physics unchanged.
- Spill meter now uses a .30 fill-height allowance (roughly one fifth of the
  chocolate), ending at fill 1.58 instead of .55. At 100%, mug pose and timer
  stop; emitted tails finish falling, and restart restores fill/difficulty.
  Eleven focused tests and build passed; coordinator checked 100%, timer staying
  at 3.2s during a forced tilt, chocolate remaining, and restart returning to 0%.

### Day 13 compact scene refinement (2026-10-15)

- Enlarge the centered tree by 10% to 330 × 352 logical units, with its ground
  details anchored to its base. Scale the valid decoration area with it.
- World height is now 485; cloud vertical range is 378–455. Keep bounce forces
  unchanged. Fixed drop/reset point moves left to (48, 180).
- Remove undo and physics settings from the UI. Keep reset-launch in the scene's
  upper-right corner; it preserves placed ornaments.
- Placed ornaments use captured pointer taps with a 10-pixel movement tolerance
  and enlarged hit areas, rather than relying on synthesized touch clicks that
  the magnifier guard can suppress. Preserve keyboard removal.
- Twelve physics tests and build passed. Coordinator checked the 390 × 844
  composition and removal using a temporary placed-ornament fixture, then removed
  that fixture. Native iPhone touch behavior remains for user verification.

### Day 5 optional hints (2026-10-15)

- User explicitly permits optional hints for Day 5. Keep all nine hints in the
  agreed order in Day05.jsx, with no demonstration or automatic reveal.
- Ask “¿Estás seguro de que no quieres intentarlo otro poquito?” before each new
  hint. Previously revealed hints can be reopened without confirmation. Declining
  or closing never unlocks another hint. Hint 4 names Carol of the Bells.
- Preserve melody, timing evaluation, and message reveal. Phone-size browser check
  covered confirmation, first hint, next confirmation, and declining; build and
  22 bell rhythm tests passed.

- Day 13 reset correction: the scene reset now clears all placed ornaments and
  restores the cloud, ball, velocities and active gestures to their initial state.
  This supersedes the previous reset-launch-only behavior. Accessible name is
  “Reiniciar decoración”. Build passed; browser check verified the moved cloud
  returns to its starting position.

### Day 13 optional Pong mode (2026-10-15)

- User corrected “December 15” to Day 13; Day 15 stays unchanged. Decoration is
  the default. A discreet top-left Jugar/Decorar button changes modes. Tree
  ornaments persist; switching away cancels only the current decoration throw.
- Pong state/rules are isolated in ornamentPong.js with configuration PONG_CONFIG.
  Reuse bounceVelocity and shared OrnamentArtwork SVG assets. Pong uses no gravity,
  mirrored narrow paddle bands, actual paddle velocities, swept collisions and
  separation rearming. First to five; point resets the ball, pauses for a tap/Sacar,
  then counts down two seconds. Serve direction alternates after each point.
- AI prediction accounts for wall rebounds, delayed imperfect targets and physical
  vertical strokes. Accuracy/reaction/speed increase with total score. Both clouds
  obey the same speed ceiling and mirrored movement limits. Switching modes or
  backgrounding the page pauses Pong without catching up elapsed time.
- 27 physics tests and production build passed. Coordinator checked the integrated
  390 × 844 layout, mode switching, serve countdown and cloud dragging. Earlier
  isolated UI check covered point feedback. Physical-phone play feel is unverified.

- Day 13 reveal/Pong gate: five successful ornament placements earn the message.
  Five softly shaded cloud banks thin one by one over a translucent mist layer;
  text remains extremely faint, blurred and accessibility-hidden until placement
  five. The final cover/word fade takes 650 ms; Jugar unlocks after 700 ms.
  Earned progress survives ornament removal; full decoration reset clears progress
  and locks/unmounts Pong again. Both pointer and keyboard placements count.
  Coordinator checked initial, four-placement and five-placement states using
  temporary fixtures at 390 × 844, plus reset/relock. Fixtures removed; build passed.

- Latest Day 13 serving refinement: no serve/countdown/replay buttons. Touching
  only the bottom cloud immediately launches upward from fixed (180, 365), then
  the same held gesture drags the cloud. After a point the ball waits there; at
  five points show the winner and let the next cloud touch reset scores and serve.
  No alternating direction or countdown. Keyboard Enter/Space on the cloud serves.
- Reveal clouds now disappear in scattered top-right, bottom-left, top-left,
  bottom-right positions. A large scalloped cloud remains over all words through
  placement four, with card corners visible; it clears on five. Score labels have
  explicit spacing. Fifteen Pong tests/build passed; phone-size UI check verified
  final cloud coverage and immediate cloud-touch serving using removed fixtures.

- Day 13 cloud artwork now follows the user's Cloud Evolution Design Guide:
  one illustrated, softly volumetric cloud with asymmetrical silhouette and blended
  cream/periwinkle lighting. Built-in imagegen produced day13-message-cloud.png;
  full prompt is alongside it. Final cover and scattered smaller clouds share
  this transparent asset; reveal timing and five-placement gate are unchanged.
  Build passed and final cloud inspected at 390 × 844 with a removed fixture.

### Day 22: sparkler visual prototype (`/chispa-a1k6`)

- Canvas 2D only, black full-screen drawing area with date and temporary En vivo,
  capture control. No game, score, timer, reveal, or save.
- Live sparks use bounded particles, gravity/drag, fine streaks and a small hot
  core. Record normalized coordinates/timestamps separately; preserve independent
  strokes. Exposure uses seeded per-segment rendering cached offscreen and replayed
  on resize. Latest trial accumulates light during pauses and increases exposure
  energy with time per pixel, so slow movement is brighter. One button starts a
  fresh capture (Empezar captura), then stops it (Detener captura) and displays
  the exposure result. Drawing is enabled only during capture. Starting again
  clears the previous result. Nine focused tests and build passed for this change.
- Nine focused simulation/rendering tests and build passed. At 390 × 844,
  coordinator checked separate trails, mode switching with retained exposure,
  and Clear. Physical phone appearance and performance await user feedback.

- Day 22 heart reveal: small golden outline heart at top-left; reserve the red
  message card above the drawing canvas without shifting the artwork on reveal.
  User authorized placeholder copy. At capture stop, recognize an upright heart
  using resampled outline/template comparison plus a two-lobe/top-cleft check.
  Accept either direction and split strokes; ignore dwell density. Reveal persists
  across subsequent captures. No extra instructions or controls. Twelve focused
  tests passed, build passed, and initial phone layout inspected at 390 × 844.
  Freehand recognition feel still awaits user testing.
- Day 22 detection refinement: tolerate tilted hearts, uneven lobes, and off-center
  notches. Check each stroke and groups of up to three so earlier failed attempts
  do not invalidate a later heart; remember success on finger release and reveal
  at capture stop. Thirteen tests and build passed. Coordinator verified the actual
  message appearing using timed synthetic pointer input at 390 × 844; temporary
  fixture removed. Physical freehand phone recognition remains for user feedback.

### Day 15: enchanted snow globe (`/magia-l3m7`)

- New star-only Canvas 2D prototype follows the supplied storyboard and pasted
  specification. Use day15-snow-globe.png unchanged as the static scene; all dust
  is generated. Canvas is anchored at image left 19.2%, top 31.7%, width 60.6%,
  clipped to the sphere and its floor. A masked, faint copy of the original image
  restores stationary edge reflections above particles.
- 1800 normalized golden grains rise, swirl in irregular spiral arms, join star
  targets at staggered times, hold, dissolve, and settle. Default cycle 20.4 s;
  no additional figures, scoring, or completion. Device motion requires two
  deliberate acceleration peaks; repeated triggers are ignored while active.
  Globe tap/keyboard is the fallback and requests iOS motion permission in gesture.
- Collapsible Vista previa includes trigger, pause/resume, timeline, particle count,
  glow, swirl strength, formation duration, and clipping-boundary controls.
- Coordinator implemented and checked phone framing, initial dust, intermediate
  formation, star, spiral, timeline and touch trigger at 390 × 844. Two trajectory
  tests and build passed. Real iPhone sensor feel and performance remain unverified.
- Day 15 now cycles star → snowflake → leaping reindeer → bell → heart, then
  repeats, advancing only on an accepted idle-state trigger. New figures change
  only normalized particle targets; dust, timings, swirl, and background remain.
  Preview panel includes a figure selector. Three trajectory/target tests passed,
  including all targets inside the glass; phone screenshots reviewed all four new
  figures. Reindeer scaled within the boundary to keep antler tips visible.

- Latest Day 9 phone tuning: force at maximum slider value 1.5, frequency at
  minimum .5, recovery at minimum .1, cup damping 0. Angular-speed limit starts
  at 22.5°/s (25% of the 10–60 range) and ramps linearly to 60°/s at 20 seconds.
  Shared preview defaults remain unchanged; the game supplies this tuning.
  Restart retains existing neutral-orientation recalibration, resets the ramp,
  and reports zero stats immediately. Hide the sensor button when sensors are
  active; keep the permission activation/retry button when inactive.
- Day 9 existing title/message card starts hidden with space reserved. At 20 s
  of surviving play it fades into focus over 1.2 s with a warm glow. Restart hides
  it again. No liquid/spill geometry changes. Sixteen focused tests/build passed.

### Day 23: Christmas fan (`/brisa-m8z2`)

- Supplied nativity background and wooden fan reference are rendered with Canvas
  fog and articulated photographic fan slices. Nineteen sections fold right to
  left around a fixed bottom pivot; the left guard remains stationary. A tap
  toggles; only the open fan accepts fanning and advances fog clearance.
- Device acceleration z (normal to the phone) detects gentle alternating
  forward/backward cycles with smoothing, thresholds and side-motion rejection.
  Request permission on mount, with one gesture fallback where required. Cache
  requests through Strict Mode. Touch fallback: repeated up/down drags on the
  open fan. No explanatory scene text; retain permission/error feedback.
- Message placeholder explicitly authorized by user. Message and nativity are
  beneath one continuous noise-based fog field, with an organic elliptical density
  hill over the message. No separate final reveal animation. Completion is tracked
  when the whole message footprint has negligible fog. Date remains above fog.
- Four tests cover motion discrimination, full cycles, continuous late-clearing
  message density, and fixed hinge geometry; build passed. Coordinator inspected
  open/closed phone layouts and completed message using timed synthetic motion.
  Physical iPhone sensitivity and permission flow remain unverified.
- Day 23 refinement: fan blades use constant uniform scale through opening and
  closing; remove angle-dependent stretching and fanning squash. Keep the fixed
  hinge and rotate sections only. Fog now transports a continuous density field
  upward/outward through three drifting vortices driven by fanning energy, with
  lingering wind and soft diffusion. Preserve late message concealment; completion
  checks actual rendered opacity over its entire footprint. Six focused tests and
  build passed; the latest visual flow and physical-phone feel await user review.

- Day 23 slat refinement: finite-width textured shafts extend through the fixed
  brass pivot into rounded wooden ends, rotating as part of each rigid blade.
  Closed angles span -25 to -21 degrees for a visible layered upright bundle;
  fully opened angles and radius remain unchanged. Mist uses overlapping warped
  broad density banks, drifting transport, and irregular late-clearing message
  protection. Motion detection, interaction and completion check are unchanged.
  Six focused checks and build passed; coordinator inspected closed/open phone
  views and partial wind-driven fog via a temporary fixture (removed).
- Day 9 easier opening supersedes the earlier immediate 22.5→60 ramp: keep the
  combined angular-speed ceiling at 10°/s through 20 seconds, then increase to
  60°/s over the following 40 seconds. During the first 20 seconds, disturbance
  torque is 35% of its configured strength and recovery gains 1.2 seconds before
  its existing frequency multiplier. These assists taper out smoothly from 20–60s.
  No automatic centering, liquid changes, or reveal timing changes. Restart resets
  the easy phase; the initial-speed slider now matches 10. Seventeen physics,
  sensor-mapping and challenge tests plus build passed. Phone playability still
  needs user feedback; no physical-device claim.

- Day 15: sustained shaking now holds the dust in free motion, using a separate
  motion clock from figure formation. Wait for 700 ms without meaningful motion
  before advancing formation; continuing shakes renew that interval. Keep the
  original two-peak activation and tap fallback. Reserve an empty outlined message
  space above the scene, with date visible. Four focused tests/build passed and
  phone layout inspected at 390 × 844. Physical shake sensitivity remains untested.
- Day 22 marked ready at the user's request; final-message metadata unchanged.

### Day 21: cutout story (`/paz-y9j4`)

- First static scene only, pending the user's story: use the supplied snowy plain,
  moon and two trench PNGs unchanged. German trench left, British right, moon in
  the upper center, with open snow between the trenches. Preserve cutout borders.
- Landscape composition contains the full 1672:941 background and anchors all
  layers proportionally. Portrait shows the explicitly requested Spanish prompt
  to turn the phone; CSS orientation changes reveal the scene automatically.
  Date remains visible. No invented story text, personal message or gameplay.
- Day status is rough. Build passed; coordinator inspected landscape 844×390 and
  portrait 390×844. Physical device rotation still awaits user testing.
