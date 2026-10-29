// Shared strike resolution for both fighters (bot.receive, main.js incoming/online). One place for the damage multipliers
// and the standard counters, so new rules (zones, momentum, limbs) are added here once.
// atk: { type, dmg, counter, cap }   v: the defender's state { swing: { type, u, reach, gap } | null }
//   swing.type = the move family ('jab' 'cross' 'teep' 'knee' '*kick' ...), u = animation progress, gap = distance minus attacker lunge
// Returns { dmg, tag, how }: how = 'stop' (the swing is knocked out) | 'down' (knockdown) | null
// ---- guard rules (see PLANS.md plan 5). Same table for the player, the bot and online hits. ----
// atk: { type, level, side (the attacker's limb), startDist? }
// s: { guard: high guard up (and not sagging), long: long guard up, lgGap: gap when it was raised, busy: { L, R } that side's guard hand is
//      punching, parry: 'active' | 'open' | null, parryAge: seconds since the tap }
// Returns { res: 'hit' | 'blocked' | 'parried', mul, tag }. Checks (legs) are decided by the caller before this.
const LG_RANGE = 1.5, PARRY_WIN = 0.2, PARRY_WIN_TEEP = 0.12, PARRY_OPEN = 0.65;   // long guard needs this gap; parry windows (s)
function defend(atk, s) {
  const t = atk.type, head = atk.level === 'high' || t === 'plum', straight = t === 'jab' || t === 'cross', hookish = t === 'hook' || t === 'elbow';
  const mySide = atk.side === 'L' ? 'R' : 'L', lowKick = t === 'legkick';
  let mul = 1, tag = null;
  if (s.parry === 'active' && (s.guard ? straight && head : (straight && !head) || t === 'teep') && (t !== 'teep' || s.parryAge <= PARRY_WIN_TEEP)) return { res: 'parried', mul: 0, tag: null };
  if ((s.parry === 'open' || s.parry === 'active') && !lowKick) { mul = 1.25; tag = 'PARRY MISSED'; }        // a parry that read it wrong leaves you open
  if (s.long) {
    if (head) {
      const gap = Math.min(s.lgGap, atk.startDist == null ? 99 : atk.startDist);
      if (gap >= LG_RANGE) return { res: 'blocked', mul: 1, tag: null };
      return { res: 'hit', mul: mul * 1.1, tag: tag || 'GUARD CRUSHED' };                         // raised too close: the arm is cramped
    }
    return { res: 'hit', mul: lowKick ? mul : mul * 1.25, tag };                                  // body is fully open
  }
  if (s.guard) {
    if (head && (hookish || t === 'highkick')) {
      if (s.busy[mySide]) return { res: 'hit', mul: mul * 1.25, tag: tag || 'OPEN SIDE' };
      return { res: 'blocked', mul: 1, tag: null };
    }
    if (!head && !lowKick) mul *= 1.25;                                                           // body is open behind a high guard
    return { res: 'hit', mul, tag };
  }
  if (!head && hookish) mul *= 0.6;                                                               // default stance: arms cover the body
  else if (t === 'midkick' || t === 'knee') mul *= 0.7;                                           // (straights and teeps still get through)
  return { res: 'hit', mul, tag };
}

function strikeMods(atk, v) {
  let mul = 1, tag = null, how = null;
  const S = v.swing, type = atk.type;
  if (S) {                                                         // caught mid-swing: critical damage, the swing carries on unless it is a standard counter
    mul *= 1.6; tag = 'CAUGHT';
    const kick = S.type === 'teep' || S.type.endsWith('kick');
    if (type === 'legkick' && kick && S.u >= 0.2 && S.u < 0.9) { how = 'down'; tag = 'KNOCKDOWN'; }      // low kick on the standing leg of a teep / roundhouse
    else if (type === 'teep' && (S.type === 'cross' || S.type.endsWith('kick'))) { how = 'stop'; tag = 'INTERRUPTED'; }   // the teep stops roundhouse and cross
    else if (S.type === 'knee' && (type === 'jab' || type === 'cross') && S.gap > S.reach + 0.1) { how = 'stop'; tag = 'INTERRUPTED'; }   // knee from too far
  } else if (atk.counter) { mul *= 1.5; tag = 'PERFECT COUNTER'; }
  let dmg = atk.dmg * mul;
  if (atk.cap) dmg = Math.min(dmg, atk.cap);                       // combo bonus x crit can't stack past x2
  return { dmg, tag, how };
}
