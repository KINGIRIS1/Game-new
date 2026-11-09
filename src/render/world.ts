// Cảnh 3D của kinh đô: địa hình bậc thang, rừng, sông, công trình, lũy tre, đê, thành Cổ Loa, nước lũ, mưa,
// trời ngày đêm (`troi.ts`), đêm yêu tinh, cảnh Tết (cây nêu, dây cờ, mâm bánh, người gói bánh) và các hiệu ứng khi đặt công trình.

import * as THREE from 'three';
import { BUILDINGS, FIELD, NGAY_MS, NU_TUONG_IDS, UNITS, XAY_O_MS, isBridge, isRoad, type BuildingType, type NuTuongId, type Terrain, type TuongId, type UnitType } from '../game/defs';
import { raidSpawnBand, type Battle, type RaidSide } from '../game/battle';
import { caoLoAtDien } from '../game/caoLo';
import { HAI_BA_KINDS, haiBaJoined, type HaiBaKind } from '../game/chuong5';
import { advLook, inChapter3, ruaVangCame, type AdvLook } from '../game/coLoa';
import { inChapter4 } from '../game/chuong4';
import { doanhCount, gateToward, generals, heroPost } from '../game/doanhTrai';
import { nuTuongList } from '../game/nuTuong';
import { dienLevel, occupancy, stairWall, upcomingBoats, type Building, type GameState } from '../game/game';
import { giongLook, type GiongLook } from '../game/giong';
import { KHOANH_N, khoanhOf, khoanhOrigin, openMask, openStart, openable } from '../game/khoanh';
import { FAR_PLOTS, benKiaOpen, bridgeEnds, bridgeTo, plotAt, plotOf, plotOrigin, poiAt, poiPlots, type Dat } from '../game/benKia';
import { DIEN_HOME, FAR_FOREST, FOREST_BAND, GRID, KHOANH, RIVER_END, RIVER_START, baseHeights, farBankOf, inGrid, isNearBank, isRiver, riverDistance, riverFacing, rotAngle, turnLocal } from '../game/map';
import { BAI_CAT, BIEN_DIEN, CUA_BIEN, QUAN_DAO, RIVER_MID, benDock, bienDo, isSea, riverOf, seaIndex, seaRoute, type QuanDaoId, type SeaRoute } from '../game/bien';
import { sonLook, type SonLook } from '../game/son';
import { floodHits } from '../game/terrain';
import { tetOpen } from '../game/tet';
import { gioBuoi, troiLuc, type Buoi, type TroiLuc } from '../game/ngayDem';
import { isBusy, itemProgress, pendingBuildings, pendingOf } from '../game/xay';
import { Battlefield, CAM_KHE } from './battlefield';
import { runJob, type Job as ViecNan } from './nanSan';
import { BattleView } from './battleView';
import { IsoCamera, type CamBounds } from './camera';
import { DOOR_OPEN, banhChung, banhGiay } from './buildings';
import { PERSON_SCALE, type LinhTap, type LotOpts } from './congTrinh/chung';
import { BEP_TET_SEAT } from './congTrinh/bep';
import { DIEN_LOT, bannerHeight, courtSlot } from './congTrinh/dien';
import { doanhTraiHeroSpot, linhTapCount } from './congTrinh/doanhTrai';
import type { Swim } from './congTrinh/hoKimQuy';
import { CONG_TRINH, lotModel } from './congTrinh/index';
import { makeRuaVang } from './beasts';
import { buildDecor, disposeDecor, isBatchedDecor, type DecorSpot } from './decor';
import { buildWild, disposeWild, wildSpots } from './oTrong';
import { buildCayDaBatch, disposeCayDaBatch, makeCayDa, type CayDaPlace } from './cayDa';
import { bridgeDeckY, cloudPuffs, poiMarker, type BridgeBanks } from './benKia';
import { SHORE_LAND, SeaLife, animateSea, buildSea, buildSeaMist, islandAt, shoreCap } from './bien';
import { makeSoldier } from './soldier';
import { makeAnDuong, makeCaoLo, makeGiong, makeLacTuong, makeNuTuong, makeSonTinh, makeTrungNhi, makeTrungTrac } from './heroes';

/** Người đứng chầu là nữ tướng (chương 5), không phải tướng chỉ huy. */
const isNuTuong = (t: TuongId | NuTuongId): t is NuTuongId => (NU_TUONG_IDS as string[]).includes(t);
import { addSunLights, type SunLights } from './lights';
import {
  buildCitadel,
  buildWallTops,
  type WallTopCell,
  makeUNo,
  CITADEL_TOP,
  EARTH_WALL_TOP,
  buildDikes,
  buildForest,
  setForestLite,
  type ForestOptions,
  buildStakes,
  buildWallSites,
  buildWalls,
  makeScaffold,
  makeBoat,
  makeEnemyBoat,
  makeLauThuyen,
  makeFighter,
  makeSailBoat,
  makeThuyenKhoi,
  makeTradeBoat,
  SEA_BOAT_SCALE,
  type CitadelSpot,
  type DikeSpot,
  type TreeSpot,
  type WallSpot,
} from './models';
import { makeWorker, type Job } from './people';
import { C } from './palette';
import { NEN_MARGIN, NenDat, RAMP } from './nenDat';
import type { Poser } from './rig';
import { ShapeBuilder, disposeInstances, disposeModel, seeded } from './shapes';
import { ToonModel, inkThin, outlineOf, toon } from './toon';
import { SANG_NGAY, TroiMau, apMauToi, doSang, phaThoiTiet, phaTroi, toiTheoTroi } from './troi';
import { DuocLayer, QuangDong, duocCho, type DuocSpot } from './duoc';

/**
 * Ô (HALF, HALF) nằm ở gốc tọa độ cảnh. Giữ như tâm lưới 55×55 cũ (khi sông còn ở mép lưới) để camera, ánh nắng,
 * bóng đổ và các ảnh chụp thử không xê dịch khi lưới nới qua sông.
 */
export const HALF = 27.5;
/** Mép bờ bên kia (tọa độ thế giới). */
const FAR = RIVER_END - HALF;
/** Luồng thuyền qua lại: sát bờ bên kia, ngoài tầm cầu tàu và thuyền neo ở bến. */
const BOAT_LANE = FAR - 0.9;
/** Thuyền buôn ghé đậu cách bờ chừng này ô (tâm thuyền), ngoài thuyền neo của bến, trong luồng thuyền. */
const MERCHANT_OUT = 3.5;
/** Số gợn sóng trên mặt sông: chừng 20 gợn mỗi ô bề rộng sông. */
const RIPPLES = 20 * (RIVER_END - RIVER_START);
/** Mặt nước nằm thấp hơn mặt đất. */
const WATER_Y = -0.28;
/** Mỗi bậc đất cao chừng này (đơn vị thế giới). Mặt ô bậc h nằm ở h * LEVEL_H. */
export const LEVEL_H = 0.3;
const topY = (h: number) => Math.max(h, 0) * LEVEL_H;
/** Dấu mặt bờ hai đầu cầu (`BridgeBanks`), để biết lúc nào phải dựng lại cầu; công trình khác là chuỗi rỗng. */
const bankKey = (b?: BridgeBanks) => (b ? `${b.near.toFixed(3)},${b.far.toFixed(3)}` : '');

/**
 * Mặt nước lũ khi nước dâng tới mực `level` (bậc): ở mực L, nước phủ ô bậc L − 1 mà chưa tới mặt ô bậc L.
 * Dưới bậc 1 thì nước sông dâng dần lên từ mặt sông.
 */
export function waterSurface(level: number): number {
  const one = (1 - 0.35) * LEVEL_H;
  if (level >= 1) return (level - 0.35) * LEVEL_H;
  return WATER_Y + Math.max(level, 0) * (one - WATER_Y);
}

/** Mật độ rừng: thưa để công trình nổi bật, không rối mắt. */
const FOREST_DENSITY = 0.3;

/** Trời thuần ban ngày (tắt ngày đêm trong Cài đặt). */
const BAN_NGAY: TroiLuc = { ngay: 1, chieu: 0, dem: 0, rang: 0 };

/**
 * Độ nét: số điểm ảnh vẽ cho mỗi điểm CSS, không vượt quá màn hình thật.
 * Mặc định 1,5: vẫn sắc trên điện thoại mà chỉ phải tô khoảng nửa số điểm ảnh của mức 2.
 */
export const RESOLUTIONS = { low: 1, medium: 1.5, high: 2 } as const;
export type Resolution = keyof typeof RESOLUTIONS;

/**
 * Dưới độ phóng này rừng dùng cây bản thấp (`treeTemplates(true)`), kể cả độ phóng mặc định (0,72–0,84): nhìn từ trên
 * cao thì bản thấp gần như y bản đủ, mà thu nhỏ thì thấy gần trọn rừng cả nghìn cây. Phóng to quá thì hiện bản đủ.
 */
const LITE_ZOOM = 1;
/** Nhịp lính tập trong sân doanh trại: số lần đổi tư thế mỗi giây. */
const DRILL_BEAT = 1.4;
/**
 * Bán kính quả cầu bao một người dân (đơn vị thế giới, tâm cao chừng nửa người), để xét dân có trong khung nhìn không
 * (`workerInView`). Người cao chừng 0,9; cầu rộng dư cho cuốc giơ quá đầu, đồ gánh, người đi mang hàng.
 */
const WORKER_RADIUS = 1.2;

/** Đất, nước và ô lưới dùng chất liệu Lambert đơn giản, công trình và cây mới dùng tô màu hoạt hình. */
const groundMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });

/** Màu pha cho đất đặc sản bên kia sông đã về tay ta. */
const DAT_TINT: Record<Dat, number> = { phuSa: 0x6e5034, nuiDa: 0x8d887c, moSat: 0x9a4a2a };

/** Đặc sản đất của ô (x, z) bên kia sông, nếu có. */
/** Số giả ngẫu nhiên 0..1 cố định theo `n` (đuốc thắp so le). */
function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function datAt(x: number, z: number): Dat | null {
  const id = plotAt(x, z);
  const poi = id === null ? undefined : poiAt(id);
  return poi?.kind === 'dacSan' ? poi.dat : null;
}

/** Tọa độ thế giới của góc ô (x, z). */
const wx = (x: number) => x - HALF;
const wz = (z: number) => z - HALF;
/** Ô gần nhất trong lưới theo một chiều. */
const clampTile = (v: number) => Math.min(Math.max(v, 0), GRID - 1);

/**
 * Bậc cao nhất được vẽ của từng ô trong lưới gần biển (góc đông nam sau ngã ba, dải rừng ngoài cùng hai bờ bên kia):
 * đất liền thấp dần xuống bãi cát (`shoreCap`), −1 là ô đã thành bãi cát hay biển (nền không vẽ, `render/bien.ts` vẽ).
 * Đất bên này, khoảnh bên kia, sông không đổi (99). Chỉ đổi hình vẽ, không đổi độ cao trong state.
 */
const SHORE = (() => {
  const out = new Int8Array(GRID * GRID).fill(99);
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      if (isNearBank(x, z) || isRiver(x, z) || plotAt(x, z) !== null) continue;
      out[z * GRID + x] = shoreCap(bienDo(x + 0.5, z + 0.5));
    }
  }
  return out;
})();
/** Bậc vẽ ra của ô trong lưới có bậc `h` trong state, tính cả đất thấp dần ra biển. */
const shoreLevel = (x: number, z: number, h: number) => Math.min(h, Math.max(SHORE[z * GRID + x], 0));

/**
 * Ô giữ phẳng trọn ô trên nền đất (`nenDat.ts`): mọi ô dưới móng công trình (kể cả đường đi, đồ trang trí, lũy, đê)
 * và ô đầu cầu hai bên sông. Nền công trình, đầu cầu phẳng tới tận mép, không chìa ra lơ lửng trên dải dốc; móng đắp
 * cao hơn đất quanh thì đất quanh dốc lên tới chân móng, móng giáp sông thì dựng vách đất xuống sông như bờ kè.
 */
function flatTiles(state: GameState): number[] {
  const out = new Set<number>();
  for (const b of state.buildings) {
    if (isBridge(b.type)) {
      const ends = bridgeEnds(b.type, b.x, b.z);
      for (const [x, z] of [...ends.near, ...ends.far]) if (x >= 0 && z >= 0 && x < GRID && z < GRID && !isRiver(x, z)) out.add(z * GRID + x);
      continue;
    }
    const def = BUILDINGS[b.type];
    for (let z = b.z; z < b.z + def.d; z++) for (let x = b.x; x < b.x + def.w; x++) if (x >= 0 && z >= 0 && x < GRID && z < GRID) out.add(z * GRID + x);
  }
  return [...out].sort((a, b) => a - b);
}

/** Dấu của các ô giữ phẳng: chỉ đổi khi dựng, dỡ, dời công trình (rẻ hơn tính lại cả danh sách ô mỗi lần sync). */
function flatKeyOf(state: GameState): string {
  return state.buildings.map((b) => `${b.type}@${b.x},${b.z}`).join(';');
}

/**
 * Rừng bên kia sông (chưa khai phá) và rừng bao ngoài lưới không đổ bóng, cho nhẹ máy: lượt vẽ bóng phải vẽ lại từng
 * cây, mà rừng ở xa bìa đất thì bóng đổ khó thấy.
 */
function shadowless(forest: THREE.Object3D): THREE.Object3D {
  forest.traverse((o) => (o.castShadow = false));
  return forest;
}

/** Nhiều khối hộp vẽ trong một lần, mỗi khối có màu riêng. */
export class InstancedBoxes {
  readonly mesh: THREE.InstancedMesh;
  private count = 0;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly c = new THREE.Color();

  constructor(capacity: number, opts: { shadow?: boolean } = {}) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshLambertMaterial();
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = !!opts.shadow;
    this.mesh.receiveShadow = true;
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
  }

  begin(): void {
    this.count = 0;
  }

  add(w: number, h: number, d: number, color: THREE.ColorRepresentation, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): void {
    if (this.count >= this.mesh.instanceMatrix.count) return;
    this.q.setFromEuler(this.e.set(rx, ry, rz));
    this.m.compose(this.p.set(x, y, z), this.q, this.s.set(w, h, d));
    this.mesh.setMatrixAt(this.count, this.m);
    this.mesh.setColorAt(this.count, this.c.set(color));
    this.count++;
  }

  end(): void {
    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

/** Chỗ đứng của một người dân trong công trình (tọa độ trong mô hình). `walk` là quãng đi qua lại. */
interface Spot {
  job: Job;
  x: number;
  y: number;
  z: number;
  ry: number;
  walk?: number;
}

/** Chỗ tướng đứng (tọa độ cảnh); `ry`: góc quay mặt khi đứng chầu trong sân Điện. */
interface HeroSpot {
  x: number;
  y: number;
  z: number;
  ry?: number;
}

interface WorkerView {
  obj: THREE.Group;
  spot: Spot;
  phase: number;
}

interface BuildingView {
  group: THREE.Group;
  type: BuildingType;
  level: number;
  damaged: boolean;
  workers: number;
  /** Ô góc đang vẽ: công trình được dời đi thì dựng lại ở chỗ mới. */
  x: number;
  z: number;
  /** Hướng xoay đang vẽ (số nấc 90°). */
  rot: number;
  /** Bậc nền đang vẽ. */
  ground: number;
  /** Ruộng đang vẽ dáng đã bồi phù sa. */
  boi: boolean;
  /** Cầu: mặt bờ hai đầu đang vẽ (`bankKey`); bờ đắp cao thêm thì dựng lại cho đầu cầu gác đúng mặt bờ. */
  banks: string;
  /** Doanh trại: các doanh, lính tập, giá nỏ; nơi ở: bậc binh khí đang vẽ (`campKey`). Đổi thì dựng lại. */
  camp: string;
  people: WorkerView[];
  popAge: number;
  baseScale: number;
  /** Công trình đang dựng mới (chưa vào kinh đô): mô hình mọc dần theo tiến độ (`update`). */
  dung: boolean;
}

/** Giàn giáo quanh công trình đang dựng hay đang nâng cấp, có vài thợ làm. */
interface SiteView {
  group: THREE.Group;
  /** Chỗ và cỡ móng đang vẽ: đổi thì dựng lại. */
  key: string;
  people: WorkerView[];
}

/** Loại tường vẽ theo lô (lũy, đê, thành): đang đắp thì vẽ cọc mốc trên ô, không dựng giàn giáo. */
const BATCHED_WALLS: BuildingType[] = ['luy', 'de', 'thanh'];

/**
 * Chỗ đứng của người ở công trình còn vẽ theo móng cũ (ruộng nếp), tọa độ mô hình trước khi phóng theo móng. Công
 * trình vẽ trên móng mới (`congTrinh/`, kể cả vườn, chuồng lợn, bếp) cho chỗ đứng theo bản vẽ của nó.
 */
const SPOTS: Partial<Record<BuildingType, Spot[]>> = {
  // Mỗi người một cột x − z như thợ đá, tránh bù nhìn.
  ruongNep: [
    { job: 'nong', x: -0.85, y: 0.06, z: 0.3, ry: 0.5 },
    { job: 'nong', x: 0.3, y: 0.06, z: 0.3, ry: -0.4 },
    { job: 'nong', x: 0.75, y: 0.06, z: -0.4, ry: -0.9 },
  ],
};

/** Cây nêu ngày Tết cao chừng này. Khánh đất nung treo trên nêu. */
const NEU_H = 4.2;
/** Hai Bà trên voi trận ở sân doanh trại: voi to hơn người đứng (Cao Lỗ 0,9) mà vẫn vừa sân trại. */
const HAI_BA_SCALE = 0.65;
const KHANH = 0xa8502e;

/** Công trình cần người làm: hiện đúng số người đang làm. */
const WORKED: BuildingType[] = ['ruong', 'ben', 'baiDa', 'loRen', 'xuongMoc', 'langChai', 'benKhoi', 'ruongNep', 'vuon', 'chuongLon', 'bep'];

/** Số người hiện ra: công trình cần người làm thì đúng số người đang làm, còn lại cố định theo cấp. */
function peopleCount(b: Building, spots: number): number {
  if (WORKED.includes(b.type)) return Math.min(b.workers, spots);
  if (b.type === 'nhaSan') return Math.min(b.level >= 2 ? 2 : 1, spots);
  // Doanh trại: mỗi lầu cổng một lính gác (cấp 1 một người trong cổng tre).
  if (b.type === 'doanhTrai') return spots;
  // Nhà thợ hồ: thợ đóng gạch, thợ cả, thêm người nhào đất, nện tường theo cấp.
  if (b.type === 'thoHo') return Math.min(b.level >= 3 ? 4 : b.level >= 2 ? 3 : 2, spots);
  return Math.min(1, spots);
}

/** Binh chủng đứng tập trong sân doanh trại, theo thứ tự đứng (giáo binh hàng giữa trước). */
const LINH_TAP: LinhTap[] = ['giao', 'cung', 'no'];

/**
 * Doanh trại cấp `level` vẽ theo state: tướng của từng doanh, lính đứng tập (đúng số chỗ theo cấp, không quá số lính
 * đang có, chia theo tỉ lệ binh chủng đã luyện, phần dư lớn nhất được thêm), giá nỏ khi đã sang chương 4.
 * Nơi ở của binh chủng vẽ lính tập, voi theo bậc binh khí đã rèn của binh chủng ấy. Loại khác không theo state.
 */
function campOpts(state: GameState, type: BuildingType, level: number): LotOpts | undefined {
  const unit = HOME_UNIT[type];
  if (unit) return { tier: state.arms[unit] ?? 0 };
  if (type !== 'doanhTrai') return undefined;
  const have = LINH_TAP.map((k) => Math.max(0, state.troops[k] ?? 0));
  const total = have.reduce((a, b) => a + b, 0);
  const n = Math.min(linhTapCount(level), total);
  const share = have.map((h) => (total ? (h * n) / total : 0));
  const cnt = share.map(Math.floor);
  const order = LINH_TAP.map((_, j) => j).sort((a, b) => share[b] - cnt[b] - (share[a] - cnt[a]));
  for (let k = 0; cnt.reduce((a, b) => a + b, 0) < n; k++) cnt[order[k % order.length]]++;
  const linh = LINH_TAP.flatMap((kind, j) => Array.from({ length: cnt[j] }, () => ({ kind, tier: state.arms[kind] ?? 0 })));
  return { doanh: generals(state).slice(0, doanhCount(state)), linh, no: inChapter4(state) };
}

/** Binh chủng ở mỗi nơi ở (`UNITS[k].home`). */
const HOME_UNIT: Partial<Record<BuildingType, UnitType>> = Object.fromEntries((Object.keys(UNITS) as UnitType[]).map((k) => [UNITS[k].home, k]));

/** Khóa so dáng doanh trại, nơi ở đang vẽ với state (`campOpts`); loại không theo state thì rỗng. */
const campKey = (o: LotOpts | undefined): string => (o ? `${o.doanh?.join(',')}|${o.linh?.map((l) => l.kind + l.tier).join(',')}|${o.no ? 1 : 0}|${o.tier ?? ''}` : '');

/** Đoạn tường mà cổng thành, cống đê nối vào: cổng, cống xoay theo những đoạn này. */
const GATE_WALLS: BuildingType[] = ['luy', 'de', 'thanh', 'congThanh', 'congDe'];
/** Công trình một ô nằm trong dải tường, xoay theo đoạn tường kề bên (`gateTurn`). */
const GATE_TYPES: BuildingType[] = ['congThanh', 'congDe'];

/**
 * Góc xoay cổng thành (hay cống đê): đoạn tường hai bên chạy dọc trục x (ô đông, tây có tường) thì cửa trông theo trục
 * z, ngược lại trông theo trục x; mặt trước (+z của mô hình) quay ra phía xa Điện, tức ra ngoài thành (cống: ra sông). Không có tường kề hay kề cả
 * hai trục như nhau thì theo trục xa Điện hơn.
 */
function gateTurn(state: GameState, b: { x: number; z: number }, walls: Set<number>): number {
  const at = (dx: number, dz: number) => (walls.has((b.z + dz) * GRID + b.x + dx) ? 1 : 0);
  const ew = at(1, 0) + at(-1, 0);
  const ns = at(0, 1) + at(0, -1);
  const dien = state.buildings.find((d) => d.type === 'dien');
  const cx = dien ? dien.x + BUILDINGS.dien.w / 2 : RIVER_START;
  const cz = dien ? dien.z + BUILDINGS.dien.d / 2 : RIVER_START;
  const dx = b.x + 0.5 - cx;
  const dz = b.z + 0.5 - cz;
  if (ew > ns || (ew === ns && Math.abs(dz) >= Math.abs(dx))) return dz < 0 ? Math.PI : 0;
  return dx < 0 ? -Math.PI / 2 : Math.PI / 2;
}

/**
 * Thuyền khơi của một bến thuyền khơi: đường đi (ô) và lịch một chuyến. Chuyến lặp mãi theo đồng hồ cảnh: neo ở bến,
 * xuôi sông ra biển, đánh cá một vòng quanh quần đảo, về bến. Chỉ để nhìn: cá và vỏ ốc tính đều mỗi phút (`game.ts`).
 */
interface SeaBoat {
  obj: THREE.Group;
  key: string;
  route: SeaRoute;
  /** Điểm của đường đi (thế giới) và quãng đường cộng dồn tới từng điểm. */
  pts: THREE.Vector2[];
  acc: number[];
  /** Hướng mũi thuyền khi neo: xuôi theo dòng sông trước bến. */
  dockHeading: number;
  /** Lệch pha để hai thuyền không cùng nhịp. */
  phase: number;
}

/** Thuyền khơi: neo ở bến chừng này giây, chạy chừng này ô mỗi giây, kéo lưới chậm hơn khi đánh cá quanh đảo. */
const SEA_DOCK_S = 24;
/** Đoàn thuyền thủy binh Triệu từ biển kéo vào đi chừng này ô mỗi giây (60 giây báo đủ đi từ khơi tới đầu sông xa nhất). */
const FLEET_SPEED = 2;
/** Một thuyền trong đoàn thủy binh đang tới: đường từ khơi tới chỗ hiện ra (tọa độ thế giới), dài bao nhiêu. */
interface FleetBoat {
  obj: THREE.Group;
  path: THREE.Path;
  len: number;
  phase: number;
}
const SEA_SPEED = 2.2;
const SEA_FISH_SPEED = 1.5;

/** Dựng sẵn bãi chiến (`World.prepareField`): còn ít hơn chừng này mili giây rảnh thì để việc sau sang lần rảnh sau. */
const PREP_SLACK_MS = 8;

export class World {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly view: IsoCamera;

  /** Đất trong lưới (và một dải ngoài lưới) dựng liền một khối (`nenDat.ts`), chia mảnh, dựng lại phần đổi. */
  private land?: NenDat;
  /** Đất đã mở và ô giữ phẳng lúc dựng đất lần cuối (nền đọc lúc dựng lại). */
  private landMask: Uint8Array = new Uint8Array(GRID * GRID);
  private landFlat = new Set<number>();
  /** Dấu từng ô lúc dựng đất lần cuối (bậc, đất mở, giữ phẳng): so để biết ô nào đổi. */
  private landSig?: Int32Array;
  /** Các ô giữ phẳng (có đồ một ô) lúc dựng đất lần cuối: đổi thì dựng lại đất. */
  private flatKey = '';
  /** Độ cao đã vẽ, so với state để biết khi nào phải dựng lại đất. */
  private heights: number[] = [];
  /** Nước lũ phủ trên các ô ngập, và lớp tô xanh báo trước vùng sẽ ngập. */
  private readonly floodWater = new InstancedBoxes(GRID * GRID);
  private readonly floodPreview = new InstancedBoxes(GRID * GRID);
  /** Ô của khoảnh rừng đang chọn (bảng Khoảnh rừng), tô vàng mờ. */
  private readonly chunkPick = new InstancedBoxes(KHOANH * KHOANH);
  /** Dải ô đang kéo thả khi trải đường: xanh ô trải được, đỏ ô không. */
  private readonly linePick = new InstancedBoxes(GRID);
  private chunkPicked = -1;
  private floodKey = '';
  private riverWater?: THREE.Object3D;
  /** Mưa giông khi Thủy Tinh hô mưa gọi gió. */
  private readonly rain: THREE.InstancedMesh;
  private readonly drops: { x: number; y: number; z: number; v: number }[] = [];
  private storm = 0;
  private stormGoal = 0;
  /** Đêm yêu tinh: trời tối xanh, ma trơi lơ lửng ở bìa rừng. */
  private night = 0;
  private nightGoal = 0;
  /** Ngày đêm theo đồng hồ chơi (`troiLuc`); tắt trong Cài đặt thì luôn ban ngày; `gioGhim` ghim giờ để chụp thử. */
  private ngayDem = true;
  private ngayDemMix = 1;
  private gioGhim: number | null = null;
  private readonly troiNen = new TroiMau();
  private readonly troi = new TroiMau();
  /** Độ tối lúc này (0 ban ngày, 1 ban đêm hay đêm yêu tinh). */
  private toi = 0;
  /** Độ tối theo giờ (không tính đêm yêu tinh, để đêm yêu tinh ban ngày trông như cũ), cho đèn đuốc. */
  private toiGio = 0;
  private readonly wisps = new THREE.Group();
  private readonly lights: SunLights;
  private state?: GameState;
  private forest?: THREE.Object3D;
  /** Rừng hai bờ bên kia sông, dựng riêng vì ít khi đổi (bên này dựng lại mỗi lần phát rừng). */
  private farForest?: THREE.Object3D;
  private farForestKey = '#';
  private readonly tint = new THREE.Color();
  /** Mây mù phủ khoảnh bên kia chưa dò, và mây đang tan ở khoảnh vừa dò. */
  private fog?: THREE.Object3D;
  private fogKey = '';
  private fogKnown = new Set<number>();
  private readonly fogFading: { obj: THREE.Mesh; age: number }[] = [];
  /** Dấu điểm lạ trên khoảnh bên kia đã dò: đồn giặc, bản làng, đặc sản, của chôn. */
  private pois?: THREE.Group;
  private poiKey = '';
  /** Người trinh sát đang chạy qua cầu, theo lúc đi và khoảnh đích. */
  private readonly scoutViews = new Map<number, THREE.Group>();
  /** Quân ta đang hành quân qua cầu tới đồn giặc, trước khi sang bãi chiến. */
  private march?: { figs: THREE.Object3D[]; pts: { x: number; z: number }[]; t: number; dur: number };
  private walls?: THREE.Object3D;
  private dikes?: THREE.Object3D;
  private citadel?: THREE.Object3D;
  /** Nóc thành đất, thành Cổ Loa làm lối đi: đất nối nóc, lan can mép ngoài (`buildWallTops`). */
  private rampart?: THREE.Object3D;
  private rampartKey = '';
  /** Đường đi và đồ trang trí một ô, vẽ theo lô. */
  private decor?: THREE.Object3D;
  /** Khóm cỏ, hoa dại, đá nhỏ trên ô trống; vẽ lại khi đất mở thêm, bậc đất đổi hay công trình đổi chỗ. */
  private wild?: THREE.Object3D;
  private wildOcc?: Int32Array;
  private wildMask?: Uint8Array;
  private wildDirty = true;
  /** Ô có cây dại, tảng đá lúc vẽ lô trang trí ô trống lần trước (trang trí ô trống né các ô này). */
  private wildCayKey = '';
  /**
   * Cây dại, tảng đá (`game/cayDa.ts`) đang thấy, theo ô `z * GRID + x`. Cái đã lớn gộp chung một lô (`cayDaBatch`,
   * một lần vẽ); cái mới mọc vẽ riêng (`cayDaGrowing`) và lớn dần lên, đủ cỡ thì vào lô.
   */
  private cayDaSpots = new Map<number, CayDaPlace & { tx: number; tz: number }>();
  private cayDaBatch: THREE.Group | null = null;
  private readonly cayDaGrowing = new Map<number, THREE.Group>();
  private cayDaKey = '#';
  private readonly ripples = new InstancedBoxes(RIPPLES);
  private readonly buildingsRoot = new THREE.Group();
  private readonly views = new Map<number, BuildingView>();
  /** Khung nhìn của camera, lấy lại mỗi khung để chỉ dân trong tầm nhìn mới hiện và cử động (`workerInView`). */
  private readonly viewFrustum = new THREE.Frustum();
  private readonly frustumMat = new THREE.Matrix4();
  private readonly workerBall = new THREE.Sphere(new THREE.Vector3(), WORKER_RADIUS);
  /** Có giặc (trinh sát đã báo hay đang đánh): cửa cổng thành đóng lại; lúc yên thì mở. */
  private gatesShut = false;
  /** Đang có trận giữ kinh đô: lính tập trong sân doanh trại đã ra trận, sân để trống. */
  private drillOut = false;
  /** Thuyền trên sông: thuyền xuôi sông Thao (`home` là 'z') tới ngã ba thì rẽ sang sông Đà. */
  private readonly boats: { obj: THREE.Object3D; axis: 'x' | 'z'; home: 'x' | 'z'; speed: number; pos: number }[] = [];
  private readonly rippleState: { axis: 'x' | 'z'; pos: number; lane: number; len: number }[] = [];
  private gridOverlay?: THREE.LineSegments;
  private ghost?: THREE.Group;
  private readonly footprint: THREE.Mesh;
  private readonly selection: THREE.LineLoop;
  private panGoal: THREE.Vector3 | null = null;
  private readonly raidView = new BattleView(this.scene, { x: -HALF, z: -HALF }, 1, (x, z, wet, wall) => this.fighterY(x, z, wet, wall));
  /** Bãi chiến phó bản, dựng khi cần lần đầu. */
  private field?: Battlefield;
  /** Nắng có đổ bóng không (Cài đặt Bóng đổ, `setBongDo`). */
  private bongDo = true;
  /** Đang xem bãi chiến: chỗ camera nhìn kinh đô trước đó, để trả về sau trận. */
  private cityCam: { target: THREE.Vector3; zoom: number; bounds: CamBounds; facing: number } | null = null;
  private readonly warning: THREE.Mesh;
  private merchantBoat?: THREE.Object3D;
  /** Gióng đứng chầu trong sân Điện, đổi dáng khi lớn lên; tráng sĩ thì ở doanh trại; bay về trời thì hiển linh (`court`). */
  private giong?: { obj: THREE.Group; look: GiongLook; key: string; y: number; ride: boolean };
  /** Sơn Tinh đứng chầu trong sân Điện ở chương 2 (rước dâu rồi thì ở doanh trại), đánh lui Thủy Tinh thì về núi. */
  private son?: { obj: THREE.Group; look: SonLook; key: string };
  /** An Dương Vương đứng chầu trong sân Điện từ chương 3, cạnh cột đá thề. */
  private adv?: { obj: THREE.Group; look: AdvLook; key: string; y: number };
  /** Cao Lỗ đứng chầu trong sân Điện từ khi cầm quân (chương 4), sau An Dương Vương. */
  private caoLo?: { obj: THREE.Group; key: string; y: number };
  /** Hai Bà Trưng trên voi trận, mỗi bà một mô hình. */
  private haiBa = new Map<HaiBaKind, { obj: THREE.Group; key: string; y: number }>();
  private pillar?: { obj: THREE.Group; key: string };
  /**
   * Tướng đứng chầu trong sân Điện mà không có dáng truyện riêng: Lạc tướng, và tướng đã về trời, về núi, xuống biển
   * (hiển linh, có hào quang). Tướng có dáng truyện ở trên (`giong`, `son`, `adv`, `caoLo`).
   */
  private court = new Map<TuongId | NuTuongId, { obj: THREE.Group; key: string }>();
  /** Cảnh Tết trước Điện và quanh bếp gói bánh, chỉ có lúc Tết mở. */
  private tetDecor?: THREE.Group;
  private tetKey = '';
  /** Rùa Vàng bơi chậm trên sông sau khi đã hiện lên diệt yêu tinh. */
  private turtle?: THREE.Group;
  /** Cấp Điện và danh sách khoảnh đã mở lúc dựng đất, rừng lần cuối. */
  private landKey = '';
  private wallKey = '';
  /** Mặt thành đất, thành Cổ Loa, cổng thành còn nguyên theo ô: độ cao chỗ lính đứng trên mặt thành (`fighterY`). */
  private wallTops = new Map<number, number>();
  /** Bậc lên thành còn nguyên theo ô: chân bậc, độ cao leo lên, góc mép cao (`stairOf`), để lính đi qua theo dốc. */
  private stairRamps = new Map<number, { base: number; rise: number; turn: number }>();
  /** Giàn giáo các công trình đang có thợ làm, theo id công trình. */
  private sites = new Map<number, SiteView>();
  /** Lô cọc mốc trên các ô tường đang đắp dở, đang nâng, đang đổi loại. */
  private wallSites?: THREE.Object3D;
  private wallSiteKey = '';
  private dikeKey = '';
  private citadelKey = '';
  private decorKey = '';
  /** Đèn đuốc ban đêm (`duoc.ts`): đuốc cắm ở công trình, đèn thuyền, đom đóm quanh ruộng. */
  private readonly duoc = new DuocLayer();
  private duocKey = '';
  private readonly denThuyen = new QuangDong(64, 0xffb45a, 0.42, 0.5, 0.9);
  private readonly domDom = new QuangDong(72, 0xd6ff70, 0.1, 0.55, 1.2);
  private readonly denTmp = new THREE.Vector3();
  private time = 0;
  private res: Resolution = 'medium';
  /** Máy vẽ được nhiều hình trong một lệnh (WEBGL_multi_draw): rừng gộp một lô, chỉ vẽ cây thấy được (`batchTemplates`). */
  private readonly batched: boolean;
  /** Rừng bao ngoài lưới, dựng một lần. */
  private readonly outer: THREE.Object3D;
  /** Rừng đang hiện bản thấp (độ phóng dưới `LITE_ZOOM`). */
  private forestLite = false;
  /** Biển Đông phía đông: mặt biển, bãi cát, hai quần đảo (`render/bien.ts`), dựng một lần. */
  private readonly sea: THREE.Group;
  /** Cá voi, cá heo lâu lâu nổi lên ngoài biển. */
  private readonly seaLife: SeaLife;
  /** Thuyền khơi của từng bến thuyền khơi: neo trước bến, xuôi sông ra biển đánh cá quanh đảo rồi về. */
  private readonly seaBoats = new Map<number, SeaBoat>();
  /** Đoàn thuyền thủy binh Triệu, thủy quân Hán (cả lâu thuyền) từ biển kéo vào trong lúc trinh sát báo (`upcomingBoats`), dựng lại theo đợt. */
  private fleet: { key: string; boats: FleetBoat[] } | null = null;
  /**
   * Mây mù phủ biển khi biển chưa mở (dưới Điện 8): camera kéo ra biển được nhưng chỉ thấy mờ mờ. Lên Điện 8 thì mây
   * tan dần (`mistFade` từ 0 tới 1) rồi gỡ đi.
   */
  private seaMist?: { group: THREE.Group; materials: THREE.Material[] };
  private mistFade = -1;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.batched = this.renderer.extensions.has('WEBGL_multi_draw');

    this.scene.background = new THREE.Color(C.sky);
    this.scene.fog = new THREE.Fog(C.sky, 75, 125);
    this.view = new IsoCamera(canvas);
    this.view.onUserMove = () => {
      this.panGoal = null;
    };
    this.view.target.set(wx(DIEN_HOME) + BUILDINGS.dien.w / 2, 0, wz(DIEN_HOME) + BUILDINGS.dien.d / 2);

    this.lights = addSunLights(this.scene, 24, 2048);
    const edge = baseHeights();
    this.scene.add(this.staticTerrain(edge));
    this.outer = this.outerForest(edge);
    this.scene.add(this.outer);
    this.sea = buildSea(HALF);
    this.scene.add(this.sea);
    this.seaLife = new SeaLife(this.scene, HALF);
    this.scene.add(this.ripples.mesh, this.buildingsRoot);
    // Nước lũ màu phù sa đục, mờ một chút để còn thấy móng nhà dưới nước.
    const floodMat = this.floodWater.mesh.material as THREE.MeshLambertMaterial;
    floodMat.transparent = true;
    floodMat.opacity = 0.88;
    this.floodWater.mesh.renderOrder = 1;
    const previewMat = this.floodPreview.mesh.material as THREE.MeshLambertMaterial;
    previewMat.transparent = true;
    previewMat.opacity = 0.45;
    previewMat.depthWrite = false;
    this.floodPreview.mesh.renderOrder = 2;
    this.scene.add(this.floodWater.mesh, this.floodPreview.mesh);
    const pickMat = this.chunkPick.mesh.material as THREE.MeshLambertMaterial;
    pickMat.transparent = true;
    pickMat.opacity = 0.5;
    pickMat.depthWrite = false;
    pickMat.emissive.set(0x6b5410);
    this.chunkPick.mesh.renderOrder = 2;
    this.scene.add(this.chunkPick.mesh);
    const lineMat = this.linePick.mesh.material as THREE.MeshLambertMaterial;
    lineMat.transparent = true;
    lineMat.opacity = 0.55;
    lineMat.depthWrite = false;
    this.linePick.mesh.receiveShadow = false;
    this.linePick.mesh.renderOrder = 2;
    this.scene.add(this.linePick.mesh);
    this.rain = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.025, 0.55, 0.025),
      toiTheoTroi(new THREE.MeshBasicMaterial({ color: C.rain, transparent: true, opacity: 0.55, depthWrite: false })),
      420,
    );
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    this.scene.add(this.rain);
    for (let i = 0; i < 420; i++) this.drops.push({ x: Math.random() * 40 - 20, y: Math.random() * 16, z: Math.random() * 40 - 20, v: 14 + Math.random() * 6 });
    this.addBoats();
    this.initRipples();
    this.initWisps();
    this.scene.add(this.duoc.group, this.denThuyen.mesh, this.domDom.mesh);

    this.footprint = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x4caf50, transparent: true, opacity: 0.45, depthWrite: false }),
    );
    this.footprint.visible = false;
    this.footprint.renderOrder = 2;
    this.scene.add(this.footprint);

    const ring = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.5, 0, -0.5),
      new THREE.Vector3(0.5, 0, -0.5),
      new THREE.Vector3(0.5, 0, 0.5),
      new THREE.Vector3(-0.5, 0, 0.5),
    ]);
    this.selection = new THREE.LineLoop(ring, new THREE.LineBasicMaterial({ color: 0xffd54a, transparent: true }));
    this.selection.visible = false;
    this.scene.add(this.selection);

    this.warning = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xd0342c, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    this.warning.visible = false;
    this.warning.renderOrder = 2;
    this.scene.add(this.warning);

    this.resize();
  }

  /**
   * Đất xa ngoài lưới và nước sông. Nền đất (`rebuildLand`) đã nới ra ngoài lưới `NEN_MARGIN` ô; xa hơn nữa là từng cột
   * đất kéo dài theo đúng bậc của ô mép lưới gần nhất (bên này phía bắc, phía tây; bên kia phía đông, phía nam), để mép
   * rừng liền với nền. Phía đông nam đất dừng ở bãi cát ven biển (bờ chéo, `bienDo`), gần bờ thì thấp dần (`shoreCap`).
   * Nước chỉ phủ hai dòng sông, sông Đà tới cửa biển: mùa lũ cả mặt nước dâng lên mà không tràn lên đất (ô ngập vẽ
   * riêng theo `floodMap`).
   */
  private staticTerrain(edge: number[]): THREE.Object3D {
    const group = new THREE.Group();
    const far = 70;
    const M = NEN_MARGIN;
    const land = new ShapeBuilder();
    const color = new THREE.Color();
    const strip = (w: number, d: number, h: number, x: number, z: number) => {
      const top = topY(h);
      // Một màu giữa hai sắc rừng, theo bậc như nền: dải này nằm dưới rừng, xa tầm nhìn.
      color.setHex(C.grassLocked[1]).lerp(new THREE.Color(C.grassLocked[2]), 0.5).offsetHSL(0, -0.02 * h, 0.022 * h - 0.02);
      land.box(w, top + 1, d, color.getHex(), x, (top - 1) / 2 - 0.02, z);
    };
    const at = (x: number, z: number) => edge[clampTile(z) * GRID + clampTile(x)];
    const river = (x: number, z: number) => isRiver(clampTile(x), clampTile(z));
    // Từng cột ô ngoài nền: các ô liền nhau cùng bậc gộp một hộp. Cột sông Thao (phía bắc), hàng sông Đà (phía tây) là
    // nước; ô từ bãi cát trở ra là biển.
    const lo = -M - far;
    const hi = GRID + M + far;
    for (let x = lo; x < hi; x++) {
      let run: { h: number; z0: number } | null = null;
      const flush = (end: number) => {
        if (run) strip(1, end - run.z0, run.h, wx(x) + 0.5, wz(run.z0) + (end - run.z0) / 2);
        run = null;
      };
      for (let z = lo; z < hi; z++) {
        const inNen = x >= -M && x < GRID + M && z >= -M && z < GRID + M;
        let h: number | null = null;
        if (!inNen && !river(x, z)) {
          const cap = shoreCap(bienDo(x + 0.5, z + 0.5));
          if (cap >= 0) h = Math.min(at(x, z), cap);
        }
        if (run && h !== run.h) flush(z);
        if (h !== null && !run) run = { h, z0: z };
      }
      flush(hi);
    }
    const water = new ShapeBuilder();
    const box = (x0: number, x1: number, z0: number, z1: number, color: number) =>
      water.box(x1 - x0, 1, z1 - z0, color, (x0 + x1) / 2, WATER_Y - 0.5, (z0 + z1) / 2);
    // Sông Thao (phía đông) chảy từ bắc xuống tới ngã ba; sông Đà (phía nam) chảy suốt, qua ngã ba, đổ ra biển Đông ở
    // cửa biển góc đông nam.
    box(wx(RIVER_START), wx(RIVER_END), wz(-M) - far, wz(RIVER_START), C.water[0]);
    // Sông Đà dừng đúng mép biển: khúc cuối là dải nước có mép xiên theo bờ chéo (chỗ biển nông bắt đầu), khỏi chìa một
    // dải nước sông ra biển.
    const mouth = (z: number) => {
      let x = RIVER_START;
      while (bienDo(x, z) < BAI_CAT - 0.6) x += 0.05;
      return x;
    };
    const ends = Array.from({ length: RIVER_END - RIVER_START + 1 }, (_, k) => ({ z: RIVER_START + k, x: mouth(RIVER_START + k) }));
    const x0 = Math.min(...ends.map((e) => e.x));
    box(wx(-M) - far, wx(x0), wz(RIVER_START), wz(RIVER_END), C.water[1]);
    const tail: number[] = [];
    for (let k = 0; k + 1 < ends.length; k++) {
      const [a, b] = [ends[k], ends[k + 1]];
      tail.push(wx(x0), 0, wz(a.z), wx(x0), 0, wz(b.z), wx(a.x), 0, wz(a.z));
      tail.push(wx(a.x), 0, wz(a.z), wx(x0), 0, wz(b.z), wx(b.x), 0, wz(b.z));
    }
    const tailGeo = new THREE.BufferGeometry();
    tailGeo.setAttribute('position', new THREE.Float32BufferAttribute(tail, 3));
    tailGeo.computeVertexNormals();
    water.add(tailGeo, C.water[1], 0, WATER_Y, 0);
    const landMesh = land.mesh(groundMaterial);
    landMesh.castShadow = false;
    const waterMesh = water.mesh(groundMaterial);
    waterMesh.castShadow = false;
    this.riverWater = waterMesh;
    group.add(landMesh, waterMesh);
    return group;
  }

  /**
   * Rừng bao ngoài lưới. Bên này (phía bắc, phía tây) rừng dày sâu 10 ô; sau hai bờ bên kia chỉ một dải thưa 10 ô, vì
   * trong lưới bên ấy đã có rừng sâu 17 ô, cho nhẹ máy. Gần bãi cát không có cây.
   */
  private outerForest(edge: number[]): THREE.Object3D {
    const near: TreeSpot[] = [];
    const far: TreeSpot[] = [];
    const rand = seeded(7);
    for (let x = -10; x < GRID + 10; x++) {
      for (let z = -10; z < GRID + 10; z++) {
        if (x >= 0 && z >= 0 && x < GRID && z < GRID) continue;
        // Ô ngoài lưới mang đúng bậc của ô mép lưới gần nhất; ô ấy là sông thì chỗ này cũng là nước.
        const ex = Math.min(Math.max(x, 0), GRID - 1);
        const ez = Math.min(Math.max(z, 0), GRID - 1);
        if (isRiver(ex, ez)) continue;
        const farSide = farBankOf(ex, ez) !== null;
        const r = rand();
        const c = bienDo(x + 0.5, z + 0.5);
        if (c > -2.5 || r > (farSide ? 0.3 : 0.6) * FOREST_DENSITY) continue;
        const cx = wx(x) + 0.5 + (rand() - 0.5) * 0.4;
        const cz = wz(z) + 0.5 + (rand() - 0.5) * 0.4;
        const h = Math.min(edge[ez * GRID + ex], Math.max(shoreCap(c), 0));
        (farSide ? far : near).push({ x: cx, y: topY(h), z: cz, kind: rand() < 0.3 ? 'bamboo' : 'tree', seed: Math.floor(rand() * 1e9) });
      }
    }
    const group = new THREE.Group();
    // Rừng ngoài lưới không đổ bóng: ở xa bìa đất, bóng khó thấy mà lượt vẽ bóng phải vẽ lại cả rừng.
    group.add(shadowless(buildForest(near, this.forestOptions())), shadowless(buildForest(far, this.forestOptions())));
    return group;
  }

  private addBoats(): void {
    const routes: { axis: 'x' | 'z'; speed: number; pos: number }[] = [
      { axis: 'z', speed: 1.1, pos: -30 },
      { axis: 'z', speed: 0.8, pos: 5 },
      { axis: 'x', speed: 0.9, pos: -20 },
    ];
    for (const r of routes) {
      const obj = makeBoat();
      obj.position.y = WATER_Y - 0.02;
      if (r.axis === 'z') {
        obj.position.x = BOAT_LANE;
        obj.rotation.y = -Math.PI / 2;
      } else {
        obj.position.z = BOAT_LANE;
      }
      this.scene.add(obj);
      this.boats.push({ obj, home: r.axis, ...r });
    }
  }

  /** Đốm ma trơi xanh lơ lửng dọc bìa rừng phía bắc và phía tây, chỉ hiện trong đêm yêu tinh. */
  private initWisps(): void {
    const rand = seeded(23);
    const geo = new THREE.SphereGeometry(0.16, 8, 6);
    for (let i = 0; i < 22; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: i % 3 ? C.ghost : C.ghostDeep, transparent: true, opacity: 0, depthWrite: false });
      const wisp = new THREE.Mesh(geo, mat);
      // Chỗ trong dải giặc xuất phát (0..1 dọc bìa rừng, 0..1 theo chiều sâu), đặt thật ở `placeWisps`.
      wisp.userData.u = rand();
      wisp.userData.v = rand();
      wisp.userData.north = i % 2 === 0;
      wisp.position.y = 1 + rand() * 1.4;
      wisp.userData.base = wisp.position.clone();
      wisp.userData.phase = rand() * Math.PI * 2;
      this.wisps.add(wisp);
    }
    this.wisps.visible = false;
    this.scene.add(this.wisps);
  }

  /**
   * Bóng nắng phủ quanh chỗ đang nhìn (cạnh theo độ phóng), bám theo từng điểm ảnh của bóng để bóng khỏi rung khi kéo.
   * Sương mù lùi xa khi thu nhỏ, để nhìn trọn kinh đô lớn không bị mờ nửa trên.
   */
  private followView(): void {
    const v = this.view;
    const sun = this.lights.sun;
    const extent = THREE.MathUtils.clamp(15 / v.zoom, 15, 48);
    const cam = sun.shadow.camera;
    if (cam.right !== extent) {
      cam.left = -extent;
      cam.right = extent;
      cam.top = extent;
      cam.bottom = -extent;
      cam.updateProjectionMatrix();
    }
    const texel = (2 * extent) / sun.shadow.mapSize.x;
    const tx = Math.round(v.target.x / texel) * texel;
    const tz = Math.round(v.target.z / texel) * texel;
    sun.target.position.set(tx, 0, tz);
    sun.position.set(tx - 10, 24, tz + 14);
    sun.target.updateMatrixWorld();
    const fog = this.scene.fog as THREE.Fog;
    const far = Math.max(0, 1 / v.zoom - 1);
    fog.near = 75 + 40 * far;
    fog.far = 125 + 70 * far;
  }

  /** Đã đặt tâm nhìn ban đầu theo vùng đất chưa. */
  private framed = false;
  private wispKey = '';
  /** Đặt ma trơi dọc dải yêu tinh xuất phát ở bìa rừng phía bắc và phía tây (`raidSpawnBand`). */
  private placeWisps(state: GameState): void {
    const band = raidSpawnBand(state);
    const key = `${band.lo}:${band.from}:${band.to}`;
    if (key === this.wispKey) return;
    this.wispKey = key;
    for (const w of this.wisps.children) {
      const along = band.lo + (w.userData.u as number) * (RIVER_START - band.lo - 1);
      const depth = Math.max(0, band.from - 1) + (w.userData.v as number) * (band.to - band.from + 2);
      const north = w.userData.north as boolean;
      const base = w.userData.base as THREE.Vector3;
      base.set(wx(north ? along : depth), base.y, wz(north ? depth : along));
      w.position.copy(base);
    }
  }

  private initRipples(): void {
    const rand = seeded(11);
    for (let i = 0; i < RIPPLES; i++) {
      this.rippleState.push({
        axis: i % 2 ? 'x' : 'z',
        pos: -40 + rand() * 60,
        lane: RIVER_START - HALF + 0.3 + rand() * (RIVER_END - RIVER_START - 0.6),
        len: 0.4 + rand() * 0.6,
      });
    }
  }

  private forestOptions(): ForestOptions {
    return { batched: this.batched, lod: true };
  }

  /** Độ phóng dưới `LITE_ZOOM` thì mọi khu rừng hiện bản thấp, phóng to quá thì bản đủ. */
  private updateForestLod(): void {
    const lite = this.view.zoom < LITE_ZOOM;
    if (lite === this.forestLite) return;
    this.forestLite = lite;
    for (const f of [this.outer, this.forest, this.farForest]) if (f) setForestLite(f, lite);
  }

  get resolution(): Resolution {
    return this.res;
  }

  setResolution(res: Resolution): void {
    this.res = res;
    this.resize();
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // Đặt lại mỗi lần đổi cỡ: mở hay gập Fold5, phóng to trang đều có thể đổi devicePixelRatio.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, RESOLUTIONS[this.res]));
    this.renderer.setSize(w, h, false);
    this.view.setSize(w, h);
    if (this.inField) this.fitField();
  }

  /** Xóa mọi thứ đã vẽ theo state cũ, dùng khi nạp mã lưu hoặc chơi lại. */
  resetAll(): void {
    for (const v of this.views.values()) this.dropView(v);
    this.views.clear();
    for (const site of this.sites.values()) this.dropSite(site);
    this.sites.clear();
    this.wallSiteKey = '#';
    if (this.fleet)
      for (const b of this.fleet.boats) {
        this.scene.remove(b.obj);
        disposeModel(b.obj);
      }
    this.fleet = null;
    // Khóa không trùng với khóa nào (kể cả khóa rỗng khi không còn đoạn nào): lần vẽ sau gỡ lô cũ, vẽ lại từ đầu.
    this.wallKey = '#';
    this.dikeKey = '#';
    this.citadelKey = '#';
    this.decorKey = '#';
    this.duocKey = '#';
    this.wildDirty = true;
    for (const o of this.cayDaGrowing.values()) this.scene.remove(o);
    this.cayDaGrowing.clear();
    this.cayDaSpots.clear();
    this.rebuildCayDaBatch();
    this.cayDaKey = '#';
    this.floodKey = '';
    this.heights = [];
    this.landKey = '';
    this.farForestKey = '#';
    this.fogKey = '';
    this.fogKnown = new Set();
    this.poiKey = '';
    for (const o of this.scoutViews.values()) this.scene.remove(o);
    this.scoutViews.clear();
    this.framed = false;
    this.setSelection(null);
    this.setChunkSelection(null);
    if (this.merchantBoat) this.scene.remove(this.merchantBoat);
    this.merchantBoat = undefined;
  }

  /** Mặt đất (tọa độ thế giới) giữa ô (x, z): phần phẳng của ô, nơi đặt công trình. */
  private groundY(x: number, z: number): number {
    const h = this.heights[z * GRID + x];
    return h === undefined ? 0 : topY(shoreLevel(x, z, h));
  }

  /** Mặt đất đúng như đã vẽ ở điểm (x, z) tính theo ô, kể cả trên dải dốc mép ô. */
  private surfaceY(x: number, z: number): number {
    if (this.land) return this.land.heightAt(x, z);
    const tx = Math.min(Math.max(Math.floor(x), 0), GRID - 1);
    const tz = Math.min(Math.max(Math.floor(z), 0), GRID - 1);
    return this.groundY(tx, tz);
  }

  /**
   * Chỗ lính đứng trong trận giữ kinh đô (tọa độ trận): mặt đất, mặt cầu, hay ngập nửa người dưới nước. `wet`: thứ đi
   * dưới nước (thuyền, thủy quái) qua ô cầu thì đi dưới gầm, vẫn ở mặt sông.
   */
  private fighterY(x: number, z: number, wet = false, wall = false): number {
    const tx = Math.floor(x);
    const tz = Math.floor(z);
    if (!wet) {
      // Lính trên mặt thành đứng trên mặt thành; ai đi qua bậc lên thành thì theo dốc bậc.
      const i = tz * GRID + tx;
      const top = wall ? this.wallTops.get(i) : undefined;
      if (top !== undefined) return top;
      const ramp = this.stairRamps.get(i);
      if (ramp) {
        const u = (x - tx - 0.5) * Math.sin(ramp.turn) + (z - tz - 0.5) * Math.cos(ramp.turn);
        return ramp.base + ramp.rise * Math.min(1, Math.max(0, (u + 0.46) / 0.96));
      }
    }
    const deck = wet ? null : this.bridgeWalkY(x, z);
    const inRiver = deck === null && (tx < 0 || tz < 0 || tx >= GRID || tz >= GRID || isRiver(tx, tz));
    const ground = deck ?? (inRiver ? WATER_Y : this.surfaceY(x, z));
    const water = this.state?.raid.water ?? 0;
    const surface = water > 0 ? waterSurface(water) : WATER_Y;
    if (inRiver) return Math.max(WATER_Y, surface) - 0.3;
    return surface > ground ? Math.max(ground, surface - 0.3) : ground;
  }

  /** Cập nhật cảnh theo state. Chỉ dựng lại phần đã thay đổi. */
  sync(state: GameState): void {
    this.state = state;
    const level = dienLevel(state);
    this.placeWisps(state);
    const heightsChanged = state.heights.length !== this.heights.length || state.heights.some((h, i) => h !== this.heights[i]);
    if (heightsChanged) {
      this.heights = [...state.heights];
      this.wildDirty = true;
    }
    const bridged = state.buildings.some((b) => isBridge(b.type));
    const landKey = `${level}:${state.khoanh.join(',')}:${bridged}:${state.benKia.open.join(',')}`;
    const flatKey = flatKeyOf(state);
    if (flatKey !== this.flatKey && landKey === this.landKey && !heightsChanged) {
      // Chỉ đổi ô giữ phẳng (dựng, dỡ, dời công trình, đường đi...): dựng lại đất và lưới ô, không đụng tới rừng.
      this.flatKey = flatKey;
      this.rebuildLand(state);
      this.rebuildGridOverlay(state);
    }
    if (landKey !== this.landKey || heightsChanged) {
      this.flatKey = flatKey;
      this.landKey = landKey;
      const lo = openStart(state);
      // Kéo cảnh trong vùng đất đã khai phá, chừa một dải rừng và một phần sông; có cầu thì kéo được sang bên kia.
      const bounds: CamBounds = { min: wx(lo) - 3, max: bridged ? wx(GRID) - 2 : wx(RIVER_START) + 2 };
      // Ngay từ Điện 1 kéo được ra biển phía đông nam, tới quá hai quần đảo, theo dải chéo dọc hai quần đảo (dưới
      // Điện 8 biển còn mây mù phủ, `syncSeaMist`).
      const t = QUAN_DAO.map((q) => q.x - q.z);
      bounds.sea = {
        maxX: wx(Math.max(...QUAN_DAO.map((q) => q.x)) + 6),
        maxZ: wz(Math.max(...QUAN_DAO.map((q) => q.z)) + 14),
        minT: Math.min(...t) - 30,
        maxT: Math.max(...t) + 30,
      };
      if (this.cityCam) this.cityCam.bounds = bounds;
      else this.view.bounds = bounds;
      // Lần đầu dựng cảnh: nhìn vào giữa vùng đất đã khai phá (Điện ở gần góc sông, nhìn vào Điện thì nửa màn hình là sông).
      if (!this.framed) {
        this.framed = true;
        const mid = wx((lo + RIVER_START) / 2);
        this.view.target.set(mid, 0, mid);
        this.view.apply();
      }
      this.rebuildLand(state);
      this.rebuildForest(state);
      this.rebuildGridOverlay(state);
      if (this.chunkPicked >= 0) this.setChunkSelection(this.chunkPicked);
      this.floodKey = '';
    }

    const alive = new Set<number>();
    this.gatesShut = state.raid.phase !== 'idle';
    this.drillOut = state.raid.phase === 'battle';
    let wallTiles: Set<number> | null = null;
    // Công trình đang dựng mới chưa vào `state.buildings` nhưng đã chiếm chỗ: vẽ mô hình mọc dần trong giàn giáo.
    const pend = pendingBuildings(state);
    const dungIds = new Set(pend.map((b) => b.id));
    for (const b of pend.length ? [...state.buildings, ...pend] : state.buildings) {
      if (BATCHED_WALLS.includes(b.type) || isBatchedDecor(b.type)) continue;
      alive.add(b.id);
      const v = this.views.get(b.id);
      const dung = dungIds.has(b.id);
      const banks = isBridge(b.type) ? bankKey(this.bridgeBanks(b.type, b.x, b.z)) : b.type === 'bacThanh' ? this.stairOf(b).key : '';
      // Giữa trận lính chết không dựng lại doanh trại (đỡ giật hình); hết trận mới vẽ theo số lính còn.
      const camp = v && state.raid.phase === 'battle' ? v.camp : campKey(campOpts(state, b.type, b.level));
      if (!v || v.type !== b.type || v.level !== b.level || v.damaged !== !!b.damaged || v.workers !== b.workers || v.x !== b.x || v.z !== b.z || v.rot !== (b.rot ?? 0) || v.boi !== !!b.boi || v.banks !== banks || v.camp !== camp || v.dung !== dung) this.createView(b, dung);
      else if (!banks && v.ground !== this.heights[b.z * GRID + b.x]) {
        v.ground = this.heights[b.z * GRID + b.x];
        v.group.position.y = topY(v.ground);
      }
      if (GATE_TYPES.includes(b.type)) {
        wallTiles ??= new Set(state.buildings.filter((w) => GATE_WALLS.includes(w.type)).map((w) => w.z * GRID + w.x));
        const group = this.views.get(b.id)!.group;
        group.rotation.y = gateTurn(state, b, wallTiles);
        // Ván phai cống đê nâng lên khi mở, hạ xuống khi đóng (`update`).
        if (b.type === 'congDe') group.userData.mo = !!b.mo;
      }
    }
    for (const [id, v] of this.views) {
      if (!alive.has(id)) {
        this.dropView(v);
        this.views.delete(id);
      }
    }
    this.syncSites(state, pend);

    this.syncMerchant(state);
    this.syncSeaBoats(state);
    this.syncFleet(state);
    this.syncSeaMist(dienLevel(state) < BIEN_DIEN);
    this.syncGiong(state);
    this.syncSon(state);
    this.syncAdv(state);
    this.syncCaoLo(state);
    this.syncCourt(state);
    this.syncHaiBa(state);
    this.syncTurtle(state);
    this.syncTet(state);
    this.syncWallWalk(state);

    const walls = state.buildings.filter((b) => b.type === 'luy');
    // Khóa có cả ô đứng: dời một đoạn lũy sang chỗ khác thì vẽ lại.
    const key = walls.map((b) => `${b.id}:${b.x}:${b.z}:${b.level}:${b.damaged ? 1 : 0}:${this.heights[b.z * GRID + b.x]}`).join(',');
    if (key !== this.wallKey) {
      this.wallKey = key;
      if (this.walls) {
        this.scene.remove(this.walls);
        disposeInstances(this.walls);
      }
      const spots: WallSpot[] = walls.map((w) => ({
        x: wx(w.x) + 0.5,
        y: this.groundY(w.x, w.z),
        z: wz(w.z) + 0.5,
        seed: w.x * 92821 + w.z * 68917,
        level: w.level,
        damaged: !!w.damaged,
      }));
      this.walls = buildWalls(spots);
      this.scene.add(this.walls);
    }

    const dikes = state.buildings.filter((b) => b.type === 'de');
    const dkey = dikes.map((b) => `${b.id}:${b.x}:${b.z}:${b.level}:${b.damaged ? 1 : 0}:${this.heights[b.z * GRID + b.x]}`).join(',');
    if (dkey !== this.dikeKey) {
      this.dikeKey = dkey;
      if (this.dikes) {
        this.scene.remove(this.dikes);
        disposeInstances(this.dikes);
      }
      const spots: DikeSpot[] = dikes.map((d) => ({ x: wx(d.x) + 0.5, y: this.groundY(d.x, d.z), z: wz(d.z) + 0.5, level: d.level, damaged: !!d.damaged }));
      this.dikes = buildDikes(spots);
      this.scene.add(this.dikes);
      this.floodKey = '';
    }

    const citadel = state.buildings.filter((b) => b.type === 'thanh');
    const ckey = citadel.map((b) => `${b.id}:${b.x}:${b.z}:${b.damaged ? 1 : 0}:${b.uNo ?? ''}:${this.heights[b.z * GRID + b.x]}`).join(',');
    if (ckey !== this.citadelKey) {
      this.citadelKey = ckey;
      if (this.citadel) {
        this.scene.remove(this.citadel);
        disposeModel(this.citadel);
      }
      const spots: CitadelSpot[] = citadel.map((c) => ({
        x: wx(c.x) + 0.5,
        y: this.groundY(c.x, c.z),
        z: wz(c.z) + 0.5,
        seed: c.x * 31 + c.z * 17,
        damaged: !!c.damaged,
      }));
      this.citadel = buildCitadel(spots);
      // Ụ nỏ trên mặt các đoạn thành còn nguyên; ụ hư thì chỉ còn ụ đất sạt, không người.
      citadel.forEach((c, i) => {
        if (!c.uNo || c.damaged) return;
        const u = makeUNo(c.uNo === 'hu');
        u.position.set(spots[i].x, spots[i].y + CITADEL_TOP, spots[i].z);
        // Lính nỏ quay ra ngoài thành, về phía xa Điện.
        const dien = state.buildings.find((b) => b.type === 'dien');
        const mid = (BUILDINGS.dien.w - 1) / 2;
        if (dien) u.rotation.y = Math.atan2(c.x - dien.x - mid, c.z - dien.z - mid);
        this.citadel!.add(u);
      });
      this.scene.add(this.citadel);
    }
    this.syncRampart(state);
    this.syncDecor(state);
    this.syncCayDa(state);
    this.syncWild(state);
    this.syncFlood(state);
    this.syncFarForest(state);
    this.syncFog(state);
    this.syncPois(state);
    this.syncDuoc();
  }

  /**
   * Chỗ đuốc theo công trình đang vẽ (`duocCho`, đổi ra cảnh theo chỗ và hướng xoay của mô hình) và quầng sáng cho lửa
   * sẵn có trong mô hình (`userData.flame`). Công trình hư, đang xây thì không thắp. Chỉ dựng lại khi công trình đổi.
   */
  private syncDuoc(): void {
    const views = [...this.views.entries()].filter(([, v]) => !v.damaged && !v.dung);
    const key = views.map(([id, v]) => `${id}:${v.type}:${v.level}:${v.x}:${v.z}:${v.group.rotation.y.toFixed(2)}:${v.group.position.y.toFixed(2)}`).join(',');
    if (key === this.duocKey) return;
    this.duocKey = key;
    const spots: DuocSpot[] = [];
    const p = new THREE.Vector3();
    for (const [id, v] of views) {
      const g = v.group;
      const cos = Math.cos(g.rotation.y);
      const sin = Math.sin(g.rotation.y);
      duocCho(v.type).forEach((c, i) => {
        // Xoay quanh trục đứng như `Object3D.rotation.y`.
        spots.push({ x: g.position.x + c.x * cos + c.z * sin, y: g.position.y, z: g.position.z - c.x * sin + c.z * cos, kind: 'cot', seed: hash01(id * 7 + i) });
      });
      g.updateWorldMatrix(true, true);
      let i = 0;
      g.traverse((o) => {
        if (!o.userData.flame) return;
        o.getWorldPosition(p);
        const spot: DuocSpot = { x: p.x, y: p.y, z: p.z, kind: 'lua', seed: hash01(id * 13 + i++) };
        // Bát lửa đặt cao: vũng sáng nằm trên mặt đất dưới bát.
        if (typeof o.userData.flameDat === 'number') spot.dat = o.parent!.localToWorld(p.set(o.position.x, o.userData.flameDat, o.position.z)).y;
        spots.push(spot);
      });
    }
    this.duoc.set(spots);
  }

  /**
   * Cây dại, tảng đá trên ô trống. Ô đã có công trình đè lên thì không vẽ (nhịp sau luật cũng dọn đi). Gọi được riêng
   * mỗi khi cây đá mọc thêm mà không phải dựng lại cả cảnh.
   */
  syncCayDa(state: GameState): void {
    const occ = occupancy(state);
    const list = state.cayDa.list.filter((c) => !occ[c.z * GRID + c.x]);
    const key = list.map((c) => `${c.x}:${c.z}:${c.kind}:${c.v}:${this.heights[c.z * GRID + c.x]}`).join(',');
    if (key === this.cayDaKey) return;
    // Lần dựng đầu (vào game, nạp mã lưu): hiện ngay; về sau cái mới mọc thì lớn dần lên.
    const first = this.cayDaKey === '#';
    this.cayDaKey = key;
    const before = this.cayDaSpots;
    this.cayDaSpots = new Map();
    for (const c of list) {
      const i = c.z * GRID + c.x;
      // Lệch tâm ô, xoay theo ô cho các bụi không đứng thẳng hàng.
      const h = Math.imul(c.x + 11, 0x2c1b3c6d) ^ Math.imul(c.z + 5, 0x297a2d39);
      const spot = {
        kind: c.kind,
        v: c.v,
        tx: c.x,
        tz: c.z,
        x: wx(c.x) + 0.5 + ((h & 0xff) / 255 - 0.5) * 0.12,
        y: this.groundY(c.x, c.z),
        z: wz(c.z) + 0.5 + (((h >>> 8) & 0xff) / 255 - 0.5) * 0.12,
        ry: (((h >>> 16) & 0xffff) / 0xffff) * Math.PI * 2,
      };
      this.cayDaSpots.set(i, spot);
      const old = before.get(i);
      const same = old && old.kind === c.kind && old.v === c.v;
      const growing = this.cayDaGrowing.get(i);
      if (growing && !same) this.dropGrowing(i);
      if (!first && !same) {
        const o = makeCayDa(c.kind, c.v);
        o.userData.grow = 0;
        o.scale.setScalar(0.01);
        this.cayDaGrowing.set(i, o);
        this.scene.add(o);
      }
      const o = this.cayDaGrowing.get(i);
      if (o) {
        o.position.set(spot.x, spot.y, spot.z);
        o.rotation.y = spot.ry;
      }
    }
    for (const i of [...this.cayDaGrowing.keys()]) if (!this.cayDaSpots.has(i)) this.dropGrowing(i);
    this.rebuildCayDaBatch();
  }

  /** Bỏ cây đá đang mọc ở ô `i` (đã đủ cỡ vào lô, hay đã dọn): trả bộ nhớ viền mực riêng của nó. */
  private dropGrowing(i: number): void {
    const o = this.cayDaGrowing.get(i);
    if (!o) return;
    this.scene.remove(o);
    // Hình dáng dùng chung giữa các cây đá cùng dáng; chỉ viền mực là riêng.
    (o.children[1] as THREE.Mesh | undefined)?.geometry.dispose();
    this.cayDaGrowing.delete(i);
  }

  /** Dựng lại lô gộp các cây đá đã lớn. */
  private rebuildCayDaBatch(): void {
    if (this.cayDaBatch) {
      this.scene.remove(this.cayDaBatch);
      disposeCayDaBatch(this.cayDaBatch);
    }
    const grown = [...this.cayDaSpots].filter(([i]) => !this.cayDaGrowing.has(i)).map(([, s]) => s);
    this.cayDaBatch = buildCayDaBatch(grown);
    if (this.cayDaBatch) this.scene.add(this.cayDaBatch);
  }

  /** Cây dại, tảng đá chạm trúng ở vị trí màn hình, hoặc null. Công trình đứng chắn phía trước thì là chạm công trình. */
  pickCayDa(clientX: number, clientY: number): { x: number; z: number } | null {
    const ray = this.view.setRay(clientX, clientY);
    const targets = [...this.cayDaGrowing.values()];
    if (this.cayDaBatch) targets.push(this.cayDaBatch);
    const hit = ray.intersectObjects(targets, true)[0];
    if (!hit) return null;
    const front = ray.intersectObjects(this.buildingsRoot.children, true)[0];
    if (front && front.distance < hit.distance) return null;
    // Lô gộp không biết từng cái: lấy cây đá có gốc gần chỗ chạm nhất (tán cây có thể chìa sang ô bên).
    let best: { x: number; z: number } | null = null;
    let bestD = 0.8;
    for (const s of this.cayDaSpots.values()) {
      const d = Math.hypot(s.x - hit.point.x, s.z - hit.point.z);
      if (d < bestD) {
        bestD = d;
        best = { x: s.tx, z: s.tz };
      }
    }
    return best;
  }

  /**
   * Trang trí ô trống (`oTrong.ts`): chỉ dựng lại khi lưới chiếm ô hay mặt nạ đất mở đổi (cả hai được ghi nhớ theo
   * dấu vân tay nên so bằng tham chiếu là đủ), hoặc bậc đất đổi.
   */
  private syncWild(state: GameState): void {
    const occ = occupancy(state);
    const mask = openMask(state);
    const cayKey = state.cayDa.list.map((c) => c.z * GRID + c.x).join(',');
    if (!this.wildDirty && occ === this.wildOcc && mask === this.wildMask && cayKey === this.wildCayKey) return;
    this.wildDirty = false;
    this.wildOcc = occ;
    this.wildMask = mask;
    this.wildCayKey = cayKey;
    if (this.wild) {
      this.scene.remove(this.wild);
      disposeWild(this.wild);
    }
    const dien = state.buildings.find((b) => b.type === 'dien');
    const center = dien ? { x: dien.x + BUILDINGS.dien.w / 2, z: dien.z + BUILDINGS.dien.d / 2 } : null;
    const skip = new Set(state.cayDa.list.map((c) => c.z * GRID + c.x));
    this.wild = buildWild(wildSpots(mask, occ, center, skip), (x, z) => this.surfaceY(x, z), (v) => v - HALF);
    this.scene.add(this.wild);
  }

  /**
   * Đường đi và đồ trang trí một ô: vẽ lại cả lô khi có ô thêm, bớt, đổi loại hay đổi bậc đất. Mép ô đường không giáp
   * ô cùng loại thì có viền.
   */
  private syncDecor(state: GameState): void {
    const small = state.buildings.filter((b) => isBatchedDecor(b.type));
    const key = small.map((b) => `${b.id}:${b.type}:${b.x}:${b.z}:${this.heights[b.z * GRID + b.x]}`).join(',');
    if (key === this.decorKey) return;
    this.decorKey = key;
    if (this.decor) {
      this.scene.remove(this.decor);
      disposeDecor(this.decor);
    }
    const roadAt = new Map<number, BuildingType>();
    for (const b of small) if (isRoad(b.type)) roadAt.set(b.z * GRID + b.x, b.type);
    const spots: DecorSpot[] = small.map((b) => {
      const spot: DecorSpot = { type: b.type, x: wx(b.x) + 0.5, y: this.groundY(b.x, b.z), z: wz(b.z) + 0.5, seed: b.x * 92821 + b.z * 68917 };
      if (isRoad(b.type)) {
        const same = (dx: number, dz: number) => roadAt.get((b.z + dz) * GRID + b.x + dx) === b.type;
        spot.open = [!same(0, 1), !same(0, -1), !same(1, 0), !same(-1, 0)];
      }
      return spot;
    });
    this.decor = buildDecor(spots);
    this.scene.add(this.decor);
  }

  /** Gọi mỗi khung hình: nước lũ dâng, rút mượt theo state mà không phải dựng lại cả cảnh. */
  updateFlood(state: GameState): void {
    if (this.state !== state) return;
    this.syncFlood(state);
  }

  /**
   * Nước lũ phủ các ô đang ngập, nước sông dâng theo; mưa giông khi Thủy Tinh dâng nước. Nước êm vào sau đê qua cống
   * mở (`floodHits`) màu đỏ nâu phù sa.
   */
  private syncFlood(state: GameState): void {
    const raid = state.raid;
    this.stormGoal = raid.foe === 'thuy' && raid.phase !== 'idle' ? 1 : raid.water > 0.02 ? 0.5 : 0;
    this.nightGoal = raid.foe === 'yeu' && raid.phase !== 'idle' ? 1 : 0;
    const water = raid.water;
    const walls = state.buildings.filter((b) => (b.type === 'de' && b.damaged) || b.type === 'congDe');
    const key = water > 0.005 ? `${water.toFixed(2)}:${walls.map((b) => `${b.id}${b.mo ? 'm' : ''}${b.damaged ? 'h' : ''}`).join(',')}` : '';
    if (key === this.floodKey) return;
    this.floodKey = key;
    const surface = waterSurface(water);
    if (this.riverWater) this.riverWater.position.y = Math.max(0, surface - WATER_Y);
    this.floodWater.begin();
    if (water > 0.005) {
      const { wet, calm } = floodHits(state, water);
      for (let z = 0; z < RIVER_START; z++) {
        for (let x = 0; x < RIVER_START; x++) {
          if (!wet[z * GRID + x]) continue;
          const top = this.groundY(x, z);
          if (surface <= top + 0.01) continue;
          const deep = (x * 5 + z * 3) % 2 === 0;
          const shade = calm?.[z * GRID + x] ? (deep ? C.siltDeep : C.silt) : deep ? C.floodDeep : C.flood;
          this.floodWater.add(1, surface - top, 1, shade, wx(x) + 0.5, (surface + top) / 2, wz(z) + 0.5);
        }
      }
    }
    this.floodWater.end();
  }

  /**
   * Tô những ô sẽ ngập khi lũ dâng tới `level`: xanh là nước dữ (tràn bờ, qua đê vỡ), vàng đất là nước êm chỉ vào qua
   * cống đang mở (bồi phù sa cho ruộng). null để tắt.
   */
  setFloodPreview(state: GameState | null, level = 0): void {
    this.floodPreview.begin();
    if (state && level > 0) {
      const { wet, calm } = floodHits(state, level);
      for (let z = 0; z < RIVER_START; z++) {
        for (let x = 0; x < RIVER_START; x++) {
          if (!wet[z * GRID + x]) continue;
          const color = calm?.[z * GRID + x] ? 0xd9a441 : 0x3f8fd0;
          this.floodPreview.add(0.96, 0.04, 0.96, color, wx(x) + 0.5, this.groundY(x, z) + 0.04, wz(z) + 0.5);
        }
      }
    }
    this.floodPreview.end();
  }

  /** Thuyền buôn lớn neo cạnh bến đầu tiên trong lúc đang đậu. */
  private syncMerchant(state: GameState): void {
    // Thuyền buôn ghé bến bên này trước; chỉ có bến bên kia thì ghé bến ấy.
    const ben = state.buildings.find((b) => b.type === 'ben' && isNearBank(b.x, b.z)) ?? state.buildings.find((b) => b.type === 'ben');
    const here = !!state.merchant.visit && !!ben;
    // Bến được dời đi thì thuyền buôn neo lại cạnh bến ở chỗ mới.
    const at = ben ? `${ben.x}:${ben.z}` : '';
    if (this.merchantBoat && (!here || this.merchantBoat.userData.at !== at)) {
      this.scene.remove(this.merchantBoat);
      this.merchantBoat = undefined;
    }
    if (here && !this.merchantBoat && ben) {
      const boat = makeBoat();
      boat.scale.setScalar(1.5);
      const def = BUILDINGS.ben;
      const ry = riverFacing(ben.x, ben.z, def.w, def.d);
      const cx = wx(ben.x) + def.w / 2;
      const cz = wz(ben.z) + def.d / 2;
      // Thuyền buôn ghé dọc dòng, ngoài các thuyền neo của bến (`benDocks` chìa ra chừng 2,8 ô từ bờ), cách bờ
      // `MERCHANT_OUT` ô, còn chừa luồng thuyền qua lại sát bờ bên kia. Hướng ra sông theo mặt trước của bến.
      const out = def.w / 2 + MERCHANT_OUT;
      const ox = Math.sin(ry);
      const oz = Math.cos(ry);
      // Lệch dọc dòng một chút; thuyền nằm dọc theo dòng sông.
      boat.position.set(cx + ox * out - Math.abs(oz) * 0.9, WATER_Y - 0.02, cz + oz * out - Math.abs(ox) * 0.9);
      boat.rotation.y = Math.abs(oz) > 0.5 ? 0 : -Math.PI / 2;
      boat.userData.at = at;
      this.scene.add(boat);
      this.merchantBoat = boat;
    }
  }

  /**
   * Thuyền khơi của mỗi bến thuyền khơi: dựng theo cấp bến, đường đi theo chỗ bến (`seaRoute`). Bến hư thì thuyền
   * nằm neo ở bến, không ra khơi.
   */
  /**
   * Đoàn thuyền thủy binh Triệu trong lúc trinh sát báo: mỗi thuyền từ ngoài khơi vào cửa biển, ngược sông Đà (đánh phía
   * sông Thao thì rẽ lên ở ngã ba), tới đúng chỗ thuyền ấy hiện ra khi trận mở. Hết báo (trận mở) thì gỡ đi: thuyền
   * trong trận do `BattleView` vẽ.
   */
  private syncFleet(state: GameState): void {
    const plan = upcomingBoats(state);
    const key = plan.length ? `${state.raid.wave}:${state.raid.side}:${plan.length}` : '';
    if (key === (this.fleet?.key ?? '')) return;
    if (this.fleet) for (const b of this.fleet.boats) this.scene.remove(b.obj);
    this.fleet = null;
    if (!key) return;
    const alongX = state.raid.side === 'nam' || state.raid.side === 'namXa';
    const boats = plan.map((p, i): FleetBoat => {
      // Ba làn giữa dòng cho khỏi chồng lên nhau; từ khơi xa đi thẳng vào cửa biển.
      const lane = RIVER_MID + ((i % 3) - 1) * 0.9;
      const pts: THREE.Vector2[] = [
        new THREE.Vector2(CUA_BIEN.x + 16 + (i % 3) * 2, CUA_BIEN.z + 16 - (i % 3) * 2),
        new THREE.Vector2(CUA_BIEN.x, lane),
      ];
      if (alongX) pts.push(new THREE.Vector2(p.x, lane));
      else pts.push(new THREE.Vector2(lane, lane), new THREE.Vector2(lane, p.z));
      pts.push(new THREE.Vector2(p.x, p.z));
      const path = new THREE.Path();
      path.moveTo(wx(pts[0].x), wz(pts[0].y));
      for (const q of pts.slice(1)) path.lineTo(wx(q.x), wz(q.y));
      // Lâu thuyền dựng đúng cỡ; thuyền chở lính theo kiểu Triệu hay Hán.
      const obj = p.big ? makeLauThuyen() : makeEnemyBoat(state.raid.foe === 'thuyHan' ? 'han' : 'trieu');
      if (!p.big) obj.scale.setScalar(0.9);
      obj.visible = false;
      this.scene.add(obj);
      return { obj, path, len: path.getLength(), phase: i * 1.7 };
    });
    this.fleet = { key, boats };
  }

  /** Dựng mây mù trên biển khi biển chưa mở; biển vừa mở (lên Điện 8) thì cho mây tan dần. */
  private syncSeaMist(on: boolean): void {
    if (on) {
      if (!this.seaMist) {
        const puff = toon.clone();
        const ink = inkThin.clone();
        // Viền mực đẩy đỉnh ra trong shader riêng: bản sao phải mang theo cách dựng shader ấy.
        ink.onBeforeCompile = inkThin.onBeforeCompile;
        ink.customProgramCacheKey = inkThin.customProgramCacheKey;
        const group = buildSeaMist(HALF, puff);
        const puffs = group.children[group.children.length - 1] as THREE.Mesh;
        group.add(outlineOf(puffs.geometry, ink));
        const veil = (group.children[0] as THREE.Mesh).material as THREE.Material;
        this.seaMist = { group, materials: [veil, puff, ink] };
        this.scene.add(group);
      }
      this.mistFade = -1;
      return;
    }
    if (this.seaMist && this.mistFade < 0) {
      this.mistFade = 0;
      for (const m of this.seaMist.materials) m.transparent = true;
    }
  }

  /** Mây mù tan trong chừng ba giây: bay lên, mờ dần, rồi gỡ đi. */
  private updateSeaMist(dt: number): void {
    if (!this.seaMist || this.mistFade < 0) return;
    this.mistFade = Math.min(this.mistFade + dt / 3, 1);
    const k = this.mistFade;
    this.seaMist.group.position.y = 1.2 * k;
    for (const m of this.seaMist.materials) m.opacity = 1 - k;
    if (k >= 1) {
      this.scene.remove(this.seaMist.group);
      disposeModel(this.seaMist.group);
      for (const m of this.seaMist.materials) m.dispose();
      this.seaMist = undefined;
      this.mistFade = -1;
    }
  }

  /** Thuyền trong đoàn đi tới đâu: tới chỗ hiện ra đúng lúc hết báo, đi đều `FLEET_SPEED` ô mỗi giây. */
  private moveFleet(t: number): void {
    if (!this.fleet || !this.state) return;
    const left = Math.max(0, (this.state.raid.startsAt - this.state.clock) / 1000);
    for (const b of this.fleet.boats) {
      const d = b.len - left * FLEET_SPEED;
      b.obj.visible = d >= 0;
      if (d < 0) continue;
      const u = Math.min(d / b.len, 1);
      const p = b.path.getPointAt(u);
      const ahead = b.path.getPointAt(Math.min(u + 0.6 / b.len, 1));
      const behind = b.path.getPointAt(Math.max(u - 0.6 / b.len, 0));
      b.obj.position.set(p.x, WATER_Y - 0.02 + Math.sin(t * 2.4 + b.phase) * 0.03, p.y);
      if (ahead.distanceToSquared(behind) > 1e-6) b.obj.rotation.y = Math.atan2(ahead.x - behind.x, ahead.y - behind.y);
      // Lâu thuyền khua mái chèo.
      (b.obj.userData.pose as Poser | undefined)?.({ act: 'walk', time: t + b.phase });
    }
  }

  private syncSeaBoats(state: GameState): void {
    const alive = new Set<number>();
    for (const b of state.buildings) {
      if (b.type !== 'benKhoi') continue;
      alive.add(b.id);
      const index = seaIndex(state, b);
      const key = `${b.level}:${b.x}:${b.z}:${index}:${b.damaged ? 1 : 0}`;
      const old = this.seaBoats.get(b.id);
      if (old?.key === key) continue;
      if (old) {
        this.scene.remove(old.obj);
        disposeModel(old.obj);
      }
      const route = seaRoute(b, index);
      const pts = route.path.map((p) => new THREE.Vector2(wx(p.x), wz(p.z)));
      const acc = [0];
      for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + pts[i].distanceTo(pts[i - 1]));
      const obj = makeThuyenKhoi(b.level);
      obj.rotation.order = 'YXZ';
      obj.scale.setScalar(SEA_BOAT_SCALE);
      this.scene.add(obj);
      const dock = benDock(b);
      obj.position.set(wx(dock.x), WATER_Y - 0.02, wz(dock.z));
      this.seaBoats.set(b.id, {
        obj,
        key,
        route: b.damaged ? { ...route, path: [route.path[0]] } : route,
        pts: b.damaged ? [pts[0]] : pts,
        acc: b.damaged ? [0] : acc,
        dockHeading: riverOf(b) === 'thao' ? -Math.PI / 2 : 0,
        phase: index * 57,
      });
    }
    for (const [id, boat] of this.seaBoats) {
      if (alive.has(id)) continue;
      this.scene.remove(boat.obj);
      disposeModel(boat.obj);
      this.seaBoats.delete(id);
    }
  }

  /**
   * Thuyền khơi ở đâu lúc `t`: một chuyến gồm neo ở bến, xuôi sông qua cửa biển ra ngư trường, kéo lưới một vòng quanh
   * quần đảo, rồi đi ngược đường cũ về bến. Mũi thuyền theo hướng đi (nhìn trước, sau một quãng ngắn cho mượt khi rẽ).
   */
  private moveSeaBoat(s: SeaBoat, t: number): void {
    const len = s.acc[s.acc.length - 1];
    const r = s.route.loop.r;
    const out = len / SEA_SPEED;
    const fish = len > 0 ? (Math.PI * 2 * r) / SEA_FISH_SPEED : 0;
    const cycle = SEA_DOCK_S + 2 * out + fish;
    const k = (t + s.phase) % cycle;
    const o = s.obj;
    const at = (d: number): THREE.Vector2 => {
      // Quãng đường d trên cả chuyến (đi, vòng đánh cá, về) ra điểm thế giới.
      if (d <= 0) return s.pts[0].clone();
      if (d >= 2 * len + 2 * Math.PI * r) return s.pts[0].clone();
      if (d > len && d < len + 2 * Math.PI * r) {
        const end = s.pts[s.pts.length - 1];
        const cx = wx(s.route.loop.x);
        const cz = wz(s.route.loop.z);
        const a = Math.atan2(end.y - cz, end.x - cx) + (d - len) / r;
        return new THREE.Vector2(cx + Math.cos(a) * r, cz + Math.sin(a) * r);
      }
      const e = d <= len ? d : 2 * len + 2 * Math.PI * r - d;
      let i = 1;
      while (i < s.acc.length - 1 && s.acc[i] < e) i++;
      const u = (e - s.acc[i - 1]) / Math.max(1e-6, s.acc[i] - s.acc[i - 1]);
      return s.pts[i - 1].clone().lerp(s.pts[i], Math.min(1, Math.max(0, u)));
    };
    let d: number;
    let moving = true;
    if (k < SEA_DOCK_S || len === 0) {
      d = 0;
      moving = false;
    } else if (k < SEA_DOCK_S + out) d = (k - SEA_DOCK_S) * SEA_SPEED;
    else if (k < SEA_DOCK_S + out + fish) d = len + (k - SEA_DOCK_S - out) * SEA_FISH_SPEED;
    else d = len + 2 * Math.PI * r + (k - SEA_DOCK_S - out - fish) * SEA_SPEED;
    const p = at(d);
    o.position.x = p.x;
    o.position.z = p.y;
    if (moving) {
      const ahead = at(d + 0.9);
      const behind = at(d - 0.9);
      if (ahead.distanceToSquared(behind) > 1e-6) o.rotation.y = Math.atan2(-(ahead.y - behind.y), ahead.x - behind.x);
    } else o.rotation.y = s.dockHeading;
    // Ra biển thì sóng to hơn: nhấp nhô, chòng chành.
    const atSea = isSea(p.x + HALF, p.y + HALF);
    const swell = atSea ? 1 : 0.35;
    o.position.y = WATER_Y - 0.02 + Math.sin(t * 1.3 + s.phase) * 0.05 * swell;
    o.rotation.x = Math.sin(t * 0.9 + s.phase) * 0.05 * swell;
    o.rotation.z = Math.sin(t * 1.1 + s.phase * 0.5) * 0.04 * swell;
    (o.userData.pose as Poser | undefined)?.({ act: moving ? 'walk' : 'stand', phase: t * 2.4, time: t });
  }

  /** Quần đảo dưới vị trí màn hình (chạm trúng đảo hay vũng nông quanh đảo), không thì null. */
  pickIsland(clientX: number, clientY: number): QuanDaoId | null {
    if (this.inField) return null;
    const p = this.view.groundPoint(clientX, clientY);
    if (!p) return null;
    return islandAt(p.x + HALF, p.z + HALF);
  }

  /** Đặt đồng hồ cảnh (giây), cho ảnh chụp thử: thuyền khơi, cá voi, cá heo chạy theo đồng hồ này. */
  seekTime(t: number): void {
    this.time = t;
  }

  /**
   * Bật, tắt bóng đổ (Cài đặt, lưu riêng từng máy). Tắt thì nắng thôi đổ bóng ở kinh đô lẫn bãi chiến, bỏ hẳn lượt vẽ
   * bóng mỗi khung cho máy yếu. Đổi `castShadow` của đèn nắng (không đổi `shadowMap.enabled`): three.js thấy đèn đổi
   * thì tự dựng lại shader của mọi chất liệu nhận đèn.
   */
  setBongDo(on: boolean): void {
    this.bongDo = on;
    this.lights.sun.castShadow = on;
    this.field?.setShadows(on);
  }

  get bongDoOn(): boolean {
    return this.bongDo;
  }

  /** Bật, tắt ngày đêm (Cài đặt, lưu riêng từng máy). Tắt thì trời luôn ban ngày; đổi thì trời chuyển dần. */
  setNgayDem(on: boolean, snap = false): void {
    this.ngayDem = on;
    if (snap) this.ngayDemMix = on ? 1 : 0;
  }

  get ngayDemOn(): boolean {
    return this.ngayDem;
  }

  /** Ghim giờ trong ngày để chụp thử: tên buổi, phần của ngày (0 tới 1), hay `null` để theo lại đồng hồ chơi. */
  setGio(g: Buoi | number | null): void {
    this.gioGhim = g === null ? null : typeof g === 'number' ? (((g % 1) + 1) % 1) * NGAY_MS : gioBuoi(g);
  }

  /** Trời lúc này, cho `window.__debug.troi()`. */
  troiInfo(): { luc: TroiLuc; toi: number; ghim: number | null; bat: boolean; mix: number } {
    return { luc: this.troiLucNay(), toi: this.toi, ghim: this.gioGhim, bat: this.ngayDem, mix: this.ngayDemMix };
  }

  /** Cho cá voi hay đàn cá heo nổi lên ngay gần chỗ camera nhìn (ảnh chụp thử). */
  showSeaLife(kind: 'whale' | 'dolphins'): void {
    this.seaLife.show(kind, this.time, this.view.target);
  }

  /** Lướt camera ra quần đảo `id` ngoài biển (giữ độ phóng). */
  panToIsland(id: QuanDaoId): void {
    const q = QUAN_DAO.find((o) => o.id === id)!;
    this.panGoal = new THREE.Vector3(wx(q.x), 0, wz(q.z));
  }

  /** Gỡ mô hình một công trình (dựng lại vì đổi cấp, đổi dân, hư; hay đã dỡ): trả hình và khung xương người làm. */
  private dropView(v: BuildingView): void {
    this.buildingsRoot.remove(v.group);
    disposeModel(v.group);
  }

  private createView(b: Building, dung = false): void {
    const old = this.views.get(b.id);
    if (old) this.dropView(old);
    const def = BUILDINGS[b.type];
    const banks = isBridge(b.type) ? this.bridgeBanks(b.type, b.x, b.z) : undefined;
    const stair = b.type === 'bacThanh' ? this.stairOf(b) : undefined;
    const campO = this.state ? campOpts(this.state, b.type, b.level) : undefined;
    const group = this.makeBuilding(b.type, b.level, !!b.boi, banks, stair?.rise, campO);
    // Bến, làng chài quay mặt trước ra sông: sông phía đông thì xoay một góc vuông. Công trình người chơi đã xoay thì
    // quay theo hướng ấy (người làm, thuyền neo là con của mô hình nên quay theo). Bậc lên thành quay mép cao về
    // phía đoạn thành.
    if (def.nearRiver) group.rotation.y = riverFacing(b.x, b.z, def.w, def.d);
    else if (stair) group.rotation.y = stair.turn;
    else if (b.rot) group.rotation.y = rotAngle(b.rot);
    const ground = this.heights[b.z * GRID + b.x] ?? 0;
    // Cầu: gốc mô hình ở mặt bãi bậc 0 (mặt sông cố định), hai đầu tự leo lên mặt bờ theo `banks`.
    group.position.set(wx(b.x) + def.w / 2, banks ? 0 : topY(ground), wz(b.z) + def.d / 2);
    group.userData.buildingId = b.id;
    // Cổng dựng (hay dựng lại) giữa lúc có giặc thì cửa đóng sẵn.
    if (this.gatesShut) for (const child of group.children) if (child.userData.door) child.rotation.y = 0;
    // Cống đê dựng lại thì ván phai đứng sẵn theo cống đang mở hay đóng.
    group.userData.mo = !!b.mo;
    for (const child of group.children) if (child.userData.phai !== undefined) child.position.y = b.mo ? (child.userData.phai as number) : 0;
    // Dân làm việc theo nghề; Điện có Lạc hầu, từ cấp 2 có thêm lính gác. Công trình hư thì không ai làm.
    // Công trình móng mới (`congTrinh/`) cho chỗ đứng theo bản vẽ, mô hình không phóng nên người giữ cỡ
    // `PERSON_SCALE`. Dáng cũ thì chỗ đứng thu theo hệ số thu tâm (`spread`, xem buildings.ts) và người thu lại
    // theo cỡ đã phóng theo móng (`foot`).
    const people: WorkerView[] = [];
    const moi = CONG_TRINH[b.type];
    const spots: Spot[] = moi ? moi.spots(b.level) : (SPOTS[b.type] ?? []);
    const n = b.damaged || dung ? 0 : b.type === 'dien' ? spots.length : peopleCount(b, spots.length);
    const spread = moi ? 1 : ((group.userData.spread as number | undefined) ?? 1);
    const foot = (group.userData.foot as number | undefined) ?? 1;
    const personScale = moi ? PERSON_SCALE / foot : (0.85 * spread) / foot;
    for (let i = 0; i < n; i++) {
      const spot = { ...spots[i], x: spots[i].x * spread, z: spots[i].z * spread };
      const obj = makeWorker(spot.job);
      obj.position.set(spot.x, spot.y, spot.z);
      obj.rotation.y = spot.ry;
      obj.scale.setScalar(personScale);
      group.add(obj);
      people.push({ obj, spot, phase: b.id * 1.7 + i * 2.1 });
    }
    if (moi?.docks) {
      // Thuyền neo theo bến, nổi trên mặt sông.
      const waterY = (WATER_Y - 0.02 - topY(ground)) / group.scale.y;
      for (const d of moi.docks(b.level)) {
        const boat = d.kind === 'trader' ? makeTradeBoat(d.big) : d.big ? makeSailBoat() : makeBoat();
        boat.position.set(d.x, waterY, d.z);
        boat.rotation.y = d.ry;
        if (d.scale) boat.scale.setScalar(d.scale);
        boat.userData.dock = waterY;
        // Thuyền đánh cá bơi vòng quanh chỗ neo, người chèo theo nhịp (`animate`).
        if (d.kind === 'fishing') boat.userData.fishing = { x: d.x, z: d.z, span: d.span ?? 0.4 };
        group.add(boat);
      }
    }
    if (b.damaged) {
      // Công trình bị phá: nghiêng đổ, khói đen bốc lên. Hồ Kim Quy không nghiêng cả mặt hồ, chỉ miếu bốc khói và
      // Rùa Vàng lặn mất. Đền Rồng Tiên cũng không nghiêng (hồ, núi nghiêng trông sai), chỉ đền bốc khói.
      if (b.type === 'hoKimQuy') {
        for (const c of [...group.children]) {
          if (!c.userData.swim) continue;
          group.remove(c);
          disposeModel(c);
        }
      } else if (b.type !== 'denRongTien') {
        group.rotation.z = 0.12;
        group.scale.y *= 0.85;
      }
      const smoke = new THREE.Group();
      smoke.userData.smoke = true;
      const mat = new THREE.MeshBasicMaterial({ color: C.smoke, transparent: true, opacity: 0.5, depthWrite: false });
      for (let i = 0; i < 4; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 5), mat);
        puff.userData.phase = i / 4;
        smoke.add(puff);
      }
      smoke.position.y = 1.2;
      // Đền Rồng Tiên: khói bốc trên nóc đền chính (lùi về sau móng), cuộn to hợp với đền lớn.
      if (b.type === 'denRongTien') {
        smoke.position.set(0, 3.0, -2.9);
        smoke.scale.setScalar(1.7);
      }
      group.add(smoke);
    }
    this.buildingsRoot.add(group);
    this.views.set(b.id, { group, type: b.type, level: b.level, damaged: !!b.damaged, workers: b.workers, x: b.x, z: b.z, rot: b.rot ?? 0, ground, boi: !!b.boi, banks: stair?.key ?? bankKey(banks), camp: campKey(campO), people, popAge: 0, baseScale: group.scale.x, dung });
    if (dung) this.growView(this.views.get(b.id)!);
  }

  /** Công trình đang dựng mới: mô hình cao dần theo phần việc đã làm, mới đắp móng thì chỉ còn lớp nền. */
  private growView(v: BuildingView): void {
    const id = v.group.userData.buildingId as number;
    const k = this.state ? (itemProgress(this.state, id) ?? 1) : 1;
    v.group.scale.y = v.baseScale * (0.06 + 0.94 * k);
  }

  private dropSite(site: SiteView): void {
    this.buildingsRoot.remove(site.group);
    disposeModel(site.group);
  }

  /**
   * Giàn giáo quanh công trình đang dựng mới hay đang nâng cấp (trừ tường vẽ theo lô), và lô cọc mốc trên các ô tường
   * đang đắp dở, đang nâng, đang đổi loại.
   */
  private syncSites(state: GameState, pend: Building[]): void {
    const busy = state.xay?.viec.length ? state.buildings.filter((b) => isBusy(state, b.id)) : [];
    const dung = (b: Building) => pend.includes(b);
    const keep = new Set<number>();
    const wallSpots: { x: number; y: number; z: number; seed: number }[] = [];
    let wallKey = '';
    for (const b of [...pend, ...busy]) {
      const def = BUILDINGS[b.type];
      if (XAY_O_MS[b.type] || pendingOf(state, b.id)?.doi) {
        // Ô tường: cọc mốc. Tường cũ còn đứng (đang nâng, đang đổi loại) thì cọc cắm trên mặt tường.
        const top = dung(b) ? 0 : b.type === 'luy' ? 0.55 : b.type === 'thanh' ? CITADEL_TOP : 0.3;
        wallSpots.push({ x: wx(b.x) + 0.5, y: this.groundY(b.x, b.z) + top, z: wz(b.z) + 0.5, seed: b.x * 7 + b.z * 3 });
        wallKey += `${b.id}:${b.x}:${b.z}:${top}:${this.heights[b.z * GRID + b.x]},`;
        continue;
      }
      if (isBatchedDecor(b.type)) continue;
      keep.add(b.id);
      const ground = this.heights[b.z * GRID + b.x] ?? 0;
      const key = `${b.x}:${b.z}:${def.w}:${def.d}:${ground}`;
      const old = this.sites.get(b.id);
      if (old?.key === key) continue;
      if (old) this.dropSite(old);
      const group = makeScaffold(def.w, def.d);
      group.position.set(wx(b.x) + def.w / 2, topY(ground), wz(b.z) + def.d / 2);
      group.userData.buildingId = b.id;
      // Hai thợ ở mép trước móng (phần viền cỏ móng chừa ra): một người nện đất, một người đẽo tre.
      const people: WorkerView[] = [];
      const jobs: Job[] = ['thoDa', 'thoMoc'];
      jobs.forEach((job, i) => {
        const spot: Spot = { job, x: (i ? 0.3 : -0.3) * (def.w / 2), y: 0, z: def.d / 2 - 0.22, ry: i ? -0.4 : 0.4 };
        const obj = makeWorker(job);
        obj.position.set(spot.x, spot.y, spot.z);
        obj.rotation.y = spot.ry;
        obj.scale.setScalar(PERSON_SCALE);
        group.add(obj);
        people.push({ obj, spot, phase: b.id * 1.3 + i * 2.7 });
      });
      this.buildingsRoot.add(group);
      this.sites.set(b.id, { group, key, people });
    }
    for (const [id, site] of this.sites) {
      if (keep.has(id)) continue;
      this.dropSite(site);
      this.sites.delete(id);
    }
    if (wallKey !== this.wallSiteKey) {
      this.wallSiteKey = wallKey;
      if (this.wallSites) {
        this.scene.remove(this.wallSites);
        disposeInstances(this.wallSites);
        this.wallSites = undefined;
      }
      if (wallSpots.length) {
        this.wallSites = buildWallSites(wallSpots);
        this.scene.add(this.wallSites);
      }
    }
  }

  /**
   * Mô hình công trình đặt vừa móng (`lotModel`): vẽ trên móng mới, hay dáng cũ phóng theo móng. `boi`: ruộng có phù
   * sa. `banks`: cầu, mặt bờ hai đầu.
   */
  private makeBuilding(type: BuildingType, level: number, boi = false, banks?: BridgeBanks, rise?: number, camp: LotOpts = {}): THREE.Group {
    return lotModel(type, level, { boi, banks, rise, ...camp });
  }

  /**
   * Bậc lên thành ở ô (x, z): đoạn thành dựa vào (`stairWall`), độ cao từ chân bậc lên tới mặt đoạn ấy, góc xoay mép
   * cao về phía đoạn ấy, và khóa để dựng lại khi đổi. Chưa có thành kề bên thì cao như thành đất, quay theo +z.
   */
  private stairOf(b: { x: number; z: number }): { rise: number; turn: number; base: number; key: string } {
    const wall = this.state ? stairWall(this.state, b.x, b.z) : undefined;
    const base = this.groundY(b.x, b.z);
    if (!wall) return { rise: EARTH_WALL_TOP, turn: 0, base, key: `bac:${base}` };
    const rise = Math.max(0.3, this.groundY(wall.x, wall.z) + (wall.type === 'thanh' ? CITADEL_TOP : EARTH_WALL_TOP) - base);
    const turn = Math.atan2(wall.x - b.x, wall.z - b.z);
    return { rise, turn, base, key: `bac:${rise.toFixed(3)}:${turn.toFixed(3)}:${base}` };
  }

  /**
   * Nóc các đoạn thành đất, thành Cổ Loa còn nguyên: đất nối nóc hai đoạn cùng loại kề nhau, lan can mép ngoài, hở chỗ
   * bậc lên thành và cổng thành.
   */
  private syncRampart(state: GameState): void {
    const tops = state.buildings.filter((b) => !b.damaged && (b.type === 'thanh' || (b.type === 'luy' && b.level >= 2)));
    const ways = new Set(state.buildings.filter((b) => b.type === 'bacThanh' || b.type === 'congThanh').map((b) => b.z * GRID + b.x));
    const key =
      tops.map((b) => `${b.x}:${b.z}:${b.type}:${this.heights[b.z * GRID + b.x]}`).join(',') + '|' + [...ways].join(',');
    if (key === this.rampartKey) return;
    this.rampartKey = key;
    if (this.rampart) {
      this.scene.remove(this.rampart);
      disposeInstances(this.rampart);
    }
    const cells: WallTopCell[] = tops.map((b) => ({
      tx: b.x,
      tz: b.z,
      x: wx(b.x) + 0.5,
      y: this.groundY(b.x, b.z),
      z: wz(b.z) + 0.5,
      kind: b.type === 'thanh' ? 'citadel' : 'earth',
    }));
    this.rampart = buildWallTops(cells, (tx, tz) => ways.has(tz * GRID + tx));
    this.scene.add(this.rampart);
  }

  /** Độ cao mặt thành và dốc các bậc lên thành, cho lính trong trận giữ kinh đô (`fighterY`). */
  private syncWallWalk(state: GameState): void {
    this.wallTops.clear();
    this.stairRamps.clear();
    for (const b of state.buildings) {
      if (b.damaged) continue;
      const i = b.z * GRID + b.x;
      if (b.type === 'thanh' || b.type === 'congThanh') this.wallTops.set(i, this.groundY(b.x, b.z) + CITADEL_TOP);
      else if (b.type === 'luy' && b.level >= 2) this.wallTops.set(i, this.groundY(b.x, b.z) + EARTH_WALL_TOP);
      else if (b.type === 'bacThanh') {
        const st = this.stairOf(b);
        this.stairRamps.set(i, { base: st.base, rise: st.rise, turn: st.turn });
      }
    }
  }

  /**
   * Mặt bờ hai đầu cầu loại `type` đặt ở góc (x, z), tính theo đất đang vẽ: mỗi đầu lấy ô cao hơn trong hai ô đầu cầu
   * (ô đầu cầu giữ phẳng tới mép, `flatTiles`).
   */
  private bridgeBanks(type: 'cauSongDa' | 'cauSongThao', x: number, z: number): BridgeBanks {
    const ends = bridgeEnds(type, x, z);
    const top = (cells: [number, number][]) => {
      const inside = cells.filter(([tx, tz]) => tx >= 0 && tz >= 0 && tx < GRID && tz < GRID);
      return inside.length ? Math.max(...inside.map(([tx, tz]) => this.groundY(tx, tz))) : 0;
    };
    return { near: top(ends.near), far: top(ends.far) };
  }

  /**
   * Mặt cầu còn nguyên dưới chân người đi tại (x, z) theo ô, kể cả ván gác lên bờ; null nếu không đứng trên cầu nào.
   */
  private bridgeWalkY(x: number, z: number): number | null {
    for (const b of this.state?.buildings ?? []) {
      if (!isBridge(b.type) || b.damaged) continue;
      const def = BUILDINGS[b.type];
      const da = b.type === 'cauSongDa';
      // Tọa độ dọc cầu tính từ giữa cầu (đầu bên này ở âm), và ngang cầu.
      const along = da ? z - (b.z + def.d / 2) : x - (b.x + def.w / 2);
      const across = da ? x - (b.x + def.w / 2) : z - (b.z + def.d / 2);
      const half = (da ? def.d : def.w) / 2;
      if (Math.abs(across) > 1 || Math.abs(along) > half + 0.5) continue;
      return bridgeDeckY(b.level, along, this.bridgeBanks(b.type, b.x, b.z));
    }
    return null;
  }


  /**
   * Đất trong lưới dựng liền một khối (`nenDat.ts`): giữa ô phẳng, mép ô cao dốc thoai thoải xuống ô thấp, mặt dốc
   * pha màu đất; ô dưới móng công trình, đầu cầu giữ phẳng trọn ô (`flatTiles`), ô thấp quanh đó dốc lên tới mép. Màu cỏ loang theo nhiễu liền qua mép ô, đất đã mở
   * sáng hơn rừng, bậc cao sáng màu hơn một chút. Nền nới ra ngoài lưới `NEN_MARGIN` ô cho liền với rừng bao ngoài.
   */
  private rebuildLand(state: GameState): void {
    this.landMask = openMask(state);
    this.landFlat = new Set(flatTiles(state));
    const sig = new Int32Array(GRID * GRID);
    for (let i = 0; i < sig.length; i++) sig[i] = ((this.heights[i] ?? 0) + 1) | (this.landMask[i] << 4) | ((this.landFlat.has(i) ? 1 : 0) << 5);
    if (!this.land) {
      this.land = this.makeLand();
      this.scene.add(this.land.root);
    } else {
      const changed: number[] = [];
      for (let i = 0; i < sig.length; i++) if (sig[i] !== this.landSig?.[i]) changed.push(i);
      this.land.update(changed);
    }
    this.landSig = sig;
  }

  /** Dựng nền lần đầu; nền đọc mặt đất, đất mở, ô giữ phẳng từ World mỗi khi dựng lại một phần. */
  private makeLand(): NenDat {
    const level = (x: number, z: number) => {
      const tx = clampTile(x);
      const tz = clampTile(z);
      return shoreLevel(tx, tz, Math.max(this.heights[tz * GRID + tx] ?? 0, 0));
    };
    return new NenDat(
      {
        grid: GRID,
        top: (x, z) => {
          if (isRiver(x, z)) return null;
          const cap = SHORE[z * GRID + x];
          return cap < 0 ? null : topY(Math.min(level(x, z), cap));
        },
        riverY: WATER_Y - 0.14,
        flat: (x, z) => this.landFlat.has(z * GRID + x),
        colors: (x, z, out) => {
          const open = inGrid(x, z) && this.landMask[z * GRID + x] === 1;
          const palette = open ? C.grass : C.grassLocked;
          const h = level(x, z);
          out.lo.setHex(palette[1]).offsetHSL(0, -0.02 * h, 0.022 * h - 0.02);
          out.hi.setHex(palette[2]).offsetHSL(0, -0.02 * h, 0.022 * h - 0.02);
          // Đất đặc sản bên kia đã về tay ta pha màu riêng (phù sa nâu thẫm, núi đá xám, mỏ sắt đỏ gỉ) để biết dựng vào đâu.
          const dat = open ? datAt(x, z) : null;
          if (dat) {
            this.tint.setHex(DAT_TINT[dat]);
            out.lo.lerp(this.tint, 0.65);
            out.hi.lerp(this.tint, 0.55);
          }
          out.earthTop.setHex(C.earth);
          out.earthFoot.setHex(C.earthDark);
          if (!open) {
            out.earthTop.multiplyScalar(0.85);
            out.earthFoot.multiplyScalar(0.85);
          }
        },
        origin: -HALF,
        // Phía đông nam là bãi cát rồi biển Đông, vẽ riêng (`render/bien.ts`): nền dừng ở đó, đất gần bờ thấp dần.
        outside: (x, z) => {
          const cap = shoreCap(bienDo(x + 0.5, z + 0.5));
          if (cap >= SHORE_LAND) return undefined;
          return cap < 0 ? null : topY(Math.min(level(x, z), cap));
        },
      },
      groundMaterial,
    );
  }


  /**
   * Rừng trên mọi ô chưa mở. Ô rừng sát đất đã mở thì thưa cây cho dễ nhìn bìa đất; khoảnh phát được (sát đất đã
   * mở) thì thưa hơn nữa và cắm cọc mốc buộc vải đỏ ở bốn góc.
   */
  private rebuildForest(state: GameState): void {
    if (this.forest) {
      this.scene.remove(this.forest);
      disposeInstances(this.forest);
    }
    const mask = openMask(state);
    const ready = new Set(openable(state));
    const spots: TreeSpot[] = [];
    const nearOpen = (x: number, z: number) => {
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const nz = z + dz;
          if (nx >= 0 && nz >= 0 && nx < GRID && nz < GRID && mask[nz * GRID + nx]) return true;
        }
      }
      return false;
    };
    for (let x = 0; x < RIVER_START; x++) {
      for (let z = 0; z < RIVER_START; z++) {
        if (mask[z * GRID + x]) continue;
        const rand = seeded(x * 73856093 + z * 19349663);
        const k = khoanhOf(x, z);
        const density = nearOpen(x, z) ? 0.25 : ready.has(k) ? 0.45 : 0.65;
        if (rand() > density * FOREST_DENSITY) continue;
        const cx = wx(x) + 0.5 + (rand() - 0.5) * 0.3;
        const cz = wz(z) + 0.5 + (rand() - 0.5) * 0.3;
        spots.push({ x: cx, y: this.groundY(x, z), z: cz, kind: rand() < 0.35 ? 'bamboo' : 'tree', seed: Math.floor(rand() * 1e9) });
      }
    }
    const group = new THREE.Group();
    group.add(buildForest(spots, this.forestOptions()));
    setForestLite(group, this.forestLite);
    // Cọc mốc ở bốn góc mỗi khoảnh phát được (góc chung của hai khoảnh chỉ cắm một cọc).
    const corners = new Map<number, { x: number; z: number }>();
    for (const k of ready) {
      const o = khoanhOrigin(k);
      for (const [dx, dz] of [
        [0, 0],
        [KHOANH, 0],
        [0, KHOANH],
        [KHOANH, KHOANH],
      ]) {
        const x = o.x + dx;
        const z = o.z + dz;
        corners.set(z * (GRID + 1) + x, { x, z });
      }
    }
    const stakes = [...corners.values()].map(({ x, z }) => {
      // Cọc đứng ở góc ô, lùi vào trong rừng một chút (góc ven sông), cắm đúng mặt nền ở chỗ ấy.
      const px = x + (x >= RIVER_START ? -0.2 : 0);
      const pz = z + (z >= RIVER_START ? -0.2 : 0);
      return { x: wx(px), y: this.surfaceY(px, pz), z: wz(pz), seed: x * 31 + z * 17 };
    });
    if (stakes.length) group.add(buildStakes(stakes));
    this.forest = group;
    this.scene.add(this.forest);
  }

  /** Dựng lại rừng bên kia khi đất bên ấy mở thêm hay dò thấy thêm điểm lạ (khoảnh có điểm lạ phát trống). */
  private syncFarForest(state: GameState): void {
    const k = state.benKia;
    const seen = k.known.filter((id) => poiAt(id));
    const key = `${k.open.join(',')}|${seen.join(',')}`;
    if (key === this.farForestKey && this.farForest) return;
    this.farForestKey = key;
    if (this.farForest) {
      this.scene.remove(this.farForest);
      disposeInstances(this.farForest);
    }
    this.farForest = this.buildFarForest(state, new Set<number>([...k.open, ...seen]));
    setForestLite(this.farForest, this.forestLite);
    this.scene.add(this.farForest);
  }

  /**
   * Rừng hai bờ bên kia sông (chưa khai phá): thưa hơn bên này một chút và không đổ bóng, cho nhẹ máy; ba ô bãi bồi sát
   * sông cây thưa như bìa rừng bên này. Khoảnh đã mở hay có điểm lạ đã dò (`clearing`) thì phát trống.
   */
  private buildFarForest(state: GameState, clearing: Set<number>): THREE.Object3D {
    const spots: TreeSpot[] = [];
    const mask = openMask(state);
    for (let x = 0; x < GRID; x++) {
      for (let z = 0; z < GRID; z++) {
        if (farBankOf(x, z) === null || mask[z * GRID + x]) continue;
        // Góc đông nam gần biển: bãi cát không có cây.
        if (SHORE[z * GRID + x] < 0 || bienDo(x + 0.5, z + 0.5) > -2.5) continue;
        const plot = plotAt(x, z);
        if (plot !== null && clearing.has(plot)) continue;
        const rand = seeded(x * 73856093 + z * 19349663);
        const density = riverDistance(x, z) <= 2 ? 0.22 : 0.4;
        if (rand() > density * FOREST_DENSITY) continue;
        const cx = wx(x) + 0.5 + (rand() - 0.5) * 0.3;
        const cz = wz(z) + 0.5 + (rand() - 0.5) * 0.3;
        spots.push({ x: cx, y: this.groundY(x, z), z: cz, kind: rand() < 0.35 ? 'bamboo' : 'tree', seed: Math.floor(rand() * 1e9) });
      }
    }
    return shadowless(buildForest(spots, this.forestOptions()));
  }

  // ---------- Bên kia sông ----------

  /** Dựng mây mù ở các khoảnh chưa dò (từ khi Điện đủ cấp mở chuyện bên kia sông); khoảnh vừa dò thì mây tan dần. */
  private syncFog(state: GameState): void {
    const on = benKiaOpen(state);
    const key = on ? `on:${state.benKia.known.join(',')}` : 'off';
    if (key === this.fogKey) return;
    const known = new Set(state.benKia.known);
    // Khoảnh vừa dò (không phải lần đầu dựng cảnh): mây tách riêng để tan dần.
    if (this.fogKey.startsWith('on') && on) {
      for (const id of known) {
        if (this.fogKnown.has(id)) continue;
        const b = new ShapeBuilder();
        this.plotClouds(b, id);
        const mat = toon.clone();
        mat.transparent = true;
        const mesh = b.mesh(mat);
        mesh.castShadow = false;
        this.scene.add(mesh);
        this.fogFading.push({ obj: mesh, age: 0 });
      }
    }
    this.fogKey = key;
    this.fogKnown = known;
    if (this.fog) this.scene.remove(this.fog);
    this.fog = undefined;
    if (!on) return;
    const b = new ShapeBuilder();
    for (let id = 0; id < FAR_PLOTS; id++) if (!known.has(id)) this.plotClouds(b, id);
    if (b.empty) return;
    const mesh = b.mesh(toon);
    mesh.castShadow = false;
    const group = new THREE.Group();
    group.add(mesh, outlineOf(mesh.geometry, inkThin));
    this.fog = group;
    this.scene.add(group);
  }

  /** Mây trên khoảnh bên kia `id`, theo mặt đất giữa khoảnh. */
  private plotClouds(b: ShapeBuilder, id: number): void {
    const o = plotOrigin(id);
    cloudPuffs(b, id, wx(o.x), wz(o.z), this.groundY(o.x + 2, o.z + 2));
  }

  /** Mây vừa dò tan trong chừng một giây: phình ra, bay lên, mờ dần. */
  private updateFog(dt: number): void {
    for (let i = this.fogFading.length - 1; i >= 0; i--) {
      const f = this.fogFading[i];
      f.age += dt;
      const k = Math.min(f.age, 1);
      f.obj.scale.setScalar(1 + 0.15 * k);
      f.obj.position.y = 0.4 * k;
      (f.obj.material as THREE.Material).opacity = 1 - k;
      if (k >= 1) {
        this.scene.remove(f.obj);
        f.obj.geometry.dispose();
        this.fogFading.splice(i, 1);
      }
    }
  }

  /** Dấu điểm lạ trên khoảnh bên kia đã dò. */
  private syncPois(state: GameState): void {
    const k = state.benKia;
    const key = `${k.known.join(',')}|${k.cleared.join(',')}|${k.open.join(',')}|${k.villages.join(',')}|${k.dug.join(',')}`;
    if (key === this.poiKey) return;
    this.poiKey = key;
    if (this.pois) this.scene.remove(this.pois);
    const group = new THREE.Group();
    for (const id of poiPlots()) {
      if (!k.known.includes(id)) continue;
      const poi = poiAt(id)!;
      // Đất đặc sản về tay ta thì thôi vẽ dấu (đất đã pha màu, chừa chỗ dựng); của chôn đào rồi thì hết gò.
      if ((poi.kind === 'dacSan' && k.open.includes(id)) || (poi.kind === 'cua' && k.dug.includes(id))) continue;
      // Làng về theo thì nhà làng là công trình (`banLang`), vẽ như công trình khác.
      if (poi.kind === 'lang' && k.villages.includes(id)) continue;
      const o = plotOrigin(id);
      const marker = poiMarker(poi, poi.kind === 'lang' ? k.villages.includes(id) : k.cleared.includes(id), id);
      marker.position.set(wx(o.x) + 2.5, this.groundY(o.x + 2, o.z + 2), wz(o.z) + 2.5);
      group.add(marker);
    }
    this.pois = group;
    this.scene.add(group);
  }

  /** Người trinh sát chạy từ sân Điện qua cầu tới khoảnh đang dò, theo đồng hồ chơi. */
  private updateScouts(t: number): void {
    const state = this.state;
    const list = state && !this.inField ? state.benKia.scouts : [];
    const alive = new Set(list.map((sc) => sc.from * 64 + sc.plot));
    for (const [key, obj] of this.scoutViews) {
      if (alive.has(key)) continue;
      this.scene.remove(obj);
      this.scoutViews.delete(key);
    }
    if (!state) return;
    const dien = state.buildings.find((b) => b.type === 'dien');
    for (const sc of list) {
      const bridge = bridgeTo(state, plotOf(sc.plot).bank);
      if (!dien || !bridge || !isBridge(bridge.type)) continue;
      const key = sc.from * 64 + sc.plot;
      let obj = this.scoutViews.get(key);
      if (!obj) {
        obj = makeSoldier('giao');
        obj.scale.setScalar(0.8);
        this.scene.add(obj);
        this.scoutViews.set(key, obj);
      }
      const ends = bridgeEnds(bridge.type, bridge.x, bridge.z);
      const mid = (cells: [number, number][]) => ({
        x: cells.reduce((a, c) => a + c[0], 0) / cells.length + 0.5,
        z: cells.reduce((a, c) => a + c[1], 0) / cells.length + 0.5,
      });
      const o = plotOrigin(sc.plot);
      // Ra từ cổng Điện (Điện đã xoay thì cổng theo hướng xoay).
      const gate = turnLocal(dien.rot, 0, BUILDINGS.dien.d / 2 + 0.5);
      const front = { x: dien.x + BUILDINGS.dien.w / 2 + gate.x, z: dien.z + BUILDINGS.dien.d / 2 + gate.z };
      const pts = [front, mid(ends.near), mid(ends.far), { x: o.x + 2.5, z: o.z + 2.5 }];
      const lens = pts.slice(1).map((q, i) => Math.hypot(q.x - pts[i].x, q.z - pts[i].z));
      const total = lens.reduce((a, b) => a + b, 0);
      let d = THREE.MathUtils.clamp((state.clock - sc.from) / Math.max(1, sc.at - sc.from), 0, 1) * total;
      let i = 0;
      while (i < lens.length - 1 && d > lens[i]) d -= lens[i++];
      const a = pts[i];
      const b = pts[i + 1];
      const u = lens[i] > 0 ? Math.min(d / lens[i], 1) : 1;
      const x = a.x + (b.x - a.x) * u;
      const z = a.z + (b.z - a.z) * u;
      const tx = Math.floor(x);
      const tz = Math.floor(z);
      obj.position.set(wx(x), this.bridgeWalkY(x, z) ?? (isRiver(tx, tz) ? 0.12 : this.surfaceY(x, z)), wz(z));
      obj.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      (obj.userData.pose as Poser | undefined)?.({ act: 'walk', phase: t * 8, stride: 0.5, time: t });
    }
  }

  /** Điểm trên đường gấp khúc `pts` cách điểm đầu một quãng `d` (ô), kèm hướng đi. */
  private alongPath(pts: { x: number; z: number }[], d: number): { x: number; z: number; ry: number } {
    let i = 0;
    let left = Math.max(0, d);
    for (; i < pts.length - 2; i++) {
      const len = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z);
      if (left <= len) break;
      left -= len;
    }
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const u = len > 0 ? Math.min(left / len, 1) : 1;
    return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, ry: Math.atan2(b.x - a.x, b.z - a.z) };
  }

  /**
   * Quân ta hành quân từ doanh trại qua cầu tới đồn giặc ở khoảnh `plot` trong `dur` giây, đúng tỉ lệ các binh chủng
   * mang theo (tối đa chừng 18 người cho nhẹ máy), camera đi theo đầu hàng. Xong thì gọi `stopMarch`.
   */
  startMarch(state: GameState, plot: number, army: Record<string, number>, dur: number): void {
    this.stopMarch();
    const barracks = state.buildings.find((b) => b.type === 'doanhTrai');
    const bridge = bridgeTo(state, plotOf(plot).bank);
    if (!barracks || !bridge || !isBridge(bridge.type)) return;
    const ends = bridgeEnds(bridge.type, bridge.x, bridge.z);
    const mid = (cells: [number, number][]) => ({
      x: cells.reduce((a, c) => a + c[0], 0) / cells.length + 0.5,
      z: cells.reduce((a, c) => a + c[1], 0) / cells.length + 0.5,
    });
    const o = plotOrigin(plot);
    // Ra từ cổng trại gần đầu cầu nhất.
    const near = mid(ends.near);
    const gate = gateToward(barracks, near);
    const pts = [{ x: gate.x, z: gate.z }, near, mid(ends.far), { x: o.x + 2.5, z: o.z + 2.5 }];
    const kinds = (['giao', 'cung', 'no', 'voi'] as const).filter((k) => (army[k] ?? 0) > 0);
    const total = kinds.reduce((n, k) => n + army[k], 0);
    const figs: THREE.Object3D[] = [];
    for (const k of kinds) {
      const n = Math.max(1, Math.round((18 * army[k]) / Math.max(total, 18)));
      for (let i = 0; i < n; i++) {
        const fig = k === 'voi' ? makeFighter('voi') : makeSoldier(k);
        fig.scale.setScalar(k === 'voi' ? 0.7 : 0.8);
        this.scene.add(fig);
        figs.push(fig);
      }
    }
    this.march = { figs, pts, t: 0, dur };
  }

  stopMarch(): void {
    if (!this.march) return;
    for (const f of this.march.figs) this.scene.remove(f);
    this.march = undefined;
  }

  /** Mặt đất dưới chân người đi tại (x, z) theo ô; trên cầu thì đứng trên mặt cầu. */
  private walkY(x: number, z: number): number {
    const deck = this.bridgeWalkY(x, z);
    if (deck !== null) return deck;
    return isRiver(Math.floor(x), Math.floor(z)) ? 0.12 : this.surfaceY(x, z);
  }

  private updateMarch(dt: number, t: number): void {
    const m = this.march;
    if (!m) return;
    m.t += dt;
    const total = m.pts.slice(1).reduce((n, p, i) => n + Math.hypot(p.x - m.pts[i].x, p.z - m.pts[i].z), 0);
    const head = (Math.min(m.t / m.dur, 1) * total) / 0.8 + 1;
    m.figs.forEach((fig, i) => {
      const at = this.alongPath(m.pts, Math.min(head - i * 0.7, total));
      fig.position.set(wx(at.x), this.walkY(at.x, at.z), wz(at.z));
      fig.rotation.y = at.ry;
      (fig.userData.pose as Poser | undefined)?.({ act: 'walk', phase: t * 9 + i, stride: 0.5, time: t });
    });
    const lead = this.alongPath(m.pts, Math.min(head, total));
    this.panGoal = new THREE.Vector3(wx(lead.x), 0, wz(lead.z));
  }

  private rebuildGridOverlay(state: GameState): void {
    const visible = this.gridOverlay?.visible ?? false;
    if (this.gridOverlay) {
      this.scene.remove(this.gridOverlay);
      this.gridOverlay.geometry.dispose();
    }
    const mask = openMask(state);
    const pts: THREE.Vector3[] = [];
    // Viền từng ô đã mở (cả bên kia sông) nằm sát mặt đất, bám theo dải dốc ở mép ô.
    const along = [0.03, RAMP, 1 - RAMP, 0.97];
    const at = (px: number, pz: number) => new THREE.Vector3(wx(px), this.surfaceY(px, pz) + 0.02, wz(pz));
    for (let x = 0; x < GRID; x++) {
      for (let z = 0; z < GRID; z++) {
        if (!mask[z * GRID + x]) continue;
        // Bốn cạnh, mỗi cạnh ba đoạn (qua hai mép dải dốc), chạy vòng quanh ô.
        const ring: [number, number][] = [
          ...along.map((t): [number, number] => [t, 0.03]),
          ...along.slice(1).map((t): [number, number] => [0.97, t]),
          ...along.slice(0, 3).reverse().map((t): [number, number] => [t, 0.97]),
          ...along.slice(0, 3).reverse().map((t): [number, number] => [0.03, t]),
        ];
        for (let i = 0; i < ring.length - 1; i++) pts.push(at(x + ring[i][0], z + ring[i][1]), at(x + ring[i + 1][0], z + ring[i + 1][1]));
      }
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    this.gridOverlay = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xfff8e0, transparent: true, opacity: 0.35 }));
    this.gridOverlay.visible = visible;
    this.scene.add(this.gridOverlay);
  }

  showGrid(on: boolean): void {
    if (this.gridOverlay) this.gridOverlay.visible = on;
  }

  /** Hiệu ứng nảy lên khi vừa xây hoặc nâng cấp. */
  pop(id: number): void {
    const v = this.views.get(id);
    if (v) v.popAge = 0.0001;
  }

  /** Ô lưới dưới vị trí màn hình, hoặc null nếu chạm ra ngoài lưới. Chạm trúng mặt đất bậc nào thì lấy ô đó. */
  pickTile(clientX: number, clientY: number): { x: number; z: number } | null {
    // Mặt dốc nằm trong ô cao, vách đứng nằm trên mép ô giữ phẳng: điểm chạm rơi vào ô nào là ô ấy.
    const hit = this.land && this.view.setRay(clientX, clientY).intersectObjects(this.land.parts, false)[0];
    if (hit) {
      const n = hit.face?.normal;
      // Chạm trúng vách đứng: lùi vào trong một chút để lấy ô có vách (ô cao), không phải ô thấp bên cạnh.
      const x = Math.floor(hit.point.x + HALF - (n ? n.x * 0.01 : 0));
      const z = Math.floor(hit.point.z + HALF - (n ? n.z * 0.01 : 0));
      if (x >= 0 && z >= 0 && x < GRID && z < GRID && !isRiver(x, z)) return { x, z };
    }
    const p = this.view.groundPoint(clientX, clientY);
    if (!p) return null;
    const x = Math.floor(p.x + HALF);
    const z = Math.floor(p.z + HALF);
    return x >= 0 && z >= 0 && x < GRID && z < GRID ? { x, z } : null;
  }

  /** Điểm (lx, lz) trên móng Điện (gốc ở tâm móng, như bản vẽ Điện) đổi ra tọa độ cảnh, theo hướng Điện đã xoay. */
  private dienPoint(dien: Building, lx: number, lz: number): { x: number; z: number } {
    const def = BUILDINGS.dien;
    const t = turnLocal(dien.rot, lx, lz);
    return { x: wx(dien.x) + def.w / 2 + t.x, z: wz(dien.z) + def.d / 2 + t.z };
  }

  /**
   * Chỗ tướng `tuong` đứng chầu trong sân Điện, hai bên lối giữa trước ngai vàng (ô `t` trong bản vẽ Điện,
   * `courtSlot`), và góc quay mặt, theo hướng Điện đã xoay. Móng Điện phẳng nên đứng cùng độ cao mặt sân.
   */
  private courtSpot(dien: Building, tuong: TuongId | NuTuongId): Required<HeroSpot> {
    const c = courtSlot(tuong);
    const at = this.dienPoint(dien, c.x, c.z);
    return { x: at.x, y: this.groundY(dien.x, dien.z) + 0.05, z: at.z, ry: c.ry + rotAngle(dien.rot) };
  }

  /** Chỗ tướng đứng trong sân doanh trại. Chưa có doanh trại thì null. */
  private barracksSpot(state: GameState, tuong: TuongId): HeroSpot | null {
    const b = heroPost(state);
    return b ? this.postSpot(b, tuong) : null;
  }

  /**
   * Chỗ tướng `tuong` đứng trên đài tướng doanh trại `b` (mỗi tướng một chỗ cố định, đã xoay theo trại), nhìn ra sân
   * tập. Cấp 1 chưa có đài thì đứng trên sân.
   */
  private postSpot(b: Building, tuong: TuongId): Required<HeroSpot> {
    const def = BUILDINGS.doanhTrai;
    const c = doanhTraiHeroSpot(tuong, b.level);
    const at = turnLocal(b.rot, c.x, c.z);
    return { x: wx(b.x) + def.w / 2 + at.x, y: this.groundY(b.x, b.z) + 0.05 + c.y, z: wz(b.z) + def.d / 2 + at.z, ry: c.ry + rotAngle(b.rot) };
  }

  /**
   * Chỗ đứng của tướng: tướng đã cùng ra trận (Gióng tráng sĩ, Sơn Tinh đã rước dâu) ở doanh trại;
   * Gióng lúc nhỏ cho dân nuôi, Sơn Tinh lúc cầu hôn đứng chầu trong sân Điện (chưa có doanh trại thì tướng cũng ở đó).
   */
  private heroHome(state: GameState, tuong: TuongId, atBarracks: boolean): HeroSpot | null {
    if (atBarracks) {
      const spot = this.barracksSpot(state, tuong);
      if (spot) return spot;
    }
    const dien = state.buildings.find((b) => b.type === 'dien');
    return dien ? this.courtSpot(dien, tuong) : null;
  }

  /**
   * Gióng lúc nhỏ đứng chầu trong sân Điện cho dân nuôi; thành tráng sĩ thì về doanh trại, cưỡi ngựa sắt. Chưa có doanh
   * trại thì tráng sĩ xuống ngựa đứng chầu trong sân (tướng đứng trong sân Điện không cưỡi thú).
   */
  private syncGiong(state: GameState): void {
    const look = giongLook(state);
    const camp = look === 'trangSi' && !!this.barracksSpot(state, 'giong');
    const spot = this.heroHome(state, 'giong', look === 'trangSi');
    const key = look && spot ? `${look}:${camp}:${spot.x}:${spot.y}:${spot.z}:${spot.ry}` : '';
    if (this.giong?.key === key) return;
    if (this.giong) this.scene.remove(this.giong.obj);
    this.giong = undefined;
    if (!look || !spot) return;
    const obj = makeGiong(look, { onFoot: look === 'trangSi' && !camp });
    obj.scale.setScalar(look === 'trangSi' ? 0.9 : look === 'be' ? 1.1 : 1);
    obj.position.set(spot.x, spot.y, spot.z);
    obj.rotation.y = spot.ry ?? -Math.PI / 2 + 0.5;
    this.scene.add(obj);
    this.giong = { obj, look, key, y: spot.y, ride: look === 'trangSi' && camp };
  }

  /**
   * Sơn Tinh lúc cầu hôn đứng trên mỏm đá trong sân Điện; rước Mị Nương rồi thì cùng ra trận, ở doanh trại.
   * Đánh lui Thủy Tinh thì về núi (rồi hiển linh trong sân Điện, `syncCourt`).
   */
  private syncSon(state: GameState): void {
    const look = sonLook(state);
    const camp = look === 'trangSi' && !!this.barracksSpot(state, 'sonTinh');
    const spot = this.heroHome(state, 'sonTinh', look === 'trangSi');
    const key = look && spot ? `${look}:${camp}:${spot.x}:${spot.y}:${spot.z}:${spot.ry}` : '';
    if (this.son?.key === key) return;
    if (this.son) this.scene.remove(this.son.obj);
    this.son = undefined;
    if (!look || !spot) return;
    const obj = makeSonTinh({ rock: !camp });
    obj.scale.setScalar(0.95);
    obj.position.set(spot.x, spot.y, spot.z);
    obj.rotation.y = spot.ry ?? 0.4;
    this.scene.add(obj);
    this.son = { obj, look, key };
  }

  /**
   * An Dương Vương đứng chầu trong sân Điện từ chương 3: chưa có nỏ thần thì cầm rìu đồng, có rồi thì cầm nỏ thần.
   * Sau lưng ngài là cột đá thề Thục Phán dựng khi nhận ngôi, thề giữ đền thờ các vua Hùng.
   */
  private syncAdv(state: GameState): void {
    const look = advLook(state);
    const dien = state.buildings.find((b) => b.type === 'dien');
    const spot = dien ? this.courtSpot(dien, 'anDuong') : null;
    const key = look && spot ? `${look}:${spot.x}:${spot.y}:${spot.z}:${spot.ry}` : '';
    if (this.adv?.key !== key) {
      if (this.adv) this.scene.remove(this.adv.obj);
      this.adv = undefined;
      if (look && spot) {
        const obj = makeAnDuong({ crossbow: look === 'noThan' });
        obj.scale.setScalar(0.9);
        obj.position.set(spot.x, spot.y, spot.z);
        obj.rotation.y = spot.ry;
        this.scene.add(obj);
        this.adv = { obj, look, key, y: spot.y };
      }
    }
    const pkey = inChapter3(state) && dien && spot ? `${spot.x}:${spot.y}:${spot.z}:${spot.ry}` : '';
    if (this.pillar?.key === pkey) return;
    if (this.pillar) this.scene.remove(this.pillar.obj);
    this.pillar = undefined;
    if (!pkey || !dien || !spot) return;
    const obj = this.makePillar();
    // Cột đá đứng sau lưng tướng, chếch ra phía ngoài lối, giữa bốn chỗ đứng chầu cho khỏi vướng ai.
    const c = courtSlot('anDuong');
    const at = this.dienPoint(dien, c.x + Math.sign(c.x) * 0.5, c.z - 0.5);
    obj.position.set(at.x, spot.y, at.z);
    obj.rotation.y = 0.3 + rotAngle(dien.rot);
    this.scene.add(obj);
    this.pillar = { obj, key: pkey };
  }

  /** Cao Lỗ đứng chầu trong sân Điện, sau An Dương Vương, từ khi cầm quân. */
  private syncCaoLo(state: GameState): void {
    const dien = state.buildings.find((b) => b.type === 'dien');
    const spot = dien && caoLoAtDien(state) ? this.courtSpot(dien, 'caoLo') : null;
    const key = spot ? `${spot.x}:${spot.y}:${spot.z}:${spot.ry}` : '';
    if (this.caoLo?.key === key) return;
    if (this.caoLo) this.scene.remove(this.caoLo.obj);
    this.caoLo = undefined;
    if (!spot) return;
    const obj = makeCaoLo();
    obj.scale.setScalar(0.9);
    obj.position.set(spot.x, spot.y, spot.z);
    obj.rotation.y = spot.ry;
    this.scene.add(obj);
    this.caoLo = { obj, key, y: spot.y };
  }

  /**
   * Hai Bà Trưng ở kinh đô từ khi vào chương 5. Bà chỉ huy doanh trại thì cưỡi voi trận đứng giữa sân trại ấy. Chưa
   * chỉ huy trại nào thì xuống voi đứng chầu trong sân Điện (tướng đứng trong sân không cưỡi thú), ở cột ngoài ngang
   * ngai: Trưng Trắc bên trái, Trưng Nhị bên phải (`courtSlot`).
   */
  private syncHaiBa(state: GameState): void {
    const dien = state.buildings.find((b) => b.type === 'dien');
    for (const kind of HAI_BA_KINDS) {
      const spot = haiBaJoined(state) ? this.haiBaSpot(state, kind, dien) : null;
      const key = spot ? `${spot.x}:${spot.y}:${spot.z}:${spot.ry}:${spot.onFoot}` : '';
      const cur = this.haiBa.get(kind);
      if ((cur?.key ?? '') === key) continue;
      if (cur) {
        this.scene.remove(cur.obj);
        disposeModel(cur.obj);
        this.haiBa.delete(kind);
      }
      if (!spot) continue;
      const obj = kind === 'trungTrac' ? makeTrungTrac({ onFoot: spot.onFoot }) : makeTrungNhi({ onFoot: spot.onFoot });
      obj.scale.setScalar(spot.onFoot ? 0.9 : HAI_BA_SCALE);
      obj.position.set(spot.x, spot.y, spot.z);
      obj.rotation.y = spot.ry;
      this.scene.add(obj);
      this.haiBa.set(kind, { obj, key, y: spot.y });
    }
  }

  /** Chỗ bà `kind` ở kinh đô: trong sân doanh trại (cưỡi voi), chưa có doanh trại thì đứng chầu trong sân Điện. */
  private haiBaSpot(state: GameState, kind: HaiBaKind, dien: Building | undefined): Required<HeroSpot> & { onFoot: boolean } | null {
    const post = heroPost(state);
    if (post) return { ...this.postSpot(post, kind), onFoot: false };
    return dien ? { ...this.courtSpot(dien, kind), onFoot: true } : null;
  }

  /**
   * Tướng đứng chầu trong sân Điện mà không có dáng truyện riêng ở kinh đô: Lạc tướng (luôn có), và tướng đã về trời,
   * về núi, xuống biển mà vẫn chỉ huy (hiển linh, có hào quang). Cùng với các dáng truyện (Gióng lúc nhỏ, Sơn Tinh cầu
   * hôn, An Dương Vương, Cao Lỗ), mọi tướng đã có đều đứng hai bên ngai vàng, trừ tướng đang ở doanh trại.
   */
  private syncCourt(state: GameState): void {
    const dien = state.buildings.find((b) => b.type === 'dien');
    const want = new Map<TuongId | NuTuongId, Required<HeroSpot>>();
    if (dien) {
      // Nữ tướng đã theo về đứng chầu hàng sau Hai Bà, kể cả khi đang ở doanh trại.
      for (const n of nuTuongList(state)) want.set(n, this.courtSpot(dien, n));
      for (const t of generals(state)) {
        const ghost =
          (t === 'giong' && !giongLook(state)) ||
          (t === 'sonTinh' && !sonLook(state)) ||
          (t === 'anDuong' && !advLook(state)) ||
          (t === 'caoLo' && !caoLoAtDien(state));
        if (t === 'lacTuong' || ghost) want.set(t, this.courtSpot(dien, t));
      }
    }
    for (const [t, v] of this.court) {
      const spot = want.get(t);
      if (spot && v.key === `${spot.x}:${spot.y}:${spot.z}:${spot.ry}`) continue;
      this.scene.remove(v.obj);
      disposeModel(v.obj);
      this.court.delete(t);
    }
    for (const [t, spot] of want) {
      if (this.court.has(t)) continue;
      const obj = isNuTuong(t)
        ? makeNuTuong(t)
        : t === 'giong'
          ? makeGiong('trangSi', { bamboo: true, glow: true, onFoot: true })
          : t === 'sonTinh'
            ? makeSonTinh({ glow: true })
            : t === 'anDuong'
              ? makeAnDuong({ crossbow: true, glow: true })
              : t === 'caoLo'
                ? makeCaoLo({ glow: true })
                : makeLacTuong();
      obj.scale.setScalar(t === 'sonTinh' ? 0.95 : 0.9);
      obj.position.set(spot.x, spot.y, spot.z);
      obj.rotation.y = spot.ry;
      this.scene.add(obj);
      this.court.set(t, { obj, key: `${spot.x}:${spot.y}:${spot.z}:${spot.ry}` });
    }
  }

  /**
   * Cảnh Tết, chỉ lúc Tết mở, trong sân chầu của Điện (khối `e`, `m` trong bản vẽ Điện): cây nêu bên trái lối giữa,
   * dây cờ đuôi nheo căng từ ngọn nêu tới hai cột cờ hai bên sân, mâm bánh đã dâng bày trước bệ ngai (chỉ loại đã
   * dâng), và một người ngồi trên chiếu gói bánh của bếp. Không có pháo. Điện đã xoay thì cả cảnh xoay theo.
   */
  private syncTet(state: GameState): void {
    const dien = state.buildings.find((b) => b.type === 'dien');
    const bep = state.buildings.find((b) => b.type === 'bep' && !b.damaged);
    const o = state.tet.offered;
    const h = (b: Building) => this.heights[b.z * GRID + b.x] ?? 0;
    const key =
      dien && tetOpen(state)
        ? [dien.x, dien.z, dien.rot ?? 0, dien.level, h(dien), o.chung, o.giay, bep ? `${bep.x},${bep.z},${bep.level},${h(bep)},${bep.rot ?? 0}` : '-'].join(':')
        : '';
    if (key === this.tetKey) return;
    this.tetKey = key;
    if (this.tetDecor) this.scene.remove(this.tetDecor);
    this.tetDecor = undefined;
    if (!key || !dien) return;
    const root = new THREE.Group();
    // Tọa độ trong bản vẽ Điện (gốc ở tâm móng) đổi ra tọa độ cảnh theo hướng xoay. Móng Điện phẳng nên mặt sân cùng
    // một độ cao.
    const y = topY(h(dien)) + 0.05;
    const turn = rotAngle(dien.rot);
    const at = (lx: number, lz: number, ly: number) => {
      const p = this.dienPoint(dien, lx, lz);
      return new THREE.Vector3(p.x, y + ly, p.z);
    };
    // Dây cờ buộc gần đầu hai cột cờ hai bên sân (Điện cấp 1 chưa có cột cờ thì buộc vào hai cọc mốc góc trước).
    const [left, right] =
      dien.level >= 2
        ? DIEN_LOT.groups('2').map((f) => at(f.x - 0.2, f.z, bannerHeight(dien.level) - 0.15))
        : [-1, 1].map((sx) => at(sx * 4.6, 4.6, 0.7));
    const e = DIEN_LOT.zone('e');
    const neu = this.makeNeu();
    neu.position.copy(at(e.x, e.z, 0));
    neu.rotation.y = Math.PI / 4 + turn;
    root.add(neu);
    const top = at(e.x, e.z, NEU_H - 0.3);
    root.add(this.makeFlagLine(top, left, 4));
    root.add(this.makeFlagLine(top, right, 9));
    if (o.chung || o.giay) {
      const m = DIEN_LOT.zone('m');
      const tray = this.makeTray(o.chung, o.giay);
      tray.position.copy(at(m.x, m.z, 0));
      tray.rotation.y = Math.PI / 4 + turn;
      root.add(tray);
    }
    if (bep) {
      // Một người ngồi xếp bằng trên chiếu gói bánh của bếp (trong móng, `BEP_TET_SEAT`), quay ra trước.
      const w = makeWorker('phuNu', true);
      w.scale.setScalar(PERSON_SCALE);
      const seat = turnLocal(bep.rot, BEP_TET_SEAT.x, BEP_TET_SEAT.z);
      w.position.set(wx(bep.x) + BUILDINGS.bep.w / 2 + seat.x, topY(h(bep)) + 0.08, wz(bep.z) + BUILDINGS.bep.d / 2 + seat.z);
      w.rotation.y = BEP_TET_SEAT.ry + rotAngle(bep.rot);
      root.add(w);
    }
    this.scene.add(root);
    this.tetDecor = root;
  }

  /** Cây nêu: cây tre cao, ngọn còn chùm lá, vòng tre, thanh ngang treo khánh đất nung, dải vải đỏ. Mặt chính theo trục x. */
  private makeNeu(): THREE.Group {
    const m = new ToonModel(inkThin);
    const p = m.plain;
    p.sphere(0.22, C.earthDark, 0, 0.02, 0, [1, 0.35, 1], 8);
    p.cyl(0.05, 0.07, NEU_H, C.bamboo, 0, NEU_H / 2, 0, undefined, 6);
    for (let i = 1; i < 10; i++) p.cyl(0.062, 0.062, 0.035, C.thatchDark, 0, i * 0.42, 0, undefined, 6);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const leaf = new THREE.ConeGeometry(0.05, 0.62, 4);
      leaf.scale(1, 1, 0.3);
      leaf.rotateX(1.95 + (i % 2) * 0.25);
      leaf.rotateY(a);
      p.add(leaf, i % 2 ? C.bamboo : 0x6f8f44, Math.sin(a) * 0.2, NEU_H - 0.08, Math.cos(a) * 0.2);
    }
    p.add(new THREE.TorusGeometry(0.2, 0.02, 5, 16), C.bamboo, 0, NEU_H - 0.42, 0);
    p.cyl(0.02, 0.02, 0.8, C.bamboo, 0, NEU_H - 0.7, 0, [0, 0, Math.PI / 2], 4);
    for (const x of [-0.36, -0.12, 0.12, 0.36]) {
      p.cyl(0.005, 0.005, 0.2, C.ink, x, NEU_H - 0.8, 0, undefined, 3);
      p.cone(0.08, 0.14, KHANH, x, NEU_H - 0.97, 0, [Math.PI, 0, 0], 3);
    }
    m.band.box(0.14, 1.4, 0.015, C.red, 0.09, NEU_H - 1.5, 0.06, [0, 0, -0.06]);
    m.band.box(0.1, 1.0, 0.015, C.bronzeLight, -0.09, NEU_H - 1.3, 0.06, [0, 0, 0.08]);
    return m.group();
  }

  /** Dây cờ đuôi nheo nhiều màu võng xuống giữa hai điểm (tọa độ cảnh). */
  private makeFlagLine(a: THREE.Vector3, b: THREE.Vector3, flags: number): THREE.Group {
    const m = new ToonModel(inkThin);
    const p = m.plain;
    const colors = [C.red, C.bronzeLight, C.indigo, 0x6f8f44, C.cream];
    const n = flags * 2;
    const sag = a.distanceTo(b) * 0.1;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push(new THREE.Vector3().lerpVectors(a, b, t).add(new THREE.Vector3(0, -sag * 4 * t * (1 - t), 0)));
    }
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < n; i++) {
      const d = new THREE.Vector3().subVectors(pts[i + 1], pts[i]);
      const mid = new THREE.Vector3().addVectors(pts[i], pts[i + 1]).multiplyScalar(0.5);
      const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize()));
      p.cyl(0.01, 0.01, d.length(), C.woodDark, mid.x, mid.y, mid.z, [e.x, e.y, e.z], 4);
    }
    // Cờ tam giác mũi chúc xuống, mặt cờ nằm dọc theo dây.
    const yaw = Math.atan2(b.x - a.x, b.z - a.z);
    for (let i = 1, k = 0; i < n; i += 2, k++) {
      const flag = new THREE.ConeGeometry(0.11, 0.3, 3);
      flag.rotateX(Math.PI);
      flag.scale(1, 1, 0.2);
      flag.rotateY(yaw - Math.PI / 2);
      p.add(flag, colors[k % colors.length], pts[i].x, pts[i].y - 0.15, pts[i].z);
    }
    return m.group();
  }

  /** Mâm đồng trên chân gỗ, bày chồng bánh chưng và bánh giầy đã dâng. Mặt chính theo trục x. */
  private makeTray(chung: boolean, giay: boolean): THREE.Group {
    const m = new ToonModel(inkThin);
    const p = m.plain;
    p.cyl(0.16, 0.22, 0.26, C.woodDark, 0, 0.13, 0, undefined, 10);
    p.cyl(0.46, 0.4, 0.05, C.bronze, 0, 0.285, 0, undefined, 18);
    p.add(new THREE.TorusGeometry(0.45, 0.02, 5, 20), C.bronzeDark, 0, 0.31, 0, [Math.PI / 2, 0, 0]);
    const both = chung && giay;
    const y = 0.31;
    if (chung) {
      const x0 = both ? -0.2 : 0;
      for (const dx of [-0.08, 0.08]) for (const dz of [-0.08, 0.08]) banhChung(p, x0 + dx, y, dz);
      banhChung(p, x0, y + 0.08, 0, 1, Math.PI / 4);
    }
    if (giay) {
      const x0 = both ? 0.2 : 0;
      for (const dx of [-0.075, 0.075]) for (const dz of [-0.075, 0.075]) banhGiay(p, x0 + dx, y, dz);
      banhGiay(p, x0, y + 0.05, 0);
    }
    return m.group();
  }

  /** Cột đá thề: trụ đá vuông trên bệ, mặt khắc vạch chữ, đỉnh vát. */
  private makePillar(): THREE.Group {
    const b = new ShapeBuilder();
    b.box(0.42, 0.08, 0.42, C.rockDark, 0, 0.04, 0);
    b.box(0.24, 0.9, 0.24, C.rock, 0, 0.53, 0);
    b.cone(0.18, 0.16, C.rockDark, 0, 1.06, 0, [0, Math.PI / 4, 0], 4);
    for (let i = 0; i < 5; i++) b.box(0.12, 0.02, 0.01, C.ink, 0, 0.3 + i * 0.12, 0.122);
    const g = new THREE.Group();
    const mesh = b.mesh(toon);
    g.add(mesh, outlineOf(mesh.geometry, inkThin));
    return g;
  }

  /** Rùa Vàng bơi qua bơi lại trên sông phía nam kinh đô, từ khi hiện lên diệt yêu tinh. */
  private syncTurtle(state: GameState): void {
    // Đã có Hồ Kim Quy thì thần về ở hồ (rùa bơi trong mô hình hồ), không bơi trên sông nữa.
    const want = ruaVangCame(state) && !state.buildings.some((b) => b.type === 'hoKimQuy');
    if (want && !this.turtle) {
      this.turtle = makeRuaVang();
      this.turtle.scale.setScalar(0.55);
      this.scene.add(this.turtle);
    } else if (!want && this.turtle) {
      this.scene.remove(this.turtle);
      this.turtle = undefined;
    }
  }

  /** Người chơi chạm vào tướng (ở doanh trại hay trước Điện): Gióng, Sơn Tinh, An Dương Vương hay Cao Lỗ. */
  pickHero(clientX: number, clientY: number): 'giong' | 'son' | 'adv' | 'caoLo' | null {
    const ray = this.view.setRay(clientX, clientY);
    if (this.giong && ray.intersectObject(this.giong.obj, true).length) return 'giong';
    if (this.son && ray.intersectObject(this.son.obj, true).length) return 'son';
    if (this.adv && ray.intersectObject(this.adv.obj, true).length) return 'adv';
    if (this.caoLo && ray.intersectObject(this.caoLo.obj, true).length) return 'caoLo';
    // Tướng hiển linh đứng chầu trong sân Điện cũng mở bảng của tướng ấy (Lạc tướng không có bảng riêng).
    const panel: Partial<Record<TuongId, 'giong' | 'son' | 'adv' | 'caoLo'>> = { giong: 'giong', sonTinh: 'son', anDuong: 'adv', caoLo: 'caoLo' };
    for (const [t, v] of this.court) {
      const id = isNuTuong(t) ? undefined : panel[t];
      if (id && ray.intersectObject(v.obj, true).length) return id;
    }
    return null;
  }

  /** Id công trình (trừ lũy tre, đê) dưới vị trí chạm, ưu tiên phần nhô cao như mái nhà. */

  pickBuildingId(clientX: number, clientY: number): number | null {
    const ray = this.view.setRay(clientX, clientY);
    const hits = ray.intersectObjects(this.buildingsRoot.children, true);
    for (const hit of hits) {
      let o: THREE.Object3D | null = hit.object;
      while (o && o.userData.buildingId === undefined) o = o.parent;
      if (o) return o.userData.buildingId as number;
    }
    return null;
  }

  /** Vị trí màn hình của điểm cao `lift` trên mặt đất ở tọa độ ô (x, z) (số thực); null khi ra sau camera. */
  screenAt(x: number, z: number, lift: number): { x: number; y: number } | null {
    const p = new THREE.Vector3(wx(x), this.groundY(Math.floor(x), Math.floor(z)) + lift, wz(z)).project(this.view.camera);
    if (p.z > 1 || p.z < -1) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    return { x: rect.left + ((p.x + 1) / 2) * rect.width, y: rect.top + ((1 - p.y) / 2) * rect.height };
  }

  /** Vị trí màn hình của tâm ô (x, z). Dùng cho kiểm thử tự động. */
  tileToScreen(x: number, z: number): { x: number; y: number } {
    const p = new THREE.Vector3(wx(x) + 0.5, this.groundY(x, z), wz(z) + 0.5).project(this.view.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    return { x: rect.left + ((p.x + 1) / 2) * rect.width, y: rect.top + ((1 - p.y) / 2) * rect.height };
  }

  screenCenterTile(): { x: number; z: number } {
    return { x: Math.floor(this.view.target.x + HALF), z: Math.floor(this.view.target.z + HALF) };
  }

  /** Lướt camera để công trình hiện ra ở vị trí màn hình (screenX, screenY), ví dụ phần không bị bảng che. */
  focusOn(b: Pick<Building, 'type' | 'x' | 'z'>, screenX: number, screenY: number): void {
    const def = BUILDINGS[b.type];
    const at = this.view.groundPoint(screenX, screenY);
    if (!at) return;
    const goal = this.view.target.clone();
    goal.x += wx(b.x) + def.w / 2 - at.x;
    goal.z += wz(b.z) + def.d / 2 - at.z;
    this.panGoal = goal;
  }

  /**
   * Thuyền đánh cá của làng chài: bơi chậm một vòng bầu dục quanh chỗ neo (dọc bờ xa nhất `span` ô), mũi thuyền theo
   * hướng đi, người lái đò chèo theo nhịp. Tọa độ móng làng chài.
   */
  private rowFishingBoat(boat: THREE.Object3D, t: number): void {
    const f = boat.userData.fishing as { x: number; z: number; span: number };
    const a = t * 0.22 + f.x * 3 + f.z;
    const depth = 0.22;
    boat.position.x = f.x + f.span * Math.sin(a);
    boat.position.z = f.z + depth * Math.cos(a);
    // Mũi thuyền (+x của mô hình) theo hướng đi: vận tốc (span·cos a, −depth·sin a).
    boat.rotation.y = Math.atan2(depth * Math.sin(a), f.span * Math.cos(a));
    (boat.userData.pose as Poser | undefined)?.({ act: 'walk', phase: t * 3 + f.x * 5 });
  }

  /**
   * Rùa Vàng trong Hồ Kim Quy: bơi chậm vòng bầu dục quanh gò giữa hồ (`Swim`, tọa độ móng), đầu theo hướng bơi,
   * nhấp nhô theo sóng; mỗi vòng có lúc lặn xuống nửa mai rồi nổi lên.
   */
  private swimTurtle(turtle: THREE.Object3D, t: number): void {
    const f = turtle.userData.swim as Swim;
    const a = t * 0.16;
    turtle.position.x = f.x + f.rx * Math.cos(a);
    turtle.position.z = f.z + f.rz * Math.sin(a);
    const dive = Math.max(0, Math.sin(a * 0.5 + 1)) ** 6;
    turtle.position.y = f.y + Math.sin(t * 1.3) * 0.015 - dive * 0.06;
    // Đầu rùa (+z của mô hình) theo hướng bơi: vận tốc (−rx·sin a, rz·cos a).
    turtle.rotation.y = Math.atan2(-f.rx * Math.sin(a), f.rz * Math.cos(a));
    (turtle.userData.pose as Poser | undefined)?.({ act: 'walk', phase: t * 2.4 });
  }

  /** Động tác theo nghề (people.ts): cúi bổ cuốc, bổ đá, quai búa, đi qua đi lại mang hàng, đứng gác nhìn quanh. */
  /**
   * Dân `w` đứng trên công trình (hay giàn giáo) `group` có trong khung nhìn khung này thì hiện, trả true; ngoài khung
   * thì ẩn. `group` là con trực tiếp của `buildingsRoot` (không dời, không xoay) nên ma trận của nó là ma trận thế giới,
   * và đã `updateMatrix` trước khi gọi (công trình vừa dựng chưa qua lần vẽ nào, đang nảy hay mọc thì cỡ đổi mỗi khung).
   */
  private workerInView(w: WorkerView, group: THREE.Object3D): boolean {
    const ball = this.workerBall;
    ball.center.copy(w.obj.position).applyMatrix4(group.matrix);
    ball.center.y += WORKER_RADIUS / 2;
    const seen = this.viewFrustum.intersectsSphere(ball);
    w.obj.visible = seen;
    return seen;
  }

  private animateWorker(w: WorkerView, t: number): void {
    const { obj, spot, phase } = w;
    const pose = obj.userData.pose as Poser | undefined;
    const walk = spot.job === 'buon' || spot.job === 'giuKho' ? (spot.walk ?? 0) : 0;
    if (walk) {
      const k = t * 0.7 + phase;
      obj.position.x = spot.x + Math.sin(k) * walk;
      obj.rotation.y = Math.cos(k) >= 0 ? Math.PI / 2 : -Math.PI / 2;
      pose?.({ act: 'walk', phase: t * 8 + phase, stride: 0.45, time: t + phase });
      return;
    }
    if (spot.job === 'phuNu' || spot.job === 'lacHau' || spot.job === 'linhGac') obj.rotation.y = spot.ry + 0.25 * Math.sin(t * 0.5 + phase);
    pose?.({ act: 'stand', time: t + phase });
  }

  /** Dải đỏ nhấp nháy ở bìa rừng (giặc Ân) hay trên mặt sông (thủy quái) phía giặc sắp tới; null để tắt. */
  setRaidWarning(side: RaidSide | null): void {
    this.warning.visible = !!side;
    if (!side) return;
    const len = RIVER_START;
    // Giặc trên bộ ra từ dải ở bìa rừng (`raidSpawnBand`): dải đỏ phủ đúng chỗ ấy.
    const band = this.state ? raidSpawnBand(this.state) : { lo: FOREST_BAND, from: 0.6, to: 2 };
    const along = RIVER_START - band.lo;
    const deep = Math.max(3, band.to - band.from + 2);
    const mid = (band.from + band.to) / 2;
    if (side === 'bac') {
      this.warning.scale.set(along, 1, deep);
      this.warning.position.set(wx(band.lo) + along / 2, 1.0, wz(0) + mid);
    } else if (side === 'tay') {
      this.warning.scale.set(deep, 1, along);
      this.warning.position.set(wx(0) + mid, 1.0, wz(band.lo) + along / 2);
    } else if (side === 'namXa' || side === 'dongXa') {
      // Bìa rừng ngoài cùng bên kia sông, dọc suốt bờ.
      const span = RIVER_START - FOREST_BAND;
      const depth = GRID - FAR_FOREST + 1;
      if (side === 'namXa') {
        this.warning.scale.set(span, 1, depth);
        this.warning.position.set(wx(FOREST_BAND) + span / 2, 1.0, wz(FAR_FOREST) + depth / 2 - 0.5);
      } else {
        this.warning.scale.set(depth, 1, span);
        this.warning.position.set(wx(FAR_FOREST) + depth / 2 - 0.5, 1.0, wz(FOREST_BAND) + span / 2);
      }
    } else if (side === 'nam') {
      this.warning.scale.set(len, 1, 2.6);
      this.warning.position.set(wx(0) + len / 2, WATER_Y + 0.08, wz(RIVER_START) + 1.4);
    } else {
      this.warning.scale.set(2.6, 1, len);
      this.warning.position.set(wx(RIVER_START) + 1.4, WATER_Y + 0.08, wz(0) + len / 2);
    }
  }

  /**
   * Xoay cảnh kinh đô một nấc 90° quanh tâm nhìn (1: theo chiều kim đồng hồ, −1: ngược lại).
   * Ở bãi chiến thì không xoay. Trả về hướng nhìn mới (0–3).
   */
  rotateView(dir: 1 | -1): number {
    if (!this.inField) {
      // Xoay quanh đúng chỗ đang nhìn: bỏ lướt camera dở dang.
      this.panGoal = null;
      this.view.rotate(dir);
    }
    return this.view.facing;
  }

  /** Lướt camera tới phía giặc tới. */
  lookAtEdge(side: RaidSide): void {
    const band = this.state ? raidSpawnBand(this.state) : { lo: FOREST_BAND, from: 0.6, to: 2 };
    const along = (band.lo + RIVER_START) / 2;
    const deep = band.to + 3;
    const bank = RIVER_START - 4;
    // Bên kia sông: bìa rừng ngoài cùng bên ấy, quãng giữa bờ.
    const farDeep = FAR_FOREST - 3;
    const at: Record<RaidSide, [number, number]> = {
      bac: [along, deep],
      tay: [deep, along],
      nam: [along, bank],
      dong: [bank, along],
      namXa: [RIVER_START / 2, farDeep],
      dongXa: [farDeep, RIVER_START / 2],
    };
    const [x, z] = at[side];
    this.panGoal = new THREE.Vector3(wx(x), 0, wz(z));
  }

  /** Vẽ lính hai bên của trận giữ kinh đô; null khi không có trận. */
  updateBattle(battle: Battle | null, dt: number): void {
    this.raidView.update(battle, dt);
  }

  get inField(): boolean {
    return this.cityCam !== null;
  }

  /** Bãi chiến (dựng lần đầu khi cần). */
  private battlefield(): Battlefield {
    if (!this.field) {
      this.field = new Battlefield();
      this.field.setShadows(this.bongDo);
    }
    return this.field;
  }

  /** Hủy các việc dựng sẵn bãi chiến còn chờ lúc rảnh (`prepareField`). */
  private fieldPrep: (() => void) | null = null;

  /**
   * Dựng sẵn bãi chiến nền `terrain`, bố cục `bai` khi người chơi đang xếp quân, mỗi lần trình duyệt rảnh một việc (bảng
   * xếp quân đã hiện): cảnh bãi chiến trước (lợi nhất; rồi gửi dịch sẵn shader của bãi chiến), rồi từng nhân vật trong
   * `jobs` (`fieldJobs` ở nanTruoc.ts) để giữ sẵn dáng. Lúc xuất quân `showField` thấy đúng nền, bố cục đã dựng thì khỏi
   * dựng lại, lính dựng từ dáng có sẵn, nên khung vào trận nhẹ đi. Đang ở bãi chiến thì thôi; xuất quân trước khi xong
   * thì bỏ phần còn lại.
   */
  prepareField(terrain: Terrain, bai: string | null, jobs: readonly ViecNan[] = []): void {
    this.fieldPrep?.();
    this.fieldPrep = null;
    if (this.inField) return;
    const tasks: (() => void)[] = [
      () => {
        const field = this.battlefield();
        field.setTerrain(terrain, bai);
        this.renderer.compileAsync(field.scene, this.view.camera).catch(() => undefined);
      },
      ...jobs.map((j) => () => runJob(j)),
    ];
    let cancel = () => {};
    // Lúc rảnh thì làm liền nhiều việc khi còn thời gian rảnh; gọi vì quá hạn (máy bận) thì mỗi lần một việc.
    const next = (deadline?: IdleDeadline) => {
      do {
        const task = tasks.shift();
        if (!task || this.inField) {
          this.fieldPrep = null;
          return;
        }
        try {
          task();
        } catch {
          // Nhân vật nào hỏng ở đây thì lúc vào trận dựng như cũ.
        }
      } while (deadline && !deadline.didTimeout && deadline.timeRemaining() > PREP_SLACK_MS);
      later();
    };
    const later = () => {
      if (typeof requestIdleCallback === 'function') {
        const id = requestIdleCallback(next, { timeout: 600 });
        cancel = () => cancelIdleCallback(id);
      } else {
        const id = setTimeout(next, 60);
        cancel = () => clearTimeout(id);
      }
    };
    later();
    this.fieldPrep = () => cancel();
  }

  /** Sang bãi chiến với nền `terrain` và bố cục vật cản `bai` (`baiChien.ts`), hoặc về lại kinh đô khi `terrain` là null. */
  showField(terrain: Terrain | null, bai: string | null = null): void {
    const v = this.view;
    if (terrain) {
      this.fieldPrep?.();
      this.fieldPrep = null;
      this.battlefield().setTerrain(terrain, bai);
      if (!this.cityCam) this.cityCam = { target: v.target.clone(), zoom: v.zoom, bounds: { ...v.bounds }, facing: v.facing };
      this.panGoal = null;
      // Bãi chiến vẽ cho hướng nhìn mặc định: quân ta ở dưới, giặc ở trên.
      v.setFacing(0);
      v.bounds = { min: -6, max: 6 };
      v.target.set(0, 0, 0);
      this.fitField();
      return;
    }
    if (!this.cityCam) return;
    v.bounds = this.cityCam.bounds;
    v.target.copy(this.cityCam.target);
    v.zoom = this.cityCam.zoom;
    v.setFacing(this.cityCam.facing);
    this.cityCam = null;
    this.field?.update(null, 0);
  }

  /**
   * Vừa khít bề ngang bãi, chừa chỗ cho lính đứng sát mép. Bãi Mộ Dạ (màn cầm cự) nhìn rộng sang phải hơn để thấy
   * đường ngựa vua chạy dọc mép bãi và biển; bãi Cấm Khê nhìn rộng để thấy đường mòn dân rút bên trái và suối bên phải.
   */
  private fitField(): void {
    const v = this.view;
    if (this.field?.current === 'camKhe') {
      v.zoomToFit(CAM_KHE.view.w, CAM_KHE.view.h);
      const dx = CAM_KHE.view.x - FIELD.w / 2;
      v.target.set(Math.SQRT1_2 * dx, 0, -Math.SQRT1_2 * dx);
      return;
    }
    if (this.field?.current === 'moDa') {
      v.zoomToFit(FIELD.w + 6, FIELD.d * 0.62 + 5);
      // Dời tâm nhìn sang phải bãi chừng 2 ô (bãi xoay 45°).
      v.target.set(Math.SQRT1_2 * 2, 0, -Math.SQRT1_2 * 2);
      return;
    }
    v.zoomToFit(FIELD.w + 1.5, FIELD.d * 0.62 + 3);
  }

  /** Vẽ trận ngoài bãi đang diễn ra. Cảnh kết chương có điểm nhìn riêng (Rùa Vàng ở biển) thì camera lướt tới đó. */
  updateField(battle: Battle | null, dt: number): void {
    this.field?.update(battle, dt);
    const focus = this.inField ? this.field?.focus() : null;
    if (!focus) return;
    const v = this.view;
    v.bounds = { min: -30, max: 30 };
    const k = Math.min(1, dt * 1.2);
    v.target.x += (focus.x - v.target.x) * k;
    v.target.z += (focus.z - v.target.z) * k;
    const wide = v.fitZoom(FIELD.w + 16, FIELD.d * 0.8 + 10);
    v.zoom += (wide - v.zoom) * k;
    v.apply();
  }

  /** Gỡ bóng mờ công trình đang đặt: trả hình và các chất liệu mờ nhân bản riêng cho nó. */
  private dropGhost(): void {
    if (!this.ghost) return;
    this.scene.remove(this.ghost);
    this.ghost.traverse((o) => {
      if (o instanceof THREE.Mesh) for (const m of [o.material].flat()) (m as THREE.Material).dispose();
    });
    disposeModel(this.ghost);
    this.ghost = undefined;
  }

  /** Bóng mờ của công trình sắp đặt ở mặt đất bậc `h`, xoay `rot` nấc 90°, viền xanh nếu đặt được, đỏ nếu không. */
  setGhost(type: BuildingType | null, x = 0, z = 0, valid = true, h = 0, rot = 0): void {
    if (!type) {
      this.dropGhost();
      this.footprint.visible = false;
      return;
    }
    const def = BUILDINGS[type];
    // Bóng cầu gác đầu lên mặt bờ ở chỗ đặt, nên dời tới chỗ bờ cao thấp khác thì dựng lại.
    const banks = isBridge(type) ? this.bridgeBanks(type, x, z) : undefined;
    const stair = type === 'bacThanh' ? this.stairOf({ x, z }) : undefined;
    const key = `${type}:${stair?.key ?? bankKey(banks)}`;
    if (!this.ghost || this.ghost.userData.key !== key) {
      this.dropGhost();
      this.ghost = this.makeBuilding(type, 1, false, banks, stair?.rise);
      this.ghost.userData.type = type;
      this.ghost.userData.key = key;
      // Mỗi bộ hình có chất liệu riêng, nên làm mờ bằng cách nhân bản chất liệu của chính nó.
      this.ghost.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          const toGhost = (m: THREE.Material) => {
            const g = m.clone();
            g.transparent = true;
            g.opacity = 0.6;
            g.depthWrite = false;
            return g;
          };
          o.material = Array.isArray(o.material) ? o.material.map(toGhost) : toGhost(o.material);
          o.castShadow = false;
        }
      });
      this.scene.add(this.ghost);
    }
    const y = topY(h);
    this.ghost.position.set(wx(x) + def.w / 2, y + 0.02, wz(z) + def.d / 2);
    this.ghost.rotation.y = def.nearRiver ? riverFacing(x, z, def.w, def.d) : rotAngle(rot);
    // Cổng thành, cống đê: bóng xoay theo đoạn tường ở chỗ đặt, như khi đã dựng; bậc lên thành quay về đoạn thành.
    if (GATE_TYPES.includes(type) && this.state) {
      const walls = new Set(this.state.buildings.filter((w) => GATE_WALLS.includes(w.type)).map((w) => w.z * GRID + w.x));
      this.ghost.rotation.y = gateTurn(this.state, { x, z }, walls);
    }
    if (stair) this.ghost.rotation.y = stair.turn;
    this.footprint.visible = true;
    this.footprint.scale.set(def.w, 1, def.d);
    this.footprint.position.set(wx(x) + def.w / 2, y + 0.03, wz(z) + def.d / 2);
    (this.footprint.material as THREE.MeshBasicMaterial).color.set(valid ? 0x4caf50 : 0xe53935);
  }

  /** Tô dải ô đang kéo thả trải đường: xanh ô trải được, đỏ ô không; null để tắt. */
  setLinePreview(cells: { x: number; z: number; ok: boolean }[] | null): void {
    this.linePick.begin();
    for (const c of cells ?? []) {
      this.linePick.add(0.9, 0.06, 0.9, c.ok ? 0x4caf50 : 0xe53935, wx(c.x) + 0.5, this.groundY(c.x, c.z) + 0.06, wz(c.z) + 0.5);
    }
    this.linePick.end();
  }

  /** Tô vàng mờ các ô của khoảnh rừng `id` (đang mở bảng Khoảnh rừng); null để tắt. */
  setChunkSelection(id: number | null): void {
    this.chunkPicked = id ?? -1;
    this.chunkPick.begin();
    if (id !== null && id >= 0 && id < KHOANH_N * KHOANH_N) {
      const o = khoanhOrigin(id);
      for (let dx = 0; dx < KHOANH; dx++) {
        for (let dz = 0; dz < KHOANH; dz++) {
          const x = o.x + dx;
          const z = o.z + dz;
          this.chunkPick.add(0.94, 0.05, 0.94, 0xffd54a, wx(x) + 0.5, this.groundY(x, z) + 0.05, wz(z) + 0.5);
        }
      }
    }
    this.chunkPick.end();
  }

  /** Tô vàng khoảnh bên kia sông `id` (bảng Đất bên kia sông); null để tắt. */
  setFarSelection(id: number | null): void {
    this.chunkPicked = -1;
    this.chunkPick.begin();
    if (id !== null && id >= 0 && id < FAR_PLOTS) {
      const o = plotOrigin(id);
      for (let dx = 0; dx < KHOANH; dx++) {
        for (let dz = 0; dz < KHOANH; dz++) {
          const x = o.x + dx;
          const z = o.z + dz;
          this.chunkPick.add(0.94, 0.05, 0.94, 0xffd54a, wx(x) + 0.5, this.groundY(x, z) + 0.05, wz(z) + 0.5);
        }
      }
    }
    this.chunkPick.end();
  }

  setSelection(b: Building | null): void {
    if (!b) {
      this.selection.visible = false;
      return;
    }
    const def = BUILDINGS[b.type];
    this.selection.visible = true;
    this.selection.scale.set(def.w + 0.15, 1, def.d + 0.15);
    this.selection.position.set(wx(b.x) + def.w / 2, this.groundY(b.x, b.z) + 0.06, wz(b.z) + def.d / 2);
  }

  update(dt: number): void {
    this.time += dt;
    const t = this.time;

    this.view.tick(dt);
    this.followView();
    this.updateForestLod();
    if (this.panGoal) {
      const before = this.view.target.clone();
      this.view.target.lerp(this.panGoal, 1 - Math.exp(-dt * 9));
      this.view.apply();
      // Tới nơi, hoặc đích nằm ngoài ranh giới kéo (tâm nhìn bị giữ lại, không nhích nữa) thì thôi lướt.
      if (this.view.target.distanceTo(this.panGoal) < 0.01 || (dt > 0 && this.view.target.distanceTo(before) < 1e-4)) this.panGoal = null;
    }

    // Dân ngoài khung nhìn thì ẩn, khỏi vẽ và khỏi tính tư thế. Nhân vật có xương không tự cắt theo khung nhìn
    // (`frustumCulled = false` ở `rig.ts`), nên không xét ở đây thì cả trăm dân kinh đô đều vẽ mỗi khung.
    const cam = this.view.camera;
    cam.updateMatrixWorld();
    this.viewFrustum.setFromProjectionMatrix(this.frustumMat.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    for (const site of this.sites.values()) {
      site.group.updateMatrix();
      for (const w of site.people) if (this.workerInView(w, site.group)) this.animateWorker(w, t);
    }
    // Lính tập trong sân doanh trại đổi tư thế theo nhịp hô "một, hai"; thu nhỏ (`LITE_ZOOM`) thì đứng yên; có trận giữ
    // kinh đô thì đã ra trận (−1: không nhóm nào hiện). Đồng hồ cảnh có lúc âm (chụp thử tua giờ) nên lấy số dư dương.
    const beat = this.drillOut ? -1 : this.view.zoom < LITE_ZOOM ? 0 : ((Math.floor(t * DRILL_BEAT) % 2) + 2) % 2;
    for (const v of this.views.values()) {
      if (v.people.length) v.group.updateMatrix();
      for (const w of v.people) if (this.workerInView(w, v.group)) this.animateWorker(w, t);
      if (v.dung) this.growView(v);
      if (v.popAge > 0) {
        v.popAge += dt;
        const k = Math.min(v.popAge / 0.4, 1);
        v.group.scale.setScalar(v.baseScale * (1 + 0.2 * Math.sin(Math.PI * k) * (1 - k * 0.5)));
        if (k >= 1) {
          v.popAge = 0;
          v.group.scale.setScalar(v.baseScale);
        }
      }
      for (const child of v.group.children) {
        if (child.userData.dock !== undefined) child.position.y = (child.userData.dock as number) + Math.sin(t * 1.6 + v.group.id) * 0.03;
        if (child.userData.fishing) this.rowFishingBoat(child, t);
        if (child.userData.swim) this.swimTurtle(child, t + v.group.id);
        if (child.userData.drill !== undefined) child.visible = child.userData.drill === beat;
        if (child.userData.flame) child.scale.y = 0.75 + 0.35 * Math.abs(Math.sin(t * 9 + child.id));
        if (child.userData.spin) child.rotation.x = t * (child.userData.spin as number);
        if (child.userData.door) {
          // Cánh cổng thành khép dần khi có giặc, mở dần khi yên.
          const goal = this.gatesShut ? 0 : (child.userData.door as number) * DOOR_OPEN;
          child.rotation.y += (goal - child.rotation.y) * (1 - Math.exp(-dt * 3));
        }
        if (child.userData.phai !== undefined) {
          // Ván phai cống đê kéo lên dần khi mở, thả xuống dần khi đóng.
          const goal = v.group.userData.mo ? (child.userData.phai as number) : 0;
          child.position.y += (goal - child.position.y) * (1 - Math.exp(-dt * 2.5));
        }
        if (child.userData.smoke) {
          for (const puff of child.children) {
            const k = (t * 0.35 + (puff.userData.phase as number)) % 1;
            puff.position.set(Math.sin(k * 6 + puff.id) * 0.2, k * 1.6, Math.cos(k * 5) * 0.15);
            puff.scale.setScalar(0.6 + k * 1.2);
            const mat = (puff as THREE.Mesh).material as THREE.MeshBasicMaterial;
            mat.opacity = 0.5 * (1 - k);
            // Khói không nhận đèn: tối theo trời, không thì sáng trắng giữa đêm.
            const goc = (mat.userData.mauGoc ??= mat.color.clone()) as THREE.Color;
            mat.color.copy(goc).multiply(this.troi.unlit);
          }
        }
      }
    }

    if (this.merchantBoat) {
      this.merchantBoat.position.y = WATER_Y - 0.02 + Math.sin(t * 1.2) * 0.04;
    }

    // Biển Đông: sóng vỗ bờ, cá voi, cá heo, thuyền khơi đi về.
    if (!this.inField) {
      animateSea(this.sea, t, this.view.zoom);
      // Biển còn mây mù thì chưa thấy cá voi, cá heo.
      if (!this.seaMist) this.seaLife.update(t, dt, this.view.target);
      this.updateSeaMist(dt);
      for (const boat of this.seaBoats.values()) this.moveSeaBoat(boat, t);
      this.moveFleet(t);
    }

    // Cây dại, tảng đá mới mọc: lớn dần lên, nhún nhẹ khi đủ cỡ.
    let grown = false;
    for (const [i, o] of this.cayDaGrowing) {
      const k = Math.min((o.userData.grow as number) + dt / 0.6, 1);
      o.userData.grow = k;
      o.scale.setScalar(Math.max(0.01, k * (1 + 0.15 * Math.sin(Math.PI * k))));
      if (k >= 1) {
        this.dropGrowing(i);
        grown = true;
      }
    }
    if (grown) this.rebuildCayDaBatch();

    if (this.son) {
      // Sơn Tinh đứng chờ, tay gậy đung đưa.
      (this.son.obj.userData.pose as Poser | undefined)?.({ act: 'stand', time: t });
    }

    if (this.adv) {
      // An Dương Vương đứng nhún nhẹ, nỏ (hay rìu) khẽ đưa lên xuống.
      this.adv.obj.position.y = this.adv.y + Math.abs(Math.sin(t * 1.6)) * 0.02;
      (this.adv.obj.userData.pose as Poser | undefined)?.({ act: 'stand', time: t });
    }

    let courtI = 0;
    for (const v of this.court.values()) {
      // Tướng đứng chầu thở nhẹ, mỗi người một nhịp.
      (v.obj.userData.pose as Poser | undefined)?.({ act: 'stand', time: t + 1.3 * courtI++ });
    }

    if (this.caoLo) {
      // Cao Lỗ đứng nghỉ, nỏ cầm ngang thắt lưng, khẽ nhún.
      this.caoLo.obj.position.y = this.caoLo.y + Math.abs(Math.sin(t * 1.5 + 1)) * 0.02;
      (this.caoLo.obj.userData.pose as Poser | undefined)?.({ act: 'stand', time: t + 2 });
    }

    for (const [kind, h] of this.haiBa) {
      // Hai voi đứng chầu, khẽ nhún, mỗi voi một nhịp.
      const off = kind === 'trungTrac' ? 0 : 1.3;
      h.obj.position.y = h.y + Math.abs(Math.sin(t * 1.2 + off)) * 0.015;
      (h.obj.userData.pose as Poser | undefined)?.({ act: 'stand', time: t + off });
    }

    if (this.turtle) {
      // Bơi dọc sông phía nam, tới đầu thì quay lại; đầu ngóc nhấp nhô theo sóng.
      const span = RIVER_START - 5;
      const k = (t * 0.045) % 2;
      const along = k < 1 ? k : 2 - k;
      const lane = RIVER_START - HALF + 1.3;
      this.turtle.position.set(-HALF + 2 + along * span, WATER_Y - 0.05 + Math.sin(t * 1.3) * 0.03, lane);
      this.turtle.rotation.y = k < 1 ? Math.PI / 2 : -Math.PI / 2;
      (this.turtle.userData.pose as Poser | undefined)?.({ act: 'walk', phase: t * 2.6 });
    }

    this.updateStorm(dt);
    this.updateDen(t);
    this.updateFog(dt);
    this.updateScouts(t);
    this.updateMarch(dt, t);
    this.updateNight(dt);

    if (this.giong) {
      const g = this.giong;
      // Cậu bé lắc lư, thiếu niên cúi ăn cơm, ngựa sắt thở ra lửa.
      if (g.ride) g.obj.position.y = g.y + Math.abs(Math.sin(t * 2)) * 0.03;
      (g.obj.userData.pose as Poser | undefined)?.({ act: 'stand', time: t });
    }

    for (const boat of this.boats) {
      boat.pos += boat.speed * dt;
      if (boat.axis === 'z' && boat.pos > BOAT_LANE) {
        // Xuôi sông Thao tới ngã ba: rẽ sang sông Đà, xuôi về phía đông.
        boat.axis = 'x';
        boat.pos = BOAT_LANE;
        boat.obj.rotation.y = 0;
        boat.obj.position.set(BOAT_LANE, boat.obj.position.y, BOAT_LANE);
      }
      if (boat.pos > 45) {
        boat.pos = -45;
        if (boat.home === 'z' && boat.axis === 'x') {
          // Thuyền sông Thao đi hết sông Đà thì lại xuôi từ đầu sông Thao.
          boat.axis = 'z';
          boat.obj.rotation.y = -Math.PI / 2;
          boat.obj.position.x = BOAT_LANE;
        }
      }
      if (boat.axis === 'z') boat.obj.position.z = boat.pos;
      else boat.obj.position.x = boat.pos;
      boat.obj.position.y = WATER_Y - 0.02 + Math.sin(t * 1.4 + boat.speed * 10) * 0.03;
      (boat.obj.userData.pose as Poser | undefined)?.({ act: 'walk', phase: t * 3 + boat.speed * 10 });
    }

    this.ripples.begin();
    for (const r of this.rippleState) {
      r.pos += dt * 0.9;
      // Gợn sóng sông Thao chỉ tới ngã ba; sông Đà chảy suốt.
      const limit = r.axis === 'z' ? RIVER_END - HALF : 40;
      if (r.pos > limit) r.pos = -40;
      const x = r.axis === 'x' ? r.pos : r.lane;
      const z = r.axis === 'x' ? r.lane : r.pos;
      const w = r.axis === 'x' ? r.len : 0.06;
      const d = r.axis === 'x' ? 0.06 : r.len;
      this.ripples.add(w, 0.02, d, C.ripple, x, WATER_Y + 0.01, z);
    }
    this.ripples.end();

    if (this.warning.visible) {
      (this.warning.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.abs(Math.sin(t * 4)) * 0.3;
    }

    if (this.selection.visible) {
      (this.selection.material as THREE.LineBasicMaterial).opacity = 0.6 + Math.sin(t * 5) * 0.4;
    }

    this.renderer.render(this.inField && this.field ? this.field.scene : this.scene, this.view.camera);
  }

  /**
   * Đèn đuốc theo độ tối (`toiGio`, tính ở `updateStorm`): đuốc ở công trình thắp dần từ lúc chiều tà, thuyền mang đèn,
   * đom đóm bay quanh ruộng gần chỗ camera nhìn lúc đêm khuya, trời không mưa.
   */
  private updateDen(t: number): void {
    const sang = THREE.MathUtils.smoothstep(this.toiGio, 0.15, 0.45);
    this.duoc.update(sang, t);
    this.denThuyen.begin(sang, t);
    if (sang > 0.001) {
      const p = this.denTmp;
      const lamp = (o: THREE.Object3D, lift: number) => {
        o.getWorldPosition(p);
        this.denThuyen.add(p.x, p.y + lift, p.z);
      };
      for (const b of this.boats) lamp(b.obj, 0.4);
      if (this.merchantBoat) lamp(this.merchantBoat, 0.55);
      for (const b of this.seaBoats.values()) lamp(b.obj, 0.55);
      for (const v of this.views.values()) for (const c of v.group.children) if (c.userData.dock !== undefined) lamp(c, 0.4);
    }
    this.denThuyen.end();

    const khuya = THREE.MathUtils.smoothstep(this.toiGio, 0.7, 1) * (1 - Math.min(1, this.storm * 10));
    this.domDom.begin(khuya, t);
    if (khuya > 0.001) {
      const c = this.view.target;
      let k = 0;
      for (const v of this.views.values()) {
        if (v.type !== 'ruong' && v.type !== 'ruongNep' && v.type !== 'vuon') continue;
        const g = v.group.position;
        if (Math.abs(g.x - c.x) > 18 || Math.abs(g.z - c.z) > 18) continue;
        const r = BUILDINGS[v.type].w / 2;
        for (let i = 0; i < 4; i++, k++) {
          const ph = k * 2.399;
          this.domDom.add(
            g.x + Math.sin(t * 0.31 + ph) * r * 0.9,
            g.y + 0.45 + Math.sin(t * 0.9 + ph * 1.7) * 0.2,
            g.z + Math.cos(t * 0.27 + ph * 1.3) * r * 0.9,
            0.6 + 0.4 * Math.max(0, Math.sin(t * 2.3 + ph * 3.1)),
          );
        }
      }
    }
    this.domDom.end();
  }

  /** Đêm yêu tinh: ma trơi bập bềnh, sáng mờ dần theo trời tối. Màu trời và đèn tính chung ở `updateStorm`. */
  private updateNight(dt: number): void {
    this.night += (this.nightGoal - this.night) * Math.min(1, dt * 1.2);
    const k = this.night;
    this.wisps.visible = !this.inField && k > 0.05;
    if (!this.wisps.visible) return;
    for (const w of this.wisps.children) {
      const base = w.userData.base as THREE.Vector3;
      const ph = w.userData.phase as number;
      w.position.set(base.x + Math.sin(this.time * 0.7 + ph) * 0.4, base.y + Math.sin(this.time * 1.9 + ph) * 0.25, base.z + Math.cos(this.time * 0.6 + ph) * 0.4);
      const mat = (w as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity = k * (0.55 + 0.4 * Math.abs(Math.sin(this.time * 3 + ph)));
    }
  }

  /**
   * Trọng số bốn buổi lúc này: theo đồng hồ chơi, hay giờ ghim khi chụp thử. Tắt ngày đêm thì luôn ban ngày (lúc vừa
   * bật, tắt thì pha dần theo `ngayDemMix`).
   */
  private troiLucNay(): TroiLuc {
    const m = this.ngayDemMix;
    if (m <= 0) return BAN_NGAY;
    const w = troiLuc(this.gioGhim ?? this.state?.clock ?? 0);
    if (m >= 1) return w;
    return { ngay: w.ngay * m + (1 - m), chieu: w.chieu * m, dem: w.dem * m, rang: w.rang * m };
  }

  /**
   * Trời theo giờ trong ngày (`troi.ts`), rồi trời tối sầm và mưa xối xả khi Thủy Tinh hô mưa gọi gió, tạnh dần khi
   * nước rút. Đêm yêu tinh thì trời tối xanh, không mưa, dù đang giờ nào.
   */
  private updateStorm(dt: number): void {
    this.storm += (this.stormGoal - this.storm) * Math.min(1, dt * 1.5);
    const mixGoal = this.ngayDem ? 1 : 0;
    this.ngayDemMix += Math.max(-dt / 1.5, Math.min(dt / 1.5, mixGoal - this.ngayDemMix));
    const k = this.storm;
    const n = this.night;
    const w = this.troiLucNay();
    const tr = phaThoiTiet(phaTroi(w, this.troiNen), k, n, this.troi);
    (this.scene.background as THREE.Color).copy(tr.sky);
    (this.scene.fog as THREE.Fog).color.copy(tr.sky);
    this.lights.sun.intensity = tr.sun;
    this.lights.hemi.intensity = tr.hemi;
    this.lights.sun.color.copy(tr.sunColor);
    this.lights.hemi.color.copy(tr.hemiSky);
    this.lights.hemi.groundColor.copy(tr.hemiGround);
    this.lights.sun.shadow.intensity = tr.shadow;
    apMauToi(tr.unlit);
    // Ô báo ngập, khoảnh đang chọn, dải tường đang kéo là chỉ dẫn: ban đêm bù sáng cho dễ thấy (ban ngày giữ đúng 1).
    const bu = Math.min(2.5, SANG_NGAY / doSang(this.troiNen));
    for (const m of [this.floodPreview, this.chunkPick, this.linePick]) (m.mesh.material as THREE.MeshLambertMaterial).color.setScalar(bu);
    this.toiGio = w.dem + 0.5 * (w.chieu + w.rang);
    this.toi = Math.max(this.toiGio, n);
    this.rain.visible = !this.inField && k > 0.05;
    if (!this.rain.visible) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.25, 0, -0.15));
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3(1, 1, 1);
    const c = this.view.target;
    const shown = Math.floor(this.drops.length * Math.min(1, k));
    for (let i = 0; i < this.drops.length; i++) {
      const d = this.drops[i];
      d.y -= d.v * dt;
      d.x += 1.2 * dt;
      if (d.y < 0) {
        d.y += 16;
        d.x = Math.random() * 40 - 20;
        d.z = Math.random() * 40 - 20;
      }
      sc.setScalar(i < shown ? 1 : 0.0001);
      this.rain.setMatrixAt(i, m.compose(p.set(c.x + d.x, d.y, c.z + d.z), q, sc));
    }
    this.rain.instanceMatrix.needsUpdate = true;
  }
}

