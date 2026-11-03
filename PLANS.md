# Plans (nothing here is implemented yet)

Written 2026-10-28 from the user's design notes. Each plan lists what exists today, the proposed change, files touched, open questions and rough size (S/M/L). Decisions still open are marked **?**.

## Decisions (2026-10-29, from the user)
- Parry = **timed tap** (not directional). Stacked-multiplier cap stays **x2** for now. Controller support (plan 1) is **skipped for now**.
- **Priority: high guard rework (plan 5) first**, then the rest of the order below.
- Plan 7 picks, in order: **guard droops when tired** (build with the guard rework), **cardio layer**, **bot fighting styles + stance switching**, corner play after those. **No** Thai scoring or round structure for now. Everything else in plan 7 is later.
- Still open: `LG_RANGE` start value (1.5 m) and whether long guard costs a little stamina; limb health numbers (plan 6).

## Suggested build order (revised 2026-10-29)
1. Strike refactor (done). 2. **High guard rework** (plan 5) + guard droop when tired. 3. Zones / stamina by outcome / momentum (plans 2-4). 4. Limb health (plan 6). 5. Cardio layer, then bot styles + stance switching, then corner play. Controller last / skipped.

## Original build order
1. **Strike resolution refactor** (prereq for 2, 3, 4): today damage is decided in three places (player to bot in `main.js vm.onActive` + `bot.receive`, bot to player in `bot.onActive` + `incoming()`, online in `vsStrike` / `res`). Pull the multipliers (distance zone, momentum, crit, combo, guard state) into one `strikeMods(attacker, defender, move)` that returns `{ mul, tags[], push, stop }`. Both sides and the online `hit` message use it. (M)
2. Hitbox zones (plan 2), stamina by outcome (plan 3), momentum (plan 4): small once 1 exists.
3. **Limb health** (plan 6): needs the refactor and the hit zones (which limb, how hard). Build right after step 2 so the guard rework can use limb state (sagging guard, leaking blocks).
4. **High guard rework** (plan 5): biggest change (binds, viewmodel poses, bot rig, bot AI, net sync, training hints). Do it before the controller so the action list is stable.
5. Controller support (plan 1): independent, last of the big ones, because it maps whatever the final action list is.
6. Realism extras (plan 7): pick a few, after play-testing the above. Bot styles and Thai scoring are the best first picks.

---

## 1. Controller support (M)
**Today:** no Gamepad API code at all; the game needs pointer lock to start (`locked`).
**Plan:**
- Poll `navigator.getGamepads()` once per frame before `readInput()`. Standard mapping. Write pad buttons into the same `keys{}` map under codes `Pad0..Pad15` (triggers/bumpers included, threshold 0.5) and fire `press(code)` on the rising edge. That means the whole binding system, including the new two-button combos (e.g. `PadLB+PadA`), works for pads with no new action code.
- Sticks: left = move (`I.fwd` / `I.side`, check `player.js` tolerates analog 0..1 input), right = look (`yaw` / `pitch` rate, deadzone ~0.15, response curve, separate pad sensitivity slider). Aim height for strikes already follows pitch, so right stick Y does it.
- Wheel actions (lean back / slip) have no pad equivalent: default them to right-stick flick down / up (edge-detected) or to buttons.
- Rebind UI: while `rebinding`, poll the pad too (first press = single, hold + press = combo, same `capture()` flow). Show pad button names (A/B/X/Y/LB/RB/LT/RT, with a Xbox / PlayStation label toggle).
- Starting the game: pad "Start" / A on the overlay sets a `padActive` flag so `locked` logic does not require pointer lock; pausing on Start.
- Optional: rumble via `vibrationActuator` on hit taken / KO.
- Suggested default layout: LS move, RS look, RT jab, LT cross, RB right hook, LB left hook / modifier (hold = left side), A jump, B crouch, X kick, Y teep, RS click knee, LS click elbow, d-pad up/down/left/right = checks / guard / clinch (G), Back = respawn.
- Testing: stub `navigator.getGamepads` in the preview (no hardware); real check on a physical Xbox pad.
**?** Do you have a specific pad (Xbox / PlayStation / Switch) to target first?

## 2. Detailed strike hitboxes: where on the limb it lands (M)
**Today:** one check, `dist - lunge <= reach + 0.15`, and damage is flat per move.
**Plan:** each move gets distance zones measured from the striker to the target; the zone picks the contact part and a damage multiplier.
- Add to `PATK` (player) and `BMOVES` (bot) a `zones` list, e.g. `[[maxGap, mul, label], ...]` and one helper `zoneMul(def, gap)`.
- Starting values (to tune):
  - Roundhouse: far 1.7-2.1 = FOOT x0.75 (weak, can be checked easily), sweet 1.1-1.7 = SHIN x1.2 (the real power, bonus crit chance), cramped < 0.8 = THIGH x0.6 and the kick is "jammed" (partial stagger for the kicker).
  - Teep: far = TOE x0.8 + max push, mid = SOLE x1.0, close = jammed, no push.
  - Jab / cross: fingertip edge x0.8, sweet middle x1.0, cramped (arm still bent) x0.7.
  - Hook: sweet is closer (0.7-1.1); at full reach it is a slap x0.7.
  - Knee: sweet 0.5-0.9 (x1.15), too far = whiff (links to the existing "knee from too far gets cut off" rule). Elbow: sweet 0.4-0.8.
- Time inside the active window can modulate it too (peak extension = sweet spot), so late / early contact is weaker.
- Feedback: toast `SHIN` / `FOOT` / `TIP`, small sound / shake difference. Also shown in training stats.
- Bot AI: replace the `reach + 0.1` launch distance with a per-move preferred gap so it tries to land the sweet zone; skill scales how well it does.
- Online: attacker computes the zone and sends it in the existing `hit` message (`dmg` is already sent).
- Interacts with the total x2 damage cap (decide whether the zone bonus counts under it).
**?** Should being too close (jam) also let the defender counter more easily?

## 3. Stamina depends on the outcome (S after plan 1)
**Today:** cost is charged at the start of the move (`vm.onStart`), regardless of result.
**Plan:** charge the base cost at start, then adjust when the result is known (`vm.onActive` result; bot: in `bot.onActive` / `receive`):
- Whiff (miss): +40% extra cost (overextended). Whiffing a heavy kick costs the most.
- Blocked / checked / dodged: refund 20-25%.
- Clean hit: refund 40%. (Combo flow discount still applies on top; repeat penalty stays.)
- Net effect: spamming whiffs drains you fast, landing keeps you fighting. Keep the recent loosening (STATUS.md) in mind: re-tune numbers after this so the net cost per move is roughly where it is now.
- Online: the result already comes back in `res`, so the attacker can adjust on receipt. Bot gets the same rules (it has its own `stam`).
- Show it: small floating "-3" / "+2" on the stamina bar, so the rule is learnable.

## 4. Momentum and direction change damage (M)
**Idea:** closing speed along the strike changes damage; lateral movement into a swing counts too.
- Closing speed `v = (v_attacker - v_defender) . n` where `n` is the unit vector attacker to defender. Both velocities are known (player `vel`, bot `vx/vz + kb`). Damage mul = clamp(1 + 0.12 * v, 0.8, 1.35): walking into a strike up to x1.35, backing away down to x0.8. Ring speed cap is 2.6, so the range is naturally small; sprinting outside the ring would be larger but there is no fight there.
- Attacker's own forward step counts a little (+10% for a lunging step, already available as `def.step`).
- Lateral: each strike gets an approach direction (a right roundhouse / right hook sweeps toward the defender's left across their body; straights go straight). Take the defender's velocity projected on that sweep axis. Moving into the swing: extra damage (up to x1.3) AND the defender's movement on that axis is killed (a short "stopped in your tracks" movement lock ~0.25 s, shake). Moving with / away from the swing: less damage (they ride it).
- Show: `RAN INTO IT` / `ROLLED WITH IT` toast; training stats include the multiplier.
- Online: the defender resolves hits, and knows its own velocity. The attacker's velocity can be derived from the 20 Hz position stream (or add it to `mv` / `hit`).
- Bot: also reads this: backs off or circles out of the sweep side when it sees a big kick start (cheap AI win); and gets the same bonuses / penalties.
**?** Should the bonus be capped together with crits (existing x2 cap), or allowed to push it to ~x2.4?

## 5. High guard replaces left / right block (L)
**Today:** `blockL` / `blockR` holds (side-specific), `longGuard` (jab / cross / teep), checks, and a constant +7 stamina when a block lands.
**Proposed model:**
- **Default stance (no button):** arms cover the body (elbows in), so body HOOKS and body ROUNDHOUSE kicks are partly absorbed (about x0.6 / x0.7 damage, no stamina refund). Head is open. The body stays open to **teeps and straight body punches (body jab / body cross)**: the elbows do not stop a push or a straight line through the middle. Defence for those is TBD, see "Body defence options" below.
- **High guard (hold, one button):** hands to the temples. Blocks hooks and roundhouse to the head (full block, small chip damage as now). Body is open (body shots x1.25, no absorb). Straight punches (jab / cross) are NOT blocked by it.
- **Parry (separate button, tap):** short window (~0.2 s) that deflects a straight punch; success = no damage, stamina refund, opens a counter window like the existing "perfect counter" (x1.5); a missed parry leaves you open (x1.25). Long guard is now a separate, distance-only head defence (next bullets); parry stays the close-range answer to straights.
- **Long guard (hold, rules revised):**
  - Defends **all head-level strikes and nothing else**: jab, cross, hooks, high elbow, head kick, the plum grab. The body is fully open (body punches, teeps, body and leg kicks all land normally; it also no longer blocks teeps, unlike today).
  - **Distance gated.** It only works when the attacker has to close distance to hit you: the gap when the attacker STARTS the strike must be at least `LG_RANGE` (start at 1.5 m, tune; it matches the far zones in plan 2). The lead arm is extended and the attacker runs onto it.
  - **Raised when the attacker is already close, it fails.** If the gap at the moment you raise it (or when the strike starts) is under `LG_RANGE`, the arm is cramped: no block, the strike goes through as a normal hit (optionally x1.1, "guard crushed"), and the pose shows the arm collapsing. A strike that starts far and closes with a lunge or step-in is still stopped.
  - Implementation: record the gap when the guard goes up (`lgGap`) and the gap at strike start (`vm.onStart` for the player, bot launch for the bot); effective only if both are >= `LG_RANGE`. Same rule for the bot's `long` plan, so the bot also must keep its distance to use it.
  - Stamina: same as high guard (no drain, poor regen), so sitting behind a long guard is a stall, not a free defence. **?** or make it cost a little because the arm is extended.
  - Bot AI: its `long` plan against jab / cross / teep changes: vs teep it must check mid or counter-teep instead; vs punches it only picks long guard when `dist >= LG_RANGE` at notice time, otherwise block-equivalent (high guard) or evade.
- **Stamina:** holding high guard costs nothing, but regen is cut (say x0.4 while guarding) and there is no regen delay reset. Replaces the old "+7 per block" with a smaller +3, or remove it so guarding is a stall, not a farm.
- **Punching while guarded:** high guard stays on with the free hand; the punching hand leaves the guard. Per-side coverage: `guardL` / `guardR` = guard held AND the hand not currently in `vm.action.limbs`. Throwing a jab opens your left side (hooks, roundhouse and head straights on that side) during the strike plus ~0.3 s recovery; cross opens the right. Kicks and knees open the guard-side hand? (a roundhouse's kick-side arm swings down already, so it opens that side naturally).
- Hits on an open side: "OPEN SIDE" crit tag, x1.25 and no block roll.
- Truth table to implement (rows = stance state, columns = incoming):

  | state | head hook | head kick | head straight | body hook | body straight | teep | body kick | leg kick |
  |---|---|---|---|---|---|---|---|---|
  | default stance | hit | hit | hit | absorbed x0.6 | **hit (open)** | **hit (open)** | absorbed x0.7 | check or hit |
  | high guard (close range) | blocked | blocked | hit (parry) | hit x1.25 | hit x1.25 | hit x1.25 | hit x1.25 | check or hit |
  | high guard, that hand punching | hit, open side | hit, open side | hit | hit | hit | hit | hit | check or hit |
  | long guard, gap >= LG_RANGE | blocked | blocked | blocked | hit x1.25 | hit x1.25 | hit x1.25 | hit x1.25 | check or hit |
  | long guard, raised too close | hit (x1.1) | hit (x1.1) | hit (x1.1) | hit x1.25 | hit x1.25 | hit x1.25 | hit x1.25 | check or hit |

- **Body defence options** (for the open spots: teeps and straight body punches). Ranked, my pick first:
  1. **Check mid vs teep** already exists (`checkMid` checks a teep); keep it, and add the existing teep-vs-teep stop rule as the answer (a faster counter teep interrupts it). Costs a leg move, so it is a real choice.
  2. **Body parry when the guard is down (confirmed by the user):** one parry button whose target follows the guard state, so there is no aiming to do. Guard down (default stance) = it pushes down a straight body punch or a teep with the lead hand. High guard up = it deflects a head straight. Same timing window, so it is one skill to learn. A teep parry is harder (smaller window, x0.8) because the leg is stronger.
  3. **Range and movement**: back-step or step off the line (plan 4: moving away already cuts damage), the passive answer.
  4. Lean back does NOT help (it beats head shots only, by design).
  **No bracing** (rejected by the user). First version = options 1 + 2.

- Files: `main.js` (binds: remove `blockL` / `blockR`, add `guard`, `parry`; `incoming()`; regen rule; training hints `BOT_HINT`), `viewmodel.js` (`holdPoses`: high guard + elbows-in default poses), `bot.js` (`BHOLD`, `receive` rules, AI plans `block` become `guard` / `parry`, bot punches open its own side), `net.js` / `vsTick` hold sync (new hold fields), `index.html` help text. Old saved binds: map `blockL` to `guard` on load, drop `blockR`.
- Bot symmetry: bot gets the same state machine so the player can punish its open side; the "turtle after 2 hits" becomes a sustained high guard that drains its regen.
**?** Parry: simple timed tap, or directional (also deflects to a side for a counter)? Body defence decided: check mid + the guard-state parry (no brace). **?** `LG_RANGE` start value and whether long guard costs a little stamina.
- Training mode / hints: `BOT_HINT` text changes (teep is no longer "long guard", jab / cross at close range are "parry", at distance "long guard").

## 5b. Dutch block: body kick defence beyond the check (M, added 2026-10-29, builds on plan 5)
**Why:** today the only active answer to a body roundhouse is the mid check (leg up, shin to shin). High guard and long guard leave the body open (x1.25), so a guarded player is worse off than standing still. The Dutch kickboxing answer is the **Dutch block**: tuck the elbow and forearm down onto the kick, keeping the hands up, and stay in range to counter. It is the arm version of the check.
- **Input (decided by the user 2026-10-29): hold to block, one side at a time, switch with the punch buttons.** Hold the Dutch block button (suggested `KeyC`, rebindable; same family as guard and long guard: no drain, regen x0.4). It covers **one side of the body only** (the elbow drops to that flank). While it is held, **LMB (jab) puts the block on the left side, RMB (cross) puts it on the right**, and the player can flip between them without releasing the hold. The punch buttons do NOT throw punches while the block is held, they only move the block. Example: the bot throws a right roundhouse at the player's left ribs, the player holds block + LMB; the bot then switches to a lead-leg (left) roundhouse at the right ribs, the player taps RMB while still holding the block and the elbow moves across. The other side stays **open** (x1.25 on a hit there, "OPEN SIDE"), so the read is the skill: guessing the wrong side is worse than not blocking.
  - **Default side (decided by the user 2026-10-29): the open side, which follows stance.** Orthodox: the block starts on the **right** side. Southpaw: it starts on the **left**. It then moves with LMB / RMB as above. There is no stance in the code yet (everything is orthodox), so build it as `coverDefault = stance === 'southpaw' ? 'L' : 'R'` with `stance` defaulting to `'orthodox'`; stance switching (plan 7, "Stance realism" / "bot styles + stance switching") will flip it with no change here. The bot uses the same rule from its own stance.
  - **Body only:** it never blocks head or leg strikes; head kicks and hooks still need high guard, leg kicks the low check. Mutually exclusive with high guard (press block and the head guard drops).
  - **Switching:** moving the block takes a short swap time (~0.15 s) in which neither side is covered, so a late flip against a kick already in flight fails; this is what keeps it a read and not a free block. The existing telegraph (~0.3 s) is long enough to switch once.
  - Pose: guard hands stay where default stance has them, the elbow on the selected side drops to the ribs.
- **Rules in `defend()` (one place, as with all guard rules):**
  - Body roundhouse (`midkick`), body hook, knee, body elbow on the covered side: **blocked** (chip 15% as now, +3 stamina, opens a counter like a successful check).
  - A blocked kick costs the blocker a little stamina (~4) and a little arm limb health once plan 6 exists, so spamming the block against hard kicks wears the arm down. This is the trade versus the check, which costs a leg move but hurts the kicker's shin.
  - **Does not stop** straights to the body or teeps (the elbow cannot stop a push through the middle): hit x0.85. Those stay with the guard-state parry and the mid check (plan 5 body defence).
  - **Timing:** the block must be up before the kick lands (the telegraph gives ~0.3 s). Raising it late, or while that arm is punching, is an open side (x1.25, "OPEN SIDE"). Tired (stamina under 15) or a sagging arm: it drops, falls back to the default stance.
  - **Dutch counter:** after a block, a short window (~0.6 s, like parry / check) where the return is strong: the standard Dutch follow-up is a kick or hook to the same side the kicker just exposed (kick leaves the kicker off balance). Reuse the "perfect counter" x1.5 path.
- **Bot:** gets the same state (`BHOLD.cover`, plan `{ type: 'cover' }`), picked against body hooks / midkicks / knees with `skill` weighting, in `bot.js` `_react`. A skilled bot may cover then counter with the matching Dutch combo (`cover` then `lhook` + `legkick`). Bot own kicks should not be easy to cover every time: the player has to mix punches and kicks.
- **Files:** `combat.js` (`defend` cover branch), `main.js` (bind, `guardState().cover`, hold sync for `vsTick`, `BOT_HINT` text), `viewmodel.js` (`holdPoses` cover pose), `bot.js` (`BHOLD.cover`, `_react` plans, `receive` state), `net.js` hold field, `index.html` help text.
- **Balance check (decide before building):** make sure check, cover and the default stance are three real choices: default = x0.7 free but no counter, check = full stop but needs a leg and the right side, cover = full block but costs stamina and opens the head. Decided: body only, the head stays at default (open) while the block is held. Rules above ("Rules in `defend()`") apply only to the **selected side**: a body kick, hook or knee from the other side hits as an open side. Needs `guardState()` to carry `coverSide: 'L' | 'R' | null` (kick side vs block side: a strike from the attacker's `side` X lands on the defender's opposite flank, same `mySide` mapping as OPEN SIDE), and the bot's `cover` plan to carry a side too. Online: add `coverSide` to the hold sync.

## 5c. Boxing pivot, replaces jump (BUILT 2026-10-29, see STATUS.md; the notes below are the original plan, what differs from it is listed in STATUS)
**Idea (from the user, with a diagram):** a pivot = slip the head to one side, then rotate the body about the lead-foot pivot point so the fighter ends up at an angle to the opponent, off their line, ready to hook at the same time or throw a right straight right after. It is a turn on the spot, not a step around.
- **Input:** hold the pivot button + a strafe key (A / D). The facing turns **90 degrees** toward the strafe direction. It is a **pivot, not a spin on the centre**: the lead foot stays put and the body swings around it, so the player's position shifts a little (about half a body width) instead of rotating in place, and the camera yaw eases through the 90 degrees (~0.2-0.25 s) rather than snapping.
  - The user's example: facing north, pivot + D = now facing **west** (the user's original example was right; "east" was my wrong correction). Think of it as a drift: you orbit the target, so north of it + D ends east of it, looking west at it.
  - **Reworked 2026-10-29 (final, user):** the pivot does NOT target the opponent. It orbits the **empty space 1.5 m straight ahead of the player** (fixed point, you keep facing it), so the opponent is left off to one side: the point of a pivot is to take an inside or outside angle to land a strike. The bot does not turn with the pivot; it only follows it sometimes, by difficulty (`skill`: lose the player most often on easy), and a strike on a bot that is still turning gets x1.2. Earlier versions turned the player away from the target (wrong) and orbited the bot itself (wrong).
- **Replaces jump (decided: jump removed completely):** the pivot takes the jump's key (Space). Removed with it: bhop, wall bounce, slide-jump, superglide, mantle from the ground, coyote time, the "JUMPED IT" dodge of low kicks and the plum jump-avoid. Ropes are now simply solid, the ring is entered through the gate only, low kicks are answered by the check. Kept (needs no jump): slide, jump pads (`MAP_FULL=1`), air mantle after a pad.
- **Rules / balance:**
  - Cost: about the lean cost (5-8 stamina, doubling on repeated use within a short window), small recovery lock (~0.25 s, can punch out of it like the lean / slip).
  - **Angle out:** a strike that was already thrown at where you stood whiffs if you finish the pivot first (a straight along the old line, a roundhouse landing late). The first ~0.1 s is the vulnerable part (feet planted, no cover).
  - **Slip combo:** pivot right after a slip (see the diagram) gives a free angle; a pivot inside the slip window can count as the slip too (head off the line while the feet turn). Follow-up: a hook thrown during the pivot gets a damage bonus (about x1.15, "ANGLE"), like plan 4's lateral momentum; a right straight right after is clean.
  - The bot reads it like a lean / slip: `playerEvade(kind)` gets a `'pivot'` kind, a skilled bot turns to face you again (its own step) instead of throwing into empty air.
  - Blind-side rule (plan 7 "Stance and angles"): hitting from outside the opponent's facing gets extra damage and is harder for the bot to read. Pivot is the player's way into it; the bot needs a turn rate so it can re-square (rotation speed cap while it is busy).
- **Files:** `player.js` (pivot move: yaw ease about a foot pivot, replaces jump input), `main.js` (bind, stamina, `avoided()` / plum jump clean-up, `playerEvade('pivot')`, help text), `viewmodel.js` (a small camera sway / foot plant pose), `bot.js` (`playerEvade`, re-square turn), `tools/sim.js` (jump tests removed or changed), `net.js` (position / yaw already synced, nothing new unless the pivot flag is sent for the opponent's body animation).
- **Depends on / ties to:** stance (plan 7) decides which foot is the pivot (lead foot: left when orthodox, right when southpaw); limb health (plan 6) can make a damaged lead leg pivot slower.

## 6. Limb health (L, the backbone of the "real Muay Thai" goal)
**Goal:** enough damage to a limb makes it less effective or useless, so leg kicks, blocks and checks have lasting consequences instead of only hp.
**Model:** each fighter (player and bot) has four limb values 0-100: lead arm, rear arm, lead leg, rear leg (names `LA RA LL RL`, the same limb keys the viewmodel and rig already use). Head and body stay on the hp / stamina side (body health is idea 7 below).
- **How limbs take damage**
  - Being hit on a limb: low kicks hit the leg on the strike's side (a right low kick lands on the target's lead leg when both are orthodox), body kicks / body shots hit the arm that absorbed them in the default stance (arms cover the body). Repeated hits to the same limb stack (calf kick strategy).
  - Blocking with an arm: a kick blocked with the forearm damages that arm; hooks barely do. This is why you check kicks with the leg, not catch them with the arm.
  - Checking: a clean check damages BOTH legs: the checker a little, the kicker more if it hits the knee / shin point. Ties to idea "checks hurt the kicker".
  - Landing zone matters (plan 2): a shin landing in the sweet zone does x1.5 limb damage, foot / thigh zones less. A jammed kick hurts the kicker's leg.
  - Throwing hard strikes at elbows / skulls could add small hand and shin damage (optional, later).
- **Effects by threshold** (per limb, to tune)
  - Leg: below 70 = slower (speed cap -5%), below 50 = kicks off that leg x0.8 damage and +25% stamina, check with that leg fails 40% of the time; below 30 = cannot check with it, kicks off it make you stumble, pivot step weaker; below 15 = "dead leg": it buckles. A low kick that lands on a dead leg is a knockdown (extends the knockdown rule), and the fighter can no longer stand on it without risk. A damaged PLANT leg (the one you stand on while kicking) is the worst: kicks with the other leg are weaker and the leg-up knockdown rule applies more easily.
  - Arm: below 70 = that hand's strikes x0.9; below 50 = blocks on that side leak (about 40% damage goes through) and the guard hand sags a bit; below 30 = punches on that side x0.6 and parry fails; below 15 = that arm can't hold a guard (hangs).
  - Regeneration: none during a round, a partial recovery between rounds (rounds plan), none in the free-spar mode except slow trickle so fights do not stay broken for ever.
- **Visible feedback** (real fighters show it): a limp / shorter steps and slower recovery from a damaged leg, guard hand sagging, wincing animation on kicks. Player HUD: a small four-limb figure (green / amber / red); the bot's limbs are shown only through animation, plus an optional training-mode readout.
- **Bot AI:** it targets the player's weakest limb (leg kicks if your leg is under 60, body / elbow shots if an arm sags), protects its own damaged limb (stops using that leg for kicks, avoids checking with it, switches to punches, backs off or clinches), and shows the same signs.
- **Data:** `limbs = { LA, RA, LL, RL }` on the player (in `main.js`) and on `Bot`; one function `limbMods(limbs)` returns the multipliers (speed, kick power, check chance, block leak, guard sag) used by the strike-resolution step from the refactor. Online: the defender owns its limbs, so the hit result (`res`) just carries the limb damage; sync the four values (rounded) in the 20 Hz state message so the opponent's body can limp.
- **Open questions:** how many clean low kicks should it take to wreck a leg (suggest about 8-10 in a round, 5-6 with sweet-zone shin hits)? Show the bot's limb health numerically or only by animation? Should limbs heal in free spar? Do we want hand damage (broken hands from punching elbows) at all?

## 7. More realism ideas (suggestions, pick a few)
Reframed for your goal (real Muay Thai behavior first, visuals second). Ranked by fidelity gained per effort; most reuse systems already built.
**New since the last round:**
- **Bot fighting styles** (M, high fidelity): real nak muay have identities. Layer a style on top of difficulty: **Muay Femur** (technical, counters, teeps and checks, scores points), **Muay Khao** (pressure, plum, knees, closes distance), **Muay Tae** (kicker, heavy low and body kicks, checks everything), **Muay Mat** (power puncher, hooks, wants the exchange), **Muay Sok** (elbows, cuts, close range). Each is just different `COMBOS` weights, range preference, defence habits and limb targets. Gives replay value and teaches the player real matchups (teep the khao, check the tae).
- **Thai-style scoring** (S-M): judges favour kicks, knees and elbows over punches, clean power over volume, ring control, balance, sweeps and throws; teeps score little (they are pushes); a dominant clinch with knees scores. Implement weights for the rounds plan so a point-fighter wins by being effective, not busy.
- **Round structure and pacing** (M): traditional 5 x 3 min with 2 min rests (amateur 3 x 3), slow feel-out early, harder rounds 4-5; the bot paces itself by round (round 1 mostly teeps and leg checks, late rounds pressure and elbows).
- **Cardio layer** (S-M): stamina is the short-term bar; add a slower "cardio" that body shots, long clinches and heavy output drain and that only recovers in the rest. Low cardio caps max stamina, so body work matters like in real fights.
- **Body-shot realism** (S): a clean body kick or liver-side hook / teep to the solar plexus dumps stamina and briefly stuns ("breath out"), and heavy ones can drop (liver shot knockdown, the other knockdown source besides the leg sweep).
- **Move variety** (M each, medium risk): switch kick, spinning elbow, overhand, uppercut, step-up / flying knee, axe kick, spinning back kick, push kick to the knee (a real way to stop a kicker). High reward for realism but each needs animation, hit rules and bot logic: add one at a time.
- **Stance realism** (M): orthodox / southpaw affects which leg is lead and which limb the kicks land on (matchup: open vs closed stance), stance switching between strikes, entering on angles; the bot also switches.
- **Corner and ropes** (S-M): you cannot back up on the ropes; fighters cut off the ring; a clinch against the ropes favours the one pinning; referee breaks after a few seconds without work.

**Carried over from before:**
1. **Kick catch and sweep** (M): a timed catch of a body roundhouse (or teep) traps the leg; follow with a sweep (knockdown) or a counter punch. Classic Muay Thai answer to kicks; counters kick spam. Reuses the new knockdown.
2. **Checks hurt the kicker** (S): a clean shin-on-shin check damages the kicker's leg (leg health), not just staggers it.
3. **Persistent damage beyond limbs** (M, your deferred item): limb damage is now plan 6; the rest is body shots cutting max stamina (see cardio layer above) and head damage causing a wobble state (screen sway, legs buckle) before a knockdown. Lasts through the round.
4. **Guard droops when tired** (S): below ~20% stamina the high guard lowers / hands drop on their own and reactions slow. Fits the "high guard does not drain but you do not recover" idea.
5. **Rounds and referee** (M): 3 rounds x 3 min with rests and partial recovery; three knockdowns in a round = TKO; standing 8 count after a bad knockdown; scoring (10-point must) if no KO. Pairs with persistent damage.
6. **Hit stop and sound** (S-M): 2-4 frame hit pause on heavy hits, camera recoil, impact / breath / bell / crowd audio. Big feel gain, also gives audio telegraphs.
7. **Stance and angles** (M): orthodox / southpaw switch, pivot steps, attacking from the blind side (outside the opponent's facing) does extra and cannot be read by the bot; cutting off the ring against the ropes.
8. **Clinch depth** (M): pummel for position (dominant plum vs neck tie), knees to head vs body, sweep / dump from the clinch (scores in Thai rules), referee break if no work for a few seconds.
9. **Feints** (S): a cheap fake strike (small stamina, no hit) that the bot reacts to; the bot feints too.
10. **Cuts and doctor stoppage** (S, after persistent damage): elbows cause bleeding that blocks vision a little and can end the fight.
11. **Weight transfer** (S): you cannot throw a kick while sprinting or mid-air; striking while retreating is weaker (covered by plan 4).

## Questions to decide before building
1. Parry: timed tap or directional? (It no longer replaces long guard: long guard = distance-only head defence.)
2. (Decided) Body defence for teeps and straight body punches = check mid + guard-state parry. Default stance absorbs body hooks and body kicks only.
3. Cap for stacked multipliers (zone x momentum x crit x combo): keep x2, or raise?
4. First controller to target?
5. Which of plan 7 do you want in the first pass (my pick: bot styles, Thai scoring, kick catch and sweep, checks hurting the kicker, hit stop and sound)?
6. Limb health numbers: how many clean low kicks to wreck a leg, and do limbs heal in free spar?

---

## Overall thoughts (2026-10-28)
**What is strong.** The design is converging on one idea: every defence and attack has a range, a height and a body part, and every choice has a cost. Distance-gated long guard, high guard vs default stance, parry by guard state, check vs catch, momentum and limb health all follow from how real Thai exchanges work, and they fit together: leg kicks matter because limbs persist, checks matter because kicks hurt the kicker, guard matters because punching opens a side. That is a coherent ruleset, not a feature pile.
**Risks, in order.**
1. **Readability in first person.** A player cannot parse a dozen multipliers in a split second. Every rule needs an immediate cue (toast tag, sound, bot animation tell, limb HUD) and training mode should be able to show the multiplier breakdown for a strike. If a rule has no cue, it will feel random.
2. **Tuning explosion.** Zone x momentum x crit x combo x guard state x limb state will not balance by feel. Keep one central tuning table (not numbers scattered in code) and write a headless bot-vs-bot / scripted sim (`tools/balance.js`, like the existing `tools/sim.js`) to catch degenerate strategies (leg-kick spam, infinite long guard, clinch lock) before play-testing.
3. **The bot must grow with the rules.** Every new rule is exploitable until the bot understands it (targets limbs, respects long-guard range, uses styles). Budget bot work inside each step, not after.
4. **Online sync grows.** Each system adds fields to the hit / res / state messages. Keep the defender-resolves model; plan the message format once (in the refactor) rather than patching per feature.
5. **Scope.** Limb health, the guard rework and rounds are each L. Build one at a time with a play-test and a STATUS.md update between them, and stop at the point the game feels like a Thai fight; plan 7 is a menu, not a to-do list.
**Where I would not spend effort yet:** visuals (as you said), the full move list, numerical HUD clutter, and the controller until the action list stops changing.
**Cheap, high-value things that already fit the current code:** checks hurting the kicker, guard droop when tired, and hit stop are each small and make today's game feel more like a fight even before the big plans land.
