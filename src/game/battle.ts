// Mô phỏng trận đánh, thuần logic, không vẽ gì. Có hai loại trận:
// - giữ kinh đô (`raid`): giặc Ân từ bìa rừng tìm đường tới kho và Điện, gặp lũy thì phá,
//   quân ta từ doanh trại ra đánh, chòi canh bắn, bẫy chông đâm;
// - ngoài bãi (`field`, phó bản): hai bên dàn ba hàng đối mặt nhau rồi xông vào đánh.

import {
  BUILDINGS,
  ENEMIES,
  ENEMY_ROWS,
  FIELD,
  LOOT_FRACTION,
  RAID_MAX_MS,
  RALLY,
  RESOURCE_IDS,
  ROWS,
  SKILLS,
  TOWER,
  TRAP_DMG,
  UNITS,
  UNIT_TYPES,
  raidForces,
  raidHpScale,
  type EnemyType,
  type FighterStats,
  type Resources,
  type Row,
  type SkillId,
  type UnitType,
} from './defs';
import type { Building, GameState } from './game';
import { GRID, RIVER_START, areaStart, inGrid, isRiver } from './map';

export type Side = 'ta' | 'giac';
export type RaidSide = 'bac' | 'tay';
export type FighterKind = UnitType | EnemyType;

export interface Fighter {
  id: number;
  side: Side;
  kind: FighterKind;
  /** Tọa độ ô liên tục: tâm ô (i, j) là (i + 0.5, j + 0.5). */
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  /** Giây còn phải chờ tới đòn tiếp theo. */
  cd: number;
  targetUnit: number | null;
  targetBuilding: number | null;
  /** Đường đi: danh sách chỉ số ô (z * GRID + x). */
  path: number[] | null;
  pathAt: number;
  repathIn: number;
  /** Giặc đã cướp được của và đang bỏ chạy. */
  loot: boolean;
  state: 'move' | 'fight' | 'flee' | 'dead' | 'gone';
  /** Hướng nhìn (radian), để phần vẽ xoay lính. */
  face: number;
  /** Còn bao lâu nữa hết động tác ra đòn, để phần vẽ làm động tác. */
  swing: number;
}

export interface BattleEvent {
  seq: number;
  kind: 'shot' | 'trap' | 'wreck' | 'loot' | 'die' | 'rally';
  x: number;
  z: number;
  tx?: number;
  tz?: number;
}

export interface Battle {
  /** Mã riêng của trận, để phần vẽ biết đã sang trận mới. */
  id: number;
  mode: 'raid' | 'field';
  /** Trận giữ kinh đô: đợt giặc thứ mấy. Trận ngoài bãi: màn thứ mấy. */
  wave: number;
  side: RaidSide;
  /** Thời gian trận đã diễn ra, giây. */
  t: number;
  fighters: Fighter[];
  /** Máu công trình theo id, chỉ có những công trình đã bị đánh. */
  hp: Record<number, number>;
  towerCd: Record<number, number>;
  trapsUsed: number[];
  events: BattleEvent[];
  seq: number;
  nextId: number;
  stolen: Resources;
  killed: number;
  total: number;
  lost: Record<UnitType, number>;
  wrecked: number[];
  /** Giây còn lại của Trống trận. */
  rally: number;
  /** Giây còn phải chờ để dùng lại từng kỹ năng. */
  skillCd: Partial<Record<SkillId, number>>;
  /** Kết cục trận ngoài bãi; trận giữ kinh đô luôn để null. */
  outcome: 'win' | 'lose' | 'retreat' | null;
}

const statsOf = (k: FighterKind): FighterStats => (k in UNITS ? UNITS[k as UnitType] : ENEMIES[k as EnemyType]);
const tileIndex = (x: number, z: number) => z * GRID + x;

/** Số ngẫu nhiên lặp lại được theo hạt giống. */
function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Khoảng cách từ điểm tới hình chữ nhật móng công trình (đơn vị ô). */
export function rectDist(x: number, z: number, b: Building): number {
  const def = BUILDINGS[b.type];
  const dx = Math.max(b.x - x, 0, x - (b.x + def.w));
  const dz = Math.max(b.z - z, 0, z - (b.z + def.d));
  return Math.hypot(dx, dz);
}

function maxHpOf(b: Building): number {
  return BUILDINGS[b.type].hp[b.level - 1] ?? 100;
}

export function buildingHp(battle: Battle, b: Building): number {
  return battle.hp[b.id] ?? maxHpOf(b);
}

/** Công trình giặc có thể nhắm tới (không tính lũy và bẫy, không tính cái đã hư). */
function isTargetable(b: Building): boolean {
  return !b.damaged && b.type !== 'luy' && b.type !== 'bayChong';
}

// ---------- Khởi đầu trận ----------

function newBattle(id: number, mode: Battle['mode'], wave: number, side: RaidSide): Battle {
  return {
    id,
    mode,
    wave,
    side,
    t: 0,
    fighters: [],
    hp: {},
    towerCd: {},
    trapsUsed: [],
    events: [],
    seq: 0,
    nextId: 1,
    stolen: { gao: 0, voOc: 0, datDa: 0, sat: 0 },
    killed: 0,
    total: 0,
    lost: { giao: 0, cung: 0, voi: 0 },
    wrecked: [],
    rally: 0,
    skillCd: {},
    outcome: null,
  };
}

export function startBattle(state: GameState, wave: number, side: RaidSide): Battle {
  const battle = newBattle(state.nextBattleId++, 'raid', wave, side);
  const rand = rng(wave * 7919 + (side === 'bac' ? 1 : 2));
  const lo = Math.max(areaStart(5), 1);
  const forces = raidForces(wave);
  const scale = raidHpScale(wave);
  for (const kind of Object.keys(forces) as EnemyType[]) {
    for (let i = 0; i < (forces[kind] ?? 0); i++) {
      // Giặc ra từ bìa rừng: cạnh bắc (z nhỏ) hoặc cạnh tây (x nhỏ).
      const along = lo + rand() * (RIVER_START - lo - 1);
      const depth = 0.6 + rand() * 1.4;
      const hp = ENEMIES[kind].hp * scale;
      battle.fighters.push(newFighter(battle, 'giac', kind, side === 'bac' ? along : depth, side === 'bac' ? depth : along, hp));
      battle.total++;
    }
  }
  const barracks = state.buildings.find((b) => b.type === 'doanhTrai');
  if (barracks) {
    const def = BUILDINGS.doanhTrai;
    for (const kind of Object.keys(state.troops) as UnitType[]) {
      for (let i = 0; i < state.troops[kind]; i++) {
        const x = barracks.x + def.w / 2 + (rand() - 0.5) * def.w;
        const z = barracks.z + def.d / 2 + (rand() - 0.5) * def.d;
        battle.fighters.push(newFighter(battle, 'ta', kind, x, z, UNITS[kind].hp));
      }
    }
  }
  return battle;
}

function newFighter(battle: Battle, side: Side, kind: FighterKind, x: number, z: number, hp: number): Fighter {
  return {
    id: battle.nextId++,
    side,
    kind,
    x,
    z,
    hp,
    maxHp: hp,
    cd: 0,
    targetUnit: null,
    targetBuilding: null,
    path: null,
    pathAt: 0,
    repathIn: 0,
    loot: false,
    state: 'move',
    face: 0,
    swing: 0,
  };
}

export interface FieldSetup {
  id: number;
  stage: number;
  enemies: Partial<Record<EnemyType, number>>;
  hpScale: number;
  army: Record<UnitType, number>;
  rows: Record<UnitType, Row>;
}

/** Số lính đứng trên một hàng ngang. Đông hơn thì xếp thêm hàng phía sau. */
const PER_LINE = 8;

/**
 * Trận ngoài bãi: quân ta dàn ở phía z lớn, giặc ở phía z nhỏ, mỗi bên ba hàng
 * (tiền quân đứng gần đối phương nhất). Lính đứng giãn đều theo bề ngang bãi.
 */
export function startFieldBattle(setup: FieldSetup): Battle {
  const battle = newBattle(setup.id, 'field', setup.stage, 'bac');
  const rand = rng(setup.id * 7919 + setup.stage);
  const ours: Record<Row, FighterKind[]> = { tien: [], trung: [], hau: [] };
  for (const k of UNIT_TYPES) for (let i = 0; i < (setup.army[k] ?? 0); i++) ours[setup.rows[k]].push(k);
  const theirs: Record<Row, FighterKind[]> = { tien: [], trung: [], hau: [] };
  for (const k of Object.keys(setup.enemies) as EnemyType[]) for (let i = 0; i < (setup.enemies[k] ?? 0); i++) theirs[ENEMY_ROWS[k]].push(k);
  const front = (FIELD.d - FIELD.gap) / 2;
  deploy(battle, 'ta', ours, FIELD.d - front, 1, rand, (k) => UNITS[k as UnitType].hp * FIELD.hpMul);
  deploy(battle, 'giac', theirs, front, -1, rand, (k) => ENEMIES[k as EnemyType].hp * setup.hpScale * FIELD.hpMul);
  battle.total = battle.fighters.filter((f) => f.side === 'giac').length;
  return battle;
}

/** Dàn quân từ hàng đầu `front` lùi dần về phía `dir` (+1: về z lớn, −1: về z nhỏ). */
function deploy(battle: Battle, side: Side, rows: Record<Row, FighterKind[]>, front: number, dir: number, rand: () => number, hpOf: (k: FighterKind) => number): void {
  let z = front;
  for (const row of ROWS) {
    const list = rows[row];
    if (!list.length) continue;
    for (let start = 0; start < list.length; start += PER_LINE) {
      const line = list.slice(start, start + PER_LINE);
      line.forEach((kind, i) => {
        const x = (FIELD.w * (i + 1)) / (line.length + 1) + (rand() - 0.5) * 0.3;
        const f = newFighter(battle, side, kind, x, clampField(z + (rand() - 0.5) * 0.2, FIELD.d), hpOf(kind));
        f.face = dir > 0 ? Math.PI : 0;
        battle.fighters.push(f);
      });
      z += dir * 0.9;
    }
    z += dir * 0.6;
  }
}

const clampField = (v: number, max: number) => Math.min(max - 0.3, Math.max(0.3, v));

function emit(battle: Battle, e: Omit<BattleEvent, 'seq'>): void {
  battle.events.push({ ...e, seq: ++battle.seq });
  if (battle.events.length > 80) battle.events.splice(0, battle.events.length - 80);
}

// ---------- Tìm đường ----------

/** Chi phí đi qua mỗi ô: sông không đi được, công trình còn nguyên phải phá mới qua (chi phí cao). */
function costGrid(state: GameState, targetId: number | null): Float32Array {
  const cost = new Float32Array(GRID * GRID).fill(1);
  for (let z = 0; z < GRID; z++) for (let x = 0; x < GRID; x++) if (isRiver(x, z)) cost[tileIndex(x, z)] = Infinity;
  for (const b of state.buildings) {
    if (b.damaged || b.type === 'bayChong') continue;
    const def = BUILDINGS[b.type];
    const c = b.id === targetId ? 1 : b.type === 'luy' ? (b.level >= 2 ? 30 : 12) : 25;
    for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) cost[tileIndex(b.x + dx, b.z + dz)] = c;
  }
  return cost;
}

/** A* trên lưới 8 hướng, tới bất kỳ ô nào thuộc móng công trình đích. */
export function findPath(state: GameState, fromX: number, fromZ: number, target: Building): number[] | null {
  const cost = costGrid(state, target.id);
  const def = BUILDINGS[target.type];
  const sx = Math.min(GRID - 1, Math.max(0, Math.floor(fromX)));
  const sz = Math.min(GRID - 1, Math.max(0, Math.floor(fromZ)));
  const start = tileIndex(sx, sz);
  const isGoal = (i: number) => {
    const x = i % GRID;
    const z = Math.floor(i / GRID);
    return x >= target.x && x < target.x + def.w && z >= target.z && z < target.z + def.d;
  };
  const tx = target.x + def.w / 2;
  const tz = target.z + def.d / 2;
  const h = (i: number) => Math.hypot((i % GRID) + 0.5 - tx, Math.floor(i / GRID) + 0.5 - tz);
  const g = new Float32Array(GRID * GRID).fill(Infinity);
  const came = new Int32Array(GRID * GRID).fill(-1);
  const closed = new Uint8Array(GRID * GRID);
  const open: number[] = [start];
  g[start] = 0;
  while (open.length) {
    let bi = 0;
    let best = Infinity;
    for (let k = 0; k < open.length; k++) {
      const f = g[open[k]] + h(open[k]);
      if (f < best) {
        best = f;
        bi = k;
      }
    }
    const cur = open.splice(bi, 1)[0];
    if (isGoal(cur)) {
      const path = [cur];
      let c = cur;
      while (came[c] !== -1) {
        c = came[c];
        path.unshift(c);
      }
      return path;
    }
    closed[cur] = 1;
    const cx = cur % GRID;
    const cz = Math.floor(cur / GRID);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = cx + dx;
        const nz = cz + dz;
        if (!inGrid(nx, nz)) continue;
        const ni = tileIndex(nx, nz);
        if (closed[ni] || cost[ni] === Infinity) continue;
        // Không đi chéo cắt góc qua ô không đi được.
        if (dx && dz && (cost[tileIndex(cx + dx, cz)] === Infinity || cost[tileIndex(cx, cz + dz)] === Infinity)) continue;
        const ng = g[cur] + cost[ni] * (dx && dz ? Math.SQRT2 : 1);
        if (ng < g[ni]) {
          if (g[ni] === Infinity) open.push(ni);
          g[ni] = ng;
          came[ni] = cur;
        }
      }
    }
  }
  return null;
}

// ---------- Từng bước của trận ----------

function nearestEnemyOf(battle: Battle, f: Fighter, within = Infinity): Fighter | null {
  let best: Fighter | null = null;
  let bestD = within;
  for (const o of battle.fighters) {
    if (o.side === f.side || (o.state !== 'move' && o.state !== 'fight' && o.state !== 'flee')) continue;
    const d = Math.hypot(o.x - f.x, o.z - f.z);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return best;
}

function chooseTarget(state: GameState, f: Fighter): Building | null {
  const live = state.buildings.filter(isTargetable);
  const pick = (list: Building[]) =>
    list.reduce<Building | null>((best, b) => (!best || rectDist(f.x, f.z, b) < rectDist(f.x, f.z, best) ? b : best), null);
  return pick(live.filter((b) => b.type === 'kho')) ?? pick(live.filter((b) => b.type === 'dien')) ?? pick(live);
}

function moveToward(f: Fighter, tx: number, tz: number, dt: number, mult = 1): boolean {
  const dx = tx - f.x;
  const dz = tz - f.z;
  const d = Math.hypot(dx, dz);
  const step = statsOf(f.kind).speed * mult * dt;
  if (d > 1e-6) f.face = Math.atan2(dx, dz);
  if (d <= step) {
    f.x = tx;
    f.z = tz;
    return true;
  }
  f.x += (dx / d) * step;
  f.z += (dz / d) * step;
  return false;
}

function damageFighter(battle: Battle, attacker: { kind?: FighterKind; dmg: number }, target: Fighter): void {
  const bonus = attacker.kind && statsOf(attacker.kind).strongVs === target.kind ? 2 : 1;
  target.hp -= attacker.dmg * bonus;
  if (target.hp <= 0 && target.state !== 'dead') {
    target.state = 'dead';
    target.hp = 0;
    emit(battle, { kind: 'die', x: target.x, z: target.z });
    if (target.side === 'giac') battle.killed++;
    else if (target.kind in battle.lost) battle.lost[target.kind as UnitType]++;
  }
}

/** Một đòn của `f` vào `foe`: bắn tên nếu đánh xa, quân ta mạnh hơn khi đang có Trống trận. */
function strike(battle: Battle, f: Fighter, foe: Fighter): void {
  const st = statsOf(f.kind);
  if (st.range > 2) emit(battle, { kind: 'shot', x: f.x, z: f.z, tx: foe.x, tz: foe.z });
  const rally = f.side === 'ta' && battle.rally > 0 ? RALLY.dmg : 1;
  damageFighter(battle, { kind: f.kind, dmg: st.dmg * rally }, foe);
  f.cd = st.cooldown;
  f.swing = 0.3;
}

function damageBuilding(state: GameState, battle: Battle, attacker: Fighter, b: Building, dmg: number): void {
  const hp = buildingHp(battle, b) - dmg;
  battle.hp[b.id] = hp;
  if (hp > 0 || b.damaged) return;
  b.damaged = true;
  battle.wrecked.push(b.id);
  const def = BUILDINGS[b.type];
  emit(battle, { kind: 'wreck', x: b.x + def.w / 2, z: b.z + def.d / 2 });
  const share = LOOT_FRACTION[b.type];
  if (share && attacker.side === 'giac') {
    for (const r of RESOURCE_IDS) {
      const take = Math.floor(state.resources[r] * share);
      state.resources[r] -= take;
      battle.stolen[r] += take;
    }
    attacker.loot = true;
    attacker.state = 'flee';
    emit(battle, { kind: 'loot', x: attacker.x, z: attacker.z });
  }
}

/** Chỗ giặc bỏ chạy về: bìa rừng phía đã kéo tới. */
function exitPoint(battle: Battle, f: Fighter): { x: number; z: number } {
  return battle.side === 'bac' ? { x: f.x, z: -0.5 } : { x: -0.5, z: f.z };
}

function stepEnemy(state: GameState, battle: Battle, f: Fighter, dt: number): void {
  const st = statsOf(f.kind);
  if (f.state === 'flee') {
    const out = exitPoint(battle, f);
    moveToward(f, out.x, out.z, dt);
    if (f.x < 0 || f.z < 0) f.state = 'gone';
    return;
  }
  // Gặp quân ta ở gần thì đánh.
  const foe = nearestEnemyOf(battle, f, st.range + 0.5);
  if (foe) {
    f.state = 'fight';
    f.face = Math.atan2(foe.x - f.x, foe.z - f.z);
    if (f.cd <= 0) strike(battle, f, foe);
    return;
  }
  // Nhắm kho, rồi tới Điện, rồi công trình gần nhất.
  let target = f.targetBuilding !== null ? state.buildings.find((b) => b.id === f.targetBuilding) : undefined;
  if (!target || !isTargetable(target)) {
    target = chooseTarget(state, f) ?? undefined;
    f.targetBuilding = target ? target.id : null;
    f.path = null;
  }
  if (!target) {
    f.state = 'flee';
    return;
  }
  if (rectDist(f.x, f.z, target) <= st.range + 0.1) {
    f.state = 'fight';
    if (f.cd <= 0) {
      const def = BUILDINGS[target.type];
      if (st.range > 2) emit(battle, { kind: 'shot', x: f.x, z: f.z, tx: target.x + def.w / 2, tz: target.z + def.d / 2 });
      f.face = Math.atan2(target.x + def.w / 2 - f.x, target.z + def.d / 2 - f.z);
      damageBuilding(state, battle, f, target, st.dmg);
      f.cd = st.cooldown;
      f.swing = 0.3;
    }
    return;
  }
  f.repathIn -= dt;
  if (!f.path || f.repathIn <= 0) {
    f.path = findPath(state, f.x, f.z, target);
    f.pathAt = 1;
    f.repathIn = 2;
  }
  if (!f.path || f.pathAt >= f.path.length) {
    f.state = 'move';
    moveToward(f, target.x + BUILDINGS[target.type].w / 2, target.z + BUILDINGS[target.type].d / 2, dt);
    return;
  }
  const next = f.path[f.pathAt];
  const nx = next % GRID;
  const nz = Math.floor(next / GRID);
  // Ô tiếp theo có lũy hay công trình chắn đường: phá nó trước.
  const blocker = state.buildings.find((b) => {
    if (b.damaged || b.id === target!.id || b.type === 'bayChong') return false;
    const def = BUILDINGS[b.type];
    return nx >= b.x && nx < b.x + def.w && nz >= b.z && nz < b.z + def.d;
  });
  if (blocker) {
    if (rectDist(f.x, f.z, blocker) <= st.range + 0.15) {
      f.state = 'fight';
      f.face = Math.atan2(nx + 0.5 - f.x, nz + 0.5 - f.z);
      if (f.cd <= 0) {
        damageBuilding(state, battle, f, blocker, st.dmg);
        f.cd = st.cooldown;
        f.swing = 0.3;
      }
      return;
    }
  }
  f.state = 'move';
  if (moveToward(f, nx + 0.5, nz + 0.5, dt) && !blocker) f.pathAt++;
}

/** Xông tới kẻ địch gần nhất rồi đánh. Quân ta làm vậy trong mọi trận, giặc làm vậy khi đánh ngoài bãi. */
function stepChase(battle: Battle, f: Fighter, dt: number): void {
  const st = statsOf(f.kind);
  const foe = nearestEnemyOf(battle, f);
  if (!foe) {
    f.state = 'move';
    return;
  }
  const d = Math.hypot(foe.x - f.x, foe.z - f.z);
  if (d <= st.range + 0.3) {
    f.state = 'fight';
    f.face = Math.atan2(foe.x - f.x, foe.z - f.z);
    if (f.cd <= 0) strike(battle, f, foe);
    return;
  }
  f.state = 'move';
  moveToward(f, foe.x, foe.z, dt, f.side === 'ta' && battle.rally > 0 ? RALLY.speed : 1);
}

function stepDefenses(state: GameState, battle: Battle, dt: number): void {
  for (const b of state.buildings) {
    if (b.damaged) continue;
    if (b.type === 'choiCanh') {
      const cd = (battle.towerCd[b.id] ?? 0) - dt;
      battle.towerCd[b.id] = cd;
      if (cd > 0) continue;
      const tower = { x: b.x + 0.5, z: b.z + 0.5 };
      let best: Fighter | null = null;
      let bestD = TOWER.range;
      for (const o of battle.fighters) {
        if (o.side !== 'giac' || (o.state !== 'move' && o.state !== 'fight' && o.state !== 'flee')) continue;
        const d = Math.hypot(o.x - tower.x, o.z - tower.z);
        if (d < bestD) {
          bestD = d;
          best = o;
        }
      }
      if (best) {
        emit(battle, { kind: 'shot', x: tower.x, z: tower.z, tx: best.x, tz: best.z });
        damageFighter(battle, { dmg: TOWER.dmg[b.level - 1] }, best);
        battle.towerCd[b.id] = TOWER.cooldown;
      }
    }
    if (b.type === 'bayChong' && !battle.trapsUsed.includes(b.id)) {
      const victims = battle.fighters.filter(
        (o) => o.side === 'giac' && (o.state === 'move' || o.state === 'fight') && Math.hypot(o.x - b.x - 0.5, o.z - b.z - 0.5) < 0.7,
      );
      if (victims.length) {
        battle.trapsUsed.push(b.id);
        emit(battle, { kind: 'trap', x: b.x + 0.5, z: b.z + 0.5 });
        for (const v of victims) damageFighter(battle, { dmg: TRAP_DMG }, v);
      }
    }
  }
}

/** Giặc còn trên bản đồ (chưa chết, chưa chạy thoát). */
export function enemiesLeft(battle: Battle): number {
  return battle.fighters.filter((f) => f.side === 'giac' && f.state !== 'dead' && f.state !== 'gone').length;
}

export function alliesLeft(battle: Battle): number {
  return battle.fighters.filter((f) => f.side === 'ta' && f.state !== 'dead').length;
}

/** Đồng hồ chung của mọi trận: thời gian, Trống trận, hồi kỹ năng. */
function advanceClock(battle: Battle, dt: number): void {
  battle.t += dt;
  battle.rally = Math.max(0, battle.rally - dt);
  for (const k of Object.keys(battle.skillCd) as SkillId[]) battle.skillCd[k] = Math.max(0, (battle.skillCd[k] ?? 0) - dt);
}

/** Chạy trận giữ kinh đô thêm `dt` giây. Trả về true khi trận đã xong. */
export function stepBattle(state: GameState, battle: Battle, dt: number): boolean {
  advanceClock(battle, dt);
  if (battle.t * 1000 > RAID_MAX_MS) {
    // Quá lâu thì giặc rút; quá lâu nữa thì coi như đã rút hết.
    for (const f of battle.fighters) if (f.side === 'giac' && (f.state === 'move' || f.state === 'fight')) f.state = 'flee';
    if (battle.t * 1000 > RAID_MAX_MS + 30_000) for (const f of battle.fighters) if (f.state === 'flee') f.state = 'gone';
  }
  for (const f of battle.fighters) {
    if (f.state === 'dead' || f.state === 'gone') continue;
    f.cd -= dt;
    f.swing = Math.max(0, f.swing - dt);
    if (f.side === 'giac') stepEnemy(state, battle, f, dt);
    else stepChase(battle, f, dt);
  }
  stepDefenses(state, battle, dt);
  return enemiesLeft(battle) === 0;
}

const isAlive = (f: Fighter) => f.state !== 'dead' && f.state !== 'gone';
const bodyRadius = (k: FighterKind) => (k === 'voi' || k === 'chienXa' || k === 'phoTuong' ? 0.45 : 0.27);

/** Đẩy lính đứng chồng lên nhau ra, và giữ mọi người trong bãi. */
function separate(battle: Battle): void {
  const live = battle.fighters.filter(isAlive);
  for (let i = 0; i < live.length; i++) {
    const a = live[i];
    for (let j = i + 1; j < live.length; j++) {
      const b = live[j];
      const min = bodyRadius(a.kind) + bodyRadius(b.kind);
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const d = Math.hypot(dx, dz);
      if (d >= min) continue;
      const nx = d > 1e-6 ? dx / d : 1;
      const nz = d > 1e-6 ? dz / d : 0;
      const push = (min - d) / 2;
      a.x -= nx * push;
      a.z -= nz * push;
      b.x += nx * push;
      b.z += nz * push;
    }
  }
  for (const f of live) {
    f.x = clampField(f.x, FIELD.w);
    f.z = clampField(f.z, FIELD.d);
  }
}

/** Chạy trận ngoài bãi thêm `dt` giây. Trả về true khi đã phân thắng bại (xem `outcome`). */
export function stepField(battle: Battle, dt: number): boolean {
  if (battle.outcome) return true;
  advanceClock(battle, dt);
  for (const f of battle.fighters) {
    if (!isAlive(f)) continue;
    f.cd -= dt;
    f.swing = Math.max(0, f.swing - dt);
    stepChase(battle, f, dt);
  }
  separate(battle);
  if (enemiesLeft(battle) === 0) battle.outcome = 'win';
  else if (alliesLeft(battle) === 0 || battle.t > FIELD.maxS) battle.outcome = 'lose';
  return battle.outcome !== null;
}

/** Rút quân khỏi trận ngoài bãi: lính còn sống được giữ lại, không có thưởng. */
export function retreatField(battle: Battle): void {
  if (battle.mode === 'field' && !battle.outcome) battle.outcome = 'retreat';
}

export function skillReady(battle: Battle, skill: SkillId): boolean {
  return !battle.outcome && (battle.skillCd[skill] ?? 0) <= 0 && alliesLeft(battle) > 0;
}

/** Bấm kỹ năng của tướng. Trả về false khi kỹ năng chưa hồi hoặc trận đã xong. */
export function useSkill(battle: Battle, skill: SkillId): boolean {
  if (!skillReady(battle, skill)) return false;
  const def = SKILLS[skill];
  battle.skillCd[skill] = def.cooldown;
  if (skill === 'trongTran') {
    battle.rally = def.duration;
    const allies = battle.fighters.filter((f) => f.side === 'ta' && isAlive(f));
    const x = allies.reduce((s, f) => s + f.x, 0) / allies.length;
    const z = allies.reduce((s, f) => s + f.z, 0) / allies.length;
    emit(battle, { kind: 'rally', x, z });
  }
  return true;
}
