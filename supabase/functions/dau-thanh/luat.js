/* @ts-self-types="./luat.d.ts" */
// Sinh ra bởi `node scripts/luat.mjs` từ src/game/mayChu.ts. Đừng sửa tay.
// src/game/defs.ts
const RESOURCE_IDS = [
	"gao",
	"voOc",
	"datDa",
	"sat",
	"go"
];
/**
* Điện Vua Hùng lên cấp 6 khi đã vào chương 2, cấp 7 khi đã vào chương 3, cấp 8 khi đã vào chương 4, cấp 10 khi đã
* vào chương 5 (chỉ số là cấp đích). Cấp 9 mở khi đã hộ giá vua ra biển Mộ Dạ (thắng màn 32, màn hình Hết truyện).
*/
const DIEN_CHAPTER = {
	6: 2,
	7: 3,
	8: 4,
	10: 5
};
/**
* Tổng số ô đường (cả bốn loại) được trải, theo cấp Điện: đủ cho đường của mẫu kinh đô nhiều đường nhất ở cấp ấy
* (`mauDuong` ở `mau.ts`, mọi công trình giáp đường), dư chừng một phần mười cho đường tự trải.
*/
const ROAD_LIMIT = [
	90,
	130,
	140,
	220,
	320,
	330,
	470,
	470,
	480,
	480
];
/** Một ô đường: một cấp, dỡ được, giới hạn chung. */
function road(type, cost, minDien) {
	return {
		...decorDef(type, 1, cost, ROAD_LIMIT, minDien),
		decor: "duong"
	};
}
/** Một món trang trí móng `size`×`size`. */
function decor(type, size, cost, limit, minDien) {
	return {
		...decorDef(type, size, cost, limit, minDien),
		decor: "trangTri"
	};
}
function decorDef(type, size, cost, limit, minDien) {
	return {
		type,
		w: size,
		d: size,
		maxLevel: 1,
		buildCost: cost,
		upgradeCost: [{}, {}],
		production: [{}],
		hp: [1],
		limit,
		minDien,
		buildable: true,
		removable: true
	};
}
/**
* Cầu qua sông: một cầu mỗi sông, có từ Điện cấp 4 (`BEN_KIA_DIEN`), vắt qua 7 ô sông. Cấp 1 cầu cọc gỗ, cấp 2 cầu
* trụ đá (Điện 6), cấp 3 cầu lớn mái ngói hai đầu (Điện 7). Không dời, không dỡ được.
*/
function bridgeDef(type, w, d) {
	return {
		type,
		w,
		d,
		maxLevel: 3,
		buildCost: {
			gao: 400,
			voOc: 300,
			datDa: 200
		},
		upgradeCost: [
			{},
			{},
			{
				voOc: 1400,
				datDa: 1e3,
				go: 800,
				sat: 250
			},
			{
				voOc: 2400,
				datDa: 2e3,
				go: 1500,
				sat: 500
			}
		],
		levelMinDien: [
			0,
			0,
			6,
			7
		],
		production: [
			{},
			{},
			{}
		],
		hp: [
			600,
			1500,
			2600
		],
		limit: [
			0,
			0,
			0,
			1,
			1,
			1,
			1,
			1,
			1,
			1
		],
		minDien: 4,
		buildable: true,
		removable: false
	};
}
const BUILDINGS = {
	dien: {
		type: "dien",
		w: 10,
		d: 10,
		maxLevel: 10,
		buildCost: {},
		upgradeCost: [
			{},
			{},
			{
				gao: 250,
				voOc: 150
			},
			{
				gao: 450,
				voOc: 250,
				datDa: 150
			},
			{
				gao: 800,
				voOc: 700,
				datDa: 400,
				sat: 60
			},
			{
				gao: 1400,
				voOc: 1300,
				datDa: 800,
				sat: 160
			},
			{
				gao: 4e3,
				voOc: 4e3,
				datDa: 3e3,
				sat: 600
			},
			{
				gao: 7200,
				voOc: 6400,
				datDa: 5600,
				sat: 1200
			},
			{
				gao: 10400,
				voOc: 9200,
				datDa: 8e3,
				sat: 1800
			},
			{
				gao: 14100,
				voOc: 12300,
				datDa: 11e3,
				sat: 2400
			},
			{
				gao: 19200,
				voOc: 16800,
				datDa: 15200,
				sat: 3400
			}
		],
		production: [
			{
				gao: 4,
				voOc: 2
			},
			{
				gao: 6,
				voOc: 3
			},
			{
				gao: 8,
				voOc: 4
			},
			{
				gao: 10,
				voOc: 5
			},
			{
				gao: 12,
				voOc: 6
			},
			{
				gao: 14,
				voOc: 7
			},
			{
				gao: 16,
				voOc: 8
			},
			{
				gao: 18,
				voOc: 9
			},
			{
				gao: 20,
				voOc: 10
			},
			{
				gao: 22,
				voOc: 11
			}
		],
		housing: [
			4,
			5,
			6,
			7,
			8,
			9,
			10,
			11,
			12,
			13
		],
		hp: [
			700,
			850,
			1e3,
			1200,
			1400,
			1600,
			1800,
			2e3,
			2200,
			2400
		],
		limit: [
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1
		],
		minDien: 1,
		buildable: false,
		removable: false
	},
	ruong: {
		type: "ruong",
		w: 4,
		d: 4,
		maxLevel: 10,
		buildCost: { voOc: 30 },
		upgradeCost: [
			{},
			{},
			{ voOc: 40 },
			{
				voOc: 90,
				datDa: 30
			},
			{
				voOc: 200,
				datDa: 120
			},
			{
				voOc: 420,
				datDa: 260
			},
			{
				voOc: 850,
				datDa: 550
			},
			{
				voOc: 1700,
				datDa: 1100
			},
			{
				voOc: 3400,
				datDa: 2200
			},
			{
				voOc: 4300,
				datDa: 2800
			},
			{
				voOc: 6900,
				datDa: 4500
			}
		],
		production: [
			{ gao: 19 },
			{ gao: 32 },
			{ gao: 50 },
			{ gao: 75 },
			{ gao: 110 },
			{ gao: 150 },
			{ gao: 200 },
			{ gao: 260 },
			{ gao: 320 },
			{ gao: 390 }
		],
		workers: [
			2,
			3,
			3,
			4,
			4,
			5,
			5,
			5,
			5,
			6
		],
		hp: [
			150,
			170,
			190,
			210,
			230,
			250,
			270,
			300,
			330,
			360
		],
		limit: [
			2,
			3,
			4,
			5,
			6,
			7,
			8,
			8,
			9,
			10
		],
		minDien: 1,
		buildable: true,
		removable: false
	},
	ben: {
		type: "ben",
		w: 3,
		d: 3,
		maxLevel: 10,
		buildCost: { gao: 50 },
		upgradeCost: [
			{},
			{},
			{
				gao: 60,
				datDa: 20
			},
			{
				gao: 120,
				datDa: 60
			},
			{
				gao: 250,
				datDa: 150
			},
			{
				gao: 500,
				datDa: 300
			},
			{
				gao: 1e3,
				datDa: 600
			},
			{
				gao: 2e3,
				datDa: 1200
			},
			{
				gao: 4e3,
				datDa: 2400
			},
			{
				gao: 5100,
				datDa: 3e3
			},
			{
				gao: 8200,
				datDa: 4900
			}
		],
		production: [
			{ voOc: 20 },
			{ voOc: 35 },
			{ voOc: 52 },
			{ voOc: 78 },
			{ voOc: 112 },
			{ voOc: 150 },
			{ voOc: 200 },
			{ voOc: 260 },
			{ voOc: 385 },
			{ voOc: 470 }
		],
		workers: [
			1,
			2,
			2,
			3,
			3,
			4,
			4,
			4,
			4,
			5
		],
		hp: [
			160,
			180,
			200,
			220,
			240,
			260,
			280,
			310,
			340,
			375
		],
		limit: [
			2,
			2,
			3,
			3,
			4,
			4,
			5,
			5,
			5,
			5
		],
		minDien: 1,
		nearRiver: true,
		buildable: true,
		removable: false
	},
	luy: {
		type: "luy",
		w: 1,
		d: 1,
		maxLevel: 2,
		buildCost: { voOc: 4 },
		upgradeCost: [
			{},
			{},
			{ datDa: 20 }
		],
		production: [{}, {}],
		hp: [120, 420],
		limit: [
			50,
			70,
			100,
			130,
			150,
			170,
			180,
			180,
			190,
			200
		],
		minDien: 1,
		levelMinDien: [
			0,
			0,
			3
		],
		buildable: true,
		removable: true
	},
	nhaSan: {
		type: "nhaSan",
		w: 3,
		d: 3,
		maxLevel: 10,
		buildCost: {
			gao: 30,
			voOc: 20
		},
		upgradeCost: [
			{},
			{},
			{
				voOc: 50,
				datDa: 20
			},
			{
				voOc: 100,
				datDa: 70
			},
			{
				voOc: 200,
				datDa: 160
			},
			{
				voOc: 380,
				datDa: 320
			},
			{
				voOc: 760,
				datDa: 640
			},
			{
				voOc: 1500,
				datDa: 1300
			},
			{
				voOc: 3e3,
				datDa: 2600
			},
			{
				voOc: 3800,
				datDa: 3400
			},
			{
				voOc: 6200,
				datDa: 5400
			}
		],
		production: [
			{},
			{},
			{},
			{},
			{},
			{},
			{},
			{},
			{},
			{}
		],
		housing: [
			4,
			6,
			8,
			10,
			12,
			14,
			16,
			18,
			20,
			22
		],
		hp: [
			160,
			180,
			200,
			220,
			240,
			260,
			280,
			310,
			340,
			375
		],
		limit: [
			1,
			2,
			3,
			4,
			5,
			6,
			7,
			7,
			8,
			9
		],
		minDien: 1,
		buildable: true,
		removable: false
	},
	baiDa: {
		type: "baiDa",
		w: 3,
		d: 3,
		maxLevel: 10,
		buildCost: {
			gao: 40,
			voOc: 30
		},
		upgradeCost: [
			{},
			{},
			{
				gao: 30,
				voOc: 60
			},
			{
				gao: 60,
				voOc: 120
			},
			{
				gao: 120,
				voOc: 250
			},
			{
				gao: 240,
				voOc: 500
			},
			{
				gao: 480,
				voOc: 1e3
			},
			{
				gao: 960,
				voOc: 2e3
			},
			{
				gao: 1900,
				voOc: 4e3
			},
			{
				gao: 2400,
				voOc: 5100
			},
			{
				gao: 3800,
				voOc: 8200
			}
		],
		production: [
			{ datDa: 19 },
			{ datDa: 32 },
			{ datDa: 50 },
			{ datDa: 72 },
			{ datDa: 105 },
			{ datDa: 145 },
			{ datDa: 195 },
			{ datDa: 255 },
			{ datDa: 310 },
			{ datDa: 380 }
		],
		workers: [
			2,
			2,
			3,
			3,
			4,
			5,
			5,
			5,
			5,
			6
		],
		hp: [
			180,
			200,
			220,
			240,
			260,
			280,
			300,
			330,
			365,
			400
		],
		limit: [
			1,
			2,
			3,
			3,
			4,
			5,
			5,
			5,
			5,
			5
		],
		minDien: 1,
		buildable: true,
		removable: false
	},
	congThanh: {
		type: "congThanh",
		w: 1,
		d: 1,
		maxLevel: 3,
		buildCost: {
			datDa: 500,
			go: 400,
			sat: 100
		},
		upgradeCost: [
			{},
			{},
			{
				datDa: 1200,
				go: 1e3,
				sat: 250
			},
			{
				datDa: 2500,
				go: 2e3,
				sat: 500
			}
		],
		production: [
			{},
			{},
			{}
		],
		hp: [
			3e3,
			4500,
			6e3
		],
		limit: [
			0,
			0,
			0,
			0,
			4,
			4,
			4,
			4,
			4,
			4
		],
		minDien: 5,
		levelMinDien: [
			0,
			0,
			7,
			8
		],
		buildable: true,
		removable: true,
		unlock: "chuong3"
	},
	bacThanh: {
		type: "bacThanh",
		w: 1,
		d: 1,
		maxLevel: 1,
		buildCost: {
			datDa: 150,
			go: 100
		},
		upgradeCost: [{}, {}],
		production: [{}],
		hp: [800],
		limit: [
			0,
			0,
			2,
			2,
			3,
			3,
			4,
			4,
			5,
			5
		],
		minDien: 3,
		buildable: true,
		removable: true
	},
	langChai: {
		type: "langChai",
		w: 3,
		d: 3,
		maxLevel: 10,
		buildCost: {
			gao: 80,
			go: 60
		},
		upgradeCost: [
			{},
			{},
			{
				gao: 60,
				go: 40
			},
			{
				gao: 120,
				go: 80
			},
			{
				gao: 250,
				go: 160
			},
			{
				gao: 500,
				go: 320
			},
			{
				gao: 1e3,
				go: 640
			},
			{
				gao: 2e3,
				go: 1300
			},
			{
				gao: 4e3,
				go: 2600
			},
			{
				gao: 5100,
				go: 3400
			},
			{
				gao: 8200,
				go: 5400
			}
		],
		production: [
			{},
			{},
			{},
			{},
			{},
			{},
			{},
			{},
			{},
			{}
		],
		workers: [
			1,
			2,
			2,
			2,
			3,
			3,
			3,
			3,
			3,
			4
		],
		hp: [
			160,
			180,
			200,
			220,
			240,
			260,
			280,
			310,
			340,
			375
		],
		limit: [
			0,
			0,
			1,
			1,
			2,
			2,
			3,
			3,
			3,
			3
		],
		minDien: 3,
		nearRiver: true,
		buildable: true,
		removable: false
	},
	benKhoi: {
		type: "benKhoi",
		w: 3,
		d: 3,
		maxLevel: 3,
		buildCost: {
			gao: 3e3,
			go: 3e3,
			sat: 400
		},
		upgradeCost: [
			{},
			{},
			{
				gao: 5e3,
				go: 4500,
				sat: 700
			},
			{
				gao: 8e3,
				go: 7e3,
				sat: 1100
			}
		],
		production: [
			{ voOc: 120 },
			{ voOc: 170 },
			{ voOc: 230 }
		],
		workers: [
			3,
			4,
			5
		],
		hp: [
			420,
			480,
			540
		],
		limit: [
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			1,
			2,
			2
		],
		minDien: 8,
		levelMinDien: [
			0,
			0,
			9,
			10
		],
		nearRiver: true,
		buildable: true,
		removable: false
	},
	xuongMoc: {
		type: "xuongMoc",
		w: 3,
		d: 3,
		maxLevel: 10,
		buildCost: {
			gao: 60,
			voOc: 40
		},
		upgradeCost: [
			{},
			{},
			{
				voOc: 60,
				datDa: 30
			},
			{
				voOc: 120,
				datDa: 60
			},
			{
				voOc: 250,
				datDa: 120
			},
			{
				voOc: 500,
				datDa: 250
			},
			{
				voOc: 1e3,
				datDa: 500
			},
			{
				voOc: 2e3,
				datDa: 1e3
			},
			{
				voOc: 4e3,
				datDa: 2e3
			},
			{
				voOc: 5100,
				datDa: 2600
			},
			{
				voOc: 8200,
				datDa: 4100
			}
		],
		production: [
			{ go: 10 },
			{ go: 16 },
			{ go: 24 },
			{ go: 36 },
			{ go: 50 },
			{ go: 68 },
			{ go: 90 },
			{ go: 118 },
			{ go: 144 },
			{ go: 176 }
		],
		workers: [
			1,
			2,
			2,
			3,
			3,
			4,
			4,
			4,
			4,
			5
		],
		hp: [
			180,
			200,
			220,
			240,
			260,
			280,
			300,
			330,
			365,
			400
		],
		limit: [
			0,
			1,
			1,
			2,
			2,
			2,
			3,
			3,
			3,
			3
		],
		minDien: 2,
		buildable: true,
		removable: false
	},
	loRen: {
		type: "loRen",
		w: 3,
		d: 3,
		maxLevel: 10,
		buildCost: {
			voOc: 60,
			datDa: 60
		},
		upgradeCost: [
			{},
			{},
			{
				voOc: 80,
				datDa: 80
			},
			{
				voOc: 160,
				datDa: 180
			},
			{
				voOc: 320,
				datDa: 350
			},
			{
				voOc: 640,
				datDa: 700
			},
			{
				voOc: 1300,
				datDa: 1400
			},
			{
				voOc: 2600,
				datDa: 2800
			},
			{
				voOc: 5200,
				datDa: 5600
			},
			{
				voOc: 6600,
				datDa: 7200
			},
			{
				voOc: 10600,
				datDa: 11500
			}
		],
		production: [
			{ sat: 5 },
			{ sat: 9 },
			{ sat: 14 },
			{ sat: 20 },
			{ sat: 29 },
			{ sat: 40 },
			{ sat: 54 },
			{ sat: 70 },
			{ sat: 85 },
			{ sat: 104 }
		],
		workers: [
			1,
			2,
			2,
			3,
			3,
			4,
			4,
			4,
			4,
			5
		],
		hp: [
			200,
			220,
			240,
			260,
			280,
			300,
			320,
			350,
			385,
			425
		],
		limit: [
			0,
			1,
			1,
			2,
			2,
			3,
			3,
			3,
			3,
			3
		],
		minDien: 2,
		buildable: true,
		removable: false
	},
	kho: {
		type: "kho",
		w: 3,
		d: 3,
		maxLevel: 10,
		buildCost: {
			voOc: 40,
			datDa: 40
		},
		upgradeCost: [
			{},
			{},
			{
				voOc: 80,
				datDa: 100
			},
			{
				voOc: 160,
				datDa: 200
			},
			{
				voOc: 320,
				datDa: 400
			},
			{
				voOc: 640,
				datDa: 800
			},
			{
				voOc: 1300,
				datDa: 1600
			},
			{
				voOc: 2600,
				datDa: 3200
			},
			{
				voOc: 5200,
				datDa: 6400
			},
			{
				voOc: 6600,
				datDa: 8200
			},
			{
				voOc: 10600,
				datDa: 13100
			}
		],
		production: [
			{},
			{},
			{},
			{},
			{},
			{},
			{},
			{},
			{},
			{}
		],
		storage: [
			500,
			1e3,
			1500,
			2500,
			4e3,
			6e3,
			9e3,
			13e3,
			17e3,
			22e3
		],
		hp: [
			300,
			360,
			420,
			480,
			540,
			600,
			660,
			730,
			800,
			880
		],
		limit: [
			1,
			1,
			2,
			2,
			3,
			3,
			4,
			4,
			4,
			4
		],
		minDien: 1,
		buildable: true,
		removable: false
	},
	doanhTrai: {
		type: "doanhTrai",
		w: 8,
		d: 8,
		maxLevel: 5,
		buildCost: {
			gao: 80,
			voOc: 60,
			datDa: 60
		},
		upgradeCost: [
			{},
			{},
			{
				gao: 120,
				voOc: 100,
				datDa: 120,
				sat: 20
			},
			{
				gao: 250,
				voOc: 200,
				datDa: 250,
				sat: 60
			},
			{
				gao: 500,
				voOc: 400,
				datDa: 500,
				sat: 120
			},
			{
				gao: 1e3,
				voOc: 800,
				datDa: 1e3,
				sat: 240
			}
		],
		production: [
			{},
			{},
			{},
			{},
			{}
		],
		troopCap: [
			8,
			14,
			20,
			28,
			38
		],
		hp: [
			800,
			920,
			1040,
			1200,
			1400
		],
		limit: [
			0,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1
		],
		minDien: 2,
		buildable: true,
		removable: false
	},
	choiCanh: {
		type: "choiCanh",
		w: 1,
		d: 1,
		maxLevel: 10,
		buildCost: {
			voOc: 40,
			datDa: 40
		},
		upgradeCost: [
			{},
			{},
			{
				voOc: 60,
				datDa: 60
			},
			{
				voOc: 120,
				datDa: 120,
				sat: 20
			},
			{
				voOc: 240,
				datDa: 240,
				sat: 40
			},
			{
				voOc: 480,
				datDa: 480,
				sat: 80
			},
			{
				voOc: 960,
				datDa: 960,
				sat: 160
			},
			{
				voOc: 1900,
				datDa: 1900,
				sat: 320
			},
			{
				voOc: 3800,
				datDa: 3800,
				sat: 640
			},
			{
				voOc: 4900,
				datDa: 4900,
				sat: 800
			},
			{
				voOc: 7800,
				datDa: 7800,
				sat: 1300
			}
		],
		production: [
			{},
			{},
			{},
			{},
			{},
			{},
			{},
			{},
			{},
			{}
		],
		hp: [
			180,
			220,
			270,
			330,
			400,
			480,
			560,
			620,
			680,
			750
		],
		limit: [
			0,
			2,
			3,
			4,
			5,
			6,
			7,
			7,
			8,
			9
		],
		minDien: 2,
		buildable: true,
		removable: false
	},
	bayChong: {
		type: "bayChong",
		w: 1,
		d: 1,
		maxLevel: 1,
		buildCost: {
			voOc: 10,
			datDa: 10
		},
		upgradeCost: [{}, {}],
		production: [{}],
		hp: [1],
		limit: [
			0,
			4,
			6,
			8,
			10,
			12,
			14,
			14,
			14,
			14
		],
		minDien: 2,
		buildable: true,
		removable: true
	},
	denPhuDong: {
		type: "denPhuDong",
		w: 4,
		d: 4,
		maxLevel: 1,
		buildCost: {
			gao: 600,
			voOc: 600,
			datDa: 500,
			sat: 150
		},
		upgradeCost: [{}, {}],
		production: [{}],
		hp: [700],
		limit: [
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1
		],
		minDien: 1,
		buildable: true,
		removable: false,
		unlock: "ketChuong1"
	},
	de: {
		type: "de",
		w: 1,
		d: 1,
		maxLevel: 2,
		buildCost: { datDa: 15 },
		upgradeCost: [
			{},
			{},
			{
				datDa: 40,
				voOc: 20
			}
		],
		production: [{}, {}],
		hp: [600, 1500],
		limit: [
			130,
			130,
			130,
			130,
			130,
			140,
			150,
			150,
			160,
			165
		],
		minDien: 1,
		buildable: true,
		removable: true,
		unlock: "chuong2"
	},
	congDe: {
		type: "congDe",
		w: 1,
		d: 1,
		maxLevel: 1,
		buildCost: {
			datDa: 200,
			go: 120,
			voOc: 60
		},
		upgradeCost: [{}, {}],
		production: [{}],
		hp: [1500],
		limit: [
			2,
			2,
			2,
			2,
			2,
			2,
			2,
			2,
			3,
			3
		],
		minDien: 1,
		buildable: true,
		removable: true,
		unlock: "chuong2"
	},
	denTanVien: {
		type: "denTanVien",
		w: 4,
		d: 4,
		maxLevel: 1,
		buildCost: {
			gao: 1500,
			voOc: 1500,
			datDa: 1500,
			sat: 400
		},
		upgradeCost: [{}, {}],
		production: [{}],
		hp: [900],
		limit: [
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1
		],
		minDien: 1,
		buildable: true,
		removable: false,
		unlock: "ketChuong2"
	},
	thanh: {
		type: "thanh",
		w: 1,
		d: 1,
		maxLevel: 1,
		buildCost: {
			datDa: 30,
			voOc: 10
		},
		upgradeCost: [{}, {}],
		production: [{}],
		hp: [1e3],
		limit: [
			220,
			220,
			220,
			220,
			220,
			230,
			240,
			240,
			250,
			260
		],
		minDien: 1,
		buildable: true,
		removable: true,
		unlock: "chuong3"
	},
	denCoLoa: {
		type: "denCoLoa",
		w: 4,
		d: 4,
		maxLevel: 1,
		buildCost: {
			gao: 2500,
			voOc: 2500,
			datDa: 2500,
			sat: 700
		},
		upgradeCost: [{}, {}],
		production: [{}],
		hp: [1e3],
		limit: [
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1
		],
		minDien: 1,
		buildable: true,
		removable: false,
		unlock: "ketChuong3"
	},
	hoKimQuy: {
		type: "hoKimQuy",
		w: 8,
		d: 8,
		maxLevel: 1,
		buildCost: {
			gao: 2e3,
			voOc: 2e3,
			datDa: 2500,
			go: 500
		},
		upgradeCost: [{}, {}],
		production: [{}],
		hp: [1e3],
		limit: [
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1
		],
		minDien: 1,
		buildable: true,
		removable: false,
		unlock: "ruaVang"
	},
	ruongNep: {
		type: "ruongNep",
		w: 4,
		d: 4,
		maxLevel: 3,
		buildCost: {
			voOc: 300,
			datDa: 150
		},
		upgradeCost: [
			{},
			{},
			{
				voOc: 900,
				datDa: 500
			},
			{
				voOc: 2500,
				datDa: 1500
			}
		],
		production: [
			{},
			{},
			{}
		],
		workers: [
			2,
			3,
			3
		],
		hp: [
			170,
			200,
			230
		],
		limit: [
			0,
			0,
			1,
			1,
			2,
			2,
			2,
			2,
			2,
			2
		],
		minDien: 3,
		levelMinDien: [
			0,
			0,
			5,
			6
		],
		buildable: true,
		removable: false,
		unlock: "ketChuong1"
	},
	vuon: {
		type: "vuon",
		w: 3,
		d: 3,
		maxLevel: 3,
		buildCost: {
			gao: 200,
			voOc: 150
		},
		upgradeCost: [
			{},
			{},
			{
				gao: 600,
				voOc: 450
			},
			{
				gao: 1800,
				voOc: 1300
			}
		],
		production: [
			{},
			{},
			{}
		],
		workers: [
			1,
			2,
			2
		],
		hp: [
			150,
			170,
			190
		],
		limit: [
			0,
			0,
			1,
			1,
			1,
			2,
			2,
			2,
			2,
			2
		],
		minDien: 3,
		levelMinDien: [
			0,
			0,
			5,
			6
		],
		buildable: true,
		removable: false,
		unlock: "ketChuong1"
	},
	chuongLon: {
		type: "chuongLon",
		w: 3,
		d: 3,
		maxLevel: 3,
		buildCost: {
			gao: 250,
			datDa: 200
		},
		upgradeCost: [
			{},
			{},
			{
				gao: 750,
				datDa: 600
			},
			{
				gao: 2200,
				datDa: 1800
			}
		],
		production: [
			{},
			{},
			{}
		],
		workers: [
			1,
			1,
			2
		],
		hp: [
			180,
			200,
			220
		],
		limit: [
			0,
			0,
			1,
			1,
			1,
			2,
			2,
			2,
			2,
			2
		],
		minDien: 3,
		levelMinDien: [
			0,
			0,
			5,
			6
		],
		buildable: true,
		removable: false,
		unlock: "ketChuong1"
	},
	bep: {
		type: "bep",
		w: 3,
		d: 3,
		maxLevel: 3,
		buildCost: {
			voOc: 200,
			datDa: 250,
			sat: 40
		},
		upgradeCost: [
			{},
			{},
			{
				voOc: 600,
				datDa: 750,
				sat: 120
			},
			{
				voOc: 1800,
				datDa: 2200,
				sat: 350
			}
		],
		production: [
			{},
			{},
			{}
		],
		workers: [
			2,
			2,
			3
		],
		hp: [
			200,
			230,
			260
		],
		limit: [
			0,
			0,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1
		],
		minDien: 3,
		levelMinDien: [
			0,
			0,
			5,
			6
		],
		buildable: true,
		removable: false,
		unlock: "ketChuong1"
	},
	lauNo: {
		type: "lauNo",
		w: 1,
		d: 1,
		maxLevel: 3,
		buildCost: {
			voOc: 2e3,
			datDa: 2e3,
			sat: 500
		},
		upgradeCost: [
			{},
			{},
			{
				voOc: 3200,
				datDa: 3200,
				sat: 800
			},
			{
				voOc: 5e3,
				datDa: 5e3,
				sat: 1300
			}
		],
		production: [
			{},
			{},
			{}
		],
		hp: [
			1400,
			1540,
			1700
		],
		limit: [
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			3,
			3,
			3
		],
		minDien: 8,
		levelMinDien: [
			0,
			0,
			9,
			10
		],
		buildable: false,
		removable: false
	},
	traiGiao: {
		type: "traiGiao",
		w: 4,
		d: 4,
		maxLevel: 1,
		buildCost: {
			gao: 40,
			voOc: 30,
			datDa: 30
		},
		upgradeCost: [{}, {}],
		production: [{}],
		hp: [300],
		limit: [
			0,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1
		],
		minDien: 2,
		barracksLevel: 1,
		buildable: true,
		removable: false
	},
	traiCung: {
		type: "traiCung",
		w: 4,
		d: 4,
		maxLevel: 1,
		buildCost: {
			gao: 60,
			voOc: 50,
			datDa: 50,
			sat: 10
		},
		upgradeCost: [{}, {}],
		production: [{}],
		hp: [300],
		limit: [
			0,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1
		],
		minDien: 2,
		barracksLevel: 2,
		buildable: true,
		removable: false
	},
	chuongVoi: {
		type: "chuongVoi",
		w: 4,
		d: 4,
		maxLevel: 1,
		buildCost: {
			gao: 120,
			voOc: 80,
			datDa: 100,
			sat: 20
		},
		upgradeCost: [{}, {}],
		production: [{}],
		hp: [400],
		limit: [
			0,
			0,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1
		],
		minDien: 3,
		barracksLevel: 3,
		buildable: true,
		removable: false
	},
	duongDat: road("duongDat", { voOc: 2 }, 1),
	duongSoi: road("duongSoi", { datDa: 3 }, 2),
	duongDa: road("duongDa", {
		datDa: 6,
		voOc: 2
	}, 3),
	duongGach: {
		...road("duongGach", {
			datDa: 8,
			voOc: 6
		}, 1),
		unlock: "chuong3"
	},
	cayDa: decor("cayDa", 2, {
		gao: 80,
		voOc: 60
	}, [
		1,
		1,
		2,
		2,
		3,
		3,
		4,
		4,
		4,
		4
	], 2),
	gieng: decor("gieng", 1, {
		voOc: 20,
		datDa: 20
	}, [
		1,
		2,
		2,
		3,
		3,
		4,
		5,
		5,
		5,
		5
	], 2),
	ao: decor("ao", 3, {
		gao: 60,
		voOc: 60
	}, [
		1,
		1,
		1,
		2,
		2,
		2,
		3,
		3,
		3,
		3
	], 2),
	sanTrong: decor("sanTrong", 3, {
		voOc: 200,
		datDa: 150,
		sat: 30
	}, [
		0,
		0,
		1,
		1,
		1,
		2,
		2,
		2,
		2,
		2
	], 3),
	hoa: decor("hoa", 1, { voOc: 3 }, [
		10,
		15,
		20,
		25,
		30,
		35,
		40,
		40,
		40,
		40
	], 1),
	co: decor("co", 1, { voOc: 1 }, [
		20,
		30,
		40,
		50,
		60,
		70,
		80,
		80,
		80,
		80
	], 1),
	cau: decor("cau", 1, {
		gao: 10,
		voOc: 5
	}, [
		4,
		6,
		8,
		10,
		12,
		14,
		16,
		16,
		16,
		16
	], 1),
	rom: decor("rom", 1, { gao: 8 }, [
		2,
		4,
		6,
		8,
		10,
		12,
		14,
		14,
		14,
		14
	], 1),
	traiNo: {
		type: "traiNo",
		w: 4,
		d: 4,
		maxLevel: 1,
		buildCost: {
			gao: 600,
			voOc: 500,
			datDa: 500,
			sat: 120
		},
		upgradeCost: [{}, {}],
		production: [{}],
		hp: [500],
		limit: [
			0,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1
		],
		minDien: 2,
		barracksLevel: 5,
		buildable: true,
		removable: false,
		unlock: "chuong4"
	},
	denCuong: {
		type: "denCuong",
		w: 4,
		d: 4,
		maxLevel: 1,
		buildCost: {
			gao: 4e3,
			voOc: 4e3,
			datDa: 4e3,
			sat: 1100
		},
		upgradeCost: [{}, {}],
		production: [{}],
		hp: [1e3],
		limit: [
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1
		],
		minDien: 1,
		buildable: true,
		removable: false,
		unlock: "ketChuong4"
	},
	denHatMon: {
		type: "denHatMon",
		w: 4,
		d: 4,
		maxLevel: 1,
		buildCost: {
			gao: 5e3,
			voOc: 5e3,
			datDa: 5e3,
			sat: 1400
		},
		upgradeCost: [{}, {}],
		production: [{}],
		hp: [1100],
		limit: [
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1
		],
		minDien: 1,
		buildable: true,
		removable: false,
		unlock: "ketChuong5"
	},
	denRongTien: {
		type: "denRongTien",
		w: 8,
		d: 8,
		maxLevel: 1,
		buildCost: {
			gao: 7e3,
			voOc: 7e3,
			datDa: 8e3,
			sat: 1800,
			go: 2e3
		},
		upgradeCost: [{}, {}],
		production: [{}],
		hp: [1300],
		limit: [
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1
		],
		minDien: 10,
		buildable: true,
		removable: false,
		unlock: "chuong5"
	},
	cauSongDa: bridgeDef("cauSongDa", 2, 7),
	cauSongThao: bridgeDef("cauSongThao", 7, 2),
	banLang: {
		type: "banLang",
		w: 3,
		d: 3,
		maxLevel: 1,
		buildCost: {
			gao: 600,
			voOc: 400
		},
		upgradeCost: [{}, {}],
		production: [{}],
		hp: [700],
		limit: [
			0,
			0,
			0,
			4,
			4,
			4,
			4,
			4,
			4,
			4
		],
		minDien: 4,
		buildable: false,
		removable: false
	},
	donBien: {
		type: "donBien",
		w: 4,
		d: 4,
		maxLevel: 1,
		buildCost: {
			gao: 800,
			voOc: 600,
			datDa: 600,
			sat: 100
		},
		upgradeCost: [{}, {}],
		production: [{}],
		hp: [900],
		limit: [
			0,
			0,
			0,
			0,
			2,
			2,
			2,
			2,
			2,
			2
		],
		minDien: 5,
		buildable: true,
		removable: false
	},
	thoHo: {
		type: "thoHo",
		w: 3,
		d: 3,
		maxLevel: 10,
		buildCost: {
			gao: 40,
			voOc: 30
		},
		upgradeCost: [
			{},
			{},
			{
				voOc: 40,
				datDa: 20
			},
			{
				voOc: 80,
				datDa: 60
			},
			{
				voOc: 160,
				datDa: 130
			},
			{
				voOc: 300,
				datDa: 260
			},
			{
				voOc: 600,
				datDa: 520
			},
			{
				voOc: 1200,
				datDa: 1e3
			},
			{
				voOc: 2400,
				datDa: 2100
			},
			{
				voOc: 3e3,
				datDa: 2700
			},
			{
				voOc: 5e3,
				datDa: 4300
			}
		],
		production: [
			{},
			{},
			{},
			{},
			{},
			{},
			{},
			{},
			{},
			{}
		],
		hp: [
			160,
			180,
			200,
			220,
			240,
			260,
			280,
			310,
			340,
			375
		],
		limit: [
			1,
			1,
			2,
			2,
			3,
			3,
			3,
			4,
			4,
			4
		],
		minDien: 1,
		buildable: true,
		removable: false
	},
	nhaThuoc: {
		type: "nhaThuoc",
		w: 4,
		d: 4,
		maxLevel: 10,
		buildCost: {
			gao: 200,
			voOc: 150,
			datDa: 120
		},
		upgradeCost: [
			{},
			{},
			{
				gao: 150,
				voOc: 120,
				datDa: 80
			},
			{
				gao: 300,
				voOc: 240,
				datDa: 160
			},
			{
				gao: 600,
				voOc: 480,
				datDa: 320,
				sat: 40
			},
			{
				gao: 1200,
				voOc: 960,
				datDa: 640,
				sat: 80
			},
			{
				gao: 2400,
				voOc: 1900,
				datDa: 1300,
				sat: 160
			},
			{
				gao: 4800,
				voOc: 3800,
				datDa: 2600,
				sat: 320
			},
			{
				gao: 9600,
				voOc: 7600,
				datDa: 5200,
				sat: 640
			},
			{
				gao: 12e3,
				voOc: 9800,
				datDa: 6700,
				sat: 820
			},
			{
				gao: 19e3,
				voOc: 15600,
				datDa: 10700,
				sat: 1300
			}
		],
		production: [
			{},
			{},
			{},
			{},
			{},
			{},
			{},
			{},
			{},
			{}
		],
		hp: [
			240,
			270,
			300,
			330,
			360,
			400,
			440,
			490,
			540,
			600
		],
		limit: [
			0,
			0,
			0,
			1,
			1,
			1,
			1,
			1,
			1,
			1
		],
		minDien: 4,
		buildable: true,
		removable: false
	}
};
/** Cầu qua sông (sông Đà hay sông Thao). */
const isBridge = (type) => type === "cauSongDa" || type === "cauSongThao";
/**
* Cầu bị lũ cuốn (hư) khi nước dâng tới bậc này, theo cấp cầu: cầu cọc gỗ ở bậc 2, cầu trụ đá ở bậc 3, cầu lớn
* mái ngói không sợ lũ.
*/
const BRIDGE_FLOOD = [
	2,
	3,
	Infinity
];
/**
* Ụ nỏ dựng trên một đoạn thành Cổ Loa còn nguyên, mỗi đoạn một ụ, không tốn thêm đất. Tự bắn một giặc trong tầm.
* Là một phần của đoạn thành: giặc không nhắm ụ, thành bị phá thì ụ hư theo, sửa thành xong phải sửa ụ.
* `limit` theo cấp Điện (chỉ số 0 là cấp 1).
*/
/** Đoạn tường có mặt cho lính đứng: thành đất (lũy cấp 2) và thành Cổ Loa. Cổng thành nối liền mặt hai bên. */
function isWalkWall(b) {
	return b.type === "thanh" || b.type === "luy" && b.level >= 2;
}
/**
* Lính lên mặt thành theo bậc lên thành (`bacThanh`): những binh chủng tự lên khi giữ kinh đô, chúng bắn xa thêm
* `range` ô (trước khi nhân `RAID_SCALE`), giặc có tầm đánh không quá `melee` ô không với tới.
*/
const TREN_THANH = {
	units: ["cung", "no"],
	range: 1,
	melee: 2
};
const U_NO = {
	cost: {
		voOc: 150,
		datDa: 150,
		sat: 30
	},
	limit: [
		0,
		0,
		0,
		0,
		0,
		0,
		8,
		16,
		16,
		16
	],
	dmg: 14,
	range: 4,
	cooldown: 1.4
};
/** Đường đi hay đồ trang trí: chỉ để nhìn, không chắn giặc, không sợ lũ. */
const isDecor = (type) => BUILDINGS[type].decor !== void 0;
/** Loại phẳng: ruộng, vườn đứng liền bờ nhau vẫn không rối mắt, nên được kề cạnh nhau không chừa hẻm. */
const PHANG = /* @__PURE__ */ new Set([
	"ruong",
	"ruongNep",
	"vuon"
]);
/**
* Hai công trình kề cạnh nhau có phải chừa hẻm một ô không (mục Mẫu kinh đô: hẻm giữa các nhà): chỉ khi cả hai là
* công trình nhiều ô không phải đồ trang trí, và không phải cả hai đều là loại phẳng. Kề góc chéo thì không tính.
*/
const canHem = (a, b) => BUILDINGS[a].w > 1 && BUILDINGS[b].w > 1 && !isDecor(a) && !isDecor(b) && !(PHANG.has(a) && PHANG.has(b));
const TUONG_DA_IDS = [
	"baTrieu",
	"trieuQuangPhuc",
	"maiThucLoan",
	"ngoQuyen",
	"lyThuongKiet"
];
const NU_TUONG = {
	leChan: {
		stage: 34,
		unit: "no"
	},
	thanhThien: {
		stage: 35,
		unit: "cung"
	},
	batNan: {
		stage: 37,
		unit: "giao"
	},
	phungThiChinh: {
		stage: 39,
		unit: "voi"
	}
};
const NU_TUONG_BONUS = .12;
/**
* Số chỗ quân tối đa mang ra một trận phó bản, theo cấp Điện (chỉ số 0 là cấp 1): bằng sức chứa một doanh ở cấp
* doanh trại cao nhất dựng được ở cấp Điện ấy, không quá 38, để nhiều doanh không làm phó bản dễ đi.
*/
const FIELD_CAP = [
	0,
	14,
	20,
	28,
	38,
	38,
	38,
	38,
	38,
	38
];
/**
* Số chỗ quân tối đa bố trí giữ kinh đô (giặc, lũ, yêu tinh, quân Triệu), theo cấp Điện. Tới Điện 5 bằng phó bản;
* từ chương 2 nhích thêm 6 chỗ mỗi cấp. Lính còn lại là quân dự trữ.
*/
const GUARD_CAP = [
	0,
	14,
	20,
	28,
	38,
	44,
	50,
	56,
	62,
	68
];
/**
* Lầu nỏ mỗi phát bắn `targets` giặc khác nhau, mỗi mũi `dmg[cấp − 1]` sát thương. Đền Cổ Loa cộng như với chòi canh.
* Ghép hai chòi canh đã lên cấp 9, 10 thì lầu nỏ ra ngay cấp 2, 3 (theo chòi thấp hơn), để khỏi mất công nâng chòi.
*/
const LAU_NO = {
	targets: 3,
	dmg: [
		34,
		41,
		49
	],
	range: 5.5,
	cooldown: 1.1
};
/**
* Cổng thành: lính trên lầu cổng bắn giặc trong tầm (nhân `RAID_SCALE` khi giữ kinh đô như chòi canh), mỗi phát
* `targets[cấp − 1]` giặc, sát thương theo cấp; Đền Cổ Loa cộng như với chòi canh. Khi tìm đường, giặc tính ô cổng
* giá `pathCost` (lũy tre 12, thành đất 30, thành Cổ Loa 45), nên chịu đi vòng tới cổng thay vì phá thành.
*/
const CONG_THANH = {
	dmg: [
		20,
		26,
		32
	],
	targets: [
		1,
		1,
		2
	],
	range: 4.5,
	cooldown: 1.2,
	pathCost: 8
};
/** Đê cao hơn mặt đất dưới chân chừng này bậc: đê đất ở cấp 1, kè đá ở cấp 2. */
const DIKE_RAISE = [2, 3];
/**
* Công trình chịu được nước ngập bao nhiêu bậc mà không hư. Điện, nhà sàn, kho dựng trên cột,
* đền xây trên nền đá: chịu được 1 bậc. Bến, lũy, bẫy, đê không sợ nước. Còn lại ngập là hư.
*/
const FLOOD_TOLERANCE = {
	dien: 1,
	nhaSan: 1,
	kho: 1,
	denPhuDong: 1,
	denTanVien: 1,
	denCoLoa: 1,
	denCuong: 1,
	denHatMon: 1,
	denRongTien: 1,
	hoKimQuy: 99,
	ben: 99,
	langChai: 99,
	benKhoi: 99,
	luy: 99,
	bayChong: 99,
	de: 99,
	thanh: 99,
	congThanh: 99,
	congDe: 99,
	bacThanh: 99
};
/** Cống đê đóng cao như kè đá (cấp 2 của đê). */
const CONG_DE_RAISE = DIKE_RAISE[1];
/** Những loại được bồi phù sa khi nước lũ vào qua cống. */
const PHU_SA_TYPES = ["ruong", "ruongNep"];
/**
* Rèn binh khí ở lò rèn: mỗi binh chủng rèn riêng, ba bậc. Bậc 1 cần lò rèn cấp 6, bậc 2 cần lò rèn cấp 7, bậc 3
* cần lò rèn cấp 9. Mỗi bậc thêm `ARMS_BONUS` vào máu và sức đánh của binh chủng ấy, ở mọi trận.
*/
const ARMS = [
	{
		cost: {
			sat: 400,
			voOc: 400
		},
		forgeLevel: 6
	},
	{
		cost: {
			sat: 900,
			voOc: 900
		},
		forgeLevel: 7
	},
	{
		cost: {
			sat: 2e3,
			voOc: 2e3
		},
		forgeLevel: 9
	}
];
const ARMS_BONUS = .1;
/** Đền Phù Đổng (còn nguyên) cộng thêm phần này vào sản lượng mọi tài nguyên, và vào máu, sát thương của quân ta. */
const TEMPLE_BONUS = .1;
/** Tường được Hồ Kim Quy thêm máu. */
const KIM_QUY_WALL_TYPES = [
	"luy",
	"thanh",
	"congThanh"
];
/** Sức chứa mỗi loại tài nguyên theo cấp Điện Vua Hùng, chỉ số 0 là cấp 1. Kho thóc cộng thêm. */
const STORAGE_CAP = [
	500,
	1e3,
	2e3,
	4e3,
	8e3,
	14e3,
	22e3,
	32e3,
	44e3,
	6e4
];
/** Cái đầu tiên mọc sau chừng này (game mới, hay bản lưu vừa nâng). */
const CAY_DA_FIRST_MS = 18e4;
[
	20,
	35,
	60,
	90,
	130,
	190,
	270,
	380,
	530,
	740
].map((gao) => ({ gao })), [
	10,
	18,
	30,
	45,
	65,
	95,
	135,
	190,
	265,
	370
].map((datDa) => ({ datDa }));
const START_RESOURCES = {
	gao: 150,
	voOc: 120,
	datDa: 0,
	sat: 0,
	go: 0
};
/** Thuyền buôn: lần đầu sau chừng này thời gian chơi, rồi định kỳ, mỗi lần đậu một lúc. */
const MERCHANT_FIRST_MS = 12e4;
const UNIT_TYPES = [
	"giao",
	"cung",
	"voi",
	"no"
];
/** Quân nặng của giặc: giáo binh và lính nỏ khắc chế. */
const HEAVY = [
	"chienXa",
	"caSau",
	"hoTinh",
	"kyBinh",
	"linhRiu",
	"giapHan",
	"giapNgo",
	"voiRung",
	"giapLuong",
	"trauRung",
	"giapDuong",
	"teGiac",
	"riuNamHan",
	"ruaBien",
	"giapTong",
	"boTot"
];
/**
* Quân ta: giáo binh thắng quân nặng (chiến xa, cá sấu, hổ tinh, kỵ binh, lính rìu, giáp sĩ Hán), cung thủ thắng
* lính bộ (lính giáo Ân, tôm binh, quỷ núi, lính khiên Triệu, lính thủy, lính kích Hán), voi chiến thắng quân bắn xa
* (cung thủ Ân, cá phun nước, ma trơi, nỏ thủ Triệu, cung thuyền, nỏ thủ Hán).
* Lính nỏ (chương 4) đứng ngoài vòng khắc chế: đánh mạnh gấp đôi quân nặng và mọi trùm.
* Đấu thành (lính ta đánh lính ta): giáo binh khắc voi chiến, cung thủ khắc giáo binh, voi chiến khắc cung thủ và
* lính nỏ, lính nỏ khắc voi chiến. Trận khác không có lính ta đánh lính ta nên không đổi gì.
*/
const UNITS = {
	giao: {
		hp: 60,
		dmg: 8,
		range: .8,
		speed: 1.6,
		cooldown: 1,
		strongVs: [...HEAVY, "voi"],
		cost: {
			gao: 20,
			voOc: 8
		},
		home: "traiGiao",
		space: 1,
		upkeep: .6
	},
	cung: {
		hp: 40,
		dmg: 7,
		range: 3.8,
		speed: 1.5,
		cooldown: 1.2,
		strongVs: [
			"giaoAn",
			"tomBinh",
			"quyNui",
			"linhTrieu",
			"linhThuy",
			"linhHan",
			"linhNgo",
			"linhLuong",
			"linhDuong",
			"linhNamHan",
			"linhTong",
			"giao"
		],
		cost: {
			gao: 25,
			voOc: 8,
			sat: 4
		},
		home: "traiCung",
		space: 1,
		upkeep: .6
	},
	voi: {
		hp: 200,
		dmg: 15,
		range: .9,
		speed: 1.1,
		cooldown: 1.5,
		strongVs: [
			"cungAn",
			"caPhun",
			"maTroi",
			"noTrieu",
			"cungThuyen",
			"noHan",
			"noNgo",
			"noLuong",
			"noDuong",
			"cungNamHan",
			"noTong",
			"cung",
			"no"
		],
		cost: {
			gao: 60,
			voOc: 20,
			sat: 12
		},
		home: "chuongVoi",
		space: 3,
		upkeep: 1.5
	},
	no: {
		hp: 50,
		dmg: 26,
		range: 4.5,
		speed: 1.3,
		cooldown: 2.4,
		strongVs: [
			...HEAVY,
			"phoTuong",
			"daiTuong",
			"thuongLuong",
			"thuyTinh",
			"gaTrang",
			"trieuDa",
			"tuongThuy",
			"toDinh",
			"maVien",
			"lucDan",
			"tranBaTien",
			"duongTuHuc",
			"hoangThao",
			"quachQuy",
			"voi"
		],
		cost: {
			gao: 50,
			voOc: 15,
			sat: 10
		},
		home: "traiNo",
		space: 2,
		upkeep: 1
	}
};
/** Giặc Ân: lính giáo, cung thủ và chiến xa (xe ngựa chiến, quân nặng). Phó tướng làm trùm ở phó bản. */
const ENEMIES = {
	giaoAn: {
		hp: 75,
		dmg: 9,
		range: .8,
		speed: 1.4,
		cooldown: 1
	},
	cungAn: {
		hp: 45,
		dmg: 8,
		range: 3.5,
		speed: 1.3,
		cooldown: 1.3
	},
	chienXa: {
		hp: 230,
		dmg: 20,
		range: .9,
		speed: 2,
		cooldown: 1.4,
		strongVs: ["cung"]
	},
	phoTuong: {
		hp: 600,
		dmg: 24,
		range: 1,
		speed: 1.2,
		cooldown: 1.3
	},
	daiTuong: {
		hp: 1100,
		dmg: 30,
		range: 1.1,
		speed: 1.2,
		cooldown: 1.3
	},
	tomBinh: {
		hp: 85,
		dmg: 10,
		range: .8,
		speed: 1.5,
		cooldown: 1
	},
	caPhun: {
		hp: 50,
		dmg: 9,
		range: 3.6,
		speed: 1.3,
		cooldown: 1.3
	},
	caSau: {
		hp: 260,
		dmg: 22,
		range: .9,
		speed: 2,
		cooldown: 1.4,
		strongVs: ["cung"]
	},
	thuongLuong: {
		hp: 750,
		dmg: 26,
		range: 1.2,
		speed: 1.3,
		cooldown: 1.3
	},
	thuyTinh: {
		hp: 1400,
		dmg: 32,
		range: 1.3,
		speed: 1.2,
		cooldown: 1.2
	},
	quyNui: {
		hp: 90,
		dmg: 11,
		range: .8,
		speed: 1.5,
		cooldown: 1
	},
	maTroi: {
		hp: 55,
		dmg: 10,
		range: 3.6,
		speed: 1.4,
		cooldown: 1.3
	},
	hoTinh: {
		hp: 280,
		dmg: 23,
		range: .9,
		speed: 2.1,
		cooldown: 1.4,
		strongVs: ["cung"]
	},
	gaTrang: {
		hp: 1300,
		dmg: 30,
		range: 1.2,
		speed: 1.4,
		cooldown: 1.2
	},
	linhTrieu: {
		hp: 95,
		dmg: 11,
		range: .8,
		speed: 1.4,
		cooldown: 1
	},
	noTrieu: {
		hp: 55,
		dmg: 11,
		range: 3.8,
		speed: 1.3,
		cooldown: 1.4
	},
	kyBinh: {
		hp: 290,
		dmg: 24,
		range: .9,
		speed: 2.2,
		cooldown: 1.4,
		strongVs: ["cung"]
	},
	trieuDa: {
		hp: 1700,
		dmg: 34,
		range: 1.3,
		speed: 1.3,
		cooldown: 1.2
	},
	linhThuy: {
		hp: 100,
		dmg: 12,
		range: .8,
		speed: 1.7,
		cooldown: 1
	},
	cungThuyen: {
		hp: 60,
		dmg: 12,
		range: 3.8,
		speed: 1.3,
		cooldown: 1.4
	},
	linhRiu: {
		hp: 310,
		dmg: 25,
		range: .9,
		speed: 1.5,
		cooldown: 1.4,
		strongVs: ["cung"]
	},
	tuongThuy: {
		hp: 1500,
		dmg: 32,
		range: 1.2,
		speed: 1.3,
		cooldown: 1.2
	},
	linhHan: {
		hp: 105,
		dmg: 13,
		range: 1,
		speed: 1.4,
		cooldown: 1
	},
	noHan: {
		hp: 60,
		dmg: 13,
		range: 4.2,
		speed: 1.3,
		cooldown: 1.5
	},
	giapHan: {
		hp: 330,
		dmg: 26,
		range: .9,
		speed: 1.5,
		cooldown: 1.4,
		strongVs: ["cung"]
	},
	toDinh: {
		hp: 1600,
		dmg: 30,
		range: 1.2,
		speed: 1.3,
		cooldown: 1.2
	},
	maVien: {
		hp: 2e3,
		dmg: 36,
		range: 1.3,
		speed: 1.3,
		cooldown: 1.2
	},
	lauThuyen: {
		hp: 900,
		dmg: 12,
		range: 5,
		speed: .6,
		cooldown: 2
	},
	lonRung: {
		hp: 80,
		dmg: 9,
		range: .8,
		speed: 1.6,
		cooldown: 1.1
	},
	cuaDa: {
		hp: 110,
		dmg: 11,
		range: .8,
		speed: 1.1,
		cooldown: 1.2
	},
	baoGam: {
		hp: 100,
		dmg: 13,
		range: .9,
		speed: 2.2,
		cooldown: .9
	},
	ranHo: {
		hp: 95,
		dmg: 12,
		range: 1.6,
		speed: 1.4,
		cooldown: 1.2
	},
	linhNgo: {
		hp: 105,
		dmg: 13,
		range: 1,
		speed: 1.4,
		cooldown: 1
	},
	noNgo: {
		hp: 60,
		dmg: 13,
		range: 4.2,
		speed: 1.3,
		cooldown: 1.5
	},
	giapNgo: {
		hp: 330,
		dmg: 26,
		range: .9,
		speed: 1.5,
		cooldown: 1.4,
		strongVs: ["cung"]
	},
	lucDan: {
		hp: 2e3,
		dmg: 36,
		range: 1.4,
		speed: 1.4,
		cooldown: 1.2
	},
	gauNgua: {
		hp: 110,
		dmg: 13,
		range: .9,
		speed: 1.5,
		cooldown: 1.1
	},
	voiRung: {
		hp: 150,
		dmg: 14,
		range: 1,
		speed: 1,
		cooldown: 1.5
	},
	linhLuong: {
		hp: 105,
		dmg: 13,
		range: .9,
		speed: 1.4,
		cooldown: 1
	},
	noLuong: {
		hp: 60,
		dmg: 13,
		range: 4.2,
		speed: 1.3,
		cooldown: 1.5
	},
	giapLuong: {
		hp: 330,
		dmg: 26,
		range: .9,
		speed: 1.5,
		cooldown: 1.4,
		strongVs: ["cung"]
	},
	tranBaTien: {
		hp: 2e3,
		dmg: 36,
		range: 1.3,
		speed: 1.4,
		cooldown: 1.2
	},
	tranGam: {
		hp: 100,
		dmg: 13,
		range: 1.4,
		speed: 1.3,
		cooldown: 1.2
	},
	trauRung: {
		hp: 160,
		dmg: 15,
		range: 1,
		speed: 1.1,
		cooldown: 1.4
	},
	linhDuong: {
		hp: 105,
		dmg: 13,
		range: 1,
		speed: 1.4,
		cooldown: 1
	},
	noDuong: {
		hp: 60,
		dmg: 13,
		range: 4.2,
		speed: 1.3,
		cooldown: 1.5
	},
	giapDuong: {
		hp: 330,
		dmg: 26,
		range: .9,
		speed: 1.5,
		cooldown: 1.4,
		strongVs: ["cung"]
	},
	duongTuHuc: {
		hp: 2e3,
		dmg: 36,
		range: 1.4,
		speed: 1.4,
		cooldown: 1.2
	},
	soiDo: {
		hp: 85,
		dmg: 12,
		range: .8,
		speed: 2.3,
		cooldown: .8
	},
	teGiac: {
		hp: 190,
		dmg: 17,
		range: 1,
		speed: 1.2,
		cooldown: 1.5
	},
	linhNamHan: {
		hp: 105,
		dmg: 13,
		range: 1,
		speed: 1.4,
		cooldown: 1
	},
	cungNamHan: {
		hp: 60,
		dmg: 13,
		range: 4.2,
		speed: 1.3,
		cooldown: 1.5
	},
	riuNamHan: {
		hp: 330,
		dmg: 26,
		range: .9,
		speed: 1.5,
		cooldown: 1.4,
		strongVs: ["cung"]
	},
	hoangThao: {
		hp: 2e3,
		dmg: 36,
		range: 1.4,
		speed: 1.4,
		cooldown: 1.2
	},
	raiCa: {
		hp: 80,
		dmg: 12,
		range: .8,
		speed: 2.4,
		cooldown: .8
	},
	ruaBien: {
		hp: 210,
		dmg: 18,
		range: 1,
		speed: 1,
		cooldown: 1.6
	},
	linhTong: {
		hp: 105,
		dmg: 13,
		range: 1,
		speed: 1.4,
		cooldown: 1
	},
	noTong: {
		hp: 60,
		dmg: 13,
		range: 4.2,
		speed: 1.3,
		cooldown: 1.5
	},
	giapTong: {
		hp: 330,
		dmg: 26,
		range: .9,
		speed: 1.5,
		cooldown: 1.4,
		strongVs: ["cung"]
	},
	quachQuy: {
		hp: 2e3,
		dmg: 36,
		range: 1.3,
		speed: 1.4,
		cooldown: 1.2
	},
	naiRung: {
		hp: 95,
		dmg: 13,
		range: .9,
		speed: 2.2,
		cooldown: .9
	},
	boTot: {
		hp: 230,
		dmg: 19,
		range: 1,
		speed: 1.1,
		cooldown: 1.5
	}
};
/** Thủy quái bơi được dưới sông và chỗ nước ngập. */
const SWIMMERS = [
	"tomBinh",
	"caPhun",
	"caSau",
	"thuongLuong",
	"thuyTinh"
];
/** Gióng tráng sĩ cưỡi ngựa sắt: rất khỏe, mỗi đòn quét cả giặc đứng quanh. */
const GIONG = {
	hp: 500,
	dmg: 22,
	range: 1,
	speed: 2.2,
	cooldown: .9
};
/** Đòn thường của tướng (Gióng, Sơn Tinh) quét cả kẻ địch đứng quanh mục tiêu. */
const HERO_CLEAVE = {
	radius: 1.3,
	share: .5
};
/** Ngựa sắt phun lửa: lao thẳng `length` ô về phía giặc, đốt giặc trong dải rộng `width` ô. */
const FIRE = {
	dmg: 60,
	length: 7,
	width: 1.5
};
/** Nhổ tre quật giặc: đòn diện rộng quanh Gióng, hất giặc lùi ra. */
const SMASH = {
	dmg: 45,
	radius: 2.5,
	push: 1.2
};
/** Sơn Tinh, chúa vùng non cao: khỏe như Gióng, cầm gậy thần, mỗi đòn làm rung đất quanh mục tiêu. */
const SON = {
	hp: 560,
	dmg: 20,
	range: 1.1,
	speed: 1.9,
	cooldown: 1
};
/** Bốc đồi: nhấc một quả đồi ném xuống chỗ giặc đứng đông nhất. */
const HILL = {
	dmg: 70,
	radius: 2.2
};
/**
* Thủy Tinh (trùm màn 16) có hai phép:
* - Hô mưa gọi gió: cứ `cooldown` giây (lần đầu sau `first` giây) một con sóng lớn quét một dải dài `length`,
*   rộng `width` từ Thủy Tinh về phía quân ta gần nhất (chỉ khi quân ta trong tầm `reach`). Ai trúng sóng mất
*   `dmg` máu, bị đẩy lùi `push` ô, đi chậm còn `slow` tốc độ trong `slowS` giây.
* - Gọi thủy quái: cứ `cooldown` giây (lần đầu sau `first` giây) gọi `count` tôm binh từ dưới nước lên quanh mình,
*   tối đa `times` lần mỗi trận. Tôm binh gọi lên khỏe như tôm binh của màn.
*/
const TT_WAVE = {
	first: 6,
	cooldown: 12,
	reach: 8,
	length: 6,
	width: 2.6,
	dmg: 30,
	push: 1.4,
	slow: .5,
	slowS: 3
};
const TT_SUMMON = {
	first: 9,
	cooldown: 15,
	count: 3,
	times: 4
};
/** Dời non: đá mọc lên dưới chân mọi kẻ địch quanh Sơn Tinh, giữ chân chúng vài giây. */
const ROCKS = {
	dmg: 30,
	radius: 4,
	stun: 3
};
/** An Dương Vương cầm nỏ: tướng bắn xa, mũi tên găm cả giặc đứng quanh mục tiêu như đòn của các tướng khác. */
const ADV = {
	hp: 620,
	dmg: 19,
	range: 4.2,
	speed: 1.9,
	cooldown: 1
};
/** Nỏ thần: một phát tên bay ra hóa muôn mũi, trúng mọi kẻ địch còn đứng trên bãi. */
const NO_THAN = { dmg: 80 };
/** Rùa Vàng nổi lên che chở: quân ta hồi một phần máu và chỉ chịu một phần sát thương trong một lúc. */
const KIM_QUY = {
	heal: .3,
	reduce: .5
};
/** Đền Cổ Loa còn nguyên: lính nỏ trên chòi canh bắn mạnh hơn, xa hơn. */
const CO_LOA_TOWER = {
	dmg: 1.5,
	range: 1
};
/** Cao Lỗ cầm nỏ lớn: tướng bắn xa thứ hai, mũi tên găm cả giặc đứng quanh mục tiêu như đòn của các tướng khác. */
const CAO_LO = {
	hp: 700,
	dmg: 20,
	range: 4.4,
	speed: 1.9,
	cooldown: 1
};
/** Nỏ liên châu: một loạt tên rơi xuống chỗ giặc đứng đông nhất, mọi giặc trong bán kính mất chừng này máu. */
const LIEN_CHAU = {
	dmg: 120,
	radius: 3.5
};
/** Lệnh bắn: trong lúc có lệnh, lính nỏ (và khi giữ kinh đô cả ụ nỏ, lầu nỏ) bắn nhanh gấp chừng này lần. */
const LENH_BAN = { rate: 2 };
/** Trưng Trắc cưỡi voi trận đánh gần, đứng hàng đầu. */
const TRUNG_TRAC = {
	hp: 650,
	dmg: 20,
	range: 1.2,
	speed: 1.6,
	cooldown: 1.1
};
/** Trưng Nhị bắn cung trên lưng voi trận, đứng lùi sau hàng đầu như An Dương Vương. */
const TRUNG_NHI = {
	hp: 520,
	dmg: 17,
	range: 4,
	speed: 1.6,
	cooldown: 1.1
};
/**
* Voi xung trận (Trưng Trắc): voi lao thẳng `length` ô về phía giặc đứng đông nhất. Giặc trên đường (rộng `width` ô)
* mất `dmg` máu, bị hất sang hai bên `push` ô và choáng `stun` giây.
*/
const VOI_XUNG = {
	dmg: 90,
	length: 5,
	width: 1.6,
	push: 1,
	stun: 1.5
};
/**
* Hiệu triệu (Trưng Nhị): `count` nghĩa binh chạy ra quanh voi, đánh tới hết trận (mỗi lúc nhiều nhất `count` người,
* gọi lại thì bù chỗ người đã ngã); quân ta trong `radius` ô quanh voi hồi `heal` phần máu.
*/
const HIEU_TRIEU = {
	count: 5,
	radius: 3,
	heal: .15
};
/** Bà Triệu cưỡi voi trắng một ngà, đánh gần, đứng hàng đầu (map 6 Núi Nưa). */
const BA_TRIEU = {
	hp: 680,
	dmg: 23,
	range: 1.2,
	speed: 1.7,
	cooldown: 1
};
/**
* Chém cá kình (Bà Triệu): voi lao tới kẻ địch nhiều máu nhất trong `tam` ô (không có thì kẻ gần nhất), Bà chém một
* nhát `dmg`, kẻ ấy choáng `stun` giây (0 là không choáng).
*/
const CA_KINH = {
	dmg: 260,
	tam: 6,
	stun: 0
};
/** Triệu Quang Phục đi bộ cầm giáo, đánh gần, nhanh (map 7 Đầm Dạ Trạch). */
const TRIEU_QUANG_PHUC = {
	hp: 560,
	dmg: 21,
	range: 1.1,
	speed: 2.3,
	cooldown: .8
};
/**
* Ngày ẩn đêm ra (Triệu Quang Phục): cả đội lặn vào đầm `an` giây, giặc không nhắm được (quái đang đuổi mất dấu, đứng
* lại); ẩn xong, đòn thường đầu tiên của mỗi người mạnh gấp `phuc`.
*/
const NGAY_AN = {
	an: 4,
	phuc: 2.5
};
/** Mai Thúc Loan (Mai Hắc Đế) vạm vỡ cầm đại đao, đỡ đòn, máu dày (map 8 Núi Vệ). */
const MAI_THUC_LOAN = {
	hp: 820,
	dmg: 19,
	range: 1.1,
	speed: 1.8,
	cooldown: 1.1
};
/**
* Hắc Đế dấy binh (Mai Thúc Loan): cả đội thêm `danh` phần sức đánh trong `t` giây; giặc trong `tam` ô quanh ông
* quay sang đánh ông.
*/
const HAC_DE = {
	danh: .3,
	t: 8,
	tam: 3
};
/** Ngô Quyền giáp sắt cầm giáo dài, đánh gần mà với xa hơn (map 9 Bạch Đằng). */
const NGO_QUYEN = {
	hp: 640,
	dmg: 21,
	range: 1.8,
	speed: 1.9,
	cooldown: 1
};
/**
* Cọc Bạch Đằng (Ngô Quyền): cắm bãi cọc bán kính `r` ô ở chỗ giặc đứng đông nhất, đứng `t` giây; giặc trong bãi đi
* chậm (như sóng Thủy Tinh, `TT_WAVE.slow`), mất `dps` máu mỗi giây (thuyền, lâu thuyền `thuyen`).
*/
const COC_BACH_DANG = {
	r: 2.5,
	t: 6,
	dps: 25,
	thuyen: 50
};
/** Lý Thường Kiệt giáp trụ, áo choàng đỏ, cầm kiếm, đeo cuộn thơ; đánh gần, giữ đội (map 10 sông Như Nguyệt). */
const LY_THUONG_KIET = {
	hp: 600,
	dmg: 20,
	range: 1.2,
	speed: 1.9,
	cooldown: 1
};
/**
* Nam quốc sơn hà (Lý Thường Kiệt): ngâm thơ, quân ta trong `tam` ô quanh ông hồi `hoi` phần máu; giặc trong `tam` ô
* nao núng, đánh yếu đi `yeu` phần trong `t` giây.
*/
const NAM_QUOC = {
	tam: 6,
	hoi: .2,
	yeu: .3,
	t: 6
};
const THAN_THU = {
	thuLac: {
		hp: 240,
		dmg: 12,
		range: 4,
		speed: 2.4,
		cooldown: 1,
		ve: 0,
		an: {
			gao: 15,
			voOc: 15
		},
		bay: true
	},
	thuNgua: {
		hp: 320,
		dmg: 13,
		range: 1,
		speed: 2.4,
		cooldown: .9,
		ve: 1,
		an: { sat: 30 },
		bay: false
	},
	thuGa: {
		hp: 260,
		dmg: 7,
		range: .9,
		speed: 2.2,
		cooldown: .5,
		ve: 2,
		an: { gao: 30 },
		bay: false
	},
	thuRua: {
		hp: 520,
		dmg: 9,
		range: 1,
		speed: 1.5,
		cooldown: 1.1,
		ve: 3,
		an: { voOc: 30 },
		bay: false
	},
	thuRong: {
		hp: 420,
		dmg: 16,
		range: 1.6,
		speed: 2.2,
		cooldown: 1,
		ve: 4,
		an: {
			voOc: 20,
			gao: 20
		},
		bay: true
	}
};
/**
* Nghĩa binh: không luyện, không chiếm chỗ doanh trại, không ăn gạo, không chết thật. Không được cộng binh khí, huân
* công, Đền; không thuộc vòng khắc chế.
*/
const NGHIA_BINH = {
	hp: 55,
	dmg: 7,
	range: .8,
	speed: 1.6,
	cooldown: 1
};
/** Tô Định còn chừng này phần máu thì bỏ chạy về cuối bãi, nhanh gấp `speed` lần; chạy thoát thì tính như đã hạ. */
const TO_DINH_FLEE = {
	at: .3,
	speed: 1.5
};
/**
* Lệnh nỏ của Mã Viện: lần đầu sau `first` giây, rồi cứ `every` giây, một loạt tên nỏ rơi xuống chỗ quân ta đứng đông
* nhất, `dmg` sát thương mỗi người trong `radius` ô. Tên rơi sau `delay` giây kể từ lúc phất cờ.
*/
const MA_VIEN_VOLLEY = {
	first: 8,
	every: 14,
	dmg: 30,
	radius: 2,
	delay: .8
};
/**
* Lâu thuyền Hán: đậu giữa ba ô sông sát bờ, không cập bờ. Cứ `cooldown` giây (ở `ENEMIES.lauThuyen`) bắn một loạt
* `shots` mũi nỏ vào công trình hay lính gần nhất trong tầm, mỗi mũi `dmg` sát thương. Chỉ quân bắn xa và công trình
* phòng thủ bắn tới. Đậu cách bờ `moor` ô, thuyền này cách thuyền kia `spacing` ô dọc bờ.
*/
const LAU_THUYEN = {
	shots: 3,
	moor: 1.5,
	spacing: 5
};
/**
* Thuyền giặc: mỗi thuyền chở `carry` lính, hiện ở mép sông xa rồi chèo vào bờ gần nhất với tốc độ `speed`
* (ô mỗi giây), thuyền sau rời bến chậm hơn thuyền trước `stagger` giây. Thuyền không có máu, neo tới hết trận.
*/
const BOAT = {
	carry: 6,
	speed: .6,
	stagger: 1.2
};
/**
* Trận giữ kinh đô: kinh đô đã giãn rộng chừng này lần (công trình to hơn một ô mỗi chiều), nên mọi tầm bắn,
* tốc độ, bán kính kỹ năng tính bằng ô đều nhân với hệ số này. Trận ngoài bãi giữ nguyên.
*/
const RAID_SCALE = 1.4;
/** Chòi canh tự bắn giặc trong tầm (ô, trước khi nhân `RAID_SCALE`). */
const TOWER = {
	range: 4.5,
	cooldown: 1.1,
	dmg: [
		7,
		9,
		12,
		15,
		19,
		24,
		30,
		37,
		44,
		52
	]
};
/** Giặc phá được kho hoặc Điện thì cướp đi phần này của mỗi tài nguyên rồi bỏ chạy. */
const LOOT_FRACTION = {
	kho: .15,
	dien: .08
};
const ROWS = [
	"tien",
	"trung",
	"hau"
];
/** Hàng mặc định: giáo binh chặn đầu, voi ở giữa, cung thủ bắn từ sau. */
const DEFAULT_ROWS = {
	giao: "tien",
	voi: "trung",
	cung: "hau",
	no: "hau"
};
const ENEMY_ROWS = {
	giaoAn: "tien",
	chienXa: "trung",
	cungAn: "hau",
	phoTuong: "hau",
	daiTuong: "hau",
	tomBinh: "tien",
	caSau: "trung",
	caPhun: "hau",
	thuongLuong: "hau",
	thuyTinh: "hau",
	quyNui: "tien",
	hoTinh: "trung",
	maTroi: "hau",
	gaTrang: "hau",
	linhTrieu: "tien",
	kyBinh: "trung",
	noTrieu: "hau",
	trieuDa: "hau",
	linhThuy: "tien",
	linhRiu: "trung",
	cungThuyen: "hau",
	tuongThuy: "hau",
	linhHan: "tien",
	giapHan: "trung",
	noHan: "hau",
	toDinh: "hau",
	maVien: "hau",
	lauThuyen: "hau",
	lonRung: "tien",
	cuaDa: "tien",
	baoGam: "trung",
	ranHo: "trung",
	linhNgo: "tien",
	giapNgo: "trung",
	noNgo: "hau",
	lucDan: "hau",
	gauNgua: "tien",
	voiRung: "trung",
	linhLuong: "tien",
	giapLuong: "trung",
	noLuong: "hau",
	tranBaTien: "hau",
	tranGam: "tien",
	trauRung: "trung",
	linhDuong: "tien",
	giapDuong: "trung",
	noDuong: "hau",
	duongTuHuc: "hau",
	soiDo: "tien",
	teGiac: "trung",
	linhNamHan: "tien",
	riuNamHan: "trung",
	cungNamHan: "hau",
	hoangThao: "hau",
	raiCa: "tien",
	ruaBien: "trung",
	linhTong: "tien",
	giapTong: "trung",
	noTong: "hau",
	quachQuy: "hau",
	naiRung: "tien",
	boTot: "trung"
};
/**
* Bãi chiến: rộng `w` ô, dài `d` ô; hàng đầu hai bên cách nhau `gap` ô.
* Ngoài bãi mọi người đều bền hơn `hpMul` lần để trận kéo dài, kịp bấm kỹ năng.
* Quá `maxS` giây chưa phá được giặc thì coi như thua.
*/
const FIELD = {
	w: 9,
	d: 22,
	gap: 10,
	hpMul: 1.6,
	maxS: 90
};
/**
* Bãi chiến có vật cản (`baiChien.ts`): lội nước nông đi bằng chừng này phần tốc độ, lội bùn bằng chừng này phần.
* Thủy quái (`SWIMMERS`) bơi trong nước như đi thường.
*/
const BAI_CHAM = {
	nuoc: .6,
	bun: .75
};
/**
* Chương 1: tám màn trên đường từ Phong Châu tới chân núi Trâu, màn 4 và màn 8 có trùm.
* Chương 2: tám màn trên đường lên núi Tản Viên. Màn 9–11 giành lễ vật, màn 12 có thuồng luồng,
* màn 16 là Thủy Tinh.
* Chương 3: màn 17–19 diệt yêu tinh núi Thất Diệu (trùm gà trắng nghìn năm), màn 20–24 đánh quân Triệu Đà
* cùng An Dương Vương, màn 24 là Triệu Đà.
*/
const STAGES = [
	{
		chapter: 1,
		minDien: 2,
		needsGiong: false,
		enemies: { giaoAn: 4 },
		hpScale: 1,
		reward: {
			gao: 150,
			voOc: 100
		},
		terrain: "rung"
	},
	{
		chapter: 1,
		minDien: 2,
		needsGiong: false,
		enemies: {
			giaoAn: 5,
			cungAn: 2
		},
		hpScale: 1,
		reward: {
			gao: 200,
			voOc: 150,
			datDa: 80
		},
		terrain: "benSong"
	},
	{
		chapter: 1,
		minDien: 3,
		needsGiong: false,
		enemies: {
			giaoAn: 5,
			cungAn: 3,
			chienXa: 1
		},
		hpScale: 1.1,
		reward: {
			gao: 300,
			voOc: 200,
			datDa: 150,
			sat: 40
		},
		terrain: "lang"
	},
	{
		chapter: 1,
		minDien: 3,
		needsGiong: false,
		enemies: {
			giaoAn: 5,
			cungAn: 3,
			chienXa: 1,
			phoTuong: 1
		},
		hpScale: 1.1,
		reward: {
			gao: 500,
			voOc: 300,
			datDa: 250,
			sat: 80
		},
		terrain: "don"
	},
	{
		chapter: 1,
		minDien: 3,
		needsGiong: true,
		enemies: {
			giaoAn: 9,
			cungAn: 5,
			chienXa: 3
		},
		hpScale: 1.35,
		reward: {
			gao: 600,
			voOc: 400,
			datDa: 300,
			sat: 100
		},
		terrain: "rung"
	},
	{
		chapter: 1,
		minDien: 4,
		needsGiong: true,
		enemies: {
			giaoAn: 12,
			cungAn: 7,
			chienXa: 3
		},
		hpScale: 1.45,
		reward: {
			gao: 800,
			voOc: 500,
			datDa: 400,
			sat: 120
		},
		terrain: "benSong"
	},
	{
		chapter: 1,
		minDien: 4,
		needsGiong: true,
		enemies: {
			giaoAn: 10,
			cungAn: 6,
			chienXa: 4
		},
		hpScale: 1.5,
		reward: {
			gao: 1e3,
			voOc: 600,
			datDa: 500,
			sat: 150
		},
		terrain: "lang"
	},
	{
		chapter: 1,
		minDien: 5,
		needsGiong: true,
		enemies: {
			giaoAn: 12,
			cungAn: 7,
			chienXa: 4,
			daiTuong: 1
		},
		hpScale: 1.6,
		reward: {
			gao: 1500,
			voOc: 1e3,
			datDa: 800,
			sat: 250
		},
		terrain: "nui"
	},
	{
		chapter: 2,
		minDien: 5,
		needsGiong: false,
		enemies: {
			tomBinh: 10,
			caPhun: 6,
			caSau: 2
		},
		hpScale: 3.2,
		reward: {
			gao: 1200,
			voOc: 800,
			datDa: 600,
			sat: 150
		},
		terrain: "doi"
	},
	{
		chapter: 2,
		minDien: 5,
		needsGiong: false,
		enemies: {
			tomBinh: 11,
			caPhun: 7,
			caSau: 3
		},
		hpScale: 2.8,
		reward: {
			gao: 1300,
			voOc: 900,
			datDa: 700,
			sat: 180
		},
		terrain: "benSong"
	},
	{
		chapter: 2,
		minDien: 5,
		needsGiong: false,
		enemies: {
			tomBinh: 12,
			caPhun: 8,
			caSau: 3
		},
		hpScale: 2.5,
		reward: {
			gao: 1400,
			voOc: 1e3,
			datDa: 800,
			sat: 200
		},
		terrain: "rung"
	},
	{
		chapter: 2,
		minDien: 5,
		needsGiong: false,
		needsSon: true,
		enemies: {
			tomBinh: 12,
			caPhun: 7,
			caSau: 3,
			thuongLuong: 1
		},
		hpScale: 2.1,
		reward: {
			gao: 1800,
			voOc: 1200,
			datDa: 1e3,
			sat: 260
		},
		terrain: "ngap"
	},
	{
		chapter: 2,
		minDien: 5,
		needsGiong: false,
		needsSon: true,
		enemies: {
			tomBinh: 14,
			caPhun: 8,
			caSau: 4
		},
		hpScale: 2.1,
		reward: {
			gao: 2e3,
			voOc: 1300,
			datDa: 1100,
			sat: 280
		},
		terrain: "lang"
	},
	{
		chapter: 2,
		minDien: 5,
		needsGiong: false,
		needsSon: true,
		enemies: {
			tomBinh: 14,
			caPhun: 8,
			caSau: 4
		},
		hpScale: 2.1,
		reward: {
			gao: 2200,
			voOc: 1500,
			datDa: 1200,
			sat: 300
		},
		terrain: "benSong"
	},
	{
		chapter: 2,
		minDien: 5,
		needsGiong: false,
		needsSon: true,
		enemies: {
			tomBinh: 14,
			caPhun: 9,
			caSau: 4
		},
		hpScale: 2.4,
		reward: {
			gao: 2500,
			voOc: 1700,
			datDa: 1400,
			sat: 350
		},
		terrain: "nui"
	},
	{
		chapter: 2,
		minDien: 5,
		needsGiong: false,
		needsSon: true,
		sonOnly: true,
		enemies: {
			tomBinh: 12,
			caPhun: 8,
			caSau: 3,
			thuyTinh: 1
		},
		hpScale: 1.8,
		reward: {
			gao: 3e3,
			voOc: 2e3,
			datDa: 2e3,
			sat: 500
		},
		terrain: "tanVien"
	},
	{
		chapter: 3,
		minDien: 5,
		needsGiong: false,
		enemies: {
			quyNui: 12,
			maTroi: 7,
			hoTinh: 3
		},
		hpScale: 2.6,
		reward: {
			gao: 2600,
			voOc: 1800,
			datDa: 1600,
			sat: 400
		},
		terrain: "thatDieu"
	},
	{
		chapter: 3,
		minDien: 5,
		needsGiong: false,
		enemies: {
			quyNui: 13,
			maTroi: 8,
			hoTinh: 4
		},
		hpScale: 2.4,
		reward: {
			gao: 2800,
			voOc: 2e3,
			datDa: 1800,
			sat: 450
		},
		terrain: "rung"
	},
	{
		chapter: 3,
		minDien: 5,
		needsGiong: false,
		enemies: {
			quyNui: 12,
			maTroi: 7,
			hoTinh: 3,
			gaTrang: 1
		},
		hpScale: 2.4,
		reward: {
			gao: 3200,
			voOc: 2200,
			datDa: 2e3,
			sat: 500
		},
		terrain: "thatDieu"
	},
	{
		chapter: 3,
		minDien: 5,
		needsGiong: false,
		needsAdv: true,
		enemies: {
			linhTrieu: 14,
			noTrieu: 8,
			kyBinh: 4
		},
		hpScale: 1.9,
		reward: {
			gao: 3400,
			voOc: 2400,
			datDa: 2200,
			sat: 550
		},
		terrain: "rung"
	},
	{
		chapter: 3,
		minDien: 5,
		needsGiong: false,
		needsAdv: true,
		enemies: {
			linhTrieu: 14,
			noTrieu: 9,
			kyBinh: 4
		},
		hpScale: 1.8,
		reward: {
			gao: 3600,
			voOc: 2600,
			datDa: 2400,
			sat: 600
		},
		terrain: "benSong"
	},
	{
		chapter: 3,
		minDien: 5,
		needsGiong: false,
		needsAdv: true,
		enemies: {
			linhTrieu: 15,
			noTrieu: 9,
			kyBinh: 4
		},
		hpScale: 1.8,
		reward: {
			gao: 3800,
			voOc: 2800,
			datDa: 2600,
			sat: 650
		},
		terrain: "nui"
	},
	{
		chapter: 3,
		minDien: 5,
		needsGiong: false,
		needsAdv: true,
		enemies: {
			linhTrieu: 14,
			noTrieu: 9,
			kyBinh: 5
		},
		hpScale: 2.1,
		reward: {
			gao: 4e3,
			voOc: 3e3,
			datDa: 2800,
			sat: 700
		},
		terrain: "lang"
	},
	{
		chapter: 3,
		minDien: 5,
		needsGiong: false,
		needsAdv: true,
		enemies: {
			linhTrieu: 13,
			noTrieu: 9,
			kyBinh: 4,
			trieuDa: 1
		},
		hpScale: 1.9,
		reward: {
			gao: 5e3,
			voOc: 4e3,
			datDa: 3500,
			sat: 900
		},
		terrain: "coLoa"
	},
	{
		chapter: 4,
		minDien: 5,
		needsGiong: false,
		needsAdv: true,
		enemies: {
			linhThuy: 13,
			cungThuyen: 8,
			linhRiu: 4
		},
		hpScale: 2.3,
		reward: {
			gao: 5500,
			voOc: 4500,
			datDa: 4e3,
			sat: 1e3
		},
		terrain: "benSong"
	},
	{
		chapter: 4,
		minDien: 5,
		needsGiong: false,
		needsCaoLo: true,
		enemies: {
			linhThuy: 14,
			cungThuyen: 8,
			linhRiu: 4
		},
		hpScale: 2.3,
		reward: {
			gao: 6e3,
			voOc: 5e3,
			datDa: 4400,
			sat: 1100
		},
		terrain: "benSong"
	},
	{
		chapter: 4,
		minDien: 5,
		needsGiong: false,
		needsCaoLo: true,
		enemies: {
			linhThuy: 14,
			cungThuyen: 9,
			linhRiu: 5
		},
		hpScale: 2,
		reward: {
			gao: 6500,
			voOc: 5400,
			datDa: 4800,
			sat: 1200
		},
		terrain: "lang"
	},
	{
		chapter: 4,
		minDien: 5,
		needsGiong: false,
		needsCaoLo: true,
		enemies: {
			linhThuy: 13,
			cungThuyen: 8,
			linhRiu: 4,
			tuongThuy: 1
		},
		hpScale: 2,
		reward: {
			gao: 7200,
			voOc: 6e3,
			datDa: 5200,
			sat: 1300
		},
		terrain: "cuaSong"
	},
	{
		chapter: 4,
		minDien: 5,
		needsGiong: false,
		needsCaoLo: true,
		enemies: {
			linhTrieu: 7,
			linhThuy: 7,
			noTrieu: 5,
			cungThuyen: 4,
			kyBinh: 3,
			linhRiu: 2
		},
		hpScale: 2.1,
		reward: {
			gao: 7600,
			voOc: 6300,
			datDa: 5500,
			sat: 1350
		},
		terrain: "lang"
	},
	{
		chapter: 4,
		minDien: 5,
		needsGiong: false,
		needsCaoLo: true,
		enemies: {
			linhTrieu: 7,
			linhThuy: 7,
			noTrieu: 5,
			cungThuyen: 5,
			kyBinh: 2,
			linhRiu: 2
		},
		hpScale: 2.1,
		reward: {
			gao: 8e3,
			voOc: 6600,
			datDa: 5800,
			sat: 1400
		},
		terrain: "rung"
	},
	{
		chapter: 4,
		minDien: 5,
		needsGiong: false,
		needsCaoLo: true,
		enemies: {
			linhTrieu: 8,
			linhThuy: 7,
			noTrieu: 5,
			cungThuyen: 4,
			kyBinh: 2,
			linhRiu: 2
		},
		hpScale: 2.5,
		reward: {
			gao: 8500,
			voOc: 7e3,
			datDa: 6200,
			sat: 1500
		},
		terrain: "coLoa"
	},
	{
		chapter: 4,
		minDien: 5,
		needsGiong: false,
		needsCaoLo: true,
		enemies: {
			linhTrieu: 3,
			linhThuy: 3,
			noTrieu: 2,
			cungThuyen: 2
		},
		waves: [{
			at: 30,
			enemies: {
				linhTrieu: 3,
				linhThuy: 2,
				noTrieu: 2,
				kyBinh: 2,
				linhRiu: 1
			}
		}, {
			at: 60,
			enemies: {
				linhTrieu: 2,
				linhThuy: 2,
				noTrieu: 1,
				cungThuyen: 1,
				kyBinh: 1,
				linhRiu: 1,
				trieuDa: 1
			}
		}],
		holdS: 90,
		hpScale: 3,
		reward: {
			gao: 9e3,
			voOc: 7500,
			datDa: 6500,
			sat: 1600
		},
		terrain: "moDa"
	},
	{
		chapter: 5,
		minDien: 5,
		needsGiong: false,
		enemies: {
			linhHan: 13,
			noHan: 8,
			giapHan: 4
		},
		hpScale: 1.8,
		reward: {
			gao: 9500,
			voOc: 8e3,
			datDa: 7e3,
			sat: 1700
		},
		terrain: "lang"
	},
	{
		chapter: 5,
		minDien: 5,
		needsGiong: false,
		enemies: {
			linhHan: 13,
			noHan: 8,
			giapHan: 4
		},
		hpScale: 2,
		reward: {
			gao: 1e4,
			voOc: 8400,
			datDa: 7300,
			sat: 1800
		},
		terrain: "hatMon"
	},
	{
		chapter: 5,
		minDien: 5,
		needsGiong: false,
		enemies: {
			linhHan: 12,
			noHan: 9,
			giapHan: 4
		},
		hpScale: 2,
		reward: {
			gao: 10500,
			voOc: 8800,
			datDa: 7700,
			sat: 1900
		},
		terrain: "coLoa"
	},
	{
		chapter: 5,
		minDien: 5,
		needsGiong: false,
		enemies: {
			linhHan: 12,
			noHan: 8,
			giapHan: 4,
			toDinh: 1
		},
		hpScale: 1.8,
		reward: {
			gao: 11500,
			voOc: 9500,
			datDa: 8300,
			sat: 2e3
		},
		terrain: "luyLau"
	},
	{
		chapter: 5,
		minDien: 5,
		needsGiong: false,
		enemies: {
			linhHan: 13,
			noHan: 8,
			giapHan: 4
		},
		hpScale: 2.1,
		reward: {
			gao: 12e3,
			voOc: 1e4,
			datDa: 8700,
			sat: 2100
		},
		terrain: "cuaSong"
	},
	{
		chapter: 5,
		minDien: 5,
		needsGiong: false,
		enemies: {
			linhHan: 12,
			noHan: 9,
			giapHan: 4
		},
		hpScale: 2,
		reward: {
			gao: 12500,
			voOc: 10500,
			datDa: 9100,
			sat: 2200
		},
		terrain: "langBac"
	},
	{
		chapter: 5,
		minDien: 5,
		needsGiong: false,
		enemies: {
			linhHan: 12,
			noHan: 8,
			giapHan: 4,
			maVien: 1
		},
		hpScale: 1.5,
		reward: {
			gao: 13500,
			voOc: 11200,
			datDa: 9800,
			sat: 2400
		},
		terrain: "langBac"
	},
	{
		chapter: 5,
		minDien: 5,
		needsGiong: false,
		enemies: {
			linhHan: 5,
			noHan: 3,
			giapHan: 2
		},
		waves: [{
			at: 35,
			enemies: {
				linhHan: 4,
				noHan: 3,
				giapHan: 3
			}
		}, {
			at: 70,
			enemies: {
				linhHan: 4,
				noHan: 2,
				giapHan: 2,
				maVien: 1
			}
		}],
		holdS: 100,
		hpScale: 2.8,
		reward: {
			gao: 14e3,
			voOc: 12e3,
			datDa: 10500,
			sat: 2500
		},
		terrain: "camKhe"
	}
];
const du = (hpScale, extra) => ({
	kind: "giacDu",
	hpScale,
	...extra ? { extra } : {}
});
const hai = (a, b, hpScale, extra) => ({
	kind: "haiBinh",
	units: [a, b],
	hpScale,
	...extra ? { extra } : {}
});
du(3.2, {
	giaoAn: 10,
	cungAn: 7,
	chienXa: 3
}), hai("giao", "voi", 4.15, {
	giaoAn: 7,
	cungAn: 5,
	chienXa: 2
}), du(3.8, {
	giaoAn: 7,
	cungAn: 4,
	chienXa: 2
}), du(2.6, {
	giaoAn: 7,
	cungAn: 4,
	chienXa: 2
}), hai("giao", "voi", 3.5), du(2.35), hai("giao", "voi", 4), du(2.9), hai("giao", "cung", 4.1), hai("giao", "voi", 3), du(1.8), hai("giao", "voi", 3.2), du(2.8), hai("giao", "cung", 3.3), hai("giao", "voi", 2.6), du(2.05), hai("giao", "no", 3.15), du(2.35), hai("voi", "no", 2.6), hai("giao", "no", 3.1), du(3.3), hai("giao", "voi", 2.2), du(1.9), hai("giao", "no", 2.85), du(1.5), du(2.7);
const HUAN_BRANCHES = [
	"giao",
	"cung",
	"voi",
	"no",
	"tuong"
];
/**
* Giá bậc 1–4 của mỗi nhánh. Một nhánh hết 24, năm nhánh hết 120, bằng huân công của cả 40 thử thách (bậc 4 thêm ở
* chương 5, vừa bằng 40 huân công của thử thách màn 33–40).
*/
const HUAN_COST = [
	3,
	5,
	8,
	8
];
/** Mỗi bậc huân công thêm chừng này vào máu và sức đánh của nhánh ấy, ở mọi trận. */
const HUAN_BONUS = .04;
const SKILL_IDS = [
	"trongTran",
	"phunLua",
	"nhoTre",
	"bocDoi",
	"doiNon",
	"noThan",
	"ruaVang",
	"lienChau",
	"lenhBan",
	"voiXung",
	"hieuTrieu",
	"chemCaKinh",
	"ngayAn",
	"hacDe",
	"cocBachDang",
	"namQuoc"
];
const SKILLS = {
	trongTran: {
		cooldown: 20,
		duration: 6
	},
	phunLua: {
		cooldown: 15,
		duration: 0
	},
	nhoTre: {
		cooldown: 20,
		duration: 0
	},
	bocDoi: {
		cooldown: 16,
		duration: 0
	},
	doiNon: {
		cooldown: 22,
		duration: 0
	},
	noThan: {
		cooldown: 18,
		duration: 0
	},
	ruaVang: {
		cooldown: 24,
		duration: 6
	},
	lienChau: {
		cooldown: 12,
		duration: 0
	},
	lenhBan: {
		cooldown: 22,
		duration: 6
	},
	voiXung: {
		cooldown: 12,
		duration: 0
	},
	hieuTrieu: {
		cooldown: 25,
		duration: 0
	},
	chemCaKinh: {
		cooldown: 14,
		duration: 0
	},
	ngayAn: {
		cooldown: 18,
		duration: 4
	},
	hacDe: {
		cooldown: 16,
		duration: 8
	},
	cocBachDang: {
		cooldown: 14,
		duration: 6
	},
	namQuoc: {
		cooldown: 18,
		duration: 6
	}
};
/** Trống trận thúc quân: quân ta đánh mạnh hơn và chạy nhanh hơn trong một lúc. */
const RALLY = {
	dmg: 1.5,
	speed: 1.3
};
/**
* Đấu thành: đánh kinh đô người chơi khác (bản chụp), cướp của.
* - `unlockDien`: mở ở Điện cấp này.
* - `holdS`: mỗi trận đánh tối đa chừng này giây.
* - `star1`: phá từ phần này số công trình tính điểm thì được sao đầu; phá Điện thêm một sao, phá hết thêm một sao.
* - Của cướp: mỗi loại tối đa `maxLoot` × (của đang có − `protect` × sức chứa kho); lấy được bao nhiêu trong mức ấy
*   thì tính `khoW` theo số kho bị phá (không có kho thì tính theo phần trăm phá), `dienW` nếu phá Điện, `pctW` theo
*   phần trăm phá. Đánh người kém cấp Điện hơn mình thì mỗi cấp chênh lệch giảm một nửa.
* - Chiến công: thắng (từ một sao) được `trophyBase` cộng chênh lệch chiến công chia `trophySpread`, kẹp trong
*   `trophyMin`–`trophyMax`; người giữ thành mất bấy nhiêu. Không sao thì ngược lại.
* - Kinh đô máy: quân giữ thành đủ `GUARD_CAP`, của bằng `botStock` sức chứa kho.
* - `hpMul`, `siege` theo cấp Điện kinh đô bị đánh (chỉ số 0 là Điện 1): mọi người trong trận bền hơn `hpMul` lần
*   (như ngoài bãi bền hơn `FIELD.hpMul`), đòn quân đánh thành vào công trình mạnh gấp `siege` lần. Tháp, cổng, ụ nỏ
*   bắn mạnh dần theo cấp mà lính ta thì không, nên kinh đô cấp càng cao càng cần số lớn. Số đo bằng
*   `dauThanh.test.ts`: đủ quân mẫu cùng cấp Điện được 1–2 sao, nửa quân không sao.
*/
const DAU_THANH = {
	unlockDien: 5,
	holdS: 180,
	star1: .5,
	maxLoot: .2,
	protect: .25,
	khoW: .5,
	dienW: .3,
	pctW: .2,
	trophyBase: 25,
	trophySpread: 20,
	trophyMin: 10,
	trophyMax: 40,
	botStock: .6,
	hpMul: [
		3,
		3,
		3,
		3,
		3,
		3,
		4,
		6,
		6,
		10
	],
	siege: [
		2,
		2,
		2,
		2,
		2,
		1,
		2.2,
		4,
		4,
		4
	],
	/** Đánh kinh đô máy (khi chưa đủ người chơi): chiến công được hay mất nhân chừng này, không cướp của thật. */
	botTrophy: .2,
	/** Bắt đầu trận thì khóa người giữ thành chừng này giây (trận 3 phút và lúc vào trận). */
	lockS: 240,
	/** Bị đánh xong được khiên chừng này giờ. */
	shieldH: 8,
	/** Đã đánh ai thì chừng này giờ sau mới ghép lại người ấy. */
	rematchH: 12,
	/** Ghép trận: Điện chênh không quá `matchDien`, thiếu người thì nới ra `matchDienWide`; chọn ngẫu nhiên trong `matchPick` người chiến công gần nhất. */
	matchDien: 1,
	matchDienWide: 2,
	matchPick: 5,
	/** Lượt gọi máy chủ mỗi giờ: tìm đối thủ, đánh, tải bản chụp. */
	findPerH: 30,
	attackPerH: 10,
	snapPerH: 30,
	/** Tên người chơi: số chữ ít nhất, nhiều nhất. */
	nameMin: 2,
	nameMax: 16,
	/** Trận và bản chụp quá chừng này ngày thì máy chủ xóa. */
	keepDays: 30,
	/** Bảng xếp hạng: máy chủ trả chừng này người đứng đầu (PR 6). */
	rankTop: 50,
	/** Lượt gọi máy chủ mỗi giờ: xem bảng xếp hạng, xem lại trận, lưu (hay tải) bản lưu trên mây. */
	rankPerH: 60,
	replayPerH: 60,
	savePerH: 30,
	/** Bản lưu trên mây dài nhất (số ký tự của mã lưu; người chơi mô phỏng ở Điện 10 chừng 3,3 nghìn, để dư nhiều). */
	saveMax: 2e5
};
const O_DO = [
	"vuKhi",
	"giap",
	"phucSuc",
	"baoVat"
];
const BO_DO = [
	"phuDong",
	"tanVien",
	"coLoa",
	"caoLo",
	"trungTrac",
	"trungNhi",
	"nuiNua",
	"daTrach",
	"vanAn",
	"bachDang",
	"nhuNguyet"
];
const CHI_SO = [
	"mau",
	"danh",
	"toc",
	"uy",
	"giap",
	"hoi"
];
/** Tướng của từng bộ: hiệu ứng bộ chỉ có khi đúng tướng này mặc. */
const BO_CUA = {
	phuDong: "giong",
	tanVien: "sonTinh",
	coLoa: "anDuong",
	caoLo: "caoLo",
	trungTrac: "trungTrac",
	trungNhi: "trungNhi",
	nuiNua: "baTrieu",
	daTrach: "trieuQuangPhuc",
	vanAn: "maiThucLoan",
	bachDang: "ngoQuyen",
	nhuNguyet: "lyThuongKiet"
};
/** Phó bản, thử thách rơi bộ của chương màn ấy (chương 5: một trong hai bộ của Hai Bà). */
const BO_CHUONG = {
	1: ["phuDong"],
	2: ["tanVien"],
	3: ["coLoa"],
	4: ["caoLo"],
	5: ["trungTrac", "trungNhi"]
};
/** Chỉ số chính rút được của từng ô. */
const O_CHINH = {
	vuKhi: ["danh"],
	giap: ["mau", "giap"],
	phucSuc: ["toc", "hoi"],
	baoVat: ["uy"]
};
/** Hệ số theo chỉ số: giáp, tốc đánh, hồi kỹ năng mạnh hơn mỗi phần trăm nên được ít hơn. */
const CHI_SO_HE = {
	mau: 1,
	danh: 1,
	toc: .6,
	uy: 1,
	giap: .6,
	hoi: .5
};
/** Chỉ số chính ở +0, cấp đồ 1, theo phẩm (chỉ số 0 không dùng). */
const PHAM_CHINH = [
	0,
	.02,
	.03,
	.04,
	.05
];
/** Chỉ số phụ: nấc 1 tới 5 là 1% tới 2%, nhân hệ số theo chỉ số và theo cấp đồ. */
const PHU_THAP = .01;
const PHU_NAC = .0025;
/** Hệ số chỉ số theo cấp đồ (chương nơi rơi, 1–5; chỉ số 0 không dùng). */
const CAP_DO_HE = [
	0,
	1,
	1.3,
	1.6,
	1.9,
	2.2
];
/** Mỗi nấc cường hóa thêm chừng này phần chỉ số chính. */
const CUONG_HOA_NAC = .1;
/** Nấc cường hóa cao nhất theo phẩm. */
const CUONG_HOA_TRAN = [
	0,
	4,
	6,
	8,
	10
];
/** Trần tổng mỗi tướng (cả đồ và hiệu ứng bộ). */
const CHI_SO_TRAN = {
	toc: .5,
	giap: .4,
	hoi: .3
};
/** Phẩm cao nhất rơi ở trận mỗi chương: chương 1 Tốt, chương 2 Quý, từ chương 3 Huyền thoại. */
const PHAM_TRAN = {
	1: 2,
	2: 3,
	3: 4,
	4: 4,
	5: 4
};
/** Hiệu ứng hai món: đúng tướng của bộ mặc từ hai món của bộ mình thì cộng thêm chỉ số này. */
const BO_HAI = {
	phuDong: {
		k: "danh",
		v: .1
	},
	tanVien: {
		k: "mau",
		v: .1
	},
	coLoa: {
		k: "uy",
		v: .1
	},
	caoLo: {
		k: "toc",
		v: .08
	},
	trungTrac: {
		k: "giap",
		v: .08
	},
	trungNhi: {
		k: "hoi",
		v: .08
	},
	nuiNua: {
		k: "mau",
		v: .1
	},
	daTrach: {
		k: "toc",
		v: .08
	},
	vanAn: {
		k: "giap",
		v: .08
	},
	bachDang: {
		k: "uy",
		v: .1
	},
	nhuNguyet: {
		k: "hoi",
		v: .08
	}
};
/**
* Hiệu ứng bốn món: đúng tướng của bộ mặc đủ bốn món bộ mình thì kỹ năng mạnh hơn (số thay cho số gốc của kỹ năng ở
* `FIRE`, `SMASH`, `HILL`, `ROCKS`, `NO_THAN`, `KIM_QUY`, `LIEN_CHAU`, `SKILLS.lenhBan`, `VOI_XUNG`, `HIEU_TRIEU`, `CA_KINH`, `NGAY_AN`, `HAC_DE`, `COC_BACH_DANG`, `NAM_QUOC`).
*/
const BO_BON = {
	phunLua: { length: 9 },
	nhoTre: { radius: 3 },
	bocDoi: { radius: 2.8 },
	doiNon: { stun: 4 },
	noThan: { dmg: 100 },
	ruaVang: { heal: .4 },
	lienChau: { radius: 4.2 },
	lenhBan: { duration: 8 },
	voiXung: {
		length: 6.5,
		stun: 2.2
	},
	hieuTrieu: {
		count: 6,
		heal: .2
	},
	chemCaKinh: {
		dmg: 330,
		stun: 1
	},
	ngayAn: {
		an: 5,
		phuc: 3
	},
	hacDe: {
		danh: .4,
		t: 10
	},
	cocBachDang: {
		r: 3.2,
		t: 8
	},
	namQuoc: {
		hoi: .25,
		yeu: .4
	}
};
const DA_MAP_IDS = [
	1,
	2,
	3,
	4,
	5,
	6,
	7,
	8,
	9,
	10
];
DA_MAP_IDS[DA_MAP_IDS.length - 1];
/** Cỡ map dã ngoại (ô), số quái mỗi khu, quái ở khu thứ năm (mạnh nhất) ít hơn nhưng bền hơn. */
const DA_KHUNG = {
	w: 80,
	d: 80
};
/**
* Tướng trên map: hồi `hoi` phần máu mỗi giây khi `yen` giây không bị đánh; ngã thì `day` giây không bị đuổi mới đứng
* dậy; kỹ năng chỉ trúng quái trong `tam` ô quanh tướng; đội tối đa `max` tướng. Tự đánh: máu cả đội dưới `nghi[0]`
* mà không có quái đuổi thì dừng nghỉ, hồi tới `nghi[1]` mới đánh tiếp.
*/
const DA_TUONG = {
	hoi: .04,
	yen: 4,
	day: 3,
	tam: 9,
	max: 3,
	nghi: [.4, .9]
};
/**
* Lôi đài: `tang` tầng, mỗi chương mở `moiChuong` tầng, đội `doi` tướng, quá `vong` vòng thì thua (một vòng là thời gian
* người có tốc 1 đầy thanh hành động). Đòn thường gây sức đánh × `don`. Đòn đầu sau khi ẩn nhân `phuc`. Tướng mặc đủ
* bốn món bộ mình thì chiêu mạnh thêm `bo4`. Thần thú đầy thanh sau `thuVong` vòng. Thưởng sắt mỗi tầng: `sat[0]` +
* `sat[1]` × tầng, tầng mốc nhân `satMoc`. Bậc khó (lên một bậc mỗi tuần qua hết 50 tầng, tối đa `bacMax`): mỗi bậc đội
* máy thêm `bacHe` máu và sức đánh, sắt thưởng thêm `bacSat`.
*/
const LOI_DAI = {
	tang: 50,
	moiChuong: 10,
	doi: 3,
	vong: 30,
	don: 4,
	phuc: 1.6,
	bo4: .15,
	thuVong: 2.2,
	sat: [20, 4],
	satMoc: 3,
	bacHe: .06,
	bacMax: 10,
	bacSat: .1
};
/**
* Bản đồ Việt Nam (docs/thiet-ke.md mục Kế hoạch: bản đồ Việt Nam, 34 tỉnh, chức Bồ chính): mở từ Điện `dien`;
* mùa dài `muaTuan` tuần (bắt đầu 0 giờ thứ Hai giờ Việt Nam như tuần Lôi đài), đổi tỉnh mỗi mùa một lần; đổi chức
* chờ `doiChucMs` kể từ lần chọn chức trước.
* PR 2 (máy chủ điểm tỉnh): góp của được 1 điểm cho mỗi 1% sức chứa kho lúc góp, mỗi người mỗi ngày (giờ Việt Nam)
* tối đa `gopNgay` điểm; điểm tỉnh mỗi mùa cộng điểm của `topTinh` người góp nhiều nhất. Giới hạn lượt gọi mỗi giờ:
* góp `gopPerH`, chọn tỉnh hay chức `chonPerH`, xem bảng tỉnh `bangPerH`. Điểm tỉnh giữ `giuNgay` ngày.
*/
const VIET_NAM = {
	dien: 5,
	muaTuan: 4,
	doiChucMs: 864e5,
	gopNgay: 100,
	topTinh: 30,
	gopPerH: 30,
	chonPerH: 12,
	bangPerH: 120,
	giuNgay: 120
};
/**
* Mùa, phúc lành, quy về (bản đồ Việt Nam PR 4, `muaTinh.ts`). Hết mùa, tỉnh đã quy về xếp hạng theo điểm mùa ấy:
* người góp nhiều nhất cho tỉnh nào thì theo tỉnh ấy, cả mùa sau có phúc lành tỉnh (phần trăm sản lượng kinh đô: hạng
* 1–`hangDau` `phuc[0]`, tới hạng `hangMuoi` `phuc[1]`, tỉnh còn lại đã diệt được một đạo giặc `phuc[2]`; không tính
* trong Đấu thành) và thưởng một lần (`thuong`: số món đồ, huân công; ai có điểm cũng được phần cuối). Tỉnh chưa quy
* về dồn mọi điểm vào kết giao: đủ `ketGiao` (30 người × 7 ngày × 100 điểm) thì cả tỉnh quy về, giữ mãi.
*/
const MUA_TINH = {
	hangDau: 3,
	hangMuoi: 10,
	phuc: [
		10,
		6,
		3
	],
	thuong: [
		{
			mon: 2,
			huan: 10
		},
		{
			mon: 1,
			huan: 6
		},
		{
			mon: 0,
			huan: 3
		}
	],
	ketGiao: 21e3
};
/**
* Giặc chung của tỉnh (bản đồ Việt Nam PR 3, `giacChung.ts`). Mỗi tuần một đạo vào `tinhMin`–`tinhMax` tỉnh của một
* nhóm (biên giới phía bắc, phía tây, giáp biển, theo lượt tuần), đánh từ thứ `tuNgay` (0 là thứ Hai) tới hết tuần.
* Máu mỗi tỉnh = số người đã góp ở tỉnh ấy tuần trước (ít nhất `nguoiMin`) × `mauNguoi`. Mỗi trận ngoài bãi tối đa
* `FIELD.maxS` giây, giặc theo chương của người đánh (màn `man`, máu nhân `hpMul`); sát thương = phần trăm máu giặc
* đã hạ, đúng chức (quân, biên với giặc biên giới, hải với giặc biển) nhân `heChuc`; điểm tỉnh bằng sát thương. Mỗi
* ngày `tranNgay` trận. Đánh giúp tỉnh láng giềng: điểm chia đôi cho hai tỉnh. Diệt đạo: người đã đánh được một món
* (nơi rơi `don`) và `huan` huân công. Trận gửi kết quả trong `xongMs`; giới hạn lượt mỗi giờ `danhPerH`.
*/
const GIAC_CHUNG = {
	tuNgay: 4,
	tinhMin: 3,
	tinhMax: 5,
	nguoiMin: 10,
	mauNguoi: 300,
	man: {
		1: 7,
		2: 11,
		3: 20,
		4: 27,
		5: 35
	},
	hpMul: 1.2,
	heChuc: 1.5,
	tranNgay: 3,
	huan: 3,
	xongMs: 36e5,
	danhPerH: 20
};
// src/game/caoLo.ts
function initialCaoLo() {
	return {
		restUntil: 0,
		lenhBan: false
	};
}
// src/game/chuong5.ts
function initialHaiBa() {
	return {
		trungTrac: 0,
		trungNhi: 0
	};
}
// src/game/nuTuong.ts
/** Lính loại `kind` có được nữ tướng `id` cộng thêm không (đúng binh chủng của nữ tướng). */
const nuBoosts = (id, kind) => !!id && NU_TUONG[id].unit === kind;
// src/game/baiChien.ts
const tron = (x, z, r) => ({
	k: "tron",
	x,
	z,
	r
});
const doan = (ax, az, bx, bz, half, vuong) => vuong ? {
	k: "doan",
	ax,
	az,
	bx,
	bz,
	half,
	vuong
} : {
	k: "doan",
	ax,
	az,
	bx,
	bz,
	half
};
/**
* Mọi bố cục bãi chiến, theo id. Bố cục mới phải qua `kiemBai` (`baiChien.test.ts`): nằm trong dải giữa, khe giữa hai
* vật cản liền hay rộng ít nhất 1,6 ô, có lối rộng 2,5 ô, hàng nào cũng còn ít nhất 4 ô trống.
*/
const BAI = {
	rung: {
		id: "rung",
		terrain: "rung",
		can: [
			{
				hinh: tron(2.8, 9.2, .9),
				ve: "tre"
			},
			{
				hinh: tron(6.3, 12.4, 1),
				ve: "tre"
			},
			{
				hinh: tron(-.3, 13, 1.1),
				ve: "tre"
			}
		],
		cham: []
	},
	benSong: {
		id: "benSong",
		terrain: "benSong",
		can: [{
			hinh: doan(2.2, 11.4, 4, 12, .4),
			ve: "thuyen"
		}, {
			hinh: tron(6.6, 9.4, .5),
			ve: "chum"
		}],
		cham: [{
			hinh: doan(9.8, 8, 4.6, 9.8, .7),
			loai: "nuoc"
		}]
	},
	lang: {
		id: "lang",
		terrain: "lang",
		can: [
			{
				hinh: doan(-.8, 10.4, 1.6, 10.4, .9, true),
				ve: "nha"
			},
			{
				hinh: tron(6.6, 9, .6),
				ve: "rom"
			},
			{
				hinh: doan(5.6, 12.9, 9.6, 13.3, .3),
				ve: "rao"
			}
		],
		cham: []
	},
	don: {
		id: "don",
		terrain: "don",
		can: [
			{
				hinh: doan(-.6, 7.4, 1.1, 7.4, .3),
				ve: "coc"
			},
			{
				hinh: doan(4.4, 7.4, 5.2, 7.4, .3),
				ve: "coc"
			},
			{
				hinh: doan(7.8, 7.4, 9.6, 7.4, .3),
				ve: "coc"
			},
			{
				hinh: tron(2.3, 11.6, .6),
				ve: "coc"
			},
			{
				hinh: tron(6.7, 12, .6),
				ve: "coc"
			}
		],
		cham: []
	},
	nui: {
		id: "nui",
		terrain: "nui",
		can: [
			{
				hinh: tron(.3, 8.4, 1.1),
				ve: "da"
			},
			{
				hinh: tron(5.6, 8.2, .8),
				ve: "da"
			},
			{
				hinh: tron(9, 12, 1.1),
				ve: "da"
			},
			{
				hinh: tron(3, 13.6, .7),
				ve: "da"
			}
		],
		cham: []
	},
	nui2: {
		id: "nui2",
		terrain: "nui",
		can: [{
			hinh: tron(.3, 8.4, 1.1),
			ve: "da"
		}, {
			hinh: tron(9, 12, 1.1),
			ve: "da"
		}],
		cham: []
	},
	benKia: {
		id: "benKia",
		terrain: "benKia",
		can: [
			{
				hinh: tron(2.3, 8.4, .6),
				ve: "coc"
			},
			{
				hinh: tron(6.7, 8.6, .6),
				ve: "coc"
			},
			{
				hinh: doan(5.6, 12.2, 7, 12.8, .35),
				ve: "xeCui"
			}
		],
		cham: [{
			hinh: tron(2, 12.4, 1.5),
			loai: "bun",
			ve: "lau"
		}]
	},
	rung2: {
		id: "rung2",
		terrain: "rung",
		can: [
			{
				hinh: tron(6.5, 8.8, .9),
				ve: "tre"
			},
			{
				hinh: doan(1.9, 11.4, 4.2, 12.4, .3),
				ve: "go"
			},
			{
				hinh: tron(9.6, 13.4, 1),
				ve: "tre"
			}
		],
		cham: [{
			hinh: tron(.6, 8.4, .9),
			loai: "nuoc",
			ve: "sen"
		}]
	},
	benSong2: {
		id: "benSong2",
		terrain: "benSong",
		can: [{
			hinh: doan(5.2, 12.6, 7, 12, .4),
			ve: "thuyen"
		}, {
			hinh: tron(-.1, 13.2, .7),
			ve: "chum"
		}],
		cham: [{
			hinh: doan(-.8, 9, 4, 10.6, .7),
			loai: "nuoc"
		}]
	},
	lang2: {
		id: "lang2",
		terrain: "lang",
		can: [
			{
				hinh: doan(7.4, 9, 9.8, 9, .9, true),
				ve: "nha"
			},
			{
				hinh: tron(2.6, 10, .55),
				ve: "gieng"
			},
			{
				hinh: doan(-.6, 12.8, 3.4, 13.2, .3),
				ve: "rao"
			}
		],
		cham: [{
			hinh: tron(6.2, 12.6, 1),
			loai: "nuoc",
			ve: "sen"
		}]
	},
	doi: {
		id: "doi",
		terrain: "doi",
		can: [
			{
				hinh: tron(2.4, 8.8, .8),
				ve: "sim"
			},
			{
				hinh: tron(6.6, 10.2, .75),
				ve: "sim"
			},
			{
				hinh: tron(3.4, 13, .7),
				ve: "sim"
			},
			{
				hinh: tron(9.5, 13.4, 1),
				ve: "da"
			}
		],
		cham: []
	},
	ngap: {
		id: "ngap",
		terrain: "ngap",
		can: [{
			hinh: doan(6.2, 8.4, 7, 8.9, .32),
			ve: "go"
		}, {
			hinh: tron(0, 13.2, 1),
			ve: "da"
		}],
		cham: [{
			hinh: doan(-.6, 9.6, 2.6, 10.6, .85),
			loai: "nuoc"
		}, {
			hinh: tron(7.3, 12.8, 1.2),
			loai: "nuoc",
			ve: "sen"
		}]
	},
	tanVien: {
		id: "tanVien",
		terrain: "tanVien",
		can: [
			{
				hinh: tron(.2, 9, 1.1),
				ve: "daNhon"
			},
			{
				hinh: tron(8.9, 10.6, 1),
				ve: "daNhon"
			},
			{
				hinh: tron(2.4, 13.6, .6),
				ve: "da"
			}
		],
		cham: []
	},
	rung3: {
		id: "rung3",
		terrain: "rung",
		can: [
			{
				hinh: tron(-.1, 9.2, 1.1),
				ve: "tre"
			},
			{
				hinh: tron(5.6, 9.6, .55),
				ve: "da"
			},
			{
				hinh: tron(9.4, 13, 1),
				ve: "tre"
			},
			{
				hinh: tron(3, 13.2, .6),
				ve: "cayChet"
			}
		],
		cham: []
	},
	benSong3: {
		id: "benSong3",
		terrain: "benSong",
		can: [{
			hinh: doan(2, 8.6, 3.8, 9.2, .4),
			ve: "thuyen"
		}, {
			hinh: doan(7.6, 8.2, 9.8, 8.6, .3),
			ve: "go"
		}],
		cham: [{
			hinh: doan(9.8, 10.8, 5.2, 12.8, .75),
			loai: "nuoc"
		}]
	},
	lang3: {
		id: "lang3",
		terrain: "lang",
		can: [
			{
				hinh: doan(-.8, 9, 1.6, 9, .9, true),
				ve: "nhaChay"
			},
			{
				hinh: tron(6.2, 10, .55),
				ve: "rom"
			},
			{
				hinh: doan(6.2, 13, 9.6, 12.6, .3),
				ve: "rao"
			},
			{
				hinh: tron(2.1, 13.2, .5),
				ve: "gieng"
			}
		],
		cham: []
	},
	thatDieu: {
		id: "thatDieu",
		terrain: "thatDieu",
		can: [
			{
				hinh: tron(2.6, 9, .7),
				ve: "cayChet"
			},
			{
				hinh: tron(9.2, 8.6, 1),
				ve: "daNhon"
			},
			{
				hinh: tron(6.7, 12.6, .6),
				ve: "cayChet"
			},
			{
				hinh: tron(-.2, 12.8, 1.1),
				ve: "daNhon"
			}
		],
		cham: [{
			hinh: tron(2.2, 11.8, .8),
			loai: "bun"
		}]
	},
	coLoa: {
		id: "coLoa",
		terrain: "coLoa",
		can: [
			{
				hinh: doan(-.8, 8.2, 2, 8.2, .45),
				ve: "luy"
			},
			{
				hinh: doan(7, 8.2, 9.8, 8.2, .45),
				ve: "luy"
			},
			{
				hinh: tron(2.2, 12.4, .55),
				ve: "gieng"
			},
			{
				hinh: doan(7.2, 12.8, 9.8, 13.2, .35),
				ve: "go"
			}
		],
		cham: []
	},
	benSong4: {
		id: "benSong4",
		terrain: "benSong",
		can: [
			{
				hinh: doan(5.2, 9.2, 6.8, 8.6, .4),
				ve: "thuyen"
			},
			{
				hinh: doan(-.8, 12.4, 1.8, 12.9, .3),
				ve: "go"
			},
			{
				hinh: tron(6.4, 12.6, .5),
				ve: "chum"
			}
		],
		cham: [{
			hinh: doan(9.8, 12, 5.8, 13.2, .7),
			loai: "nuoc"
		}]
	},
	lang4: {
		id: "lang4",
		terrain: "lang",
		can: [
			{
				hinh: doan(7.4, 12.4, 9.8, 12.4, .9, true),
				ve: "nha"
			},
			{
				hinh: tron(2.4, 8.8, .55),
				ve: "rom"
			},
			{
				hinh: doan(7.6, 8.4, 9.6, 9, .35),
				ve: "xeCui"
			},
			{
				hinh: tron(2.2, 12.8, .5),
				ve: "gieng"
			}
		],
		cham: []
	},
	rung4: {
		id: "rung4",
		terrain: "rung",
		can: [
			{
				hinh: tron(9.4, 8.6, 1),
				ve: "tre"
			},
			{
				hinh: tron(3.6, 9.2, .6),
				ve: "da"
			},
			{
				hinh: tron(-.2, 12.4, 1.1),
				ve: "tre"
			}
		],
		cham: []
	},
	cuaSong: {
		id: "cuaSong",
		terrain: "cuaSong",
		can: [
			{
				hinh: doan(-.8, 8.6, 1.6, 9.2, .3),
				ve: "go"
			},
			{
				hinh: tron(2.6, 12.6, .55),
				ve: "coc"
			},
			{
				hinh: doan(7.4, 12.4, 9.6, 13, .4),
				ve: "thuyen"
			}
		],
		cham: [{
			hinh: tron(8.4, 9, 1.2),
			loai: "bun",
			ve: "lau"
		}]
	},
	moDa: {
		id: "moDa",
		terrain: "moDa",
		can: [{
			hinh: tron(-.1, 8.8, 1.1),
			ve: "da"
		}, {
			hinh: tron(9.1, 12.2, 1),
			ve: "daNhon"
		}],
		cham: [{
			hinh: tron(6, 8.4, .9),
			loai: "nuoc"
		}]
	},
	dao: {
		id: "dao",
		terrain: "dao",
		can: [
			{
				hinh: tron(-.1, 8.6, 1.05),
				ve: "phongBa"
			},
			{
				hinh: tron(.1, 13.4, .75),
				ve: "sanHo"
			},
			{
				hinh: doan(7.7, 8.2, 9.7, 8.8, .4),
				ve: "thuyen"
			},
			{
				hinh: tron(9.1, 12.2, .95),
				ve: "sanHo"
			}
		],
		cham: [{
			hinh: tron(5.4, 10.8, .9),
			loai: "nuoc"
		}]
	},
	lang5: {
		id: "lang5",
		terrain: "lang",
		can: [
			{
				hinh: doan(-.8, 12.6, 1.6, 12.6, .9, true),
				ve: "nha"
			},
			{
				hinh: doan(7.4, 9, 9.8, 9, .8, true),
				ve: "ngo"
			},
			{
				hinh: tron(3, 9, .5),
				ve: "gieng"
			},
			{
				hinh: tron(6.2, 12.8, .55),
				ve: "rom"
			}
		],
		cham: []
	},
	hatMon: {
		id: "hatMon",
		terrain: "hatMon",
		can: [
			{
				hinh: doan(7.2, 12.4, 9.8, 12.4, .8, true),
				ve: "ngo"
			},
			{
				hinh: tron(9.2, 8.8, .8),
				ve: "lau"
			},
			{
				hinh: doan(-.6, 8.4, 1.6, 9, .4),
				ve: "thuyen"
			}
		],
		cham: [{
			hinh: tron(.2, 12.8, 1.1),
			loai: "nuoc",
			ve: "sen"
		}]
	},
	luyLau: {
		id: "luyLau",
		terrain: "luyLau",
		can: [
			{
				hinh: doan(-.8, 8.2, 2.6, 8.2, .45),
				ve: "thanh"
			},
			{
				hinh: tron(6.8, 12.6, .55),
				ve: "da"
			},
			{
				hinh: doan(-.6, 12.8, 1.4, 13.4, .35),
				ve: "xeCui"
			}
		],
		cham: []
	},
	langBac: {
		id: "langBac",
		terrain: "langBac",
		can: [{
			hinh: tron(9.3, 8.4, .8),
			ve: "lau"
		}, {
			hinh: tron(2.6, 12.6, .65),
			ve: "lau"
		}],
		cham: [{
			hinh: tron(.3, 9, 1.2),
			loai: "nuoc",
			ve: "sen"
		}, {
			hinh: doan(9.8, 12, 6.6, 13, .7),
			loai: "bun",
			ve: "lau"
		}]
	},
	camKhe: {
		id: "camKhe",
		terrain: "camKhe",
		can: [
			{
				hinh: tron(-.1, 8.6, 1.1),
				ve: "da"
			},
			{
				hinh: tron(2.8, 13.2, .55),
				ve: "da"
			},
			{
				hinh: tron(9.3, 13.4, .9),
				ve: "daNhon"
			}
		],
		cham: [{
			hinh: doan(9.8, 8.2, 7.4, 11.6, .6),
			loai: "nuoc"
		}]
	}
};
/**
* Nền nào dùng bố cục nào, theo chương: mỗi mục là [từ chương, id bố cục]; null là bãi phẳng. Nền chưa có mục nào
* cũng là bãi phẳng.
*/
const BAI_THEO = {
	rung: [
		[1, "rung"],
		[2, "rung2"],
		[3, "rung3"],
		[4, "rung4"]
	],
	benSong: [
		[1, "benSong"],
		[2, "benSong2"],
		[3, "benSong3"],
		[4, "benSong4"]
	],
	lang: [
		[1, "lang"],
		[2, "lang2"],
		[3, "lang3"],
		[4, "lang4"],
		[5, "lang5"]
	],
	don: [[1, "don"]],
	nui: [[1, "nui"], [2, "nui2"]],
	doi: [[2, "doi"]],
	ngap: [[2, "ngap"]],
	tanVien: [[2, "tanVien"]],
	thatDieu: [[3, "thatDieu"]],
	coLoa: [[3, "coLoa"]],
	cuaSong: [[4, "cuaSong"]],
	moDa: [[4, "moDa"]],
	hatMon: [[5, "hatMon"]],
	luyLau: [[5, "luyLau"]],
	langBac: [[5, "langBac"]],
	camKhe: [[5, "camKhe"]],
	dao: [[5, "dao"]],
	benKia: [[1, "benKia"]]
};
/** Bố cục của nền `t` ở chương `ch` (mục cuối có chương không quá `ch`), hay null là bãi phẳng. */
function baiOf(t, ch) {
	let id = null;
	for (const [from, b] of BAI_THEO[t] ?? []) if (from <= ch) id = b;
	return id;
}
/** Bố cục theo id; id lạ (bản lưu đời sau, hay đã bỏ) thì không có. */
function baiById(id) {
	return id && Object.prototype.hasOwnProperty.call(BAI, id) ? BAI[id] : void 0;
}
const len = (x, z) => Math.sqrt(x * x + z * z);
const clamp01 = (t) => t < 0 ? 0 : t > 1 ? 1 : t;
/** Giữ trong bãi như `clampField` của `battle.ts`. */
const kep = (v, max) => Math.min(max - .3, Math.max(.3, v));
/** Khoảng cách từ điểm (px, pz) tới đoạn thẳng a–b. */
function segDist(px, pz, ax, az, bx, bz) {
	const ux = bx - ax;
	const uz = bz - az;
	const l2 = ux * ux + uz * uz;
	const t = l2 > 0 ? clamp01(((px - ax) * ux + (pz - az) * uz) / l2) : 0;
	return len(px - ax - ux * t, pz - az - uz * t);
}
/** Khoảng cách giữa hai đoạn thẳng p1–q1 và p2–q2 (bằng 0 khi cắt nhau). */
function segSeg(p1x, p1z, q1x, q1z, p2x, p2z, q2x, q2z) {
	const d1x = q1x - p1x;
	const d1z = q1z - p1z;
	const d2x = q2x - p2x;
	const d2z = q2z - p2z;
	const rx = p1x - p2x;
	const rz = p1z - p2z;
	const a = d1x * d1x + d1z * d1z;
	const e = d2x * d2x + d2z * d2z;
	const f = d2x * rx + d2z * rz;
	const EPS = 1e-12;
	let s;
	let t;
	if (a <= EPS && e <= EPS) return len(rx, rz);
	if (a <= EPS) {
		s = 0;
		t = clamp01(f / e);
	} else {
		const c = d1x * rx + d1z * rz;
		if (e <= EPS) {
			t = 0;
			s = clamp01(-c / a);
		} else {
			const b = d1x * d2x + d1z * d2z;
			const denom = a * e - b * b;
			s = denom > EPS ? clamp01((b * f - c * e) / denom) : 0;
			t = (b * s + f) / e;
			if (t < 0) {
				t = 0;
				s = clamp01(-c / a);
			} else if (t > 1) {
				t = 1;
				s = clamp01((b - c) / a);
			}
		}
	}
	return len(p1x + d1x * s - (p2x + d2x * t), p1z + d1z * s - (p2z + d2z * t));
}
/** Khoảng cách có dấu tới đa giác: âm ở trong. */
function polySd(pts, x, z) {
	let d = Infinity;
	let s = 1;
	for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
		const [xi, zi] = pts[i];
		const [xj, zj] = pts[j];
		d = Math.min(d, segDist(x, z, xi, zi, xj, zj));
		const c1 = z >= zi;
		const c2 = z < zj;
		const c3 = (xj - xi) * (z - zi) > (zj - zi) * (x - xi);
		if (c1 && c2 && c3 || !c1 && !c2 && !c3) s = -s;
	}
	return s * d;
}
/** Khoảng cách có dấu từ điểm (x, z) tới hình: dương ở ngoài, âm ở trong. */
function sdHinh(h, x, z) {
	if (h.k === "tron") return len(x - h.x, z - h.z) - h.r;
	if (h.k === "da") return polySd(h.pts, x, z);
	if (!h.vuong) return segDist(x, z, h.ax, h.az, h.bx, h.bz) - h.half;
	const ux = h.bx - h.ax;
	const uz = h.bz - h.az;
	const l = len(ux, uz);
	const ex = l > 1e-9 ? ux / l : 1;
	const ez = l > 1e-9 ? uz / l : 0;
	const px = x - (h.ax + h.bx) / 2;
	const pz = z - (h.az + h.bz) / 2;
	const qx = Math.abs(px * ex + pz * ez) - l / 2;
	const qz = Math.abs(pz * ex - px * ez) - h.half;
	return len(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0);
}
/** Vòng tròn bao quanh hình: tâm và bán kính. */
function bao(h) {
	if (h.k === "tron") return {
		x: h.x,
		z: h.z,
		r: h.r
	};
	if (h.k === "doan") {
		const l = len(h.bx - h.ax, h.bz - h.az);
		return {
			x: (h.ax + h.bx) / 2,
			z: (h.az + h.bz) / 2,
			r: h.vuong ? len(l / 2, h.half) : l / 2 + h.half
		};
	}
	let sx = 0;
	let sz = 0;
	for (const [x, z] of h.pts) sx += x, sz += z;
	const cx = sx / h.pts.length;
	const cz = sz / h.pts.length;
	let r = 0;
	for (const [x, z] of h.pts) r = Math.max(r, len(x - cx, z - cz));
	return {
		x: cx,
		z: cz,
		r
	};
}
/** Khoảng cách có dấu từ (x, z) tới vật cản gần nhất của bố cục: dương là còn cách bấy nhiêu ô, âm là ở trong. */
function sdfCan(bai, x, z) {
	let d = Infinity;
	for (const c of bai.can) {
		const v = sdHinh(c.hinh, x, z);
		if (v < d) d = v;
	}
	return d;
}
/** Hệ số tốc độ tại (x, z): 1 là đất thường; trong nước, bùn thì chậm theo `BAI_CHAM`. */
function chamAt(bai, x, z) {
	let m = 1;
	for (const v of bai.cham) if (sdHinh(v.hinh, x, z) <= 0) m = Math.min(m, BAI_CHAM[v.loai]);
	return m;
}
/**
* Đoạn a–b có chạm hình `h` (đã phồng thêm `r`) không. Tròn và đoạn đầu tròn tính đúng; khối vuông, đa giác thì dò
* từng 0,15 ô.
*/
function segHits(h, ax, az, bx, bz, r) {
	const b = bao(h);
	if (segDist(b.x, b.z, ax, az, bx, bz) >= b.r + r) return false;
	if (h.k === "tron") return true;
	if (h.k === "doan" && !h.vuong) return segSeg(ax, az, bx, bz, h.ax, h.az, h.bx, h.bz) < h.half + r;
	const d = len(bx - ax, bz - az);
	const n = Math.max(1, Math.ceil(d / .15));
	for (let k = 0; k <= n; k++) if (sdHinh(h, ax + (bx - ax) * k / n, az + (bz - az) * k / n) < r) return true;
	return false;
}
/**
* Đi thẳng từ (x0, z0) tới khi cách (x1, z1) trong `reach` ô mà không chạm vật cản (thân bán kính `r`). Người không
* bơi (`boi` false) đang đứng trên đất khô thì đường lội qua nước, bùn cũng tính là không thông, để biết đường vòng có
* nhanh hơn không.
*/
function thong(bai, x0, z0, x1, z1, reach, r, boi) {
	const d = len(x1 - x0, z1 - z0);
	if (d <= reach) return true;
	const k = reach > 0 ? (d - reach) / d : 1;
	const ex = x0 + (x1 - x0) * k;
	const ez = z0 + (z1 - z0) * k;
	for (const c of bai.can) if (segHits(c.hinh, x0, z0, ex, ez, r)) return false;
	if (!boi && bai.cham.length && chamAt(bai, x0, z0) === 1) {
		for (const v of bai.cham) if (segHits(v.hinh, x0, z0, ex, ez, 0)) return false;
	}
	return true;
}
/**
* Bước từ chỗ cũ (ox, oz) tới chỗ mới của `p` (thân bán kính `r`): vướng vật cản thì trượt dọc mép vật cản (bỏ phần
* bước đâm vào), không được thì trượt theo trục còn đi được (trục bước dài hơn trước), không nữa thì đứng lại chỗ cũ.
* Chỗ cũ đã nằm trong vật cản (bản lưu cũ, vừa hiện ra) thì đẩy ra chỗ trống gần nhất.
*/
function truot(bai, r, p, ox, oz) {
	if (!bai.can.length) return;
	if (sdfCan(bai, ox, oz) < r - 1e-6) {
		dayRa(bai, r, p);
		return;
	}
	if (diDuoc(bai, r, ox, oz, p.x, p.z)) return;
	const e = .01;
	const gx = sdfCan(bai, ox + e, oz) - sdfCan(bai, ox - e, oz);
	const gz = sdfCan(bai, ox, oz + e) - sdfCan(bai, ox, oz - e);
	const g = len(gx, gz);
	const mx = p.x - ox;
	const mz = p.z - oz;
	const into = g > 1e-9 ? (mx * gx + mz * gz) / g : 0;
	if (into < 0) {
		const nx = gx / g;
		const nz = gz / g;
		let tx = p.x - nx * into;
		let tz = p.z - nz * into;
		const s = sdfCan(bai, tx, tz);
		if (s < r + .002) {
			tx += nx * (r + .002 - s);
			tz += nz * (r + .002 - s);
		}
		tx = kep(tx, FIELD.w);
		tz = kep(tz, FIELD.d);
		if (diDuoc(bai, r, ox, oz, tx, tz)) {
			p.x = tx;
			p.z = tz;
			return;
		}
	}
	const xFirst = Math.abs(mx) >= Math.abs(mz);
	for (const alongX of xFirst ? [true, false] : [false, true]) {
		const x = alongX ? p.x : ox;
		const z = alongX ? oz : p.z;
		if (diDuoc(bai, r, ox, oz, x, z)) {
			p.x = x;
			p.z = z;
			return;
		}
	}
	p.x = ox;
	p.z = oz;
}
/** Bước từ (ox, oz) tới (x, z) không chạm vật cản. */
function diDuoc(bai, r, ox, oz, x, z) {
	if (sdfCan(bai, x, z) < r) return false;
	for (const c of bai.can) if (segHits(c.hinh, ox, oz, x, z, r - 1e-6)) return false;
	return true;
}
/** Đưa `p` (thân bán kính `r`) ra chỗ trống gần nhất trong bãi. Đang ở chỗ trống thì để yên. */
function dayRa(bai, r, p) {
	if (!bai.can.length || sdfCan(bai, p.x, p.z) >= r) return;
	for (let k = 0; k < 3; k++) {
		const d = sdfCan(bai, p.x, p.z);
		if (d >= r) return;
		const e = .01;
		const gx = sdfCan(bai, p.x + e, p.z) - sdfCan(bai, p.x - e, p.z);
		const gz = sdfCan(bai, p.x, p.z + e) - sdfCan(bai, p.x, p.z - e);
		const g = len(gx, gz);
		if (g < 1e-9) break;
		const push = r - d + .02;
		p.x = kep(p.x + gx / g * push, FIELD.w);
		p.z = kep(p.z + gz / g * push, FIELD.d);
	}
	if (sdfCan(bai, p.x, p.z) >= r) return;
	let best = -1;
	let bestD = Infinity;
	for (let c = 0; c < NX * NZ; c++) {
		const x = cellX(c);
		const z = cellZ(c);
		if (sdfCan(bai, x, z) < r) continue;
		const d = len(x - p.x, z - p.z);
		if (d < bestD) bestD = d, best = c;
	}
	if (best < 0) return;
	p.x = cellX(best);
	p.z = cellZ(best);
}
/**
* Hất `p` (thân bán kính `r`) từ chỗ đang đứng về phía (tx, tz) (đã giữ trong bãi): dừng ở chỗ trống cuối cùng trước
* vật cản. Đường hất không vướng gì thì tới đúng (tx, tz).
*/
function que(bai, r, p, tx, tz) {
	dayRa(bai, r, p);
	const x0 = p.x;
	const z0 = p.z;
	const d = len(tx - x0, tz - z0);
	const n = Math.ceil(d / .1);
	for (let k = 1; k <= n; k++) {
		const x = x0 + (tx - x0) * k / n;
		const z = z0 + (tz - z0) * k / n;
		if (sdfCan(bai, x, z) < r) return;
		p.x = x;
		p.z = z;
	}
	p.x = tx;
	p.z = tz;
}
/** Cạnh một ô lưới đi (ô bãi). */
const O = .5;
const NX = Math.round(FIELD.w / O);
const NZ = Math.round(FIELD.d / O);
const SQRT2 = Math.SQRT2;
/** Thân to nhất (voi, tướng): lưới tìm đường phồng vật cản theo thân này, để lối nào tìm ra thì ai cũng lọt. */
const THAN_TO = .45;
/** Bản đồ khoảng cách dựng lại mỗi chừng này giây trận. */
const NAV_S = .25;
/** Lần theo bản đồ khoảng cách tối đa chừng này ô mỗi lần nhắm. */
const DO_XA = 6;
const cellX = (c) => (c % NX + .5) * O;
const cellZ = (c) => (Math.floor(c / NX) + .5) * O;
function cellOf(x, z) {
	const i = Math.min(NX - 1, Math.max(0, Math.floor(x / O)));
	return Math.min(NZ - 1, Math.max(0, Math.floor(z / O))) * NX + i;
}
const luois = /* @__PURE__ */ new WeakMap();
const DIRS = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1],
	[1, 1],
	[1, -1],
	[-1, 1],
	[-1, -1]
];
/** Ô kề ô `c` theo hướng `d`, hay −1 khi ra ngoài lưới. */
function ke(c, d) {
	const i = c % NX;
	const j = (c - i) / NX;
	const ni = i + DIRS[d][0];
	const nj = j + DIRS[d][1];
	return ni < 0 || nj < 0 || ni >= NX || nj >= NZ ? -1 : nj * NX + ni;
}
function luoiDi(bai, r) {
	let m = luois.get(bai);
	if (!m) luois.set(bai, m = /* @__PURE__ */ new Map());
	let l = m.get(r);
	if (l) return l;
	const N = NX * NZ;
	const free = new Uint8Array(N);
	const cham = new Float32Array(N);
	for (let c = 0; c < N; c++) {
		free[c] = sdfCan(bai, cellX(c), cellZ(c)) >= r ? 1 : 0;
		cham[c] = chamAt(bai, cellX(c), cellZ(c));
	}
	const nb = new Int32Array(N * 8).fill(-1);
	const nd = new Float64Array(N * 8);
	for (let c = 0; c < N; c++) {
		if (!free[c]) continue;
		const i = c % NX;
		const j = (c - i) / NX;
		let k = 0;
		for (let d = 0; d < 8; d++) {
			const n = ke(c, d);
			if (n < 0 || !free[n]) continue;
			if (d >= 4 && (!free[j * NX + i + DIRS[d][0]] || !free[(j + DIRS[d][1]) * NX + i])) continue;
			nb[c * 8 + k] = n;
			nd[c * 8 + k] = d < 4 ? O : O * SQRT2;
			k++;
		}
	}
	m.set(r, l = {
		r,
		free,
		cham,
		nb,
		nd
	});
	return l;
}
/** Hàng đợi ưu tiên nhỏ cho Dijkstra (xóa lười: ô đã chốt thì bỏ qua khi lấy ra). */
var Heap = class {
	keys = new Float64Array(NX * NZ * 9);
	vals = new Int32Array(NX * NZ * 9);
	size = 0;
	push(k, v) {
		let i = this.size++;
		while (i > 0) {
			const p = i - 1 >> 1;
			if (this.keys[p] <= k) break;
			this.keys[i] = this.keys[p];
			this.vals[i] = this.vals[p];
			i = p;
		}
		this.keys[i] = k;
		this.vals[i] = v;
	}
	pop() {
		const top = this.vals[0];
		const k = this.keys[--this.size];
		const v = this.vals[this.size];
		let i = 0;
		for (;;) {
			let c = 2 * i + 1;
			if (c >= this.size) break;
			if (c + 1 < this.size && this.keys[c + 1] < this.keys[c]) c++;
			if (this.keys[c] >= k) break;
			this.keys[i] = this.keys[c];
			this.vals[i] = this.vals[c];
			i = c;
		}
		this.keys[i] = k;
		this.vals[i] = v;
		return top;
	}
	topKey() {
		return this.keys[0];
	}
};
/**
* Bản đồ khoảng cách (ô bãi) từ mọi ô tới nguồn gần nhất, đi theo lưới `l`: bước chéo dài √2 lần, ô chậm tốn hơn
* (trừ khi `boi`). Nguồn rơi vào ô bị chặn thì lấy các ô trống kề bên.
*/
function dijkstra(l, seeds, boi, out, heap) {
	out.fill(Infinity);
	heap.size = 0;
	const { free, cham, nb, nd } = l;
	const seed = (c, k) => {
		if (k < out[c]) {
			out[c] = k;
			heap.push(k, c);
		}
	};
	for (const c of seeds) if (free[c]) seed(c, 0);
	else for (let d = 0; d < 8; d++) {
		const n = ke(c, d);
		if (n >= 0 && free[n]) seed(n, d < 4 ? O : O * SQRT2);
	}
	while (heap.size) {
		const k = heap.topKey();
		const c = heap.pop();
		if (k > out[c]) continue;
		for (let e = c * 8, end = e + 8; e < end; e++) {
			const n = nb[e];
			if (n < 0) break;
			const v = k + (boi ? nd[e] : nd[e] / cham[n]);
			if (v < out[n]) {
				out[n] = v;
				heap.push(v, n);
			}
		}
	}
}
function taoNav(bai) {
	const to = luoiDi(bai, THAN_TO);
	const heap = new Heap();
	const rut = new Float64Array(NX * NZ);
	const back = [];
	for (let i = 0; i < NX; i++) back.push(i);
	dijkstra(to, back, false, rut, heap);
	return {
		bai,
		to,
		map: {
			giac: new Float64Array(NX * NZ).fill(Infinity),
			ta: new Float64Array(NX * NZ).fill(Infinity),
			rut
		},
		seeds: {
			giac: [],
			ta: []
		},
		stale: {
			giac: false,
			ta: false
		},
		giacBoi: false,
		luot: -1,
		heap
	};
}
/**
* Sang lượt mới (mỗi `NAV_S` giây trận) thì ghi lại chỗ đứng hai phe để dựng bản đồ khoảng cách khi cần. `giac`,
* `ta`: chỗ những người còn đánh được của mỗi phe; `giacBoi`: giặc còn lại đều là thủy quái (lội nước không chậm).
*/
function capNhatNav(nav, t, lay) {
	const luot = Math.floor(t / NAV_S + 1e-9);
	if (luot === nav.luot) return;
	nav.luot = luot;
	const { giac, ta, giacBoi } = lay();
	nav.seeds.giac = giac.map((p) => cellOf(p.x, p.z));
	nav.seeds.ta = ta.map((p) => cellOf(p.x, p.z));
	nav.giacBoi = giacBoi;
	nav.stale.giac = nav.stale.ta = true;
}
/** Bản đồ khoảng cách tới `toi`, dựng lại nếu đã sang lượt mới. */
function banDo(nav, toi) {
	if (toi !== "rut" && nav.stale[toi]) {
		nav.stale[toi] = false;
		dijkstra(nav.to, nav.seeds[toi], toi === "ta" && nav.giacBoi, nav.map[toi], nav.heap);
	}
	return nav.map[toi];
}
/**
* Nên bước về đâu để tới (tx, tz), theo bản đồ khoảng cách tới `toi`:
* - không khóa đi vòng (`khoa`) và đường thẳng thông (`thong`) thì đi thẳng tới (tx, tz), như bãi phẳng;
* - không thì lần theo bản đồ tối đa `DO_XA` ô, nhắm ô xa nhất còn đi thẳng tới được (`vong`: đang đi vòng).
*/
function huongTheo(nav, toi, x, z, r, tx, tz, reach, boi, khoa) {
	const bai = nav.bai;
	if (!khoa && thong(bai, x, z, tx, tz, reach, r, boi)) return {
		x: tx,
		z: tz,
		vong: false
	};
	const field = banDo(nav, toi);
	const { nb } = nav.to;
	let cur = cellOf(x, z);
	if (!(field[cur] < Infinity)) {
		const i0 = cur % NX;
		const j0 = (cur - i0) / NX;
		let best = -1;
		let bestD = Infinity;
		for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
			const i = i0 + di;
			const j = j0 + dj;
			if (i < 0 || j < 0 || i >= NX || j >= NZ || !(field[j * NX + i] < Infinity)) continue;
			const d = len(cellX(j * NX + i) - x, cellZ(j * NX + i) - z) + field[j * NX + i] * .001;
			if (d < bestD) bestD = d, best = j * NX + i;
		}
		if (best < 0) return {
			x: tx,
			z: tz,
			vong: true
		};
		cur = best;
	}
	const path = [cur];
	for (let k = 0; k < DO_XA; k++) {
		let best = -1;
		let bestV = field[cur];
		for (let e = cur * 8, end = e + 8; e < end; e++) {
			const n = nb[e];
			if (n < 0) break;
			if (field[n] < bestV) bestV = field[n], best = n;
		}
		if (best < 0) break;
		path.push(best);
		cur = best;
	}
	for (let i = path.length - 1; i >= 1; i--) {
		const c = path[i];
		if (thong(bai, x, z, cellX(c), cellZ(c), 0, r, boi)) return {
			x: cellX(c),
			z: cellZ(c),
			vong: true
		};
	}
	const c = path.length > 1 ? path[1] : path[0];
	if (path.length === 1 && field[c] === 0) return {
		x: tx,
		z: tz,
		vong: true
	};
	return {
		x: cellX(c),
		z: cellZ(c),
		vong: true
	};
}
function inGrid(x, z) {
	return x >= 0 && z >= 0 && x < 76 && z < 76;
}
function isRiver(x, z) {
	if (!inGrid(x, z)) return false;
	return z >= 52 && z < 59 || x >= 52 && x < 59 && z < 59;
}
/** Bờ bên kia sông: 'nam' là bờ nam sông Đà, 'dong' là bờ đông sông Thao, null là bên này hay dưới sông. */
function farBankOf(x, z) {
	if (!inGrid(x, z)) return null;
	if (z >= 59) return "nam";
	if (x >= 59 && z < 52) return "dong";
	return null;
}
/** Móng (x, z, w, d) có cạnh sát bờ sông: bên này sông, hay bên kia sông (bờ đông sông Thao, bờ nam sông Đà). */
function touchesRiver(x, z, w, d) {
	return x + w === 52 || z + d === 52 || x === 59 && z < 52 || z === 59 && x < 52;
}
/**
* Điểm (lx, lz) trên mô hình (gốc ở tâm móng) sau khi công trình xoay `rot` nấc, như `Object3D.rotation.y = rotAngle(rot)`.
* Tính bằng số nguyên cho khỏi sai số khi so ô.
*/
function turnLocal(rot, lx, lz) {
	switch (((rot ?? 0) % 4 + 4) % 4) {
		case 1: return {
			x: lz,
			z: -lx
		};
		case 2: return {
			x: -lx,
			z: -lz
		};
		case 3: return {
			x: -lz,
			z: lx
		};
		default: return {
			x: lx,
			z: lz
		};
	}
}
/** Số ô từ ô (x, z) tới bờ sông gần nhất: 0 là ô sát sông. Âm khi ô nằm dưới sông. */
function riverDistance(x, z) {
	if (isRiver(x, z)) return -1;
	const bank = farBankOf(x, z);
	if (bank === "nam") return z - 59;
	if (bank === "dong") return Math.min(x - 59, 51 - z);
	return Math.min(51 - x, 51 - z);
}
/** Số ngẫu nhiên 0..1 lặp lại được cho mỗi nút (i, j) theo hạt giống, không phụ thuộc cỡ lưới. */
function hash01(seed, i, j) {
	let t = (Math.imul(i, 668265261) ^ Math.imul(j, 374761393) ^ Math.imul(seed, 2654435761)) >>> 0;
	t = Math.imul(t ^ t >>> 15, 1 | t);
	t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
	return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
/** Value noise trên lưới thô `cell` ô, nội suy mượt, kết quả 0..1. */
function valueNoise(seed, cell) {
	const at = (i, j) => hash01(seed, i, j);
	const fade = (t) => t * t * (3 - 2 * t);
	return (x, z) => {
		const fx = x / cell;
		const fz = z / cell;
		const i = Math.floor(fx);
		const j = Math.floor(fz);
		const u = fade(fx - i);
		const v = fade(fz - j);
		const a = at(i, j) + (at(i + 1, j) - at(i, j)) * u;
		return a + (at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * u - a) * v;
	};
}
/**
* Độ cao tự nhiên của mọi ô, lặp lại y hệt ở mọi máy: ba ô sát sông là bãi bồi (bậc 0, vừa một bến),
* vào trong là đồng bằng (bậc 1) có gò (bậc 2), càng xa sông về phía rừng càng nhiều đồi (bậc 2–3).
* Bờ bên kia theo cùng luật, tính từ bờ sông bên ấy. Nhiễu tính theo tọa độ ô, nên nới lưới qua sông
* không làm đổi độ cao bên này.
*/
function baseHeights() {
	const coarse = valueNoise(20260, 7);
	const fine = valueNoise(731, 3.5);
	const out = [];
	for (let z = 0; z < 76; z++) for (let x = 0; x < 76; x++) {
		const d = riverDistance(x, z);
		if (d < 0) {
			out.push(-1);
			continue;
		}
		if (d <= 2) {
			out.push(0);
			continue;
		}
		const inland = Math.min(Math.max((d - 4) / 18, 0), 1);
		const n = coarse(x, z) * .75 + fine(x, z) * .25;
		const h = 1 + Math.floor(inland * 1.4 + Math.max(0, n - .42) * 2.6);
		out.push(Math.min(Math.max(h, 1), 3));
	}
	return out;
}
BUILDINGS.benKhoi.minDien;
/** Bờ biển lồi lõm: lệch (ô, vuông góc với bờ) theo vị trí dọc bờ `t` = x − z. */
function bienNhieu(t) {
	return .7 * Math.sin(t * .11) + .3 * Math.sin(t * .27 + 1);
}
/**
* Điểm (x, z) cách mép bãi cát bao nhiêu ô, đo vuông góc với bờ: âm là đất liền, 0 tới `BAI_CAT` là bãi cát, từ `BAI_CAT`
* là biển (càng lớn càng xa bờ).
*/
function bienDo(x, z) {
	return (x + z - 128) / Math.SQRT2 - bienNhieu(x - z);
}
/** Dòng giữa sông Đà, sông Thao: thuyền lớn chạy giữa dòng. */
const RIVER_MID = 111 / 2;
(() => {
	let x = 59;
	while (bienDo(x, RIVER_MID) < 4) x += .25;
	return {
		x,
		z: RIVER_MID
	};
})();
[{
	id: "hoangSa",
	x: 108,
	z: 82,
	dao: [
		{
			dx: -15,
			dz: -6,
			r: 1.4
		},
		{
			dx: 13,
			dz: -12,
			r: 1.2
		},
		{
			dx: 16,
			dz: 4,
			r: 1.8
		},
		{
			dx: -12,
			dz: 13,
			r: 1
		},
		{
			dx: 4,
			dz: 16,
			r: 1.5
		},
		{
			dx: -17,
			dz: 5,
			r: .9
		},
		{
			dx: 11,
			dz: 14,
			r: .8
		}
	],
	nguTruong: 22,
	seed: 1974
}, {
	id: "truongSa",
	x: 102,
	z: 142,
	dao: [
		{
			dx: -16,
			dz: -9,
			r: 1.3
		},
		{
			dx: 14,
			dz: -14,
			r: 1.1
		},
		{
			dx: 19,
			dz: 3,
			r: 1.6
		},
		{
			dx: -14,
			dz: 15,
			r: 1
		},
		{
			dx: 5,
			dz: 18,
			r: 1.4
		},
		{
			dx: -20,
			dz: 3,
			r: .9
		},
		{
			dx: 21,
			dz: -7,
			r: .8
		},
		{
			dx: -4,
			dz: -18,
			r: 1.2
		},
		{
			dx: 13,
			dz: 16,
			r: .9
		},
		{
			dx: -10,
			dz: -17,
			r: .8
		}
	],
	nguTruong: 26,
	seed: 1988
}].map((q) => q.id);
const zero$1 = () => ({
	giao: 0,
	cung: 0,
	voi: 0,
	no: 0
});
function newDon() {
	return {
		cap: 0,
		thuyen: false,
		linh: zero$1(),
		muon: zero$1(),
		chuyen: null,
		...giacMoi()
	};
}
/** Phần giặc đảo của một đồn lúc chưa có đợt nào (bản lưu 28 lên 29 cũng thêm đúng phần này). */
function giacMoi() {
	return {
		hu: false,
		dot: 0,
		thang: 0,
		sau: null,
		tran: null
	};
}
function initialDao() {
	return {
		hoangSa: newDon(),
		truongSa: newDon()
	};
}
// src/game/xay.ts
function initialXay() {
	return {
		viec: [],
		nextId: 1,
		daHoi: [],
		seq: 0
	};
}
// src/game/trangBi.ts
const initialTrangBi = () => ({
	kho: [],
	seq: 0,
	nextId: 1
});
/** Chép phần làm nên chỉ số của món (bỏ trường khác, chép sâu chỉ số phụ). */
const chupMon = (m) => ({
	o: m.o,
	bo: m.bo,
	pham: m.pham,
	cap: m.cap,
	chinh: m.chinh,
	phu: m.phu.map((p) => ({
		k: p.k,
		nac: p.nac
	})),
	cuong: m.cuong
});
const khongDo = () => ({
	mau: 0,
	danh: 0,
	toc: 0,
	uy: 0,
	giap: 0,
	hoi: 0
});
/** Chỉ số chính của món (phần cộng thêm, 0,05 là 5%). */
const chinhOf = (m) => PHAM_CHINH[m.pham] * CHI_SO_HE[m.chinh] * CAP_DO_HE[m.cap] * (1 + CUONG_HOA_NAC * m.cuong);
/** Một chỉ số phụ của món. */
const phuOf = (m, p) => (PHU_THAP + PHU_NAC * (p.nac - 1)) * CHI_SO_HE[p.k] * CAP_DO_HE[m.cap];
/** Mọi chỉ số món này cộng thêm. */
function chiSoMon(m) {
	const out = khongDo();
	out[m.chinh] += chinhOf(m);
	for (const p of m.phu) out[p.k] += phuOf(m, p);
	return out;
}
/** Số món của bộ mình tướng `kind` đang mặc trong `worn`. */
const boDem = (kind, worn) => worn.filter((m) => BO_CUA[m.bo] === kind).length;
/** Phần cộng của bộ đồ `worn` trên tướng `kind`: cộng mọi món, hiệu ứng hai món (đúng tướng của bộ), chặn trần. */
function tinhDo(kind, worn) {
	const out = khongDo();
	for (const m of worn) {
		const c = chiSoMon(m);
		for (const k of CHI_SO) out[k] += c[k];
	}
	const own = boDem(kind, worn);
	const bo = BO_DO.find((b) => BO_CUA[b] === kind);
	if (bo && own >= 2) out[BO_HAI[bo].k] += BO_HAI[bo].v;
	for (const k of CHI_SO) out[k] = Math.min(out[k], CHI_SO_TRAN[k] ?? Infinity);
	if (own >= 4) out.bo4 = true;
	return out;
}
const isObj$1 = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const isInt$1 = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
/** Chương đầu tiên rơi ra bộ `bo` (chương của tướng mang bộ). */
const chuongBo = (bo) => [
	1,
	2,
	3,
	4,
	5
].find((c) => BO_CHUONG[c].includes(bo)) ?? 5;
/**
* Món trong bản chụp Đấu thành có thể là món rơi thật ở kinh đô đang ở chương `chuong` không (chống bản chụp sửa tay),
* xét đúng như `rutMon` rút món và `cuongHoa` cường hóa: đúng dạng; cấp đồ không quá chương; bộ đã rơi được tới chương
* ấy (đồn chương thấp vẫn rơi bộ của tướng chương sau, nên không so bộ với cấp đồ); phẩm không quá trần của cấp đồ;
* chỉ số chính đúng ô; số chỉ số phụ đúng phẩm, không trùng nhau, không trùng chỉ số chính, nấc trong khoảng rút;
* cường hóa không quá trần của phẩm. Trả về lý do sai đầu tiên, hay null nếu hợp luật.
*/
function kiemMon(v, chuong) {
	if (!isObj$1(v) || !O_DO.includes(v.o) || !BO_DO.includes(v.bo) || !isInt$1(v.pham, 1, 4) || !isInt$1(v.cap, 1, 5)) return "món sai dạng";
	if (!CHI_SO.includes(v.chinh) || !Array.isArray(v.phu) || !isInt$1(v.cuong, 0, 99)) return "món sai dạng";
	const m = v;
	if (m.cap > chuong) return `món cấp ${m.cap} quá chương ${chuong}`;
	if (chuongBo(m.bo) > chuong) return `bộ ${m.bo} chưa rơi ở chương ${chuong}`;
	if (m.pham > PHAM_TRAN[m.cap]) return `phẩm ${m.pham} quá trần của cấp đồ ${m.cap}`;
	if (!O_CHINH[m.o].includes(m.chinh)) return `ô ${m.o} không có chỉ số chính ${m.chinh}`;
	if (m.phu.length !== m.pham - 1) return "số chỉ số phụ không khớp phẩm";
	const seen = /* @__PURE__ */ new Set([m.chinh]);
	for (const p of m.phu) {
		if (!isObj$1(p) || !CHI_SO.includes(p.k) || !isInt$1(p.nac, 1, 5)) return "chỉ số phụ sai";
		if (seen.has(p.k)) return "chỉ số phụ trùng";
		seen.add(p.k);
	}
	if (m.cuong > CUONG_HOA_TRAN[m.pham]) return `cường hóa +${m.cuong} quá trần của phẩm`;
	return null;
}
// src/game/son.ts
function initialSon() {
	return {
		gifts: {
			comNep: false,
			banhChung: false,
			voi9Nga: false,
			ga9Cua: false,
			ngua9HongMao: false
		},
		restUntil: 0,
		non: false,
		won: false
	};
}
// src/game/thuThach.ts
function initialThuThach() {
	return {
		won: [],
		huan: 0,
		bac: {
			giao: 0,
			cung: 0,
			voi: 0,
			no: 0,
			tuong: 0
		}
	};
}
// src/game/nhaThuoc.ts
function initialThuong() {
	return {
		linh: {
			giao: 0,
			cung: 0,
			voi: 0,
			no: 0
		},
		ms: 0
	};
}
// src/game/benKia.ts
const BANKS = ["nam", "dong"];
const PER_BANK = 30;
const plotId = (bank, i, j) => (bank === "nam" ? 0 : PER_BANK) + j * 10 + i;
function plotOf(id) {
	const bank = id < PER_BANK ? "nam" : "dong";
	const k = id % PER_BANK;
	return {
		bank,
		i: k % 10,
		j: Math.floor(k / 10)
	};
}
/** Góc khoảnh (ô nhỏ nhất theo x và z). Bờ nam: dọc theo x, vào trong theo z; bờ đông thì ngược lại. */
function plotOrigin(id) {
	const { bank, i, j } = plotOf(id);
	const along = 2 + 5 * i;
	const deep = 59 + 5 * j;
	return bank === "nam" ? {
		x: along,
		z: deep
	} : {
		x: deep,
		z: along
	};
}
/**
* Sáu đồn mỗi bờ (`i`, `j` như `Plot`), hai bờ chung khung đồn: bậc 1 sát sông, bậc 2 hàng giữa, bậc 3–4 sát rừng.
* Ngã ba sông (gần kinh đô) ở phía `i` = 9.
*/
const CAMP_SPOTS = [
	[
		3,
		0,
		1
	],
	[
		8,
		0,
		1
	],
	[
		1,
		1,
		2
	],
	[
		5,
		1,
		2
	],
	[
		7,
		2,
		3
	],
	[
		3,
		2,
		4
	]
];
const LAYOUT = {
	nam: [
		[
			4,
			1,
			{
				kind: "lang",
				nghe: "lua"
			}
		],
		[
			0,
			0,
			{
				kind: "lang",
				nghe: "oc"
			}
		],
		[
			8,
			1,
			{
				kind: "dacSan",
				dat: "phuSa"
			}
		],
		[
			0,
			1,
			{
				kind: "dacSan",
				dat: "phuSa"
			}
		],
		[
			6,
			2,
			{
				kind: "dacSan",
				dat: "nuiDa"
			}
		],
		[
			9,
			2,
			{ kind: "cua" }
		],
		[
			2,
			2,
			{ kind: "cua" }
		]
	],
	dong: [
		[
			4,
			1,
			{
				kind: "lang",
				nghe: "da"
			}
		],
		[
			0,
			0,
			{
				kind: "lang",
				nghe: "ren"
			}
		],
		[
			8,
			1,
			{
				kind: "dacSan",
				dat: "nuiDa"
			}
		],
		[
			0,
			1,
			{
				kind: "dacSan",
				dat: "moSat"
			}
		],
		[
			6,
			2,
			{
				kind: "dacSan",
				dat: "moSat"
			}
		],
		[
			9,
			2,
			{ kind: "cua" }
		],
		[
			2,
			2,
			{ kind: "cua" }
		]
	]
};
const POIS = /* @__PURE__ */ new Map();
for (const bank of BANKS) {
	for (const [i, j, tier] of CAMP_SPOTS) POIS.set(plotId(bank, i, j), {
		kind: "don",
		tier
	});
	for (const [i, j, poi] of LAYOUT[bank]) POIS.set(plotId(bank, i, j), poi);
}
/** Điểm lạ trên khoảnh `id` (có hay không, chưa xét đã dò chưa). */
const poiAt = (id) => POIS.get(id);
const noGarrison = () => ({
	nam: {
		giao: 0,
		cung: 0,
		voi: 0,
		no: 0
	},
	dong: {
		giao: 0,
		cung: 0,
		voi: 0,
		no: 0
	}
});
function initialBenKia() {
	return {
		known: [],
		open: [],
		scouts: [],
		cleared: [],
		villages: [],
		dug: [],
		garrison: noGarrison()
	};
}
const bankBridge = (bank) => bank === "nam" ? "cauSongDa" : "cauSongThao";
/** Cầu đang có sang bờ `bank` (còn nguyên hay hư). */
function bridgeTo(state, bank) {
	const type = bankBridge(bank);
	return state.buildings.find((b) => b.type === type);
}
/** Có cầu còn nguyên sang bờ `bank`. */
function bridgeUp(state, bank) {
	const b = bridgeTo(state, bank);
	return !!b && !b.damaged;
}
/** Giặc tới bờ bên kia nào (`namXa`, `dongXa`), hay null nếu tới bên này. */
const farSideBank = (side) => side === "namXa" ? "nam" : side === "dongXa" ? "dong" : null;
// src/game/cayDa.ts
function initialCayDa(clock = 0) {
	return {
		list: [],
		nextAt: clock + CAY_DA_FIRST_MS,
		seq: 0
	};
}
// src/game/khoanh.ts
/** Số khoảnh mỗi chiều. */
const KHOANH_N = 10;
const khoanhId = (cx, cz) => cz * KHOANH_N + cx;
/** Góc (ô nhỏ nhất) của khoảnh. */
function khoanhOrigin(id) {
	return {
		x: 2 + id % KHOANH_N * 5,
		z: 2 + Math.floor(id / KHOANH_N) * 5
	};
}
/** Khoảnh chứa ô (x, z), hoặc −1 nếu ô ở dải rừng ngoài cùng, dưới sông hay ngoài lưới. */
function khoanhOf(x, z) {
	if (x < 2 || z < 2 || x >= 52 || z >= 52) return -1;
	return khoanhId(Math.floor((x - 2) / 5), Math.floor((z - 2) / 5));
}
/** Các khoảnh của hình vuông cạnh `size` ô (bội số của 5) neo ở góc sông. */
function squareKhoanh(size) {
	const n = Math.min(KHOANH_N, Math.max(1, Math.round(size / 5)));
	const out = [];
	for (let cz = KHOANH_N - n; cz < KHOANH_N; cz++) for (let cx = KHOANH_N - n; cx < KHOANH_N; cx++) out.push(khoanhId(cx, cz));
	return out;
}
/** Lúc đầu mở sẵn 25 khoảnh ở góc sông: vùng 25×25, Điện 10×10 cách rìa rừng 5 ô, cách sông 10 ô. */
const START_KHOANH = squareKhoanh(25);
[
	20,
	25,
	25,
	30,
	35,
	40,
	40,
	45,
	45,
	45
].map((a) => Math.min(a + 5, 50));
const cache = /* @__PURE__ */ new WeakMap();
const NONE = [];
function openCache(state) {
	const list = state.khoanh;
	const far = state.benKia?.open ?? NONE;
	const hit = cache.get(list);
	if (hit && hit.len === list.length && hit.far === far) return hit;
	const mask = /* @__PURE__ */ new Uint8Array(5776);
	let start = 52;
	const fill = (o) => {
		for (let dz = 0; dz < 5; dz++) mask.fill(1, (o.z + dz) * 76 + o.x, (o.z + dz) * 76 + o.x + 5);
	};
	for (const id of list) {
		const o = khoanhOrigin(id);
		start = Math.min(start, o.x, o.z);
		fill(o);
	}
	for (const id of far) {
		const o = plotOrigin(id);
		fill(o);
		if (poiAt(id)?.kind === "lang") for (let dz = 1; dz < 4; dz++) mask.fill(0, (o.z + dz) * 76 + o.x + 1, (o.z + dz) * 76 + o.x + 4);
	}
	const fresh = {
		len: list.length,
		far,
		mask,
		start
	};
	cache.set(list, fresh);
	return fresh;
}
/** Mặt nạ ô đất đã mở, cả hai bờ (GRID×GRID, chỉ số z * GRID + x): 1 là đã mở. */
function openMask(state) {
	return openCache(state).mask;
}
/**
* Ô nhỏ nhất (theo cả x và z) của đất đã mở: mọi ô đã mở đều có x và z từ mốc này trở lên. Dải giặc xuất phát,
* khung camera và chỗ neo công trình một ô tính từ đây.
*/
function openStart(state) {
	return openCache(state).start;
}
// src/game/terrain.ts
const tileIndex$1 = (x, z) => z * 76 + x;
/** Độ cao của ô (x, z); ngoài lưới coi như sông. */
function tileHeight(state, x, z) {
	return inGrid(x, z) ? state.heights[tileIndex$1(x, z)] : -1;
}
/** Ô cao nhất dưới móng nếu đặt công trình loại `type` ở (x, z): công trình đắp nền bằng chỗ cao nhất. */
function footprintTop(state, type, x, z) {
	const def = BUILDINGS[type];
	let top = -1;
	for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) top = Math.max(top, tileHeight(state, x + dx, z + dz));
	return top;
}
/** Đắp mọi ô dưới móng lên bằng `h`. */
function levelFootprint(state, b, h) {
	const def = BUILDINGS[b.type];
	for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) if (inGrid(b.x + dx, b.z + dz)) state.heights[tileIndex$1(b.x + dx, b.z + dz)] = h;
}
/** Nền của công trình: móng đã đắp phẳng, nên lấy ô góc là đủ. */
function groundOf(state, b) {
	return tileHeight(state, b.x, b.z);
}
function floodToleranceOf(type) {
	if (isDecor(type)) return 99;
	return FLOOD_TOLERANCE[type] ?? 0;
}
/**
* Đê còn nguyên đứng trên ô (x, z) thì cao thêm mấy bậc. Cống đê còn nguyên mà đang đóng cao như kè đá; đang mở thì
* không chắn nước. `shut`: tính như mọi cống còn nguyên đều đóng (để biết nước nào vào qua cống).
*/
function dikeGrid(state, shut = false) {
	const raise = /* @__PURE__ */ new Int8Array(5776);
	for (const b of state.buildings) {
		if (b.damaged) continue;
		if (b.type === "de") raise[tileIndex$1(b.x, b.z)] = DIKE_RAISE[b.level - 1] ?? DIKE_RAISE[0];
		else if (b.type === "congDe" && (shut || !b.mo)) raise[tileIndex$1(b.x, b.z)] = CONG_DE_RAISE;
	}
	return raise;
}
/** Có cống đê còn nguyên đang mở không. */
function hasOpenCong(state) {
	return state.buildings.some((b) => b.type === "congDe" && b.mo && !b.damaged);
}
/**
* Những ô bị ngập khi nước sông dâng tới mực `level` (bậc, có thể lẻ): nước loang từ sông sang bốn phía,
* vào ô đã khai phá thấp hơn mực nước. Đê còn nguyên làm ô cao thêm, chắn nước. Rừng chưa phát giữ đất, không ngập.
* Trả về lưới GRID×GRID, 1 là ngập. Ô sông luôn là 1. `shut`: tính như mọi cống còn nguyên đều đóng.
*/
function floodMap(state, level, shut = false) {
	const wet = /* @__PURE__ */ new Uint8Array(5776);
	const open = openMask(state);
	const raise = dikeGrid(state, shut);
	const queue = [];
	for (let z = 0; z < 76; z++) for (let x = 0; x < 76; x++) {
		if (!isRiver(x, z)) continue;
		wet[tileIndex$1(x, z)] = 1;
		queue.push(tileIndex$1(x, z));
	}
	if (level <= 0) return wet;
	const steps = [
		[1, 0],
		[-1, 0],
		[0, 1],
		[0, -1]
	];
	while (queue.length) {
		const i = queue.pop();
		const x = i % 76;
		const z = Math.floor(i / 76);
		for (const [dx, dz] of steps) {
			const nx = x + dx;
			const nz = z + dz;
			if (!inGrid(nx, nz)) continue;
			const ni = tileIndex$1(nx, nz);
			if (wet[ni] || !open[ni]) continue;
			if (state.heights[ni] + raise[ni] >= level) continue;
			wet[ni] = 1;
			queue.push(ni);
		}
	}
	return wet;
}
/** Móng công trình có ô nào ngập theo lưới `wet` không. */
function touches(b, wet) {
	const def = BUILDINGS[b.type];
	for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) if (wet[tileIndex$1(b.x + dx, b.z + dz)]) return true;
	return false;
}
/** Công trình bị nước làm hư nếu dâng tới mực `level`: móng nằm trong vùng ngập và nước cao hơn sức chịu của nền. */
function drowns(state, b, wet, level) {
	if (b.damaged) return false;
	if (isBridge(b.type)) return level >= (BRIDGE_FLOOD[b.level - 1] ?? Infinity);
	if (level <= groundOf(state, b) + floodToleranceOf(b.type)) return false;
	return touches(b, wet);
}
/**
* Nước lũ dâng tới mực `level`. Nước dữ là nước vẫn ngập khi mọi cống còn nguyên đều đóng (tràn bờ, qua đê vỡ, cống
* vỡ); nước êm là phần chỉ ngập vì có cống mở. Ruộng lúa, ruộng nếp dính nước dữ thì hư như cũ; chỉ dính nước êm thì
* không hư mà được bồi phù sa. Công trình khác hư theo sức chịu như lũ thường, dù nước êm hay dữ.
* Dùng chung cho trận đánh, bảng cống và tô xem trước, để ba chỗ luôn khớp nhau.
*/
function floodHits(state, level) {
	const wet = floodMap(state, level);
	let calm = null;
	let harsh = wet;
	if (level > 0 && hasOpenCong(state)) {
		harsh = floodMap(state, level, true);
		calm = new Uint8Array(wet.length);
		for (let i = 0; i < wet.length; i++) if (wet[i] && !harsh[i]) calm[i] = 1;
	}
	const drown = [];
	const boi = [];
	for (const b of state.buildings) {
		if (calm && PHU_SA_TYPES.includes(b.type) && !b.damaged && !touches(b, harsh)) {
			if (level > groundOf(state, b) && touches(b, calm)) boi.push(b);
			continue;
		}
		if (drowns(state, b, wet, level)) drown.push(b);
	}
	return {
		wet,
		calm,
		drown,
		boi
	};
}
// src/game/battle.ts
/** Thần thú (chỉ ở dã ngoại, `thanThu.ts`): ngã thì nằm chờ như tướng, không chết. */
const isThanThu = (k) => k in THAN_THU;
const HERO_KINDS = [
	"giong",
	"sonTinh",
	"anDuong",
	"caoLo",
	"trungTrac",
	"trungNhi",
	"baTrieu",
	"trieuQuangPhuc",
	"maiThucLoan",
	"ngoQuyen",
	"lyThuongKiet"
];
/** Tướng của truyện: ra phó bản, giữ kinh đô, giữ thành trong Đấu thành (tướng dã ngoại chỉ đánh ở dã ngoại). */
const HERO_TRUYEN = [
	"giong",
	"sonTinh",
	"anDuong",
	"caoLo",
	"trungTrac",
	"trungNhi"
];
const isHero = (k) => HERO_KINDS.includes(k);
/** Tướng bắn xa: ngoài bãi đứng lùi sau hàng đầu quân ta. */
const ARCHER_HEROES = [
	"anDuong",
	"caoLo",
	"trungNhi"
];
const statsOf = (k) => k === "giong" ? GIONG : k === "sonTinh" ? SON : k === "anDuong" ? ADV : k === "caoLo" ? CAO_LO : k === "trungTrac" ? TRUNG_TRAC : k === "trungNhi" ? TRUNG_NHI : k === "baTrieu" ? BA_TRIEU : k === "trieuQuangPhuc" ? TRIEU_QUANG_PHUC : k === "maiThucLoan" ? MAI_THUC_LOAN : k === "ngoQuyen" ? NGO_QUYEN : k === "lyThuongKiet" ? LY_THUONG_KIET : k === "nghiaBinh" ? NGHIA_BINH : k in THAN_THU ? THAN_THU[k] : k in UNITS ? UNITS[k] : ENEMIES[k];
/** Lệnh bắn đang có: lính nỏ, ụ nỏ, lầu nỏ nghỉ giữa hai phát ngắn đi chừng này lần. */
const fireRate = (battle) => (battle.lenh ?? 0) > 0 ? LENH_BAN.rate : 1;
const tileIndex = (x, z) => z * 76 + x;
/** Hệ số hình học của trận (xem `Battle.geo`). */
const geoOf = (battle) => battle.geo ?? 1;
/** Số ngẫu nhiên lặp lại được theo hạt giống. */
function rng(seed) {
	let t = seed >>> 0;
	return () => {
		t = t + 1831565813 >>> 0;
		let r = Math.imul(t ^ t >>> 15, 1 | t);
		r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r;
		return ((r ^ r >>> 14) >>> 0) / 4294967296;
	};
}
/**
* Độ dài vectơ (dx, dz). Trận đánh chỉ dùng căn bậc hai và bốn phép tính, vì mọi trình duyệt tính ra đúng một kết
* quả (chuẩn IEEE làm tròn đúng); `Math.hypot`, `Math.sin`, `Math.cos` thì mỗi trình duyệt có thể lệch ở chữ số cuối,
* mà Đấu thành cần máy chủ đánh lại trận ra y như máy người chơi.
*/
const dist = (dx, dz) => Math.sqrt(dx * dx + dz * dz);
const TWO_PI = 6.283185307179586;
const PI = 3.141592653589793;
const HALF_PI = 1.5707963267948966;
/** Hệ số Taylor của sin tới bậc 15 (1/3!, 1/5!, …), sai số dưới 1e-11 trên [−π/2, π/2]. */
const SIN_C = [
	-.16666666666666666,
	.008333333333333333,
	-.0001984126984126984,
	27557319223985893e-22,
	-2.505210838544172e-8,
	16059043836821613e-26,
	-7647163731819816e-28
];
/** Sin tất định (xem `dist`): đưa góc về [−π/2, π/2] rồi tính đa thức. */
function dsin(a) {
	let r = a - Math.round(a / TWO_PI) * TWO_PI;
	if (r > HALF_PI) r = PI - r;
	else if (r < -1.5707963267948966) r = -3.141592653589793 - r;
	const r2 = r * r;
	let p = SIN_C[6];
	for (let i = 5; i >= 0; i--) p = p * r2 + SIN_C[i];
	return r + r * r2 * p;
}
/** Cos tất định (xem `dist`). */
const dcos = (a) => dsin(a + HALF_PI);
/** Khoảng cách từ điểm tới hình chữ nhật móng công trình (đơn vị ô). */
function rectDist(x, z, b) {
	const def = BUILDINGS[b.type];
	const dx = Math.max(b.x - x, 0, x - (b.x + def.w));
	const dz = Math.max(b.z - z, 0, z - (b.z + def.d));
	return dist(dx, dz);
}
/** Máu đầy của công trình trong trận: Hồ Kim Quy còn nguyên thì tường thành thêm máu. */
function maxHpOf(battle, b) {
	const hp = BUILDINGS[b.type].hp[b.level - 1] ?? 100;
	return battle.walls && KIM_QUY_WALL_TYPES.includes(b.type) ? hp * 1.3 : hp;
}
function buildingHp(battle, b) {
	return battle.hp[b.id] ?? maxHpOf(battle, b);
}
/**
* Công trình giặc có thể nhắm tới (không tính lũy, bẫy, đê, cống đê, thành, cổng thành, bậc lên thành, đường đi, đồ
* trang trí, không tính cái đã hư). Cổng thành như tường: giặc chỉ phá khi đường đi qua cổng.
*/
function isTargetable(b) {
	return !b.damaged && !UNTARGETED.includes(b.type) && !isDecor(b.type) && !isBridge(b.type);
}
const UNTARGETED = [
	"luy",
	"bayChong",
	"de",
	"thanh",
	"congThanh",
	"congDe",
	"bacThanh"
];
/** Thành Cổ Loa và cổng thành: yêu tinh nhắm phá trước tiên. */
const isCitadel = (b) => (b.type === "thanh" || b.type === "congThanh") && !b.damaged;
/** Yêu tinh nhắm phá thành Cổ Loa (cả cổng thành) trước tiên, rồi mới tới kho và Điện. */
function targetableIn(battle, b) {
	return isTargetable(b) || battle.foe === "yeu" && isCitadel(b);
}
function newBattle(id, mode, wave, side) {
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
		stolen: {
			gao: 0,
			voOc: 0,
			datDa: 0,
			sat: 0,
			go: 0
		},
		killed: 0,
		total: 0,
		lost: {
			giao: 0,
			cung: 0,
			voi: 0,
			no: 0
		},
		wrecked: [],
		rally: 0,
		skills: ["trongTran"],
		hero: null,
		bonus: 0,
		skillCd: {},
		outcome: null,
		flood: 0,
		floodTo: 0,
		water: 0,
		drowned: [],
		swim: false,
		foe: "an",
		shield: 0,
		crossbows: false,
		arms: {
			giao: 0,
			cung: 0,
			voi: 0,
			no: 0
		},
		boats: []
	};
}
/** Phần binh khí đã rèn cộng thêm vào máu và sức đánh của một lính ta (tướng và giặc không có). */
function armsBonus(battle, kind) {
	return kind in UNITS ? (battle.arms[kind] ?? 0) * ARMS_BONUS : 0;
}
/** Phần huân công cộng thêm vào máu và sức đánh: lính theo nhánh binh chủng, tướng theo nhánh tướng (giặc không có). */
function huanBonus(battle, kind) {
	const branch = kind in UNITS ? kind : isHero(kind) ? "tuong" : null;
	return branch ? (battle.huan?.[branch] ?? 0) * HUAN_BONUS : 0;
}
/**
* Hệ số máu và sức đánh của một người bên ta: Đền, phúc lành, binh khí đã rèn, huân công, nữ tướng (`nu`: lính đúng
* binh chủng của nữ tướng). Nghĩa binh không được cộng.
*/
const ownMult = (battle, kind, nu = false) => multOf(battle, kind, nu);
/** Như `ownMult`, theo phần cộng thêm `mods` (của người tấn công hay người giữ thành trong Đấu thành). */
const multOf = (mods, kind, nu = false) => kind === "nghiaBinh" ? 1 : 1 + mods.bonus + armsBonus(mods, kind) + huanBonus(mods, kind) + (nu ? NU_TUONG_BONUS : 0);
/** Hệ số máu và sức đánh của `f`: quân ta theo `ownMult`; quân giữ thành trong Đấu thành theo người giữ thành. */
const sideMult = (battle, f) => f.side === "ta" ? ownMult(battle, f.kind, f.nu) : battle.def ? multOf(battle.def, f.kind, f.nu) : 1;
/** Kỹ năng của từng tướng: kỹ năng đầu có ngay, kỹ năng sau mở giữa chương. */
function heroSkills(hero) {
	if (hero.kind === "sonTinh") return hero.non ? ["bocDoi", "doiNon"] : ["bocDoi"];
	if (hero.kind === "anDuong") {
		const list = hero.layTrao ? [] : ["noThan"];
		return hero.kimQuy ? [...list, "ruaVang"] : list;
	}
	if (hero.kind === "caoLo") return hero.lenhBan ? ["lienChau", "lenhBan"] : ["lienChau"];
	if (hero.kind === "trungTrac") return ["voiXung"];
	if (hero.kind === "trungNhi") return hero.hieuTrieu ? ["hieuTrieu"] : [];
	if (hero.kind === "baTrieu") return ["chemCaKinh"];
	if (hero.kind === "trieuQuangPhuc") return ["ngayAn"];
	if (hero.kind === "maiThucLoan") return ["hacDe"];
	if (hero.kind === "ngoQuyen") return ["cocBachDang"];
	if (hero.kind === "lyThuongKiet") return ["namQuoc"];
	return hero.bamboo ? ["phunLua", "nhoTre"] : ["phunLua"];
}
/** Các tướng trong trận (một, hai với Hai Bà, tới ba ở dã ngoại). */
function heroSetups(battle) {
	return [
		battle.hero,
		battle.hero2,
		...battle.heroThem ?? []
	].filter((h) => !!h);
}
/** Phần cộng của đồ tướng bên ta loại `kind` (không phải tướng trong trận, hay tướng không mặc gì thì undefined). */
function doTa(battle, kind) {
	if (battle.hero?.kind === kind) return battle.hero.trangBi;
	if (battle.hero2?.kind === kind) return battle.hero2.trangBi;
	return battle.heroThem?.find((h) => h.kind === kind)?.trangBi;
}
/**
* Cho tướng vào trận ở (x, z) và mở các kỹ năng của tướng. Đã có một tướng thì đây là tướng thứ hai; đã có hai thì
* vào `heroThem` (dã ngoại).
*/
function addHero(battle, hero, x, z, hpMul) {
	if (!battle.hero) battle.hero = {
		...hero,
		down: false
	};
	else if (!battle.hero2) battle.hero2 = {
		...hero,
		down: false
	};
	else (battle.heroThem ??= []).push({
		...hero,
		down: false
	});
	battle.skills.push(...heroSkills(hero));
	const f = newFighter(battle, "ta", hero.kind, x, z, statsOf(hero.kind).hp * hpMul * (ownMult(battle, hero.kind) + (hero.trangBi?.mau ?? 0)));
	if (hero.trangBi) f.trangBi = hero.trangBi;
	const nav = navOf(battle);
	if (nav) dayRa(nav.bai, bodyRadius(hero.kind), f);
	battle.fighters.push(f);
}
/** Chỉ quân bắn xa (cung thủ, lính nỏ, Cao Lỗ, An Dương Vương) và công trình phòng thủ bắn tới lâu thuyền. */
const SHIP_HITTERS = [
	"cung",
	"no",
	"caoLo",
	"anDuong"
];
/** `by` đánh được `o` không: lâu thuyền đậu dưới sông, quân cận chiến và tướng trên bờ không đánh tới. */
const reaches = (by, o) => o.kind !== "lauThuyen" || by === void 0 || SHIP_HITTERS.includes(by);
/** Ô cách sông như ô cách sông `old` ô ở kinh đô nhỏ, giãn theo `RAID_SCALE`. */
const fromRiver = (old) => 52 - RAID_SCALE * old;
/** Chiều sâu chỗ giặc trên bộ xuất phát (số ngẫu nhiên `r` 0..1), vùng đã khai phá bắt đầu từ ô `open`. */
const spawnDepth = (open, r) => Math.max(.6, Math.min(fromRiver(26.4 - 1.4 * r), open - 2 + 1.4 * r));
/**
* Lâu thuyền: chèo từ giữa sông tới chỗ đậu, đậu rồi cứ `cooldown` giây bắn một loạt `LAU_THUYEN.shots` mũi nỏ vào
* công trình hay lính ta gần nhất trong tầm (mỗi mũi một mục tiêu, ít mục tiêu thì bắn dồn). Hết giờ (bỏ chạy) thì
* chèo về chỗ hiện ra rồi rút đi.
*/
function stepShip(state, battle, f, dt) {
	const ship = f.ship;
	const st = statsOf(f.kind);
	const speed = BOAT.speed * dt;
	const row = (tx, tz) => {
		const dx = tx - f.x;
		const dz = tz - f.z;
		const d = dist(dx, dz);
		if (d <= speed) {
			f.x = tx;
			f.z = tz;
			return true;
		}
		f.x += dx / d * speed;
		f.z += dz / d * speed;
		return false;
	};
	if (f.state === "flee") {
		if (row(ship.ox, ship.oz)) f.state = "gone";
		return;
	}
	if (battle.t < ship.delay) return;
	if (f.x !== ship.tx || f.z !== ship.tz) {
		f.state = "move";
		row(ship.tx, ship.tz);
		return;
	}
	f.state = "fight";
	if (f.cd > 0) return;
	const reach = st.range * geoOf(battle);
	const marks = [];
	for (const o of battle.fighters) {
		if (o.side !== "ta" || !isAlive(o)) continue;
		const d = dist(o.x - f.x, o.z - f.z);
		if (d <= reach) marks.push({
			d,
			x: o.x,
			z: o.z,
			hit: () => damageFighter(battle, {
				kind: f.kind,
				dmg: st.dmg
			}, o)
		});
	}
	for (const b of state.buildings) {
		if (!targetableIn(battle, b)) continue;
		const d = rectDist(f.x, f.z, b);
		if (d > reach) continue;
		const def = BUILDINGS[b.type];
		marks.push({
			d,
			x: b.x + def.w / 2,
			z: b.z + def.d / 2,
			hit: () => damageBuilding(state, battle, f, b, st.dmg)
		});
	}
	if (!marks.length) return;
	marks.sort((p, q) => p.d - q.d);
	for (let i = 0; i < LAU_THUYEN.shots; i++) {
		const m = marks[i % Math.min(marks.length, LAU_THUYEN.shots)];
		emit(battle, {
			kind: "shot",
			x: f.x,
			z: f.z,
			tx: m.x,
			tz: m.z,
			by: "noHan"
		});
		m.hit();
	}
	f.cd = st.cooldown;
	f.swing = .3;
}
/** Thuyền chèo vào bờ; cập bờ thì thả lính lên đất, rải dọc bờ. Lính còn trên thuyền đi theo thuyền. */
function stepBoats(battle, dt) {
	if (!battle.boats.length) return;
	battle.boats.forEach((boat, b) => {
		if (!boat.landed && battle.t >= boat.delay) {
			const dx = boat.tx - boat.x;
			const dz = boat.tz - boat.z;
			const d = dist(dx, dz);
			const step = BOAT.speed * dt;
			if (d <= step) {
				boat.x = boat.tx;
				boat.z = boat.tz;
				boat.landed = true;
			} else {
				boat.x += dx / d * step;
				boat.z += dz / d * step;
			}
		}
		const crew = battle.fighters.filter((f) => f.boat === b && f.state === "aboard");
		const alongX = battle.side === "nam" || battle.side === "namXa";
		const shore = farSideBank(battle.side) ? .3 : -.3;
		crew.forEach((f, i) => {
			const off = (i - (crew.length - 1) / 2) * .28;
			if (boat.landed) {
				f.state = "move";
				f.x = alongX ? boat.x + off * 1.4 : boat.x + shore;
				f.z = alongX ? boat.z + shore : boat.z + off * 1.4;
			} else {
				f.x = alongX ? boat.x + off : boat.x;
				f.z = alongX ? boat.z : boat.z + off;
			}
		});
	});
}
function newFighter(battle, side, kind, x, z, hp) {
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
		state: "move",
		face: 0,
		swing: 0
	};
}
/** Công trình tính điểm phá trong Đấu thành: như công trình giặc nhắm tới (không tính tường, lũy, đê, cổng, bẫy, đường, trang trí, cầu). */
const isScored = (b) => !UNTARGETED.includes(b.type) && !isDecor(b.type) && !isBridge(b.type);
/**
* Trận Đấu thành trên kinh đô bị đánh `state` (bản dùng một lần, dựng từ bản chụp). Quân đánh thành (phe `ta`) ra
* từ dải bìa rừng phía bắc hay tây như giặc trên bộ, tướng ở giữa dải; lính giữ thành (phe `giac`) ra từ doanh trại
* như khi giữ kinh đô; Đền Hát Môn còn thì có nghĩa binh; tướng giữ thành đứng trước Điện.
*/
function startPvp(state, defense, attack) {
	const battle = newBattle(state.nextBattleId++, "pvp", 0, attack.side);
	battle.bonus = attack.bonus;
	battle.arms = { ...attack.arms };
	if (attack.huan) battle.huan = { ...attack.huan };
	battle.def = {
		bonus: defense.bonus,
		arms: { ...defense.arms },
		...defense.huan ? { huan: { ...defense.huan } } : {}
	};
	battle.crossbows = defense.crossbows;
	if (defense.walls) battle.walls = true;
	battle.geo = RAID_SCALE;
	const hpMul = defense.hpMul ?? 1;
	battle.hpMul = hpMul;
	battle.siege = defense.siege ?? 1;
	const rand = rng(attack.seed);
	const open = openStart(state);
	const lo = Math.min(open, fromRiver(24));
	const alongX = attack.side === "bac";
	const put = (along, depth) => alongX ? {
		x: along,
		z: depth
	} : {
		x: depth,
		z: along
	};
	for (const kind of UNIT_TYPES) for (let i = 0; i < attack.army[kind]; i++) {
		const p = put(lo + rand() * (52 - lo - 1), spawnDepth(open, rand()));
		battle.fighters.push(newFighter(battle, "ta", kind, p.x, p.z, UNITS[kind].hp * hpMul * ownMult(battle, kind)));
	}
	attack.heroes.forEach((hero, i) => {
		const p = put((lo + 52 - 1) / 2 + (i ? 1.2 : 0), spawnDepth(open, .5));
		addHero(battle, hero, p.x, p.z, hpMul);
	});
	const mods = battle.def;
	const push = (kind, x, z, hp, nu = false) => {
		const f = newFighter(battle, "giac", kind, x, z, hp * hpMul);
		if (nu) f.nu = true;
		battle.fighters.push(f);
		battle.total++;
		return f;
	};
	for (const g of defense.guards) {
		const home = state.buildings[g.at];
		if (!home) continue;
		const hd = BUILDINGS[home.type];
		for (let i = 0; i < g.n; i++) {
			const x = home.x + hd.w / 2 + (rand() - .5) * hd.w;
			const z = home.z + hd.d / 2 + (rand() - .5) * hd.d;
			push(g.kind, x, z, UNITS[g.kind].hp * multOf(mods, g.kind, !!g.nu), !!g.nu);
		}
	}
	const den = state.buildings.find((b) => b.type === "denHatMon" && !b.damaged);
	if (den) {
		const hd = BUILDINGS.denHatMon;
		for (let i = 0; i < 6; i++) {
			const a = i / 6 * Math.PI * 2;
			push("nghiaBinh", den.x + hd.w / 2 + dsin(a) * .8, den.z + hd.d + .4 + dcos(a) * .5, NGHIA_BINH.hp);
		}
	}
	const dien = state.buildings.find((b) => b.type === "dien");
	if (dien) defense.heroes.forEach((hero, i) => {
		const at = turnLocal(dien.rot, (i ? 1 : -1) * 1.2, BUILDINGS.dien.d / 2 + .6);
		const hp = statsOf(hero.kind).hp * (multOf(mods, hero.kind) + (hero.trangBi?.mau ?? 0));
		const f = push(hero.kind, dien.x + BUILDINGS.dien.w / 2 + at.x, dien.z + BUILDINGS.dien.d / 2 + at.z, hp);
		if (hero.trangBi) f.trangBi = hero.trangBi;
	});
	return battle;
}
/**
* Trận Đấu thành đã xong chưa: đã rút quân, hết giờ (`DAU_THANH.holdS`), quân đánh thành không còn ai, hay đã phá
* hết công trình tính điểm.
*/
function pvpOver(state, battle) {
	if (battle.outcome === "retreat" || battle.t >= DAU_THANH.holdS || alliesLeft(battle) === 0) return true;
	return !state.buildings.some((b) => isScored(b) && !b.damaged);
}
/** An Dương Vương, Cao Lỗ bắn nỏ: đứng lùi sau hàng đầu của quân ta chừng này ô. */
const ADV_BACK = 1.8;
/** Số lính đứng trên một hàng ngang. Đông hơn thì xếp thêm hàng phía sau. */
const PER_LINE = 8;
/**
* Trận ngoài bãi: quân ta dàn ở phía z lớn, giặc ở phía z nhỏ, mỗi bên ba hàng
* (tiền quân đứng gần đối phương nhất). Lính đứng giãn đều theo bề ngang bãi.
*/
function startFieldBattle(setup) {
	const battle = newBattle(setup.id, "field", setup.stage, "bac");
	battle.bonus = setup.bonus ?? 0;
	battle.hpScale = setup.hpScale;
	if (setup.arms) battle.arms = { ...setup.arms };
	if (setup.huan) battle.huan = { ...setup.huan };
	if (setup.challenge) battle.challenge = setup.challenge;
	if (setup.camp !== void 0) battle.camp = setup.camp;
	if (setup.dao) battle.dao = setup.dao;
	if (setup.fury) battle.fury = setup.fury;
	if (baiById(setup.bai)) battle.bai = setup.bai;
	const rand = rng(setup.id * 7919 + setup.stage);
	const ours = {
		tien: [],
		trung: [],
		hau: []
	};
	for (const k of UNIT_TYPES) for (let i = 0; i < (setup.army[k] ?? 0); i++) ours[setup.rows[k]].push(k);
	const theirs = {
		tien: [],
		trung: [],
		hau: []
	};
	for (const k of Object.keys(setup.enemies)) for (let i = 0; i < (setup.enemies[k] ?? 0); i++) theirs[ENEMY_ROWS[k]].push(k);
	const front = (FIELD.d - FIELD.gap) / 2;
	const nu = setup.nuTuong ?? null;
	const moi = !!setup.nuMoi;
	deploy(battle, "ta", ours, FIELD.d - front, 1, rand, (k) => UNITS[k].hp * FIELD.hpMul * ownMult(battle, k, moi || nuBoosts(nu, k)));
	if (moi) for (const f of battle.fighters) f.nu = true;
	if (nu) {
		for (const f of battle.fighters) if (nuBoosts(nu, f.kind)) f.nu = true;
		battle.nuTuong = {
			kind: nu,
			x: FIELD.w / 2,
			z: nuRestZ(battle)
		};
	}
	deploy(battle, "giac", theirs, front, -1, rand, (k) => ENEMIES[k].hp * setup.hpScale * FIELD.hpMul);
	battle.total = battle.fighters.filter((f) => f.side === "giac").length;
	if (setup.waves?.length) {
		battle.waves = setup.waves.map((w) => ({
			at: w.at,
			enemies: { ...w.enemies }
		})).sort((a, b) => a.at - b.at);
		battle.waveCount = battle.waves.length + 1;
		for (const w of battle.waves) for (const k of Object.keys(w.enemies)) battle.total += w.enemies[k] ?? 0;
	}
	if (setup.holdS) battle.holdS = setup.holdS;
	for (const hero of [setup.hero, setup.hero2]) if (hero) addHero(battle, hero, FIELD.w / 2, FIELD.d - front + (ARCHER_HEROES.includes(hero.kind) ? ADV_BACK : -.8), FIELD.hpMul);
	return battle;
}
/** Màn cầm cự: đợt giặc tới giờ thì kéo vào từ cuối bãi phía giặc, dàn hàng như lúc vào trận rồi xông lên. */
function arriveWaves(battle) {
	const waves = battle.waves;
	if (!waves?.length || battle.t < waves[0].at) return;
	const wave = waves.shift();
	const rows = {
		tien: [],
		trung: [],
		hau: []
	};
	for (const k of Object.keys(wave.enemies)) for (let i = 0; i < (wave.enemies[k] ?? 0); i++) rows[ENEMY_ROWS[k]].push(k);
	deploy(battle, "giac", rows, 2.6, -1, rng(battle.id * 7919 + battle.wave + Math.round(wave.at)), (k) => ENEMIES[k].hp * (battle.hpScale ?? 1) * FIELD.hpMul);
	emit(battle, {
		kind: "arrive",
		x: FIELD.w / 2,
		z: 1.5
	});
}
/** Dàn quân từ hàng đầu `front` lùi dần về phía `dir` (+1: về z lớn, −1: về z nhỏ). */
function deploy(battle, side, rows, front, dir, rand, hpOf) {
	const nav = navOf(battle);
	let z = front;
	for (const row of ROWS) {
		const list = rows[row];
		if (!list.length) continue;
		for (let start = 0; start < list.length; start += PER_LINE) {
			const line = list.slice(start, start + PER_LINE);
			line.forEach((kind, i) => {
				const f = newFighter(battle, side, kind, FIELD.w * (i + 1) / (line.length + 1) + (rand() - .5) * .3, clampField(z + (rand() - .5) * .2, FIELD.d), hpOf(kind));
				f.face = dir > 0 ? Math.PI : 0;
				if (nav) dayRa(nav.bai, bodyRadius(kind), f);
				battle.fighters.push(f);
			});
			z += dir * .9;
		}
		z += dir * .6;
	}
}
const clampField = kep;
/** Tìm đường của từng trận ngoài bãi có vật cản: dẫn xuất từ bố cục, không lưu (mở lại bản lưu thì dựng lại). */
const navs = /* @__PURE__ */ new WeakMap();
/** Trận ngoài bãi có bố cục vật cản thì cho trạng thái tìm đường; bãi phẳng hay trận giữ kinh đô thì null. */
function navOf(battle) {
	if (battle.mode !== "field") return null;
	const bai = baiById(battle.bai);
	if (!bai) return null;
	let nav = navs.get(battle);
	if (!nav || nav.bai !== bai) navs.set(battle, nav = taoNav(bai));
	return nav;
}
/** Đi chậm khi lội nước, bùn (thủy quái bơi như đi thường). */
const swims = (k) => SWIMMERS.includes(k);
/** Ai còn đánh được, ai còn là đích cho phe kia nhắm tới (như `nearestEnemyOf`). */
const targetable = (o) => o.state === "move" || o.state === "fight" || o.state === "flee";
/** Dựng lại bản đồ khoảng cách của hai phe khi tới lượt (mỗi `NAV_S` giây trận). */
function navTick(battle) {
	const nav = navOf(battle);
	if (!nav) return;
	capNhatNav(nav, battle.t, () => {
		const giac = battle.fighters.filter((o) => o.side === "giac" && targetable(o));
		return {
			giac,
			ta: battle.fighters.filter((o) => o.side === "ta" && targetable(o)),
			giacBoi: giac.length > 0 && giac.every((o) => swims(o.kind))
		};
	});
}
/**
* Bước về phía (tx, tz) trên bãi có vật cản: đường thẳng thông thì đi thẳng, vướng thì lần theo bản đồ khoảng cách
* tới `toi` (khóa đi vòng `VONG_KHOA` giây cho khỏi đổi qua đổi lại); lội nước, bùn thì chậm; đi xong thì trượt dọc vật cản.
*/
function walkField(nav, f, toi, tx, tz, reach, dt, mult) {
	const r = bodyRadius(f.kind);
	const boi = swims(f.kind);
	f.repathIn = Math.max(0, f.repathIn - dt);
	const go = huongTheo(nav, toi, f.x, f.z, r, tx, tz, reach, boi, f.repathIn > 0);
	if (go.vong && f.repathIn <= 0) f.repathIn = VONG_KHOA;
	const ox = f.x;
	const oz = f.z;
	moveToward(f, go.x, go.z, dt, mult * (boi ? 1 : chamAt(nav.bai, f.x, f.z)));
	truot(nav.bai, r, f, ox, oz);
}
/** Đã phải đi vòng thì cứ lần theo bản đồ khoảng cách chừng này giây rồi mới xét lại đường thẳng. */
const VONG_KHOA = .5;
/** Kỹ năng hất, lướt dời `f` tới (x, z) (đã giữ trong bãi): bãi có vật cản thì dừng ở mép vật cản. */
function pushTo(battle, f, x, z) {
	const nav = navOf(battle);
	if (nav) que(nav.bai, bodyRadius(f.kind), f, x, z);
	else {
		f.x = x;
		f.z = z;
	}
}
/** Người vừa hiện ra giữa trận (quân gọi thêm): bãi có vật cản thì đưa ra chỗ trống gần nhất. */
function placeFree(battle, f) {
	const nav = navOf(battle);
	if (nav) dayRa(nav.bai, bodyRadius(f.kind), f);
}
function emit(battle, e) {
	battle.events.push({
		...e,
		seq: ++battle.seq
	});
	if (battle.events.length > 80) battle.events.splice(0, battle.events.length - 80);
}
/**
* Chi phí đi qua mỗi ô: sông không đi được (thủy quái thì bơi được), công trình còn nguyên phải phá mới qua
* (chi phí cao).
*/
function costGrid(state, targetId, swim) {
	const cost = (/* @__PURE__ */ new Float32Array(5776)).fill(1);
	if (!swim) {
		for (let z = 0; z < 76; z++) for (let x = 0; x < 76; x++) if (isRiver(x, z)) cost[tileIndex(x, z)] = Infinity;
	}
	for (const b of state.buildings) {
		if (b.damaged || b.type === "bayChong" || isDecor(b.type)) continue;
		const def = BUILDINGS[b.type];
		if (isBridge(b.type)) {
			for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) cost[tileIndex(b.x + dx, b.z + dz)] = 1;
			continue;
		}
		const c = b.id === targetId ? 1 : b.type === "luy" ? b.level >= 2 ? 30 : 12 : b.type === "de" ? b.level >= 2 ? 40 : 18 : b.type === "thanh" ? 45 : b.type === "congThanh" ? CONG_THANH.pathCost : b.type === "congDe" ? 40 : 25;
		for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) cost[tileIndex(b.x + dx, b.z + dz)] = c;
	}
	return cost;
}
/** Hàng đợi ưu tiên nhỏ nhất cho A*: khóa (f, thứ tự), giá trị là chỉ số ô. */
var OpenHeap = class {
	f = [];
	q = [];
	v = [];
	get size() {
		return this.v.length;
	}
	push(f, q, v) {
		const F = this.f;
		const Q = this.q;
		const V = this.v;
		let i = V.length;
		F.push(f);
		Q.push(q);
		V.push(v);
		while (i > 0) {
			const p = i - 1 >> 1;
			if (!(f < F[p] || f === F[p] && q < Q[p])) break;
			F[i] = F[p];
			Q[i] = Q[p];
			V[i] = V[p];
			i = p;
		}
		F[i] = f;
		Q[i] = q;
		V[i] = v;
	}
	pop() {
		const F = this.f;
		const Q = this.q;
		const V = this.v;
		const top = V[0];
		const f = F.pop();
		const q = Q.pop();
		const v = V.pop();
		const n = V.length;
		if (!n) return top;
		let i = 0;
		for (;;) {
			const l = 2 * i + 1;
			const r = l + 1;
			let mf = f;
			let mq = q;
			let m = i;
			if (l < n && (F[l] < mf || F[l] === mf && Q[l] < mq)) {
				m = l;
				mf = F[l];
				mq = Q[l];
			}
			if (r < n && (F[r] < mf || F[r] === mf && Q[r] < mq)) m = r;
			if (m === i) break;
			F[i] = F[m];
			Q[i] = Q[m];
			V[i] = V[m];
			i = m;
		}
		F[i] = f;
		Q[i] = q;
		V[i] = v;
		return top;
	}
};
/** Ô trong lưới gần chỗ (x, z) nhất (chỗ ngoài lưới thì lấy ô ở mép). */
const tileAt = (x, z) => tileIndex(Math.min(75, Math.max(0, Math.floor(x))), Math.min(75, Math.max(0, Math.floor(z))));
/**
* Dấu vân của dãy công trình: đổi khi công trình được dựng, dỡ, dời, nâng cấp, bị phá hay được sửa (người chơi vẫn
* dựng, sửa được trong lúc giặc đánh). Dùng để biết lưới chi phí lưu sẵn còn đúng không.
*/
function buildingsKey(state) {
	let h = state.buildings.length | 0;
	for (const b of state.buildings) {
		h = Math.imul(h ^ b.id, 2654435761);
		h = h ^ b.x * 131 + b.z * 7919 + b.level * 31 + (b.damaged ? 17 : 0) + b.type.length * 3 | 0;
	}
	return h;
}
const COST_CACHE = /* @__PURE__ */ new WeakMap();
function costEntry(state, battle) {
	const key = buildingsKey(state);
	let entry = COST_CACHE.get(battle);
	if (!entry || entry.key !== key) {
		entry = {
			key,
			grids: [],
			paths: []
		};
		COST_CACHE.set(battle, entry);
	}
	return entry;
}
/** Công trình này có ghi chi phí riêng lên lưới không (bẫy, đường đi, trang trí, cầu, công trình đã hư thì không). */
const blocksPath = (b) => !b.damaged && b.type !== "bayChong" && !isDecor(b.type) && !isBridge(b.type);
const INDEX_CACHE = /* @__PURE__ */ new WeakMap();
/** Mục lục công trình của trận, dựng lại khi dãy công trình đổi. Gọi một lần mỗi bước (dãy không đổi giữa bước). */
function buildingIndex(state, battle) {
	const key = buildingsKey(state);
	let idx = INDEX_CACHE.get(battle);
	if (idx && idx.key === key) return idx;
	idx = {
		key,
		at: /* @__PURE__ */ new Map(),
		tile: (/* @__PURE__ */ new Int16Array(5776)).fill(-1)
	};
	for (let n = 0; n < state.buildings.length; n++) {
		const b = state.buildings[n];
		if (!idx.at.has(b.id)) idx.at.set(b.id, n);
		if (b.type === "bayChong" || isDecor(b.type) || isBridge(b.type)) continue;
		const def = BUILDINGS[b.type];
		for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) {
			if (!inGrid(b.x + dx, b.z + dz)) continue;
			const i = tileIndex(b.x + dx, b.z + dz);
			idx.tile[i] = idx.tile[i] === -1 ? n : -2;
		}
	}
	INDEX_CACHE.set(battle, idx);
	return idx;
}
/** Công trình còn nguyên chắn ở ô `tile` (không kể đích `target`, bẫy, đường đi, trang trí, cầu). */
function blockerAt(state, idx, tile, target) {
	const n = idx.tile[tile];
	if (n === -1) return void 0;
	if (n >= 0) {
		const b = state.buildings[n];
		return b.damaged || b.id === target.id ? void 0 : b;
	}
	const nx = tile % 76;
	const nz = Math.floor(tile / 76);
	return state.buildings.find((b) => {
		if (b.damaged || b.id === target.id || b.type === "bayChong" || isDecor(b.type) || isBridge(b.type)) return false;
		const def = BUILDINGS[b.type];
		return nx >= b.x && nx < b.x + def.w && nz >= b.z && nz < b.z + def.d;
	});
}
/**
* A* trên lưới 8 hướng, tới bất kỳ ô nào thuộc móng công trình đích. `swim`: bơi được qua sông. Có `battle` thì dùng
* lưới chi phí lưu sẵn của trận (cho đúng đường như dựng lại lưới mỗi lần), chỉ tạm đổi ô móng đích thành dễ đi.
*/
function findPath(state, fromX, fromZ, target, swim = false, battle) {
	const slot = swim ? 1 : 0;
	const entry = battle ? costEntry(state, battle) : null;
	const start = tileAt(fromX, fromZ);
	const memo = entry ? entry.paths[slot] ??= /* @__PURE__ */ new Map() : null;
	const memoKey = target.id * 5776 + start;
	const known = memo?.get(memoKey);
	if (known !== void 0) return known;
	const cost = entry ? entry.grids[slot] ??= costGrid(state, null, swim) : costGrid(state, target.id, swim);
	const def = BUILDINGS[target.type];
	const patched = [];
	if (battle && blocksPath(target)) for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) {
		const i = tileIndex(target.x + dx, target.z + dz);
		patched.push(i, cost[i]);
		cost[i] = 1;
	}
	const isGoal = (i) => {
		const x = i % 76;
		const z = Math.floor(i / 76);
		return x >= target.x && x < target.x + def.w && z >= target.z && z < target.z + def.d;
	};
	const tx = target.x + def.w / 2;
	const tz = target.z + def.d / 2;
	const h = (i) => dist(i % 76 + .5 - tx, Math.floor(i / 76) + .5 - tz);
	const path = searchPath(cost, start, isGoal, h);
	for (let k = 0; k < patched.length; k += 2) cost[patched[k]] = patched[k + 1];
	memo?.set(memoKey, path);
	return path;
}
const S_G = /* @__PURE__ */ new Float32Array(5776);
const S_CAME = /* @__PURE__ */ new Int32Array(5776);
const S_SEQ = /* @__PURE__ */ new Int32Array(5776);
const S_SEEN = /* @__PURE__ */ new Uint32Array(5776);
const S_SHUT = /* @__PURE__ */ new Uint32Array(5776);
let searchRun = 0;
/** A* trên lưới 8 hướng theo bảng chi phí `cost` (Infinity là không đi được), từ ô `start` tới ô đầu tiên `isGoal`. */
function searchPath(cost, start, isGoal, h) {
	const run = searchRun = searchRun + 1 >>> 0 || 1;
	const g = S_G;
	const came = S_CAME;
	const seen = S_SEEN;
	const closed = S_SHUT;
	const seqOf = S_SEQ;
	const heap = new OpenHeap();
	let seq = 0;
	seen[start] = run;
	g[start] = 0;
	came[start] = -1;
	seqOf[start] = seq++;
	heap.push(h(start), seqOf[start], start);
	while (heap.size) {
		const cur = heap.pop();
		if (closed[cur] === run) continue;
		if (isGoal(cur)) {
			const path = [cur];
			let c = cur;
			while (came[c] !== -1) {
				c = came[c];
				path.unshift(c);
			}
			return path;
		}
		closed[cur] = run;
		const cx = cur % 76;
		const cz = Math.floor(cur / 76);
		for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
			if (!dx && !dz) continue;
			const nx = cx + dx;
			const nz = cz + dz;
			if (!inGrid(nx, nz)) continue;
			const ni = tileIndex(nx, nz);
			if (closed[ni] === run || cost[ni] === Infinity) continue;
			if (dx && dz && (cost[tileIndex(cx + dx, cz)] === Infinity || cost[tileIndex(cx, cz + dz)] === Infinity)) continue;
			const ng = g[cur] + cost[ni] * (dx && dz ? Math.SQRT2 : 1);
			const old = seen[ni] === run ? g[ni] : Infinity;
			if (ng < old) {
				if (old === Infinity) seqOf[ni] = seq++;
				seen[ni] = run;
				g[ni] = ng;
				came[ni] = cur;
				heap.push(g[ni] + h(ni), seqOf[ni], ni);
			}
		}
	}
	return null;
}
function nearestEnemyOf(battle, f, within = Infinity) {
	let best = null;
	let bestD = within;
	const short = statsOf(f.kind).range <= TREN_THANH.melee;
	for (const o of battle.fighters) {
		if (o.side === f.side || o.state !== "move" && o.state !== "fight" && o.state !== "flee" || !reaches(f.kind, o)) continue;
		if (short && o.wall) continue;
		const d = dist(o.x - f.x, o.z - f.z);
		if (d < bestD) {
			bestD = d;
			best = o;
		}
	}
	return best;
}
function chooseTarget(state, battle, f) {
	const pick = (list) => list.reduce((best, b) => !best || rectDist(f.x, f.z, b) < rectDist(f.x, f.z, best) ? b : best, null);
	if (battle.foe === "yeu") {
		const wall = pick(state.buildings.filter(isCitadel));
		if (wall) return wall;
	}
	const live = state.buildings.filter(isTargetable);
	const bank = farSideBank(battle.side);
	if (bank) {
		const mine = live.filter((b) => farBankOf(b.x, b.z) === bank);
		const across = bridgeUp(state, bank) ? live.filter((b) => farBankOf(b.x, b.z) === null) : [];
		return pick(mine.filter((b) => b.type === "banLang")) ?? pick(across.filter((b) => b.type === "kho")) ?? pick(across.filter((b) => b.type === "dien")) ?? pick(mine) ?? pick(across);
	}
	return pick(live.filter((b) => b.type === "kho")) ?? pick(live.filter((b) => b.type === "dien")) ?? pick(live);
}
function moveToward(f, tx, tz, dt, mult = 1, geo = 1) {
	const dx = tx - f.x;
	const dz = tz - f.z;
	const d = dist(dx, dz);
	const step = statsOf(f.kind).speed * geo * mult * (f.slow && f.slow > 0 ? TT_WAVE.slow : 1) * dt;
	if (d > 1e-6) f.face = Math.atan2(dx, dz);
	if (d <= step) {
		f.x = tx;
		f.z = tz;
		return true;
	}
	f.x += dx / d * step;
	f.z += dz / d * step;
	return false;
}
function damageFighter(battle, attacker, target) {
	if (!reaches(attacker.kind, target)) return;
	const bonus = attacker.kind && statsOf(attacker.kind).strongVs?.includes(target.kind) ? 2 : 1;
	const shield = target.side === "ta" && battle.shield > 0 ? KIM_QUY.reduce : 1;
	const fury = target.side === "ta" ? battle.fury ?? 1 : 1;
	const armor = 1 - (target.trangBi?.giap ?? 0);
	target.hp -= attacker.dmg * bonus * shield * fury * armor;
	if (isHero(target.kind) || isThanThu(target.kind)) {
		if (target.hp <= 0 && target.state !== "gone") {
			target.hp = 0;
			target.state = "gone";
			const setup = target.side === "ta" ? heroSetups(battle).find((h) => h.kind === target.kind) : void 0;
			if (setup) setup.down = true;
			emit(battle, {
				kind: "exhaust",
				x: target.x,
				z: target.z
			});
		}
		return;
	}
	if (target.hp <= 0 && target.state !== "dead") {
		target.state = "dead";
		target.hp = 0;
		if (target.ship) {
			battle.sunk = (battle.sunk ?? 0) + 1;
			emit(battle, {
				kind: "sink",
				x: target.x,
				z: target.z
			});
		} else emit(battle, {
			kind: "die",
			x: target.x,
			z: target.z
		});
		if (target.side === "giac") battle.killed++;
		else if (target.kind in battle.lost) battle.lost[target.kind]++;
	}
}
/** Một đòn của `f` vào `foe`: bắn tên nếu đánh xa, quân ta mạnh hơn khi đang có Trống trận. */
function strike(battle, f, foe) {
	const st = statsOf(f.kind);
	if (st.range > 2) emit(battle, {
		kind: "shot",
		x: f.x,
		z: f.z,
		tx: foe.x,
		tz: foe.z,
		by: f.kind,
		fromWall: f.wall,
		toWall: foe.wall
	});
	const own = f.trangBi;
	const mult = (sideMult(battle, f) + (own?.danh ?? 0)) * (f.side === "ta" && battle.rally > 0 ? RALLY.dmg : 1);
	const phuc = f.phuc && !((f.an ?? 0) > 0) ? f.phuc : 1;
	if (phuc !== 1) f.phuc = void 0;
	const hang = (f.hang ?? 0) > 0 ? 1 + (f.hangV ?? 0) : 1;
	const nao = (f.nao ?? 0) > 0 ? 1 - (f.naoV ?? 0) : 1;
	const dmg = st.dmg * mult * (f.manh ?? 1) * phuc * hang * nao;
	damageFighter(battle, {
		kind: f.kind,
		dmg
	}, foe);
	if (isHero(f.kind)) for (const o of battle.fighters) {
		if (o === foe || o.side === f.side || !isAlive(o) || !reaches(f.kind, o)) continue;
		if (dist(o.x - foe.x, o.z - foe.z) <= HERO_CLEAVE.radius * geoOf(battle)) damageFighter(battle, { dmg: dmg * HERO_CLEAVE.share }, o);
	}
	f.cd = f.kind === "no" && f.side === "ta" ? st.cooldown / fireRate(battle) : own ? st.cooldown / (1 + own.toc) : st.cooldown;
	f.swing = .3;
}
function damageBuilding(state, battle, attacker, b, dmg) {
	const hp = buildingHp(battle, b) - dmg;
	battle.hp[b.id] = hp;
	if (hp > 0 || b.damaged) return;
	b.damaged = true;
	if (b.uNo) b.uNo = "hu";
	battle.wrecked.push(b.id);
	const def = BUILDINGS[b.type];
	emit(battle, {
		kind: "wreck",
		x: b.x + def.w / 2,
		z: b.z + def.d / 2
	});
	const share = LOOT_FRACTION[b.type];
	if (share && attacker.side === "giac" && !attacker.ship && battle.mode !== "pvp") {
		for (const r of RESOURCE_IDS) {
			const take = Math.floor(state.resources[r] * share);
			state.resources[r] -= take;
			battle.stolen[r] += take;
		}
		attacker.loot = true;
		attacker.state = "flee";
		emit(battle, {
			kind: "loot",
			x: attacker.x,
			z: attacker.z
		});
	}
}
/** Chỗ giặc bỏ chạy về: bìa rừng phía đã kéo tới, hay lặn xuống sông (bơi ra mép luồng sông rồi lặn). */
function exitPoint(battle, f) {
	if (battle.side === "namXa") return {
		x: f.x,
		z: 76.5
	};
	if (battle.side === "dongXa") return {
		x: 76.5,
		z: f.z
	};
	if (battle.side === "nam") return {
		x: f.x,
		z: 55.5
	};
	if (battle.side === "dong") return {
		x: 55.5,
		z: f.z
	};
	const out = (battle.exitAt ?? -.5) - 1;
	return battle.side === "bac" ? {
		x: f.x,
		z: out
	} : {
		x: out,
		z: f.z
	};
}
/** Giặc bỏ chạy đã thoát chưa: lặn xuống sông, hay lùi qua vạch xuất phát ở bìa rừng. */
function escaped(battle, f) {
	if (battle.side === "namXa") return f.z > 75.7;
	if (battle.side === "dongXa") return f.x > 75.7;
	if (f.x < 0 || f.z < 0 || f.x > 55 || f.z > 55) return true;
	const line = battle.exitAt ?? -.5;
	if (battle.side === "bac") return f.z < line;
	if (battle.side === "tay") return f.x < line;
	return false;
}
/** Đang bị đá giữ chân thì đứng yên, không đánh. */
function stunned(f, dt) {
	if (!f.stun || f.stun <= 0) return false;
	f.stun = Math.max(0, f.stun - dt);
	return true;
}
function stepEnemy(state, battle, f, dt, idx) {
	const st = statsOf(f.kind);
	const reach = st.range * geoOf(battle);
	const ours = f.side === "ta";
	const speed = ours && battle.rally > 0 ? RALLY.speed : 1;
	const hit = ours ? st.dmg * ownMult(battle, f.kind, f.nu) * (battle.rally > 0 ? RALLY.dmg : 1) * (battle.siege ?? 1) : st.dmg;
	if (f.state === "flee") {
		const out = exitPoint(battle, f);
		moveToward(f, out.x, out.z, dt, 1, geoOf(battle));
		if (escaped(battle, f)) f.state = "gone";
		return;
	}
	if (stunned(f, dt)) return;
	const foe = nearestEnemyOf(battle, f, reach + .5);
	if (foe) {
		f.state = "fight";
		f.face = Math.atan2(foe.x - f.x, foe.z - f.z);
		if (f.cd <= 0) strike(battle, f, foe);
		return;
	}
	const at = f.targetBuilding !== null ? idx.at.get(f.targetBuilding) : void 0;
	let target = at !== void 0 ? state.buildings[at] : void 0;
	if (!target || !targetableIn(battle, target)) {
		target = chooseTarget(state, battle, f) ?? void 0;
		f.targetBuilding = target ? target.id : null;
		f.path = null;
	}
	if (!target) {
		f.state = ours ? "move" : "flee";
		return;
	}
	if (rectDist(f.x, f.z, target) <= reach + .1) {
		f.state = "fight";
		if (f.cd <= 0) {
			const def = BUILDINGS[target.type];
			if (st.range > 2) emit(battle, {
				kind: "shot",
				x: f.x,
				z: f.z,
				tx: target.x + def.w / 2,
				tz: target.z + def.d / 2
			});
			f.face = Math.atan2(target.x + def.w / 2 - f.x, target.z + def.d / 2 - f.z);
			damageBuilding(state, battle, f, target, hit);
			f.cd = st.cooldown;
			f.swing = .3;
		}
		return;
	}
	f.repathIn -= dt;
	if (!f.path || f.repathIn <= 0) {
		f.path = findPath(state, f.x, f.z, target, battle.swim && SWIMMERS.includes(f.kind), battle);
		f.pathAt = 1;
		f.repathIn = 2;
	}
	if (!f.path || f.pathAt >= f.path.length) {
		f.state = "move";
		moveToward(f, target.x + BUILDINGS[target.type].w / 2, target.z + BUILDINGS[target.type].d / 2, dt, speed, geoOf(battle));
		return;
	}
	const next = f.path[f.pathAt];
	const nx = next % 76;
	const nz = Math.floor(next / 76);
	const blocker = blockerAt(state, idx, next, target);
	if (blocker) {
		if (rectDist(f.x, f.z, blocker) <= reach + .15) {
			f.state = "fight";
			f.face = Math.atan2(nx + .5 - f.x, nz + .5 - f.z);
			if (f.cd <= 0) {
				damageBuilding(state, battle, f, blocker, hit);
				f.cd = st.cooldown;
				f.swing = .3;
			}
			return;
		}
	}
	f.state = "move";
	if (moveToward(f, nx + .5, nz + .5, dt, speed, geoOf(battle)) && !blocker) f.pathAt++;
}
/** Xông tới kẻ địch gần nhất rồi đánh: quân hai bên ngoài bãi (trận giữ kinh đô thì lính ta đi theo `stepGuard`). */
function stepChase(battle, f, dt) {
	if (stunned(f, dt)) return;
	const st = statsOf(f.kind);
	const foe = nearestEnemyOf(battle, f);
	if (!foe) {
		f.state = "move";
		return;
	}
	const d = dist(foe.x - f.x, foe.z - f.z);
	const reach = st.range * geoOf(battle) + .3;
	if (d <= reach) {
		f.state = "fight";
		f.face = Math.atan2(foe.x - f.x, foe.z - f.z);
		if (f.cd <= 0) strike(battle, f, foe);
		return;
	}
	f.state = "move";
	const mult = f.side === "ta" && battle.rally > 0 ? RALLY.speed : 1;
	const nav = navOf(battle);
	if (nav) walkField(nav, f, f.side === "ta" ? "giac" : "ta", foe.x, foe.z, reach, dt, mult);
	else moveToward(f, foe.x, foe.z, dt, mult, geoOf(battle));
}
/**
* Sông là hào: lính ta không lội qua, chỉ qua bằng cầu còn nguyên. Ô sông sát bờ (cạnh ô đất) thì lội ra được để đánh
* thủy quái, thuyền giặc ven bờ, nhưng đi chậm hơn đất nên tìm đường thì tránh.
*/
const WADE_COST = 4;
/** Ô sông sát bờ đất (8 hướng): không đổi theo trận nên tính một lần. */
let wadeMask = null;
function wading() {
	if (wadeMask) return wadeMask;
	const m = /* @__PURE__ */ new Uint8Array(5776);
	for (let z = 0; z < 76; z++) for (let x = 0; x < 76; x++) {
		if (!isRiver(x, z)) continue;
		for (let dz = -1; dz <= 1 && !m[tileIndex(x, z)]; dz++) for (let dx = -1; dx <= 1; dx++) if (inGrid(x + dx, z + dz) && !isRiver(x + dx, z + dz)) m[tileIndex(x, z)] = 1;
	}
	return wadeMask = m;
}
const landMaps = /* @__PURE__ */ new WeakMap();
function landMap(state, battle) {
	const bridges = state.buildings.filter((b) => isBridge(b.type));
	const key = bridges.map((b) => `${b.type}${b.x},${b.z}${b.damaged ? "x" : ""}`).join(";");
	const old = landMaps.get(battle);
	if (old && old.key === key) return old;
	const wade = wading();
	const cost = /* @__PURE__ */ new Float32Array(5776);
	for (let i = 0; i < 5776; i++) cost[i] = !isRiver(i % 76, Math.floor(i / 76)) ? 1 : wade[i] ? WADE_COST : Infinity;
	for (const b of bridges) {
		if (b.damaged) continue;
		const def = BUILDINGS[b.type];
		for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) if (inGrid(b.x + dx, b.z + dz)) cost[tileIndex(b.x + dx, b.z + dz)] = 1;
	}
	const comp = (/* @__PURE__ */ new Int16Array(5776)).fill(-1);
	let comps = 0;
	const stack = [];
	for (let i = 0; i < 5776; i++) {
		if (comp[i] !== -1 || cost[i] === Infinity) continue;
		comp[i] = comps;
		stack.push(i);
		while (stack.length) {
			const c = stack.pop();
			const cx = c % 76;
			const cz = Math.floor(c / 76);
			for (const [nx, nz] of [
				[cx + 1, cz],
				[cx - 1, cz],
				[cx, cz + 1],
				[cx, cz - 1]
			]) {
				if (!inGrid(nx, nz)) continue;
				const n = tileIndex(nx, nz);
				if (comp[n] !== -1 || cost[n] === Infinity) continue;
				comp[n] = comps;
				stack.push(n);
			}
		}
		comps++;
	}
	const map = {
		key,
		cost,
		comp,
		comps
	};
	landMaps.set(battle, map);
	return map;
}
const passable = (map, x, z) => map.cost[tileAt(x, z)] !== Infinity;
/** Vùng lính ta đang đứng; lỡ đứng giữa nước sâu thì lấy vùng gần nhất để còn lên bờ. */
function compOf(map, x, z) {
	const here = map.comp[tileAt(x, z)];
	if (here !== -1) return here;
	const cx = Math.floor(x);
	const cz = Math.floor(z);
	for (let r = 1; r < 76; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
		if (Math.max(Math.abs(dx), Math.abs(dz)) !== r || !inGrid(cx + dx, cz + dz)) continue;
		const c = map.comp[tileIndex(cx + dx, cz + dz)];
		if (c !== -1) return c;
	}
	return -1;
}
/** Dò quanh giặc dưới nước chừng này ô: hơn tầm bắn xa nhất của lính ta, tướng ta khi giữ kinh đô. */
const WATER_SCAN = 8;
function guardCtx(state, battle) {
	let walls;
	let posts;
	return {
		map: landMap(state, battle),
		shore: /* @__PURE__ */ new Map(),
		walls: () => walls === void 0 ? walls = wallMap(state, battle) : walls,
		cover: /* @__PURE__ */ new Map(),
		posts: () => {
			if (posts) return posts;
			posts = /* @__PURE__ */ new Map();
			for (const f of battle.fighters) {
				if (!f.wall || f.side !== (battle.mode === "pvp" ? "giac" : "ta") || !isAlive(f)) continue;
				posts.set(f.path?.length ? f.path[f.path.length - 1] : tileAt(f.x, f.z), f.id);
			}
			return posts;
		}
	};
}
/** Khoảng cách gần nhất từ giặc ở nước sâu (x, z) tới ô đi được của từng vùng, chỉ dò trong `WATER_SCAN` ô. */
function shoreDist(ctx, o) {
	const cached = ctx.shore.get(o.id);
	if (cached) return cached;
	const { map } = ctx;
	const out = new Float32Array(map.comps).fill(Infinity);
	const x0 = Math.max(0, Math.floor(o.x - WATER_SCAN));
	const x1 = Math.min(75, Math.floor(o.x + WATER_SCAN));
	const z0 = Math.max(0, Math.floor(o.z - WATER_SCAN));
	const z1 = Math.min(75, Math.floor(o.z + WATER_SCAN));
	for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
		const c = map.comp[tileIndex(x, z)];
		if (c === -1) continue;
		const d = dist(Math.max(x - o.x, 0, o.x - x - 1), Math.max(z - o.z, 0, o.z - z - 1));
		if (d < out[c]) out[c] = d;
	}
	ctx.shore.set(o.id, out);
	return out;
}
/**
* Giặc gần nhất mà lính ta đánh tới được: đang trong tầm (bắn qua sông cũng được), đứng trên đất cùng vùng (qua cầu
* cũng là cùng vùng), hay ở dưới nước mà từ bờ vùng mình vươn tới.
*/
function reachableFoeOf(battle, f, ctx, reach) {
	const mine = compOf(ctx.map, f.x, f.z);
	let best = null;
	let bestD = Infinity;
	for (const o of battle.fighters) {
		if (o.side === f.side || o.state !== "move" && o.state !== "fight" && o.state !== "flee" || !reaches(f.kind, o)) continue;
		const d = dist(o.x - f.x, o.z - f.z);
		if (d >= bestD) continue;
		if (d > reach && mine !== -1) {
			const theirs = ctx.map.comp[tileAt(o.x, o.z)];
			if (theirs === -1 ? shoreDist(ctx, o)[mine] > reach : theirs !== mine) continue;
		}
		bestD = d;
		best = o;
	}
	return best;
}
/** Đi thẳng từ (x0, z0) tới khi cách (x1, z1) trong `reach` mà không bước vào nước sâu. */
function clearLine(map, x0, z0, x1, z1, reach) {
	const d = dist(x1 - x0, z1 - z0);
	const n = Math.ceil(Math.max(0, d - reach) / .5);
	for (let k = 1; k <= n; k++) {
		const t = Math.min(1, k * .5 / d);
		if (!passable(map, x0 + (x1 - x0) * t, z0 + (z1 - z0) * t)) return false;
	}
	return true;
}
/** Bước thẳng tới (tx, tz) nhưng không bước xuống nước sâu: vướng thì trượt dọc bờ, không được thì đứng lại. */
function walkOnLand(map, f, tx, tz, dt, mult, geo) {
	const ox = f.x;
	const oz = f.z;
	const done = moveToward(f, tx, tz, dt, mult, geo);
	if (passable(map, f.x, f.z) || !passable(map, ox, oz)) return done;
	if (passable(map, f.x, oz)) f.z = oz;
	else if (passable(map, ox, f.z)) f.x = ox;
	else {
		f.x = ox;
		f.z = oz;
	}
	return false;
}
/** Đường trên đất (qua cầu) tới chỗ đứng đánh được `foe`. */
function guardPath(map, f, foe, reach, mine) {
	const near = (i) => dist(i % 76 + .5 - foe.x, Math.floor(i / 76) + .5 - foe.z);
	const foeTile = tileAt(foe.x, foe.z);
	const isGoal = (i) => map.comp[i] === mine && (i === foeTile || near(i) <= reach + .75);
	return searchPath(map.cost, tileAt(f.x, f.z), isGoal, (i) => Math.max(0, near(i) - reach - .75));
}
/**
* Lính ta trong trận giữ kinh đô: như `stepChase` nhưng sông là hào. Giặc bên kia sông thì đi vòng qua cầu, không có
* cầu thì chỉ bắn với tới được; giặc dưới nước thì lội ra ô sát bờ mà đánh.
*/
function stepGuard(battle, f, dt, ctx) {
	if (stunned(f, dt)) return;
	if (TREN_THANH.units.includes(f.kind) && stepClimber(battle, f, dt, ctx)) return;
	const st = statsOf(f.kind);
	const geo = geoOf(battle);
	const reach = st.range * geo + .3;
	const foe = reachableFoeOf(battle, f, ctx, reach);
	if (!foe) {
		f.state = "move";
		f.path = null;
		return;
	}
	if (dist(foe.x - f.x, foe.z - f.z) <= reach) {
		f.state = "fight";
		f.face = Math.atan2(foe.x - f.x, foe.z - f.z);
		if (f.cd <= 0) strike(battle, f, foe);
		return;
	}
	f.state = "move";
	const mult = f.side === "ta" && battle.rally > 0 ? RALLY.speed : 1;
	const { map } = ctx;
	if (clearLine(map, f.x, f.z, foe.x, foe.z, reach)) {
		f.path = null;
		walkOnLand(map, f, foe.x, foe.z, dt, mult, geo);
		return;
	}
	f.repathIn -= dt;
	if (f.targetUnit !== foe.id || !f.path || f.repathIn <= 0) {
		f.targetUnit = foe.id;
		f.path = guardPath(map, f, foe, reach, compOf(map, f.x, f.z));
		f.pathAt = 1;
		f.repathIn = 1;
	}
	if (!f.path || f.pathAt >= f.path.length) {
		walkOnLand(map, f, foe.x, foe.z, dt, mult, geo);
		return;
	}
	const next = f.path[f.pathAt];
	if (walkOnLand(map, f, next % 76 + .5, Math.floor(next / 76) + .5, dt, mult, geo)) f.pathAt++;
}
const wallMaps = /* @__PURE__ */ new WeakMap();
const SIDES = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1]
];
/** Mặt thành của trận, dựng lại khi có đoạn thành, cổng hay bậc bị phá. Không có bậc lên thành nào thì `null`. */
function wallMap(state, battle) {
	const walls = [];
	const stairs = [];
	let key = "";
	for (const b of state.buildings) if (b.type === "bacThanh") {
		stairs.push(b);
		key += `s${b.id}${b.damaged ? "x" : ""}`;
	} else if (isWalkWall(b) || b.type === "congThanh") {
		walls.push(b);
		if (b.damaged) key += `d${b.id}`;
	}
	if (!stairs.length) return null;
	key += `|${walls.length}|${walls.reduce((n, b) => n + b.level, 0)}`;
	const old = wallMaps.get(battle);
	if (old && old.key === key) return old;
	const node = /* @__PURE__ */ new Uint8Array(5776);
	for (const b of walls) if (!b.damaged) node[tileIndex(b.x, b.z)] = 1;
	const isStair = /* @__PURE__ */ new Uint8Array(5776);
	for (const b of stairs) {
		if (b.damaged) continue;
		if (SIDES.some(([dx, dz]) => inGrid(b.x + dx, b.z + dz) && node[tileIndex(b.x + dx, b.z + dz)] === 1)) isStair[tileIndex(b.x, b.z)] = 1;
	}
	for (let i = 0; i < 5776; i++) if (isStair[i]) node[i] = 2;
	const comp = (/* @__PURE__ */ new Int16Array(5776)).fill(-1);
	const tiles = [];
	const steps = [];
	for (let i = 0; i < 5776; i++) {
		if (!node[i] || comp[i] !== -1) continue;
		const c = tiles.length;
		tiles.push([]);
		steps.push([]);
		comp[i] = c;
		const stack = [i];
		while (stack.length) {
			const t = stack.pop();
			(node[t] === 2 ? steps : tiles)[c].push(t);
			const tx = t % 76;
			const tz = Math.floor(t / 76);
			for (const [dx, dz] of SIDES) {
				if (!inGrid(tx + dx, tz + dz)) continue;
				const n = tileIndex(tx + dx, tz + dz);
				if (!node[n] || comp[n] !== -1 || node[t] === 2 && node[n] === 2) continue;
				comp[n] = c;
				stack.push(n);
			}
		}
	}
	const map = {
		key,
		comp,
		tiles,
		stairs: steps,
		isStair
	};
	wallMaps.set(battle, map);
	return map;
}
const tileDist = (i, x, z) => dist(i % 76 + .5 - x, Math.floor(i / 76) + .5 - z);
/** Khoảng cách từ giặc `o` tới ô mặt thành gần nhất của dải `c` (dò một lần mỗi bước trận). */
function coverOf(ctx, W, o, c) {
	const k = o.id * 4096 + c;
	const cached = ctx.cover.get(k);
	if (cached !== void 0) return cached;
	let best = Infinity;
	for (const i of W.tiles[c]) best = Math.min(best, tileDist(i, o.x, o.z));
	ctx.cover.set(k, best);
	return best;
}
const foeAlive = (f, o) => o.side !== f.side && (o.state === "move" || o.state === "fight" || o.state === "flee") && reaches(f.kind, o);
/** Đường dọc mặt thành (và bậc) trong một dải, từ ô `from` tới ô gần nhất thỏa `goal`; không có thì `null`. */
function wallPath(W, from, goal) {
	const prev = (/* @__PURE__ */ new Int32Array(5776)).fill(-2);
	prev[from] = -1;
	const queue = [from];
	for (let q = 0; q < queue.length; q++) {
		const t = queue[q];
		if (goal(t)) {
			const path = [t];
			for (let p = prev[t]; p !== -1; p = prev[p]) path.unshift(p);
			return path;
		}
		const tx = t % 76;
		const tz = Math.floor(t / 76);
		for (const [dx, dz] of SIDES) {
			if (!inGrid(tx + dx, tz + dz)) continue;
			const n = tileIndex(tx + dx, tz + dz);
			if (prev[n] !== -2 || W.comp[n] !== W.comp[from] || W.isStair[t] && W.isStair[n]) continue;
			prev[n] = t;
			queue.push(n);
		}
	}
	return null;
}
/** Đi theo `f.path` (chỉ số ô) từng ô một; trả về true khi đã tới ô cuối. */
function followPath(f, dt, mult, geo) {
	if (!f.path || f.pathAt >= f.path.length) return true;
	const next = f.path[f.pathAt];
	if (moveToward(f, next % 76 + .5, Math.floor(next / 76) + .5, dt, mult, geo)) f.pathAt++;
	return f.pathAt >= f.path.length;
}
/** Bỏ việc lên thành, đánh dưới đất như mọi lính. */
function leaveClimb(f) {
	if (f.climb !== void 0 || f.wall) f.path = null;
	f.climb = void 0;
	f.wall = void 0;
	return false;
}
/** Khoảng cách từ giặc `o` tới bậc gần nhất của dải `c`. */
const stairDist = (W, o, c) => W.stairs[c].reduce((m, i) => Math.min(m, tileDist(i, o.x, o.z)), Infinity);
/**
* Giặc `o` ở phía ngoài dải thành `c`: gần mặt thành hơn gần bậc. Bậc dựng ở mặt trong thành (phía Điện) nên giặc còn
* ngoài thành thì gần thành hơn, giặc đã vào trong thì gần bậc hơn.
*/
const outside = (ctx, W, o, c) => coverOf(ctx, W, o, c) < stairDist(W, o, c);
/**
* Cung thủ, lính nỏ khi giữ kinh đô có bậc lên thành. Giặc gần nhất còn ở ngoài thành, hay bắn tới được từ mặt thành,
* thì theo bậc lên thành (dọc đường có giặc trong tầm thì vừa đi vừa bắn), đi dọc mặt thành tới ô gần nhất bắn tới
* giặc (giặc chưa tới tầm thì tới ô gần giặc nhất mà chờ) rồi bắn xuống, xa thêm `TREN_THANH.range` ô; giặc đánh gần
* không với tới. Giặc đã vào trong thành, ngoài tầm bắn từ mặt thành thì theo bậc xuống. Đoạn thành dưới chân bị phá
* thì xuống đất ngay. Trả về false khi lính đánh dưới đất như mọi lính (`stepGuard`).
*/
function stepClimber(battle, f, dt, ctx) {
	const W = ctx.walls();
	const here = tileAt(f.x, f.z);
	if (!W || f.wall && W.comp[here] === -1) return leaveClimb(f);
	const st = statsOf(f.kind);
	const geo = geoOf(battle);
	const top = (st.range + TREN_THANH.range) * geo + .3;
	const mult = f.side === "ta" && battle.rally > 0 ? RALLY.speed : 1;
	if (f.wall) {
		const mine = W.comp[here];
		let shot = null;
		let shotD = top;
		let near = null;
		let nearD = Infinity;
		let any = null;
		let anyD = Infinity;
		for (const o of battle.fighters) {
			if (!foeAlive(f, o)) continue;
			const d = dist(o.x - f.x, o.z - f.z);
			if (d <= shotD) {
				shotD = d;
				shot = o;
			}
			if (d < anyD) {
				anyD = d;
				any = o;
			}
			if (d < nearD && coverOf(ctx, W, o, mine) <= top - .1) {
				nearD = d;
				near = o;
			}
		}
		const posts = ctx.posts();
		const free = (i) => (posts.get(i) ?? f.id) === f.id;
		if (shot) {
			const foe = shot;
			const inRange = (i) => !W.isStair[i] && tileDist(i, foe.x, foe.z) <= top - .1;
			const onTop = !W.isStair[here];
			let go = !onTop || !free(here);
			if (go) {
				const end = f.path && f.pathAt < f.path.length ? f.path[f.path.length - 1] : -1;
				if (end < 0 || !inRange(end)) {
					f.path = wallPath(W, here, (i) => i !== here && inRange(i) && free(i)) ?? (onTop ? null : wallPath(W, here, inRange));
					f.pathAt = 1;
					if (f.path?.length) posts.set(f.path[f.path.length - 1], f.id);
				}
				go = !!f.path && f.pathAt < f.path.length;
			}
			if (!go) {
				f.path = null;
				f.state = "fight";
				f.face = Math.atan2(foe.x - f.x, foe.z - f.z);
				if (f.cd <= 0) strike(battle, f, foe);
				return true;
			}
			f.state = "move";
			followPath(f, dt, mult, geo);
			return true;
		}
		f.state = "move";
		f.repathIn -= dt;
		const foe = near ?? (any && outside(ctx, W, any, mine) ? any : null);
		if (foe) {
			if (f.targetUnit !== foe.id || !f.path || f.repathIn <= 0) {
				const inRange = (i) => !W.isStair[i] && tileDist(i, foe.x, foe.z) <= top - .1;
				let post = -1;
				if (!near) {
					for (const i of W.tiles[mine]) if (free(i) && (post < 0 || tileDist(i, foe.x, foe.z) < tileDist(post, foe.x, foe.z))) post = i;
				}
				const goal = near ? inRange : (i) => i === post;
				f.targetUnit = foe.id;
				f.path = wallPath(W, here, (i) => goal(i) && free(i)) ?? wallPath(W, here, goal);
				f.pathAt = 1;
				f.repathIn = 1;
				if (f.path?.length) posts.set(f.path[f.path.length - 1], f.id);
			}
			followPath(f, dt, mult, geo);
			return true;
		}
		if (W.isStair[here]) return leaveClimb(f);
		if (f.targetUnit !== -1 || !f.path) {
			f.targetUnit = -1;
			f.path = wallPath(W, here, (i) => W.isStair[i] === 1);
			f.pathAt = 1;
		}
		followPath(f, dt, mult, geo);
		return true;
	}
	const land = compOf(ctx.map, f.x, f.z);
	let foe = null;
	let foeD = Infinity;
	for (const o of battle.fighters) {
		if (!foeAlive(f, o)) continue;
		const d = dist(o.x - f.x, o.z - f.z);
		if (d < foeD) {
			foeD = d;
			foe = o;
		}
	}
	if (!foe) return leaveClimb(f);
	let via = -1;
	for (let c = 0; c < W.tiles.length; c++) {
		if (!W.stairs[c].some((i) => ctx.map.comp[i] === land)) continue;
		if (coverOf(ctx, W, foe, c) > top - .1 && !outside(ctx, W, foe, c)) continue;
		if (via < 0 || coverOf(ctx, W, foe, c) < coverOf(ctx, W, foe, via)) via = c;
	}
	if (via < 0) return leaveClimb(f);
	let stair = f.climb ?? -1;
	if (W.comp[stair] !== via || !W.isStair[stair]) {
		stair = W.stairs[via].filter((i) => ctx.map.comp[i] === land).reduce((a, b) => tileDist(a, f.x, f.z) <= tileDist(b, f.x, f.z) ? a : b);
		f.climb = stair;
		f.path = null;
	}
	f.state = "move";
	if (f.cd <= 0 && foeD <= st.range * geo + .3) {
		f.face = Math.atan2(foe.x - f.x, foe.z - f.z);
		strike(battle, f, foe);
	}
	const sx = stair % 76 + .5;
	const sz = Math.floor(stair / 76) + .5;
	let there;
	if (clearLine(ctx.map, f.x, f.z, sx, sz, 0)) there = walkOnLand(ctx.map, f, sx, sz, dt, mult, geo);
	else {
		if (!f.path) {
			f.path = searchPath(ctx.map.cost, here, (i) => i === stair, (i) => tileDist(i, sx, sz));
			f.pathAt = 1;
		}
		there = f.path ? followPath(f, dt, mult, geo) && dist(f.x - sx, f.z - sz) < .05 : walkOnLand(ctx.map, f, sx, sz, dt, mult, geo);
	}
	if (there) {
		f.wall = true;
		f.climb = void 0;
		f.path = null;
		f.targetUnit = null;
	}
	return true;
}
function stepDefenses(state, battle, dt) {
	const foeSide = battle.mode === "pvp" ? "ta" : "giac";
	const rate = battle.mode === "pvp" ? 1 : fireRate(battle);
	for (const b of state.buildings) {
		if (b.damaged) continue;
		if (b.type === "choiCanh") {
			const cd = (battle.towerCd[b.id] ?? 0) - dt;
			battle.towerCd[b.id] = cd;
			if (cd > 0) continue;
			const tower = {
				x: b.x + .5,
				z: b.z + .5
			};
			let best = null;
			let bestD = (TOWER.range + (battle.crossbows ? CO_LOA_TOWER.range : 0)) * geoOf(battle);
			for (const o of battle.fighters) {
				if (o.side !== foeSide || o.state !== "move" && o.state !== "fight" && o.state !== "flee") continue;
				const d = dist(o.x - tower.x, o.z - tower.z);
				if (d < bestD) {
					bestD = d;
					best = o;
				}
			}
			if (best) {
				emit(battle, {
					kind: "shot",
					x: tower.x,
					z: tower.z,
					tx: best.x,
					tz: best.z
				});
				damageFighter(battle, { dmg: TOWER.dmg[b.level - 1] * (battle.crossbows ? CO_LOA_TOWER.dmg : 1) }, best);
				battle.towerCd[b.id] = TOWER.cooldown;
			}
		}
		if (b.type === "lauNo") {
			const cd = (battle.towerCd[b.id] ?? 0) - dt;
			battle.towerCd[b.id] = cd;
			if (cd > 0) continue;
			const tower = {
				x: b.x + .5,
				z: b.z + .5
			};
			const range = (LAU_NO.range + (battle.crossbows ? CO_LOA_TOWER.range : 0)) * geoOf(battle);
			const targets = battle.fighters.filter((o) => o.side === foeSide && (o.state === "move" || o.state === "fight" || o.state === "flee")).map((o) => ({
				o,
				d: dist(o.x - tower.x, o.z - tower.z)
			})).filter((t) => t.d < range).sort((p, q) => p.d - q.d).slice(0, LAU_NO.targets);
			if (targets.length) {
				for (const { o } of targets) {
					emit(battle, {
						kind: "shot",
						x: tower.x,
						z: tower.z,
						tx: o.x,
						tz: o.z
					});
					damageFighter(battle, { dmg: LAU_NO.dmg[b.level - 1] * (battle.crossbows ? CO_LOA_TOWER.dmg : 1) }, o);
				}
				battle.towerCd[b.id] = LAU_NO.cooldown / rate;
			}
		}
		if (b.type === "congThanh") {
			const cd = (battle.towerCd[b.id] ?? 0) - dt;
			battle.towerCd[b.id] = cd;
			if (cd > 0) continue;
			const gate = {
				x: b.x + .5,
				z: b.z + .5
			};
			const range = (CONG_THANH.range + (battle.crossbows ? CO_LOA_TOWER.range : 0)) * geoOf(battle);
			const targets = battle.fighters.filter((o) => o.side === foeSide && (o.state === "move" || o.state === "fight" || o.state === "flee")).map((o) => ({
				o,
				d: dist(o.x - gate.x, o.z - gate.z)
			})).filter((t) => t.d < range).sort((p, q) => p.d - q.d).slice(0, CONG_THANH.targets[b.level - 1] ?? 1);
			if (targets.length) {
				for (const { o } of targets) {
					emit(battle, {
						kind: "shot",
						x: gate.x,
						z: gate.z,
						tx: o.x,
						tz: o.z,
						by: "no"
					});
					damageFighter(battle, { dmg: CONG_THANH.dmg[b.level - 1] * (battle.crossbows ? CO_LOA_TOWER.dmg : 1) }, o);
				}
				battle.towerCd[b.id] = CONG_THANH.cooldown;
			}
		}
		if (b.type === "thanh" && b.uNo === "ok") {
			const cd = (battle.towerCd[b.id] ?? 0) - dt;
			battle.towerCd[b.id] = cd;
			if (cd > 0) continue;
			const at = {
				x: b.x + .5,
				z: b.z + .5
			};
			let best = null;
			let bestD = U_NO.range + (battle.crossbows ? CO_LOA_TOWER.range : 0);
			for (const o of battle.fighters) {
				if (o.side !== foeSide || o.state !== "move" && o.state !== "fight" && o.state !== "flee") continue;
				const d = dist(o.x - at.x, o.z - at.z);
				if (d < bestD) {
					bestD = d;
					best = o;
				}
			}
			if (best) {
				emit(battle, {
					kind: "shot",
					x: at.x,
					z: at.z,
					tx: best.x,
					tz: best.z,
					by: "no"
				});
				damageFighter(battle, { dmg: U_NO.dmg * (battle.crossbows ? CO_LOA_TOWER.dmg : 1) }, best);
				battle.towerCd[b.id] = U_NO.cooldown / rate;
			}
		}
		if (b.type === "bayChong" && !battle.trapsUsed.includes(b.id)) {
			const victims = battle.fighters.filter((o) => o.side === foeSide && (o.state === "move" || o.state === "fight") && dist(o.x - b.x - .5, o.z - b.z - .5) < .7);
			if (victims.length) {
				battle.trapsUsed.push(b.id);
				emit(battle, {
					kind: "trap",
					x: b.x + .5,
					z: b.z + .5
				});
				for (const v of victims) damageFighter(battle, { dmg: 45 }, v);
			}
		}
	}
}
/** Giặc còn trên bản đồ (chưa chết, chưa chạy thoát). */
function enemiesLeft(battle) {
	return battle.fighters.filter((f) => f.side === "giac" && f.state !== "dead" && f.state !== "gone").length;
}
function alliesLeft(battle) {
	return battle.fighters.filter((f) => f.side === "ta" && f.state !== "dead" && f.state !== "gone").length;
}
/** Đồng hồ chung của mọi trận: thời gian, Trống trận, hồi kỹ năng. */
function advanceClock(battle, dt) {
	battle.t += dt;
	battle.rally = Math.max(0, battle.rally - dt);
	battle.shield = Math.max(0, battle.shield - dt);
	if (battle.lenh) battle.lenh = Math.max(0, battle.lenh - dt);
	for (const k of Object.keys(battle.skillCd)) battle.skillCd[k] = Math.max(0, (battle.skillCd[k] ?? 0) - dt);
}
/**
* Mùa lũ: nước dâng dần mỗi bậc FLOOD_RISE_S giây tới mực lũ, loang từ sông vào ô thấp.
* Công trình bị ngập quá sức chịu của nền thì hư. Đê bị thủy quái phá thì nước tràn qua chỗ vỡ.
* Cống đê đang mở cho nước vào sau đê: ruộng chỉ dính nước ấy thì được bồi phù sa thay vì hư.
*/
function stepFlood(state, battle) {
	if (battle.floodTo <= 0) return;
	battle.water = Math.min(battle.floodTo, battle.t / 6);
	const hits = floodHits(state, battle.water);
	for (const b of hits.boi) {
		battle.boi ??= [];
		if (!battle.boi.includes(b.id)) battle.boi.push(b.id);
	}
	for (const b of hits.drown) {
		b.damaged = true;
		battle.drowned.push(b.id);
		const def = BUILDINGS[b.type];
		emit(battle, {
			kind: "drown",
			x: b.x + def.w / 2,
			z: b.z + def.d / 2
		});
	}
}
/** Chạy trận giữ kinh đô thêm `dt` giây. Trả về true khi trận đã xong. */
function stepBattle(state, battle, dt) {
	advanceClock(battle, dt);
	stepFlood(state, battle);
	stepBoats(battle, dt);
	if (battle.mode !== "pvp" && battle.t * 1e3 > 18e4) {
		for (const f of battle.fighters) if (f.side === "giac" && (f.state === "move" || f.state === "fight")) f.state = "flee";
		if (battle.t * 1e3 > 21e4) {
			for (const f of battle.fighters) if (f.state === "flee") f.state = "gone";
		}
	}
	let ctx = null;
	let idx = null;
	for (const f of battle.fighters) {
		if (f.state === "dead" || f.state === "gone" || f.state === "aboard") continue;
		f.cd -= dt;
		f.swing = Math.max(0, f.swing - dt);
		if (f.ship) stepShip(state, battle, f, dt);
		else if (f.side === (battle.mode === "pvp" ? "ta" : "giac")) stepEnemy(state, battle, f, dt, idx ??= buildingIndex(state, battle));
		else stepGuard(battle, f, dt, ctx ??= guardCtx(state, battle));
	}
	stepDefenses(state, battle, dt);
	return battle.mode === "pvp" ? pvpOver(state, battle) : enemiesLeft(battle) === 0;
}
/** Còn đứng trên bãi: chưa chết, chưa chạy thoát, không còn ngồi trên thuyền. */
function isAlive(f) {
	return f.state !== "dead" && f.state !== "gone" && f.state !== "aboard";
}
const BIG_SET = /* @__PURE__ */ new Set([
	"voi",
	"chienXa",
	"phoTuong",
	"daiTuong",
	"giong",
	"sonTinh",
	"anDuong",
	"caoLo",
	"caSau",
	"thuongLuong",
	"thuyTinh",
	"hoTinh",
	"gaTrang",
	"kyBinh",
	"trieuDa",
	"trungTrac",
	"trungNhi",
	"baTrieu",
	"toDinh"
]);
const bodyRadius = (k) => BIG_SET.has(k) ? .45 : .27;
/** Đẩy lính đứng chồng lên nhau ra, và giữ mọi người trong bãi. */
function separate(battle) {
	const live = battle.fighters.filter(isAlive);
	const nav = navOf(battle);
	const before = nav ? live.map((f) => [f.x, f.z]) : null;
	for (let i = 0; i < live.length; i++) {
		const a = live[i];
		for (let j = i + 1; j < live.length; j++) {
			const b = live[j];
			const min = bodyRadius(a.kind) + bodyRadius(b.kind);
			const dx = b.x - a.x;
			const dz = b.z - a.z;
			const d = dist(dx, dz);
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
	live.forEach((f, i) => {
		f.x = clampField(f.x, FIELD.w);
		f.z = clampField(f.z, FIELD.d);
		if (nav) truot(nav.bai, bodyRadius(f.kind), f, before[i][0], before[i][1]);
	});
}
/** Chạy trận ngoài bãi thêm `dt` giây. Trả về true khi đã phân thắng bại (xem `outcome`). */
function stepField(battle, dt) {
	if (battle.outcome) return true;
	advanceClock(battle, dt);
	arriveWaves(battle);
	navTick(battle);
	for (const f of battle.fighters) {
		if (!isAlive(f)) continue;
		f.cd -= dt;
		f.swing = Math.max(0, f.swing - dt);
		if (f.slow) f.slow = Math.max(0, f.slow - dt);
		if (f.kind === "thuyTinh") stepThuyTinh(battle, f, dt);
		if (f.kind === "toDinh" && stepToDinh(battle, f, dt)) continue;
		if (f.kind === "maVien") stepMaVien(battle, f, dt);
		stepChase(battle, f, dt);
	}
	separate(battle);
	stepNuTuong(battle, dt);
	const pending = battle.waves?.length ?? 0;
	if (alliesLeft(battle) === 0) battle.outcome = "lose";
	else if (battle.holdS !== void 0 && battle.t >= battle.holdS) battle.outcome = "win";
	else if (enemiesLeft(battle) === 0 && !pending) battle.outcome = "win";
	else if (battle.holdS === void 0 && battle.t > FIELD.maxS) battle.outcome = "lose";
	return battle.outcome !== null;
}
/** Phó tướng đứng lùi sau người ta ở cuối hàng chừng này ô, đi theo chậm rãi. */
const NU_BACK = 1.2;
const NU_SPEED = .8;
/** Chỗ phó tướng đứng: sau người ta ở cuối hàng hậu (quân ta ở phía z lớn), không ra khỏi bãi. */
function nuRestZ(battle) {
	let rear = -Infinity;
	for (const f of battle.fighters) if (f.side === "ta" && isAlive(f)) rear = Math.max(rear, f.z);
	return Math.min(FIELD.d - .4, (Number.isFinite(rear) ? rear : FIELD.d - 1) + NU_BACK);
}
/**
* Phó tướng đi chậm theo sau quân ta, giữ chỗ sau người cuối hàng và lệch theo chỗ quân ta đông. Giặc không nhắm
* nên không cần tránh.
*/
function stepNuTuong(battle, dt) {
	const nu = battle.nuTuong;
	if (!nu) return;
	let sx = 0;
	let n = 0;
	for (const f of battle.fighters) if (f.side === "ta" && isAlive(f)) sx += f.x, n++;
	const nav = navOf(battle);
	const at = {
		x: n ? Math.min(FIELD.w - 1, Math.max(1, sx / n)) : nu.x,
		z: nuRestZ(battle)
	};
	if (nav) dayRa(nav.bai, NU_R, at);
	const tx = at.x;
	const tz = at.z;
	const ox = nu.x;
	const oz = nu.z;
	const dx = tx - nu.x;
	const dz = tz - nu.z;
	const d = dist(dx, dz);
	const step = NU_SPEED * dt;
	if (d <= step) {
		nu.x = tx;
		nu.z = tz;
	} else if (d > .15) {
		nu.x += dx / d * step;
		nu.z += dz / d * step;
	}
	if (nav) truot(nav.bai, NU_R, nu, ox, oz);
}
/** Thân nữ tướng khi tránh vật cản (như lính thường). */
const NU_R = .27;
/**
* Tô Định còn ít máu thì bỏ chạy về cuối bãi phía giặc, nhanh hơn thường; chạy thoát thì tính như đã hạ. Trả về true
* khi hắn đang chạy (không đánh nữa).
*/
function stepToDinh(battle, f, dt) {
	if (f.state !== "flee" && f.hp > f.maxHp * TO_DINH_FLEE.at) return false;
	f.state = "flee";
	if (stunned(f, dt)) return true;
	const nav = navOf(battle);
	if (nav) walkField(nav, f, "rut", f.x, 0, 0, dt, TO_DINH_FLEE.speed);
	else moveToward(f, f.x, 0, dt, TO_DINH_FLEE.speed, geoOf(battle));
	if (f.z <= .4) {
		f.state = "gone";
		battle.killed++;
		emit(battle, {
			kind: "escape",
			x: f.x,
			z: f.z
		});
	}
	return true;
}
/**
* Mã Viện ra Lệnh nỏ: lần đầu sau `first` giây, rồi cứ `every` giây, một loạt tên nỏ bay tới chỗ quân ta đứng đông
* nhất, `delay` giây sau thì rơi xuống: mỗi người ta trong `radius` ô chịu `dmg` sát thương.
*/
function stepMaVien(battle, f, dt) {
	const v = f.volley ??= { next: MA_VIEN_VOLLEY.first };
	const g = geoOf(battle);
	if (v.land !== void 0) {
		v.land -= dt;
		if (v.land <= 0) {
			const tx = v.tx;
			const tz = v.tz;
			for (const o of battle.fighters) {
				if (o.side !== "ta" || !isAlive(o)) continue;
				if (dist(o.x - tx, o.z - tz) <= MA_VIEN_VOLLEY.radius * g) damageFighter(battle, {
					kind: f.kind,
					dmg: MA_VIEN_VOLLEY.dmg
				}, o);
			}
			emit(battle, {
				kind: "barrageHit",
				x: tx,
				z: tz
			});
			v.land = void 0;
		}
	}
	v.next -= dt;
	if (v.next > 0 || (f.stun ?? 0) > 0) return;
	const at = densest(battle, MA_VIEN_VOLLEY.radius * g, "ta");
	if (!at) return;
	v.next = MA_VIEN_VOLLEY.every;
	v.land = MA_VIEN_VOLLEY.delay;
	v.tx = at.x;
	v.tz = at.z;
	f.face = Math.atan2(at.x - f.x, at.z - f.z);
	f.swing = .3;
	emit(battle, {
		kind: "barrage",
		x: f.x,
		z: f.z,
		tx: at.x,
		tz: at.z
	});
}
/** Thủy Tinh làm phép: hô mưa gọi gió (sóng quét đẩy lùi quân ta) và gọi thủy quái lên đánh tiếp. */
function stepThuyTinh(battle, f, dt) {
	const spell = f.spell ??= {
		wave: TT_WAVE.first,
		summon: TT_SUMMON.first,
		summoned: 0
	};
	if (f.stun && f.stun > 0) return;
	spell.wave -= dt;
	spell.summon -= dt;
	const foe = nearestEnemyOf(battle, f);
	if (spell.wave <= 0 && foe) {
		const d = dist(foe.x - f.x, foe.z - f.z);
		if (d > TT_WAVE.reach) spell.wave = .5;
		else {
			const dx = d > 1e-6 ? (foe.x - f.x) / d : 0;
			const dz = d > 1e-6 ? (foe.z - f.z) / d : 1;
			for (const o of battle.fighters) {
				if (o.side !== "ta" || !isAlive(o)) continue;
				const along = (o.x - f.x) * dx + (o.z - f.z) * dz;
				const across = Math.abs((o.x - f.x) * dz - (o.z - f.z) * dx);
				if (along < -.3 || along > TT_WAVE.length || across > TT_WAVE.width / 2) continue;
				damageFighter(battle, {
					kind: "thuyTinh",
					dmg: TT_WAVE.dmg
				}, o);
				if (!isAlive(o)) continue;
				pushTo(battle, o, clampField(o.x + dx * TT_WAVE.push, FIELD.w), clampField(o.z + dz * TT_WAVE.push, FIELD.d));
				o.slow = TT_WAVE.slowS;
			}
			f.face = Math.atan2(dx, dz);
			f.swing = .4;
			spell.wave = TT_WAVE.cooldown;
			emit(battle, {
				kind: "wave",
				x: f.x,
				z: f.z,
				tx: f.x + dx * TT_WAVE.length,
				tz: f.z + dz * TT_WAVE.length
			});
		}
	}
	if (spell.summon <= 0 && spell.summoned < TT_SUMMON.times) {
		const hp = ENEMIES.tomBinh.hp * (battle.hpScale ?? 1) * FIELD.hpMul;
		for (let i = 0; i < TT_SUMMON.count; i++) {
			const a = i / TT_SUMMON.count * Math.PI * 2 + spell.summoned;
			const t = newFighter(battle, "giac", "tomBinh", clampField(f.x + dsin(a) * 1.1, FIELD.w), clampField(f.z + dcos(a) * 1.1, FIELD.d), hp);
			placeFree(battle, t);
			battle.fighters.push(t);
			battle.total += 1;
		}
		spell.summoned += 1;
		spell.summon = TT_SUMMON.cooldown;
		f.swing = .4;
		emit(battle, {
			kind: "summon",
			x: f.x,
			z: f.z
		});
	}
}
/** Rút quân khỏi trận ngoài bãi: lính còn sống được giữ lại, không có thưởng. */
function retreatField(battle) {
	if ((battle.mode === "field" || battle.mode === "pvp") && !battle.outcome) battle.outcome = "retreat";
}
/**
* Chỗ đứng đông nhất của phe `side` (mặc định là giặc): người có nhiều đồng đội quanh mình trong bán kính `r` nhất.
* Lâu thuyền dưới sông không tính.
*/
function densest(battle, r, side = "giac", near) {
	let best = null;
	let bestN = -1;
	for (const f of battle.fighters) {
		if (f.side !== side || !isAlive(f) || f.kind === "lauThuyen") continue;
		if (battle.da && near && dist(f.x - near.x, f.z - near.z) > DA_TUONG.tam) continue;
		let n = 0;
		for (const o of battle.fighters) if (o.side === side && isAlive(o) && dist(o.x - f.x, o.z - f.z) <= r) n++;
		if (n > bestN) {
			bestN = n;
			best = f;
		}
	}
	return best;
}
/** Bề ngang, bề dọc chỗ đánh: bãi chiến, map dã ngoại, hay kinh đô bờ bên này. */
const khungW = (battle) => battle.mode === "field" ? FIELD.w : battle.da ? DA_KHUNG.w : 52;
const khungD = (battle) => battle.mode === "field" ? FIELD.d : battle.da ? DA_KHUNG.d : 52;
/** Mọi kỹ năng tướng loại này có thể có (đã mở hết). */
const allSkillsOf = (kind) => heroSkills({
	kind,
	bamboo: true,
	glow: false,
	non: true,
	kimQuy: true,
	lenhBan: true,
	hieuTrieu: true
});
/** Tướng đang đứng trong trận làm được kỹ năng này (Hai Bà mỗi bà một kỹ năng). */
function skillOwner(battle, skill) {
	return battle.fighters.find((f) => f.side === "ta" && isHero(f.kind) && isAlive(f) && allSkillsOf(f.kind).includes(skill));
}
function skillReady(battle, skill) {
	if (battle.outcome || !battle.skills.includes(skill) || (battle.skillCd[skill] ?? 0) > 0) return false;
	if (skill === "trongTran") return alliesLeft(battle) > 0;
	return !!skillOwner(battle, skill) && battle.fighters.some((f) => f.side === "giac" && isAlive(f) && f.kind !== "lauThuyen");
}
/** Bấm kỹ năng. Trả về false khi kỹ năng chưa hồi, không có trong trận này, hoặc trận đã xong. */
function useSkill(battle, skill) {
	if (!skillReady(battle, skill)) return false;
	const def = SKILLS[skill];
	const hero = skillOwner(battle, skill);
	const own = hero ? doTa(battle, hero.kind) : void 0;
	const bo4 = !!own?.bo4;
	battle.skillCd[skill] = def.cooldown * (1 - (own?.hoi ?? 0));
	const scale = (battle.mode === "field" ? FIELD.hpMul : battle.hpMul ?? 1) * (1 + battle.bonus + (battle.huan?.tuong ?? 0) * HUAN_BONUS + (own?.uy ?? 0));
	const g = geoOf(battle);
	if (skill === "trongTran") {
		battle.rally = def.duration;
		const allies = battle.fighters.filter((f) => f.side === "ta" && isAlive(f));
		emit(battle, {
			kind: "rally",
			x: allies.reduce((s, f) => s + f.x, 0) / allies.length,
			z: allies.reduce((s, f) => s + f.z, 0) / allies.length
		});
	} else if (skill === "phunLua") {
		const fireLen = bo4 ? BO_BON.phunLua.length : FIRE.length;
		const target = nearestEnemyOf(battle, hero);
		const d = dist(target.x - hero.x, target.z - hero.z) || 1;
		const dx = (target.x - hero.x) / d;
		const dz = (target.z - hero.z) / d;
		for (const o of battle.fighters) {
			if (o.side === "ta" || !isAlive(o)) continue;
			const along = (o.x - hero.x) * dx + (o.z - hero.z) * dz;
			const across = Math.abs((o.x - hero.x) * dz - (o.z - hero.z) * dx);
			if (along >= -.3 && along <= fireLen * g && across <= FIRE.width * g / 2) damageFighter(battle, {
				kind: "giong",
				dmg: FIRE.dmg * scale
			}, o);
		}
		const fromX = hero.x;
		const fromZ = hero.z;
		pushTo(battle, hero, clampField(hero.x + dx * fireLen * g * .8, khungW(battle)), clampField(hero.z + dz * fireLen * g * .8, khungD(battle)));
		hero.face = Math.atan2(dx, dz);
		emit(battle, {
			kind: "fire",
			x: fromX,
			z: fromZ,
			tx: hero.x,
			tz: hero.z,
			...bo4 ? { len: fireLen } : {}
		});
	} else if (skill === "nhoTre") {
		const smashR = bo4 ? BO_BON.nhoTre.radius : SMASH.radius;
		for (const o of battle.fighters) {
			if (o.side === "ta" || !isAlive(o) || !reaches("giong", o)) continue;
			const d = dist(o.x - hero.x, o.z - hero.z);
			if (d > smashR * g) continue;
			damageFighter(battle, {
				kind: "giong",
				dmg: SMASH.dmg * scale
			}, o);
			if (d > 1e-6 && isAlive(o)) {
				const nx = o.x + (o.x - hero.x) / d * SMASH.push * g;
				const nz = o.z + (o.z - hero.z) / d * SMASH.push * g;
				if (navOf(battle)) pushTo(battle, o, clampField(nx, FIELD.w), clampField(nz, FIELD.d));
				else {
					o.x = nx;
					o.z = nz;
				}
			}
		}
		hero.swing = .3;
		emit(battle, {
			kind: "smash",
			x: hero.x,
			z: hero.z,
			...bo4 ? { r: smashR } : {}
		});
	} else if (skill === "bocDoi") {
		const hillR = bo4 ? BO_BON.bocDoi.radius : HILL.radius;
		const at = densest(battle, hillR * g, "giac", hero);
		const cx = at.x;
		const cz = at.z;
		for (const o of battle.fighters) {
			if (o.side === "ta" || !isAlive(o)) continue;
			if (dist(o.x - cx, o.z - cz) <= hillR * g) damageFighter(battle, {
				kind: "sonTinh",
				dmg: HILL.dmg * scale
			}, o);
		}
		hero.face = Math.atan2(cx - hero.x, cz - hero.z);
		hero.swing = .3;
		emit(battle, {
			kind: "hill",
			x: hero.x,
			z: hero.z,
			tx: cx,
			tz: cz,
			...bo4 ? { r: hillR } : {}
		});
	} else if (skill === "noThan") {
		for (const o of battle.fighters) {
			if (o.side === "ta" || !isAlive(o)) continue;
			if (battle.da && dist(o.x - hero.x, o.z - hero.z) > DA_TUONG.tam) continue;
			damageFighter(battle, {
				kind: "anDuong",
				dmg: (bo4 ? BO_BON.noThan.dmg : NO_THAN.dmg) * scale
			}, o);
		}
		const foe = nearestEnemyOf(battle, hero);
		if (foe) hero.face = Math.atan2(foe.x - hero.x, foe.z - hero.z);
		hero.swing = .3;
		emit(battle, {
			kind: "volley",
			x: hero.x,
			z: hero.z
		});
	} else if (skill === "lienChau") {
		const rainR = bo4 ? BO_BON.lienChau.radius : LIEN_CHAU.radius;
		const at = densest(battle, rainR * g, "giac", hero);
		const cx = at.x;
		const cz = at.z;
		for (const o of battle.fighters) {
			if (o.side === "ta" || !isAlive(o)) continue;
			if (dist(o.x - cx, o.z - cz) <= rainR * g) damageFighter(battle, {
				kind: "caoLo",
				dmg: LIEN_CHAU.dmg * scale
			}, o);
		}
		hero.face = Math.atan2(cx - hero.x, cz - hero.z);
		hero.swing = .3;
		emit(battle, {
			kind: "rain",
			x: hero.x,
			z: hero.z,
			tx: cx,
			tz: cz,
			...bo4 ? { r: rainR } : {}
		});
	} else if (skill === "lenhBan") {
		battle.lenh = bo4 ? BO_BON.lenhBan.duration : def.duration;
		hero.swing = .3;
		emit(battle, {
			kind: "order",
			x: hero.x,
			z: hero.z
		});
	} else if (skill === "ruaVang") {
		battle.shield = def.duration;
		for (const o of battle.fighters) {
			if (o.side !== "ta" || !isAlive(o)) continue;
			o.hp = Math.min(o.maxHp, o.hp + o.maxHp * (bo4 ? BO_BON.ruaVang.heal : KIM_QUY.heal));
		}
		hero.swing = .3;
		emit(battle, {
			kind: "shield",
			x: hero.x,
			z: hero.z
		});
	} else if (skill === "voiXung") {
		const at = densest(battle, 2 * g, "giac", hero);
		const d = dist(at.x - hero.x, at.z - hero.z) || 1;
		const dx = (at.x - hero.x) / d;
		const dz = (at.z - hero.z) / d;
		const len = (bo4 ? BO_BON.voiXung.length : VOI_XUNG.length) * g;
		for (const o of battle.fighters) {
			if (o.side === "ta" || !isAlive(o) || !reaches("trungTrac", o)) continue;
			const along = (o.x - hero.x) * dx + (o.z - hero.z) * dz;
			const across = (o.x - hero.x) * dz - (o.z - hero.z) * dx;
			if (along < -.3 || along > len || Math.abs(across) > VOI_XUNG.width * g / 2) continue;
			damageFighter(battle, {
				kind: "trungTrac",
				dmg: VOI_XUNG.dmg * scale
			}, o);
			if (!isAlive(o)) continue;
			const side = across >= 0 ? 1 : -1;
			const nx = o.x + dz * side * VOI_XUNG.push * g;
			const nz = o.z - dx * side * VOI_XUNG.push * g;
			if (navOf(battle)) pushTo(battle, o, clampField(nx, FIELD.w), clampField(nz, FIELD.d));
			else {
				o.x = nx;
				o.z = nz;
			}
			o.stun = Math.max(o.stun ?? 0, bo4 ? BO_BON.voiXung.stun : VOI_XUNG.stun);
		}
		const fromX = hero.x;
		const fromZ = hero.z;
		const maxX = khungW(battle);
		const maxZ = khungD(battle);
		pushTo(battle, hero, clampField(hero.x + dx * len, maxX), clampField(hero.z + dz * len, maxZ));
		hero.face = Math.atan2(dx, dz);
		hero.swing = .3;
		emit(battle, {
			kind: "charge",
			x: fromX,
			z: fromZ,
			tx: hero.x,
			tz: hero.z
		});
	} else if (skill === "hieuTrieu") {
		const alive = battle.fighters.filter((f) => f.kind === "nghiaBinh" && isAlive(f)).length;
		const count = bo4 ? BO_BON.hieuTrieu.count : HIEU_TRIEU.count;
		const n = Math.max(0, count - alive);
		const hpMul = battle.mode === "field" ? FIELD.hpMul : battle.hpMul ?? 1;
		const maxX = khungW(battle);
		const maxZ = khungD(battle);
		for (let i = 0; i < n; i++) {
			const a = i / Math.max(1, n) * Math.PI * 2 + battle.t;
			const f = newFighter(battle, "ta", "nghiaBinh", clampField(hero.x + dsin(a) * .9 * g, maxX), clampField(hero.z + dcos(a) * .9 * g, maxZ), NGHIA_BINH.hp * hpMul);
			f.face = hero.face;
			placeFree(battle, f);
			battle.fighters.push(f);
		}
		for (const o of battle.fighters) {
			if (o.side !== "ta" || !isAlive(o)) continue;
			if (dist(o.x - hero.x, o.z - hero.z) <= HIEU_TRIEU.radius * g) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * (bo4 ? BO_BON.hieuTrieu.heal : HIEU_TRIEU.heal));
		}
		hero.swing = .3;
		emit(battle, {
			kind: "call",
			x: hero.x,
			z: hero.z,
			...bo4 ? { n: count } : {}
		});
	} else if (skill === "chemCaKinh") {
		const tam = CA_KINH.tam * g;
		let foe = null;
		for (const o of battle.fighters) {
			if (o.side === "ta" || !isAlive(o) || o.state === "dead" || !reaches("baTrieu", o)) continue;
			if (dist(o.x - hero.x, o.z - hero.z) > tam) continue;
			if (!foe || o.hp > foe.hp) foe = o;
		}
		foe ??= nearestEnemyOf(battle, hero);
		if (foe) {
			const d = dist(foe.x - hero.x, foe.z - hero.z) || 1;
			const dx = (foe.x - hero.x) / d;
			const dz = (foe.z - hero.z) / d;
			const fromX = hero.x;
			const fromZ = hero.z;
			const lao = Math.max(0, d - (bodyRadius("baTrieu") + bodyRadius(foe.kind)));
			pushTo(battle, hero, clampField(hero.x + dx * lao, khungW(battle)), clampField(hero.z + dz * lao, khungD(battle)));
			hero.face = Math.atan2(dx, dz);
			damageFighter(battle, {
				kind: "baTrieu",
				dmg: (bo4 ? BO_BON.chemCaKinh.dmg : CA_KINH.dmg) * scale
			}, foe);
			const stun = bo4 ? BO_BON.chemCaKinh.stun : CA_KINH.stun;
			if (stun && isAlive(foe)) foe.stun = Math.max(foe.stun ?? 0, stun);
			emit(battle, {
				kind: "chem",
				x: fromX,
				z: fromZ,
				tx: foe.x,
				tz: foe.z
			});
		}
		hero.swing = .3;
	} else if (skill === "ngayAn") {
		const an = bo4 ? BO_BON.ngayAn.an : NGAY_AN.an;
		const phuc = bo4 ? BO_BON.ngayAn.phuc : NGAY_AN.phuc;
		for (const o of battle.fighters) {
			if (o.side !== "ta" || !isAlive(o) || o.state === "dead") continue;
			o.an = an;
			o.phuc = phuc;
		}
		hero.swing = .3;
		emit(battle, {
			kind: "an",
			x: hero.x,
			z: hero.z,
			len: an
		});
	} else if (skill === "hacDe") {
		const t = bo4 ? BO_BON.hacDe.t : HAC_DE.t;
		const v = bo4 ? BO_BON.hacDe.danh : HAC_DE.danh;
		for (const o of battle.fighters) {
			if (o.side !== "ta" || !isAlive(o) || o.state === "dead") continue;
			o.hang = t;
			o.hangV = v;
		}
		const tam = HAC_DE.tam * g;
		for (const o of battle.fighters) {
			if (o.side === "ta" || !isAlive(o) || o.state === "dead" || !o.nha || dist(o.x - hero.x, o.z - hero.z) > tam) continue;
			if (o.nha.trang !== "ve") {
				o.nha.trang = "duoi";
				o.nha.duoi = hero.id;
			}
		}
		hero.swing = .3;
		emit(battle, {
			kind: "hacDe",
			x: hero.x,
			z: hero.z,
			len: t,
			r: HAC_DE.tam
		});
	} else if (skill === "cocBachDang") {
		const r = bo4 ? BO_BON.cocBachDang.r : COC_BACH_DANG.r;
		const t = bo4 ? BO_BON.cocBachDang.t : COC_BACH_DANG.t;
		const at = densest(battle, r * g, "giac", hero) ?? nearestEnemyOf(battle, hero);
		if (at) {
			(battle.coc ??= []).push({
				x: at.x,
				z: at.z,
				r: r * g,
				t,
				dps: COC_BACH_DANG.dps * scale,
				thuyen: COC_BACH_DANG.thuyen * scale
			});
			hero.face = Math.atan2(at.x - hero.x, at.z - hero.z);
			emit(battle, {
				kind: "coc",
				x: hero.x,
				z: hero.z,
				tx: at.x,
				tz: at.z,
				len: t,
				r
			});
		}
		hero.swing = .3;
	} else if (skill === "namQuoc") {
		const tam = NAM_QUOC.tam * g;
		const hoi = bo4 ? BO_BON.namQuoc.hoi : NAM_QUOC.hoi;
		const yeu = bo4 ? BO_BON.namQuoc.yeu : NAM_QUOC.yeu;
		for (const o of battle.fighters) {
			if (!isAlive(o) || o.state === "dead" || dist(o.x - hero.x, o.z - hero.z) > tam) continue;
			if (o.side === "ta") o.hp = Math.min(o.maxHp, o.hp + o.maxHp * hoi);
			else {
				o.nao = NAM_QUOC.t;
				o.naoV = yeu;
			}
		}
		hero.swing = .3;
		emit(battle, {
			kind: "tho",
			x: hero.x,
			z: hero.z,
			len: NAM_QUOC.t,
			r: NAM_QUOC.tam
		});
	} else {
		for (const o of battle.fighters) {
			if (o.side === "ta" || !isAlive(o) || !reaches("sonTinh", o)) continue;
			if (dist(o.x - hero.x, o.z - hero.z) > ROCKS.radius * g) continue;
			damageFighter(battle, {
				kind: "sonTinh",
				dmg: ROCKS.dmg * scale
			}, o);
			if (isAlive(o)) o.stun = bo4 ? BO_BON.doiNon.stun : ROCKS.stun;
		}
		hero.swing = .3;
		emit(battle, {
			kind: "rocks",
			x: hero.x,
			z: hero.z
		});
	}
	return true;
}
// src/game/daNgoai.ts
function initialDaNgoai() {
	return {
		cap: 1,
		exp: 0,
		map: 1,
		cho: null,
		dangO: false,
		doi: [],
		tuDanh: true,
		boss: DA_MAP_IDS.map(() => 0),
		xa: 1,
		tichMs: 0,
		du: 0,
		giet: 0,
		bossGiet: 0
	};
}
new Map(Object.keys(BUILDINGS).map((t, i) => [t, i + 1]));
// src/game/tet.ts
function initialTet() {
	return {
		seq: 0,
		nextAt: null,
		openUntil: 0,
		banh: {
			chung: 0,
			giay: 0
		},
		offered: {
			chung: false,
			giay: false
		},
		blessing: {
			chung: false,
			giay: false
		}
	};
}
function initialRaid() {
	return {
		wave: 0,
		won: 0,
		nextAt: null,
		phase: "idle",
		foe: "an",
		side: "bac",
		floods: 0,
		floodsHeld: 0,
		nights: 0,
		nightsHeld: 0,
		trieu: 0,
		trieuHeld: 0,
		thuyBinh: 0,
		thuyBinhHeld: 0,
		han: 0,
		hanHeld: 0,
		thuyHan: 0,
		thuyHanHeld: 0,
		lauSunk: 0,
		water: 0,
		startsAt: 0,
		battle: null,
		lastResult: null
	};
}
function initialCampaign() {
	return {
		cleared: 0,
		rows: { ...DEFAULT_ROWS },
		battle: null,
		lastResult: null
	};
}
function initialGiong() {
	return {
		fed: 0,
		gear: {
			ngua: false,
			roi: false,
			giap: false
		},
		whipBroken: false,
		restUntil: 0,
		ascended: false
	};
}
function createInitialState(now) {
	const dien = {
		id: 1,
		type: "dien",
		x: 32,
		z: 32,
		level: 1,
		workers: 0
	};
	const state = {
		version: 36,
		resources: { ...START_RESOURCES },
		dan: 4,
		danProgress: 0,
		buildings: [dien],
		heights: baseHeights(),
		nextId: 2,
		questIndex: 0,
		lastSeen: now,
		clock: 0,
		merchant: {
			nextAt: MERCHANT_FIRST_MS,
			visit: null,
			seq: 0
		},
		troops: {
			giao: 0,
			cung: 0,
			voi: 0,
			no: 0
		},
		thuong: initialThuong(),
		arms: {
			giao: 0,
			cung: 0,
			voi: 0,
			no: 0
		},
		raid: initialRaid(),
		campaign: initialCampaign(),
		nextBattleId: 1,
		giong: initialGiong(),
		son: initialSon(),
		adv: initialAdv(),
		caoLo: initialCaoLo(),
		haiBa: initialHaiBa(),
		thuThach: initialThuThach(),
		tet: initialTet(),
		story: { seen: [] },
		settings: { muted: false },
		khoanh: [...START_KHOANH],
		hinted: [],
		cayDa: initialCayDa(),
		benKia: initialBenKia(),
		xay: initialXay(),
		trangBi: initialTrangBi(),
		dao: initialDao(),
		daNgoai: initialDaNgoai()
	};
	levelFootprint(state, dien, footprintTop(state, "dien", dien.x, dien.z));
	return state;
}
function dienLevel(state) {
	return state.buildings.find((b) => b.type === "dien")?.level ?? 1;
}
function storageCap(state) {
	let cap = STORAGE_CAP[dienLevel(state) - 1];
	for (const b of state.buildings) cap += BUILDINGS[b.type].storage?.[b.level - 1] ?? 0;
	return cap;
}
/** Số chỗ làm của công trình ở cấp hiện tại (0 nếu không cần người). */
function slotsOf(b) {
	return BUILDINGS[b.type].workers?.[b.level - 1] ?? 0;
}
new Map(Object.keys(BUILDINGS).map((t, i) => [t, i + 1]));
/** Cấp Điện cần có để công trình lên cấp `level`. */
function dienNeededFor(type, level) {
	const def = BUILDINGS[type];
	if (type === "dien") return 0;
	return Math.max(def.levelMinDien?.[level] ?? 0, level);
}
/** Bước nhỏ của mô phỏng trận, giây. */
const BATTLE_STEP = .05;
// src/game/coLoa.ts
function initialAdv() {
	return {
		no: false,
		restUntil: 0,
		kimQuy: false,
		won: false,
		layTrao: false,
		bien: false
	};
}
// src/game/doanhTrai.ts
const zero = () => ({
	giao: 0,
	cung: 0,
	voi: 0,
	no: 0
});
/** Số chỗ một đạo quân chiếm (voi chiến chiếm nhiều chỗ). */
const armySpace = (army) => UNIT_TYPES.reduce((n, k) => n + (army[k] ?? 0) * UNITS[k].space, 0);
/** Chọn bớt quân cho vừa `cap` chỗ, giữ tỉ lệ các binh chủng. Vừa sẵn thì lấy hết. */
function fitArmy(troops, cap) {
	const total = armySpace(troops);
	if (total <= cap) return { ...troops };
	const share = (k) => troops[k] * cap / total;
	const out = zero();
	for (const k of UNIT_TYPES) out[k] = Math.floor(share(k));
	for (;;) {
		const room = cap - armySpace(out);
		const next = UNIT_TYPES.filter((k) => out[k] < troops[k] && UNITS[k].space <= room).sort((a, b) => share(b) - out[b] - (share(a) - out[a]))[0];
		if (!next) return out;
		out[next] += 1;
	}
}
// node_modules/fflate/esm/browser.js
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	1,
	1,
	1,
	1,
	2,
	2,
	2,
	2,
	3,
	3,
	3,
	3,
	4,
	4,
	4,
	4,
	5,
	5,
	5,
	5,
	0,
	0,
	0,
	0
]);
var fdeb = new u8([
	0,
	0,
	0,
	0,
	1,
	1,
	2,
	2,
	3,
	3,
	4,
	4,
	5,
	5,
	6,
	6,
	7,
	7,
	8,
	8,
	9,
	9,
	10,
	10,
	11,
	11,
	12,
	12,
	13,
	13,
	0,
	0
]);
var clim = new u8([
	16,
	17,
	18,
	0,
	8,
	7,
	9,
	6,
	10,
	5,
	11,
	4,
	12,
	3,
	13,
	2,
	14,
	1,
	15
]);
var freb = function(eb, start) {
	var b = new u16(31);
	for (var i = 0; i < 31; ++i) b[i] = start += 1 << eb[i - 1];
	var r = new i32(b[30]);
	for (var i = 1; i < 30; ++i) for (var j = b[i]; j < b[i + 1]; ++j) r[j] = j - b[i] << 5 | i;
	return {
		b,
		r
	};
};
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (var i = 0; i < 32768; ++i) {
	var x = (i & 43690) >> 1 | (i & 21845) << 1;
	x = (x & 52428) >> 2 | (x & 13107) << 2;
	x = (x & 61680) >> 4 | (x & 3855) << 4;
	rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var hMap = (function(cd, mb, r) {
	var s = cd.length;
	var i = 0;
	var l = new u16(mb);
	for (; i < s; ++i) if (cd[i]) ++l[cd[i] - 1];
	var le = new u16(mb);
	for (i = 1; i < mb; ++i) le[i] = le[i - 1] + l[i - 1] << 1;
	var co;
	if (r) {
		co = new u16(1 << mb);
		var rvb = 15 - mb;
		for (i = 0; i < s; ++i) if (cd[i]) {
			var sv = i << 4 | cd[i];
			var r_1 = mb - cd[i];
			var v = le[cd[i] - 1]++ << r_1;
			for (var m = v | (1 << r_1) - 1; v <= m; ++v) co[rev[v] >> rvb] = sv;
		}
	} else {
		co = new u16(s);
		for (i = 0; i < s; ++i) if (cd[i]) co[i] = rev[le[cd[i] - 1]++] >> 15 - cd[i];
	}
	return co;
});
var flt = new u8(288);
for (var i = 0; i < 144; ++i) flt[i] = 8;
for (var i = 144; i < 256; ++i) flt[i] = 9;
for (var i = 256; i < 280; ++i) flt[i] = 7;
for (var i = 280; i < 288; ++i) flt[i] = 8;
var fdt = new u8(32);
for (var i = 0; i < 32; ++i) fdt[i] = 5;
var flm = /*#__PURE__*/ hMap(flt, 9, 0);
var flrm = /*#__PURE__*/ hMap(flt, 9, 1);
var fdm = /*#__PURE__*/ hMap(fdt, 5, 0);
var fdrm = /*#__PURE__*/ hMap(fdt, 5, 1);
var max = function(a) {
	var m = a[0];
	for (var i = 1; i < a.length; ++i) if (a[i] > m) m = a[i];
	return m;
};
var bits = function(d, p, m) {
	var o = p / 8 | 0;
	return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
};
var bits16 = function(d, p) {
	var o = p / 8 | 0;
	return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft = function(p) {
	return (p + 7) / 8 | 0;
};
var slc = function(v, s, e) {
	if (s == null || s < 0) s = 0;
	if (e == null || e > v.length) e = v.length;
	return new u8(v.subarray(s, e));
};
var ec = [
	"unexpected EOF",
	"invalid block type",
	"invalid length/literal",
	"invalid distance",
	"stream finished",
	"no stream handler",
	,
	"no callback",
	"invalid UTF-8 data",
	"extra field too long",
	"date not in range 1980-2099",
	"filename too long",
	"stream finishing",
	"invalid zip data"
];
var err = function(ind, msg, nt) {
	var e = new Error(msg || ec[ind]);
	e.code = ind;
	if (Error.captureStackTrace) Error.captureStackTrace(e, err);
	if (!nt) throw e;
	return e;
};
var inflt = function(dat, st, buf, dict) {
	var sl = dat.length, dl = dict ? dict.length : 0;
	if (!sl || st.f && !st.l) return buf || new u8(0);
	var noBuf = !buf;
	var resize = noBuf || st.i != 2;
	var noSt = st.i;
	if (noBuf) buf = new u8(sl * 3);
	var cbuf = function(l) {
		var bl = buf.length;
		if (l > bl) {
			var nbuf = new u8(Math.max(bl * 2, l));
			nbuf.set(buf);
			buf = nbuf;
		}
	};
	var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
	var tbts = sl * 8;
	do {
		if (!lm) {
			final = bits(dat, pos, 1);
			var type = bits(dat, pos + 1, 3);
			pos += 3;
			if (!type) {
				var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
				if (t > sl) {
					if (noSt) err(0);
					break;
				}
				if (resize) cbuf(bt + l);
				buf.set(dat.subarray(s, t), bt);
				st.b = bt += l, st.p = pos = t * 8, st.f = final;
				continue;
			} else if (type == 1) lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
			else if (type == 2) {
				var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
				var tl = hLit + bits(dat, pos + 5, 31) + 1;
				pos += 14;
				var ldt = new u8(tl);
				var clt = new u8(19);
				for (var i = 0; i < hcLen; ++i) clt[clim[i]] = bits(dat, pos + i * 3, 7);
				pos += hcLen * 3;
				var clb = max(clt), clbmsk = (1 << clb) - 1;
				var clm = hMap(clt, clb, 1);
				for (var i = 0; i < tl;) {
					var r = clm[bits(dat, pos, clbmsk)];
					pos += r & 15;
					var s = r >> 4;
					if (s < 16) ldt[i++] = s;
					else {
						var c = 0, n = 0;
						if (s == 16) n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i - 1];
						else if (s == 17) n = 3 + bits(dat, pos, 7), pos += 3;
						else if (s == 18) n = 11 + bits(dat, pos, 127), pos += 7;
						while (n--) ldt[i++] = c;
					}
				}
				var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
				lbt = max(lt);
				dbt = max(dt);
				lm = hMap(lt, lbt, 1);
				dm = hMap(dt, dbt, 1);
			} else err(1);
			if (pos > tbts) {
				if (noSt) err(0);
				break;
			}
		}
		if (resize) cbuf(bt + 131072);
		var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
		var lpos = pos;
		for (;; lpos = pos) {
			var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
			pos += c & 15;
			if (pos > tbts) {
				if (noSt) err(0);
				break;
			}
			if (!c) err(2);
			if (sym < 256) buf[bt++] = sym;
			else if (sym == 256) {
				lpos = pos, lm = null;
				break;
			} else {
				var add = sym - 254;
				if (sym > 264) {
					var i = sym - 257, b = fleb[i];
					add = bits(dat, pos, (1 << b) - 1) + fl[i];
					pos += b;
				}
				var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
				if (!d) err(3);
				pos += d & 15;
				var dt = fd[dsym];
				if (dsym > 3) {
					var b = fdeb[dsym];
					dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
				}
				if (pos > tbts) {
					if (noSt) err(0);
					break;
				}
				if (resize) cbuf(bt + 131072);
				var end = bt + add;
				if (bt < dt) {
					var shift = dl - dt, dend = Math.min(dt, end);
					if (shift + bt < 0) err(3);
					for (; bt < dend; ++bt) buf[bt] = dict[shift + bt];
				}
				for (; bt < end; ++bt) buf[bt] = buf[bt - dt];
			}
		}
		st.l = lm, st.p = lpos, st.b = bt, st.f = final;
		if (lm) final = 1, st.m = lbt, st.d = dm, st.n = dbt;
	} while (!final);
	return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
var wbits = function(d, p, v) {
	v <<= p & 7;
	var o = p / 8 | 0;
	d[o] |= v;
	d[o + 1] |= v >> 8;
};
var wbits16 = function(d, p, v) {
	v <<= p & 7;
	var o = p / 8 | 0;
	d[o] |= v;
	d[o + 1] |= v >> 8;
	d[o + 2] |= v >> 16;
};
var hTree = function(d, mb) {
	var t = [];
	for (var i = 0; i < d.length; ++i) if (d[i]) t.push({
		s: i,
		f: d[i]
	});
	var s = t.length;
	var t2 = t.slice();
	if (!s) return {
		t: et,
		l: 0
	};
	if (s == 1) {
		var v = new u8(t[0].s + 1);
		v[t[0].s] = 1;
		return {
			t: v,
			l: 1
		};
	}
	t.sort(function(a, b) {
		return a.f - b.f;
	});
	t.push({
		s: -1,
		f: 25001
	});
	var l = t[0], r = t[1], i0 = 0, i1 = 1, i2 = 2;
	t[0] = {
		s: -1,
		f: l.f + r.f,
		l,
		r
	};
	while (i1 != s - 1) {
		l = t[t[i0].f < t[i2].f ? i0++ : i2++];
		r = t[i0 != i1 && t[i0].f < t[i2].f ? i0++ : i2++];
		t[i1++] = {
			s: -1,
			f: l.f + r.f,
			l,
			r
		};
	}
	var maxSym = t2[0].s;
	for (var i = 1; i < s; ++i) if (t2[i].s > maxSym) maxSym = t2[i].s;
	var tr = new u16(maxSym + 1);
	var mbt = ln(t[i1 - 1], tr, 0);
	if (mbt > mb) {
		var i = 0, dt = 0;
		var lft = mbt - mb, cst = 1 << lft;
		t2.sort(function(a, b) {
			return tr[b.s] - tr[a.s] || a.f - b.f;
		});
		for (; i < s; ++i) {
			var i2_1 = t2[i].s;
			if (tr[i2_1] > mb) {
				dt += cst - (1 << mbt - tr[i2_1]);
				tr[i2_1] = mb;
			} else break;
		}
		dt >>= lft;
		while (dt > 0) {
			var i2_2 = t2[i].s;
			if (tr[i2_2] < mb) dt -= 1 << mb - tr[i2_2]++ - 1;
			else ++i;
		}
		for (; i >= 0 && dt; --i) {
			var i2_3 = t2[i].s;
			if (tr[i2_3] == mb) {
				--tr[i2_3];
				++dt;
			}
		}
		mbt = mb;
	}
	return {
		t: new u8(tr),
		l: mbt
	};
};
var ln = function(n, l, d) {
	return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
};
var lc = function(c) {
	var s = c.length;
	while (s && !c[--s]);
	var cl = new u16(++s);
	var cli = 0, cln = c[0], cls = 1;
	var w = function(v) {
		cl[cli++] = v;
	};
	for (var i = 1; i <= s; ++i) if (c[i] == cln && i != s) ++cls;
	else {
		if (!cln && cls > 2) {
			for (; cls > 138; cls -= 138) w(32754);
			if (cls > 2) {
				w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
				cls = 0;
			}
		} else if (cls > 3) {
			w(cln), --cls;
			for (; cls > 6; cls -= 6) w(8304);
			if (cls > 2) w(cls - 3 << 5 | 8208), cls = 0;
		}
		while (cls--) w(cln);
		cls = 1;
		cln = c[i];
	}
	return {
		c: cl.subarray(0, cli),
		n: s
	};
};
var clen = function(cf, cl) {
	var l = 0;
	for (var i = 0; i < cl.length; ++i) l += cf[i] * cl[i];
	return l;
};
var wfblk = function(out, pos, dat) {
	var s = dat.length;
	var o = shft(pos + 2);
	out[o] = s & 255;
	out[o + 1] = s >> 8;
	out[o + 2] = out[o] ^ 255;
	out[o + 3] = out[o + 1] ^ 255;
	for (var i = 0; i < s; ++i) out[o + i + 4] = dat[i];
	return (o + 4 + s) * 8;
};
var wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
	wbits(out, p++, final);
	++lf[256];
	var _a = hTree(lf, 15), dlt = _a.t, mlb = _a.l;
	var _b = hTree(df, 15), ddt = _b.t, mdb = _b.l;
	var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
	var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
	var lcfreq = new u16(19);
	for (var i = 0; i < lclt.length; ++i) ++lcfreq[lclt[i] & 31];
	for (var i = 0; i < lcdt.length; ++i) ++lcfreq[lcdt[i] & 31];
	var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
	var nlcc = 19;
	for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc);
	var flen = bl + 5 << 3;
	var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
	var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
	if (bs >= 0 && flen <= ftlen && flen <= dtlen) return wfblk(out, p, dat.subarray(bs, bs + bl));
	var lm, ll, dm, dl;
	wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
	if (dtlen < ftlen) {
		lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
		var llm = hMap(lct, mlcb, 0);
		wbits(out, p, nlc - 257);
		wbits(out, p + 5, ndc - 1);
		wbits(out, p + 10, nlcc - 4);
		p += 14;
		for (var i = 0; i < nlcc; ++i) wbits(out, p + 3 * i, lct[clim[i]]);
		p += 3 * nlcc;
		var lcts = [lclt, lcdt];
		for (var it = 0; it < 2; ++it) {
			var clct = lcts[it];
			for (var i = 0; i < clct.length; ++i) {
				var len = clct[i] & 31;
				wbits(out, p, llm[len]), p += lct[len];
				if (len > 15) wbits(out, p, clct[i] >> 5 & 127), p += clct[i] >> 12;
			}
		}
	} else lm = flm, ll = flt, dm = fdm, dl = fdt;
	for (var i = 0; i < li; ++i) {
		var sym = syms[i];
		if (sym > 255) {
			var len = sym >> 18 & 31;
			wbits16(out, p, lm[len + 257]), p += ll[len + 257];
			if (len > 7) wbits(out, p, sym >> 23 & 31), p += fleb[len];
			var dst = sym & 31;
			wbits16(out, p, dm[dst]), p += dl[dst];
			if (dst > 3) wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
		} else wbits16(out, p, lm[sym]), p += ll[sym];
	}
	wbits16(out, p, lm[256]);
	return p + ll[256];
};
var deo = /*#__PURE__*/ new i32([
	65540,
	131080,
	131088,
	131104,
	262176,
	1048704,
	1048832,
	2114560,
	2117632
]);
var et = /*#__PURE__*/ new u8(0);
var dflt = function(dat, lvl, plvl, pre, post, st) {
	var s = st.z || dat.length;
	var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7e3)) + post);
	var w = o.subarray(pre, o.length - post);
	var lst = st.l;
	var pos = (st.r || 0) & 7;
	if (lvl) {
		if (pos) w[0] = st.r >> 3;
		var opt = deo[lvl - 1];
		var n = opt >> 13, c = opt & 8191;
		var msk_1 = (1 << plvl) - 1;
		var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
		var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
		var hsh = function(i) {
			return (dat[i] ^ dat[i + 1] << bs1_1 ^ dat[i + 2] << bs2_1) & msk_1;
		};
		var syms = new i32(25e3);
		var lf = new u16(288), df = new u16(32);
		var lc_1 = 0, eb = 0, i = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
		for (; i + 2 < s; ++i) {
			var hv = hsh(i);
			var imod = i & 32767, pimod = head[hv];
			prev[imod] = pimod;
			head[hv] = imod;
			if (wi <= i) {
				var rem = s - i;
				if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
					pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i - bs, pos);
					li = lc_1 = eb = 0, bs = i;
					for (var j = 0; j < 286; ++j) lf[j] = 0;
					for (var j = 0; j < 30; ++j) df[j] = 0;
				}
				var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
				if (rem > 2 && hv == hsh(i - dif)) {
					var maxn = Math.min(n, rem) - 1;
					var maxd = Math.min(32767, i);
					var ml = Math.min(258, rem);
					while (dif <= maxd && --ch_1 && imod != pimod) {
						if (dat[i + l] == dat[i + l - dif]) {
							var nl = 0;
							for (; nl < ml && dat[i + nl] == dat[i + nl - dif]; ++nl);
							if (nl > l) {
								l = nl, d = dif;
								if (nl > maxn) break;
								var mmd = Math.min(dif, nl - 2);
								var md = 0;
								for (var j = 0; j < mmd; ++j) {
									var ti = i - dif + j & 32767;
									var cd = ti - prev[ti] & 32767;
									if (cd > md) md = cd, pimod = ti;
								}
							}
						}
						imod = pimod, pimod = prev[imod];
						dif += imod - pimod & 32767;
					}
				}
				if (d) {
					syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
					var lin = revfl[l] & 31, din = revfd[d] & 31;
					eb += fleb[lin] + fdeb[din];
					++lf[257 + lin];
					++df[din];
					wi = i + l;
					++lc_1;
				} else {
					syms[li++] = dat[i];
					++lf[dat[i]];
				}
			}
		}
		for (i = Math.max(i, wi); i < s; ++i) {
			syms[li++] = dat[i];
			++lf[dat[i]];
		}
		pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i - bs, pos);
		if (!lst) {
			st.r = pos & 7 | w[pos / 8 | 0] << 3;
			pos -= 7;
			st.h = head, st.p = prev, st.i = i, st.w = wi;
		}
	} else {
		for (var i = st.w || 0; i < s + lst; i += 65535) {
			var e = i + 65535;
			if (e >= s) {
				w[pos / 8 | 0] = lst;
				e = s;
			}
			pos = wfblk(w, pos + 1, dat.subarray(i, e));
		}
		st.i = s;
	}
	return slc(o, 0, pre + shft(pos) + post);
};
var dopt = function(dat, opt, pre, post, st) {
	if (!st) {
		st = { l: 1 };
		if (opt.dictionary) {
			var dict = opt.dictionary.subarray(-32768);
			var newDat = new u8(dict.length + dat.length);
			newDat.set(dict);
			newDat.set(dat, dict.length);
			dat = newDat;
			st.w = dict.length;
		}
	}
	return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
};
/**
* Compresses data with DEFLATE without any wrapper
* @param data The data to compress
* @param opts The compression options
* @returns The deflated version of the data
*/
function deflateSync(data, opts) {
	return dopt(data, opts || {}, 0, 0);
}
/**
* Expands DEFLATE data with no wrapper
* @param data The data to decompress
* @param opts The decompression options
* @returns The decompressed version of the data
*/
function inflateSync(data, opts) {
	return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
var td = typeof TextDecoder != "undefined" && /*#__PURE__*/ new TextDecoder();
try {
	td.decode(et, { stream: true });
} catch (e) {}
// src/game/mau.ts
/**
* Khung dựng mẫu theo cấp Điện: cạnh hình vuông neo góc sông (bội số của khoảnh 5 ô). Mẫu xếp đủ mọi công trình tới
* số tối đa của cấp ấy, mỗi công trình giáp đường; khung phải đủ rộng cho chừng ấy công trình cùng đường đi và tường
* (`docs/thiet-ke.md` mục Mẫu kinh đô: khung theo cấp). Lúc áp mẫu, chỗ nào rơi vào khoảnh rừng chưa phát thì bỏ qua.
*/
const MAU_KHUNG = {
	phongChau: [
		25,
		30,
		30,
		35,
		40,
		45,
		45,
		50,
		50,
		50
	],
	deBao: [
		25,
		30,
		30,
		35,
		40,
		45,
		45,
		50,
		50,
		50
	],
	coLoa: [
		25,
		30,
		30,
		35,
		45,
		45,
		45,
		50,
		50,
		50
	],
	coLoaSong: [
		25,
		30,
		30,
		35,
		45,
		45,
		50,
		50,
		50,
		50
	],
	nghiaLinh: [
		25,
		30,
		30,
		35,
		40,
		45,
		45,
		50,
		50,
		50
	]
};
/** Cạnh khung dựng mẫu `id` ở cấp Điện `level`. */
const khungOf = (id, level) => MAU_KHUNG[id][Math.min(Math.max(level, 1), MAU_KHUNG[id].length) - 1];
/** Ô nhỏ nhất (cả x và z) của khung dựng mẫu `id` ở cấp Điện `level`. */
function frameStart(level, id) {
	return 52 - khungOf(id, level);
}
/** Các khoảnh phủ khung dựng mẫu `id` ở cấp Điện `level` (phát đủ chừng này thì mọi chỗ của mẫu đều trên đất đã mở). */
function frameKhoanh(level, id) {
	const lo = frameStart(level, id);
	const out = [];
	for (let z = lo; z < 52; z += 5) for (let x = lo; x < 52; x += 5) out.push(khoanhOf(x, z));
	return out;
}
/** Ô đất cuối cùng trước sông (cả x và z). */
const LAST = 51;
/** Ô cuối của móng Điện (cả x và z). */
const DIEN_END = 32 + BUILDINGS.dien.w - 1;
/** Tâm móng Điện. */
const DIEN_C = 32 + BUILDINGS.dien.w / 2;
/** Đường quanh Điện: hàng (và cột) ngay trước mép bắc, mép tây của Điện, và ngay sau mép nam, mép đông. */
const PALACE_A = 31;
const PALACE_B = DIEN_END + 1;
/** Đê bao chạy ở hàng (và cột) này: bãi bồi ngoài đê vừa một dải bến sát sông. */
const DE_AT = 51 - BUILDINGS.ben.w;
/** Đường chân đê, ngay trong đê: người gánh từ bến ngoài đê qua đê vào đường này. */
const CHAN_DE = DE_AT - 1;
/** Cột (và hàng) giữa Điện: trục đường và cổng thành, đối xứng qua đường chéo. */
const GATE_AXIS = 32 + Math.floor(BUILDINGS.dien.w / 2);
/** Dải lô giữa hai phố sâu nhất chừng này ô (hai dãy nhà sâu 4 ô, hay một nhà 8×8). */
const BAND = 8;
/**
* Trạng thái ô trên bản nháp: còn trống, đã có công trình (hay ngoài vùng), chừa trống, bãi ngoài đê (chỉ cho loại
* phải sát sông: bến, làng chài), đường.
*/
const FREE = 0;
const USED = 1;
const KEEP = 2;
const BANK = 3;
const ROAD = 4;
/** Phạt điểm chỗ dựng ngoài khu mẫu muốn (vòng thành Cổ Loa). */
const OFF_ZONE = 100;
/**
* Loại có mốc mở theo truyện (đền, Hội Tết, đê, thành) chỉ dựng được sau kết chương 1, mà màn cuối chương 1
* cần Điện cấp này: dưới cấp này mẫu không chừa chỗ cho chúng, đỡ chật đất.
*/
const storyDien = () => STAGES[7].minDien;
/** Số chỗ mẫu chừa cho loại `type` ở cấp Điện `level`: đúng số tối đa theo cấp Điện. */
function wantOf(type, level) {
	const def = BUILDINGS[type];
	if (def.unlock && level < storyDien()) return 0;
	return def.limit[level - 1] ?? 0;
}
const STEP4 = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1]
];
/** Bản nháp một mẫu ở một cấp Điện. */
var Draft = class {
	level;
	hem;
	rong;
	lo;
	cell = /* @__PURE__ */ new Uint8Array(5776);
	/** Chỗ (số thứ tự trong `slots`, cộng 1) đứng trên ô; 0 là ô không có công trình. */
	owner = /* @__PURE__ */ new Int16Array(5776);
	slots = [];
	rings = [];
	/** Bảng cộng dồn ô không trống (`busy`) và ô không trống mà không phải bãi ngoài đê (`hard`), tính lại khi đổi. */
	busy = null;
	hard = null;
	constructor(level, side, hem = HEM, rong = 1) {
		this.level = level;
		this.hem = hem;
		this.rong = rong;
		this.lo = 52 - side;
		for (let z = 0; z < 76; z++) for (let x = 0; x < 76; x++) if (x < this.lo || z < this.lo || x > LAST || z > LAST) this.cell[z * 76 + x] = USED;
	}
	at(x, z) {
		return inGrid(x, z) ? this.cell[z * 76 + x] : USED;
	}
	set(i, v) {
		this.cell[i] = v;
		this.busy = this.hard = null;
	}
	count(type) {
		let n = 0;
		for (const s of this.slots) if (s.type === type) n++;
		return n;
	}
	put(type, x, z) {
		const w = BUILDINGS[type].w;
		for (let dz = 0; dz < w; dz++) for (let dx = 0; dx < w; dx++) {
			const i = (z + dz) * 76 + x + dx;
			this.set(i, USED);
			this.owner[i] = this.slots.length + 1;
		}
		this.slots.push({
			type,
			x,
			z
		});
	}
	slotOf(i) {
		const o = this.owner[i];
		return o ? this.slots[o - 1] : void 0;
	}
	/** Đặt công trình một ô nếu ô còn trống. */
	segment(type, x, z) {
		if (this.at(x, z) !== FREE) return false;
		this.put(type, x, z);
		return true;
	}
	/** Đánh dấu `v` (chừa trống hay bãi ngoài đê) cho các ô còn trống trong hình chữ nhật (x0, z0)–(x1, z1). */
	mark(x0, z0, x1, z1, v) {
		for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (this.at(x, z) === FREE) this.set(z * 76 + x, v);
	}
	/** Trải đường thẳng từ ô (x0, z0) tới ô (x1, z1) (cùng hàng hay cùng cột) trên các ô trống hay chừa trống. */
	road(x0, z0, x1, z1) {
		for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
			const c = this.at(x, z);
			if (c === FREE || c === KEEP) this.set(z * 76 + x, ROAD);
		}
	}
	/** Phố chữ L ở `v`: hàng `v` và cột `v`, từ góc (v, v) tới ô `end`. */
	ell(v, end) {
		this.road(v, v, end, v);
		this.road(v, v, v, end);
	}
	/** Hai trục giữa Điện (cột và hàng `GATE_AXIS`) từ ô `from` tới ô `to`. */
	axis(from, to) {
		this.road(GATE_AXIS, from, GATE_AXIS, to);
		this.road(from, GATE_AXIS, to, GATE_AXIS);
	}
	sums() {
		const n = 77;
		const busy = /* @__PURE__ */ new Int32Array(5929);
		const hard = /* @__PURE__ */ new Int32Array(5929);
		for (let z = 0; z < 76; z++) {
			let rb = 0;
			let rh = 0;
			for (let x = 0; x < 76; x++) {
				const c = this.cell[z * 76 + x];
				if (c !== FREE) rb++;
				if (c !== FREE && c !== BANK) rh++;
				busy[(z + 1) * n + x + 1] = busy[z * n + x + 1] + rb;
				hard[(z + 1) * n + x + 1] = hard[z * n + x + 1] + rh;
			}
		}
		this.busy = busy;
		this.hard = hard;
	}
	/** Móng cạnh `w` ở (x, z) toàn ô trống (`bank`: kể cả bãi ngoài đê). */
	open(x, z, w, bank) {
		if (x < 0 || z < 0 || x + w > 76 || z + w > 76) return false;
		if (!this.busy) this.sums();
		const t = bank ? this.hard : this.busy;
		const n = 77;
		return t[(z + w) * n + x + w] - t[z * n + x + w] - t[(z + w) * n + x] + t[z * n + x] === 0;
	}
	/** Ô `i` là lối vào công trình: ô đường, hay (với loại phải sát sông) ô đê có đường ngay sau. */
	gate(i, river) {
		const c = this.cell[i];
		if (c === ROAD) return true;
		if (!river || c !== USED || this.slotOf(i)?.type !== "de") return false;
		const x = i % 76;
		const z = (i - x) / 76;
		return STEP4.some(([dx, dz]) => this.at(x + dx, z + dz) === ROAD);
	}
	/** Móng cạnh `w` ở (x, z) giáp đường ở ít nhất một ô viền (không tính góc chéo). */
	reaches(x, z, w, river) {
		for (let k = 0; k < w; k++) for (const [cx, cz] of [
			[x + k, z - 1],
			[x + k, z + w],
			[x - 1, z + k],
			[x + w, z + k]
		]) if (inGrid(cx, cz) && this.gate(cz * 76 + cx, river)) return true;
		return false;
	}
	/** Các ô viền cạnh (không tính góc chéo) của móng cạnh `w` ở (x, z). */
	edge(x, z, w) {
		const out = [];
		for (let k = 0; k < w; k++) out.push([x + k, z - 1], [x + k, z + w], [x - 1, z + k], [x + w, z + k]);
		return out;
	}
	/** Nhà nhiều ô đứng trên ô (x, z), nếu có. */
	nhaAt(x, z) {
		if (!inGrid(x, z)) return void 0;
		const o = this.slotOf(z * 76 + x);
		return o && BUILDINGS[o.type].w > 1 ? o : void 0;
	}
	/**
	* Số ô viền (không tính góc chéo) không còn trống mà không phải nhà nhiều ô: móng sát đường, tường thì xếp thành dãy
	* dọc phố. Nhà sát nhà không thưởng (xem `sat`), trừ khi xếp khít (`hem` 0).
	*/
	contact(x, z, w) {
		let n = 0;
		for (const [cx, cz] of this.edge(x, z, w)) if (this.at(cx, cz) !== FREE && (!this.hem || !this.nhaAt(cx, cz))) n++;
		return n;
	}
	/** Số ô viền cạnh của móng `type` ở (x, z) là nhà nhiều ô phải chừa hẻm với nó (`canHem`): mẫu phạt nặng (`HEM`). */
	sat(type, x, z) {
		const w = BUILDINGS[type].w;
		if (w <= 1 || !this.hem) return 0;
		let n = 0;
		for (const [cx, cz] of this.edge(x, z, w)) {
			const o = this.nhaAt(cx, cz);
			if (o && canHem(type, o.type)) n++;
		}
		for (let k = 2; k <= this.rong; k++) for (let i = 0; i < w; i++) for (const [cx, cz] of [
			[x + i, z - k],
			[x + i, z + w - 1 + k],
			[x - k, z + i],
			[x + w - 1 + k, z + i]
		]) {
			const o = this.nhaAt(cx, cz);
			if (o && canHem(type, o.type)) n += .5;
		}
		return n;
	}
	/** Dựng được `type` ở (x, z): móng trống, sát sông nếu phải sát sông, giáp đường nếu là công trình nhiều ô. */
	fits(type, x, z) {
		const def = BUILDINGS[type];
		const w = def.w;
		const river = !!def.nearRiver;
		if (river && !touchesRiver(x, z, w, w)) return false;
		if (!this.open(x, z, w, river)) return false;
		return w === 1 || this.reaches(x, z, w, river);
	}
	/** Số vòng thành bao trọn móng (x, z, cạnh w): 3 là trong vòng trong cùng, 0 là ngoài vòng ngoài. */
	ringsAround(x, z, w) {
		let n = 0;
		for (const r of this.rings) if (x > r.a && z > r.a && x + w - 1 < r.b && z + w - 1 < r.b) n++;
		return n;
	}
	/** Số ô đường trên bản nháp. */
	roads() {
		let n = 0;
		for (let i = 0; i < this.cell.length; i++) if (this.cell[i] === ROAD) n++;
		return n;
	}
	/** Ô đi được trên mạng đường: ô đường, ô đê (dân gánh qua đê), ô cổng thành. */
	walk(i, off) {
		if (this.cell[i] === ROAD) return !off[i];
		const s = this.slotOf(i);
		return !!s && (s.type === "de" || !!s.cong);
	}
	/**
	* Ô đường `i` chạy qua đất trống: hai ô kề ngang dòng đường đều trống, ngoài khung, hay chỉ có bẫy, chòi canh (không
	* nhà, không tường: đường dọc tường giữ liền).
	*/
	bare(i) {
		const x = i % 76;
		const z = (i - x) / 76;
		return (this.at(x - 1, z) === ROAD || this.at(x + 1, z) === ROAD ? [[x, z - 1], [x, z + 1]] : [[x - 1, z], [x + 1, z]]).every(([sx, sz]) => {
			const c = this.at(sx, sz);
			if (c === FREE || c === KEEP) return true;
			if (c !== USED) return false;
			const o = inGrid(sx, sz) ? this.slotOf(sz * 76 + sx) : void 0;
			return !o || o.type === "bayChong" || o.type === "choiCanh";
		});
	}
	/** Số ô đường kề ô (x, z). */
	roadNear(x, z) {
		let n = 0;
		for (const [dx, dz] of STEP4) if (this.at(x + dx, z + dz) === ROAD) n++;
		return n;
	}
	/** Loang trên mạng đường (bỏ các ô `off`) từ các ô gốc; trả về khoảng cách (-1: không tới). */
	spreadFrom(roots, off) {
		const dist = (/* @__PURE__ */ new Int32Array(5776)).fill(-1);
		const q = /* @__PURE__ */ new Int32Array(5776);
		let h = 0;
		let t = 0;
		for (const i of roots) {
			if (dist[i] >= 0 || !this.walk(i, off)) continue;
			dist[i] = 0;
			q[t++] = i;
		}
		while (h < t) {
			const i = q[h++];
			const x = i % 76;
			const z = (i - x) / 76;
			for (const [dx, dz] of STEP4) {
				if (!inGrid(x + dx, z + dz)) continue;
				const j = (z + dz) * 76 + x + dx;
				if (dist[j] >= 0 || !this.walk(j, off)) continue;
				dist[j] = dist[i] + 1;
				q[t++] = j;
			}
		}
		return dist;
	}
	/** Các ô viền (không tính góc chéo) của móng chỗ `s`. */
	rim(s) {
		const w = BUILDINGS[s.type].w;
		const out = [];
		const add = (cx, cz) => inGrid(cx, cz) && out.push(cz * 76 + cx);
		for (let k = 0; k < w; k++) {
			add(s.x + k, s.z - 1);
			add(s.x + k, s.z + w);
			add(s.x - 1, s.z + k);
			add(s.x + w, s.z + k);
		}
		return out;
	}
	/**
	* Tỉa đường: ô đường sát móng công trình nhiều ô (bến ngoài đê thì ô đường ngay sau đê), ô đường hai bên cổng thành
	* là lối vào, giữ lại; rồi bỏ dần đoạn đường thẳng (từ 3 ô) giữa hai ngã ba chạy qua đất trống (hai bên không có gì,
	* mọi lối vào vẫn nối về Điện, kho), bỏ ô đường cụt, tới khi không bỏ được nữa. Đường chỉ bị cắt ở ngã ba hay đầu mút nên vẫn là
	* các đoạn thẳng.
	*/
	prune() {
		const off = /* @__PURE__ */ new Uint8Array(5776);
		const roots = [];
		for (const s of this.slots) if (s.type === "dien" || s.type === "kho") {
			for (const i of this.rim(s)) if (this.cell[i] === ROAD) roots.push(i);
		}
		const base = this.spreadFrom(roots, off);
		const need = /* @__PURE__ */ new Uint8Array(5776);
		const doors = [];
		const door = (i) => {
			if (need[i]) return;
			need[i] = 1;
			doors.push(i);
		};
		for (const s of this.slots) {
			if (s.cong) {
				for (const [dx, dz] of STEP4) if (this.at(s.x + dx, s.z + dz) === ROAD) door((s.z + dz) * 76 + s.x + dx);
				continue;
			}
			if (BUILDINGS[s.type].w === 1) continue;
			for (const i of this.rim(s)) if (this.cell[i] === ROAD) door(i);
			else if (this.slotOf(i)?.type === "de") {
				const x = i % 76;
				const z = (i - x) / 76;
				for (const [dx, dz] of STEP4) if (this.at(x + dx, z + dz) === ROAD) door((z + dz) * 76 + x + dx);
			}
		}
		const must = doors.filter((i) => base[i] >= 0);
		const ok = () => {
			const dist = this.spreadFrom(roots, off);
			return must.every((i) => dist[i] >= 0);
		};
		const dropEnds = () => {
			for (let changed = true; changed;) {
				changed = false;
				for (let i = 0; i < this.cell.length; i++) {
					if (this.cell[i] !== ROAD || need[i]) continue;
					const x = i % 76;
					if (this.roadNear(x, (i - x) / 76) <= 1) {
						this.set(i, FREE);
						changed = true;
					}
				}
			}
		};
		dropEnds();
		for (let changed = true; changed;) {
			changed = false;
			const seen = /* @__PURE__ */ new Uint8Array(5776);
			const runs = [];
			for (let i = 0; i < this.cell.length; i++) {
				if (seen[i] || this.cell[i] !== ROAD || need[i]) continue;
				const x0 = i % 76;
				if (this.roadNear(x0, (i - x0) / 76) !== 2) continue;
				const run = [];
				const stack = [i];
				seen[i] = 1;
				while (stack.length) {
					const j = stack.pop();
					run.push(j);
					const x = j % 76;
					const z = (j - x) / 76;
					for (const [dx, dz] of STEP4) {
						if (!inGrid(x + dx, z + dz)) continue;
						const k = (z + dz) * 76 + x + dx;
						if (seen[k] || this.cell[k] !== ROAD || need[k] || this.roadNear(x + dx, z + dz) !== 2) continue;
						seen[k] = 1;
						stack.push(k);
					}
				}
				runs.push(run);
			}
			runs.sort((p, q) => q.length - p.length || p[0] - q[0]);
			for (const run of runs) {
				if (run.length < 3 || !run.every((j) => this.bare(j))) continue;
				for (const j of run) off[j] = 1;
				if (ok()) {
					for (const j of run) {
						off[j] = 0;
						this.set(j, FREE);
					}
					changed = true;
					dropEnds();
					break;
				}
				for (const j of run) off[j] = 0;
			}
		}
	}
	/** Các ô đường (chỉ số ô), gần Điện trước. */
	roadCells() {
		const out = [];
		for (let i = 0; i < this.cell.length; i++) if (this.cell[i] === ROAD) out.push(i);
		const d = (i) => Math.hypot(i % 76 + .5 - DIEN_C, Math.floor(i / 76) + .5 - DIEN_C);
		return out.sort((a, b) => d(a) - d(b) || a - b);
	}
};
const near = (d, type, f) => {
	const s = d.slots.find((o) => o.type === type) ?? d.slots[0];
	const w = BUILDINGS[s.type].w;
	return Math.hypot(f.cx - s.x - w / 2, f.cz - s.z - w / 2);
};
/** Về phía rừng so với Điện (không về phía ngã ba sông). */
const forestSide = (f) => f.cx + f.cz > 2 * DIEN_C ? 40 : 0;
/** Cổ Loa: phạt chỗ không nằm trong đúng số vòng thành `rings` (3 là vòng trong, 0 là ngoài vòng ngoài). */
const zone = (d, f, rings) => Math.abs(d.ringsAround(f.x, f.z, f.w) - rings) * OFF_ZONE;
/** Phạt điểm chỗ dựng một mình lệch khỏi đường chéo: mẫu đứng đối xứng qua đường chéo từ góc rừng tới ngã ba sông. */
const ASYM = 8;
/** Thưởng điểm cho mỗi ô viền là đường, tường (`Draft.contact`): nhà xếp thành dãy dọc phố. */
const CONTACT = .6;
/**
* Phạt điểm mỗi ô viền sát nhà nhiều ô khác (`Draft.sat`): giữa hai nhà chừa hẻm một ô cho kinh đô thoáng, dễ bấm.
* Phạt nặng hơn mọi điểm chấm chỗ thường, nhẹ hơn phạt sai vòng thành (`OFF_ZONE`): hết chỗ thoáng mới xếp sát.
*/
const HEM = 20;
/**
* Các mức phạt sát nhà thử lần lượt (`veMau`): chừa hẻm hết cỡ, không đủ chỗ thì nhẹ tay hơn, cuối cùng xếp khít như
* trước. Đất mẫu đo cho dãy nhà khít (vòng thành Cổ Loa, khung theo bìa đất) nên có cấp không chừa hẻm hết được.
*/
const HEM_BAC = [
	HEM,
	4,
	1,
	0
];
function footAt(d, x, z, w) {
	const cx = x + w / 2;
	const cz = z + w / 2;
	return {
		x,
		z,
		w,
		cx,
		cz,
		river: Math.min(LAST - (x + w - 1), LAST - (z + w - 1)),
		forest: Math.min(x - d.lo, z - d.lo),
		dien: Math.hypot(cx - DIEN_C, cz - DIEN_C),
		diag: Math.abs(cx - cz)
	};
}
/** Xếp một công trình `type` vào chỗ điểm thấp nhất, ưu tiên chỗ trên đường chéo. Hết chỗ thì trả về false. */
function placeSingle(d, type, score) {
	const w = BUILDINGS[type].w;
	let best = null;
	let bestScore = Infinity;
	for (let z = d.lo; z + w - 1 <= LAST; z++) for (let x = d.lo; x + w - 1 <= LAST; x++) {
		if (!d.fits(type, x, z)) continue;
		const s = (x === z ? 0 : ASYM) + score(footAt(d, x, z, w), d) - CONTACT * d.contact(x, z, w) + d.hem * d.sat(type, x, z);
		if (s < bestScore) {
			bestScore = s;
			best = {
				x,
				z
			};
		}
	}
	if (!best) return false;
	d.put(type, best.x, best.z);
	return true;
}
/**
* Xếp một cặp công trình cùng cỡ đối xứng nhau qua đường chéo: `a` ở (x, z) phía bắc đường chéo, `b` ở (z, x)
* phía tây. Hết chỗ thì trả về false.
*/
function placePair(d, a, b, score) {
	const w = BUILDINGS[a].w;
	let best = null;
	let bestScore = Infinity;
	for (let z = d.lo; z + w - 1 <= LAST; z++) for (let x = z + w; x + w - 1 <= LAST; x++) {
		if (!d.fits(a, x, z) || !d.fits(b, z, x)) continue;
		const s = (score(footAt(d, x, z, w), d) + score(footAt(d, z, x, w), d)) / 2 - CONTACT * (d.contact(x, z, w) + d.contact(z, x, w)) / 2 + d.hem * (d.sat(a, x, z) + d.sat(b, z, x)) / 2;
		if (s < bestScore) {
			bestScore = s;
			best = {
				x,
				z
			};
		}
	}
	if (!best) return false;
	d.put(a, best.x, best.z);
	d.put(b, best.z, best.x);
	return true;
}
function placeJob(d, [what, score, from = 0, max = Infinity]) {
	const [a, b] = Array.isArray(what) ? what : [what, what];
	const had = new Map([a, b].map((t) => [t, d.count(t)]));
	const left = (t) => (d.level < from ? 0 : Math.min(wantOf(t, d.level), had.get(t) + max)) - d.count(t);
	for (;;) if (!(a === b ? left(a) >= 2 : left(a) >= 1 && left(b) >= 1) || !placePair(d, a, b, score)) break;
	for (const t of a === b ? [a] : [a, b]) while (left(t) > 0 && placeSingle(d, t, score));
}
/** Số chỗ còn thiếu so với số mẫu muốn (`wantOf`, `from` của từng việc) sau khi xếp. */
function shortfall(d, jobs) {
	const want = /* @__PURE__ */ new Map();
	for (const [what, , from = 0] of jobs) for (const t of Array.isArray(what) ? what : [what]) if (d.level >= from) want.set(t, wantOf(t, d.level));
	else if (!want.has(t)) want.set(t, 0);
	let n = 0;
	for (const [t, w] of want) n += Math.max(0, w - d.count(t));
	return n;
}
/** `n` vị trí rải đều trong đoạn [from, to]. */
function spread(n, from, to) {
	return Array.from({ length: n }, (_, i) => from + Math.floor((i + .5) * (to - from + 1) / n));
}
/** Đặt công trình một ô `type` ở ô gần (x, z) nhất còn trống trên cùng hàng (theo `alongX`) hay cùng cột. */
function segmentNear(d, type, x, z, alongX) {
	for (let k = 0; k < 4; k++) for (const s of k ? [k, -k] : [0]) if (d.segment(type, alongX ? x + s : x, alongX ? z : z + s)) return true;
	return false;
}
/** Ô trống gần ô (x, z) nhất (trong bán kính 10), không ra ngoài ô `inner` (cả x và z), ưu tiên ô giáp đường; -1 nếu không có. */
function freeNear(d, x, z, inner = d.lo + 1) {
	let best = -1;
	let bestScore = Infinity;
	for (let dz = -10; dz <= 10; dz++) for (let dx = -10; dx <= 10; dx++) {
		if (x + dx < inner || z + dz < inner || d.at(x + dx, z + dz) !== FREE) continue;
		const byRoad = STEP4.some(([ex, ez]) => d.at(x + dx + ex, z + dz + ez) === ROAD) ? 0 : .5;
		const s = Math.abs(dx) + Math.abs(dz) + byRoad;
		if (s < bestScore) {
			bestScore = s;
			best = (z + dz) * 76 + x + dx;
		}
	}
	return best;
}
/**
* Chòi canh dọc hai mặt: hàng `at` (chạy theo x) và cột `at` (chạy theo z), trong đoạn [from, to], chia đôi, rải
* đều, mỗi chòi vào ô trống gần chỗ định nhất (xếp sau công trình, vào kẽ trống; không ra ngoài ô `inner`). Số lẻ
* thì một chòi gần ô (`odd`, `odd`) trên đường chéo.
*/
function towersAlong(d, n, at, from, to, odd = at, inner = d.lo + 1) {
	if (n <= 0) return;
	const put = (x, z) => {
		const i = freeNear(d, x, z, inner);
		if (i >= 0) d.put("choiCanh", i % 76, Math.floor(i / 76));
	};
	if (n % 2) put(odd, odd);
	const k = Math.floor(n / 2);
	for (const p of spread(k, from, to)) {
		const i = freeNear(d, p, at, inner);
		if (i < 0) continue;
		const x = i % 76;
		const z = Math.floor(i / 76);
		d.put("choiCanh", x, z);
		if (d.at(z, x) === FREE) d.put("choiCanh", z, x);
		else put(at, p);
	}
}
/** Bẫy chông rải đều ở hàng ô ngoài cùng hai mặt rừng (bắc và tây), nửa mỗi mặt, tới ô `to`. */
function edgeTraps(d, to = LAST) {
	const n = wantOf("bayChong", d.level);
	const north = Math.ceil(n / 2);
	for (const x of spread(north, d.lo + 1, to)) segmentNear(d, "bayChong", x, d.lo, true);
	for (const z of spread(n - north, d.lo + 1, to)) segmentNear(d, "bayChong", d.lo, z, false);
}
/**
* Chia quãng `t` ô giữa hai phố thành các dải lô sâu 3–8 ô, giữa hai dải là một phố (mỗi dải giáp phố cả hai mặt).
* Trả về độ sâu từng dải, từ phía Điện ra; quãng dưới 3 ô thì không có dải nào.
*/
function splitSpan(t, mode) {
	if (t < 3) return [];
	const n = Math.ceil((t + 1) / (BAND + (mode === "wide" ? 3 : 1)));
	let sizes;
	if (mode === "even" || mode === "wide") {
		const body = t - (n - 1);
		sizes = Array.from({ length: n }, (_, i) => Math.floor(body / n) + (i < body % n ? 1 : 0));
	} else {
		sizes = Array.from({ length: n - 1 }, () => BAND);
		const rest = t - 9 * (n - 1);
		if (rest < 3 && n > 1) {
			const tot = sizes.pop() + rest;
			const a = Math.ceil(tot / 2);
			sizes.push(a, tot - a);
		} else sizes.push(rest);
		if (mode === "out") sizes.reverse();
	}
	return sizes;
}
/**
* Các phố chữ L chia quãng giữa phố `inner` (phía Điện) và phố `outer` (phía rừng) thành dải lô theo `mode`, mỗi phố
* chạy tới ô `end`. Trả về hàng các phố đã trải (kể cả hai phố biên nếu `edges`).
*/
function streets(d, inner, outer, end, mode) {
	const out = [];
	let v = inner;
	for (const s of splitSpan(inner - outer - 1, mode).slice(0, -1)) {
		v -= s + 1;
		d.ell(v, end);
		out.push(v);
	}
	return out;
}
/** Đường quanh Điện: vòng vuông kín sát bốn mặt Điện. */
function palaceRing(d) {
	d.road(PALACE_A, PALACE_A, PALACE_B, PALACE_A);
	d.road(PALACE_A, PALACE_B, PALACE_B, PALACE_B);
	d.road(PALACE_A, PALACE_A, PALACE_A, PALACE_B);
	d.road(PALACE_B, PALACE_A, PALACE_B, PALACE_B);
}
/** Đường quanh Điện nối ra tới ô `end` (sông hay đường chân đê): bốn mặt kéo dài về phía sông. */
function palaceRoads(d, end) {
	palaceRing(d);
	d.ell(PALACE_A, end);
	d.road(PALACE_A, PALACE_B, end, PALACE_B);
	d.road(PALACE_B, PALACE_A, PALACE_B, end);
}
/**
* Chừa ô ngay trước và ngay sau cặp cổng ở (x, at) mặt bắc và (at, x) mặt tây: dân gánh hàng chỉ qua tường ở cổng
* (tường chắn hẳn), công trình đứng sát cổng thì cổng thành vô dụng.
*/
function keepGate(d, x, at) {
	d.mark(x, at - 1, x, at - 1, KEEP);
	d.mark(x, at + 1, x, at + 1, KEEP);
	d.mark(at - 1, x, at - 1, x, KEEP);
	d.mark(at + 1, x, at + 1, x, KEEP);
}
/** Chỗ trong mẫu ở ô (x, z), nếu có. */
const slotAt = (d, x, z) => d.slotOf(z * 76 + x);
/**
* Phong Châu: lũy tre bao hai mặt rừng (bắc và tây), bẫy chông ở hàng ngoài lũy, phố trong lũy; đường quanh Điện;
* các phố chữ L giữa hai đường ấy chạy tới sông; hai trục giữa Điện ra cổng lũy (từ cấp Điện có cổng thành).
*/
function luyTre(d, v) {
	const lo = d.lo;
	for (let x = lo + 1; x <= LAST; x++) d.segment("luy", x, lo + 1);
	for (let z = lo + 2; z <= LAST; z++) d.segment("luy", lo + 1, z);
	edgeTraps(d);
	if (wantOf("congThanh", d.level) > 0) {
		for (const s of [slotAt(d, GATE_AXIS, lo + 1), slotAt(d, lo + 1, GATE_AXIS)]) if (s?.type === "luy") s.cong = true;
		keepGate(d, GATE_AXIS, lo + 1);
	}
	palaceRoads(d, LAST);
	const outer = lo + 2;
	if (PALACE_A - outer - 1 >= 3) {
		d.ell(outer, LAST);
		streets(d, PALACE_A, outer, LAST, v.split);
		d.axis(outer, PALACE_A);
	}
}
/**
* Đê bao dọc hai bờ sông, cách sông 3 ô, chạy suốt tới bìa đất; bãi ngoài đê chỉ cho bến, làng chài. Đường chân đê
* ngay trong đê, bẫy chông ở bìa rừng, phố bìa rừng ngay trong hàng bẫy.
*/
function deBaoWalls(d) {
	const lo = d.lo;
	for (let z = lo; z <= DE_AT; z++) d.segment("de", DE_AT, z);
	for (let x = lo; x < DE_AT; x++) d.segment("de", x, DE_AT);
	d.mark(DE_AT + 1, lo, LAST, LAST, BANK);
	d.mark(lo, DE_AT + 1, LAST, LAST, BANK);
	edgeTraps(d, DE_AT - 1);
	d.road(CHAN_DE, lo + 1, CHAN_DE, CHAN_DE);
	d.road(lo + 1, CHAN_DE, CHAN_DE, CHAN_DE);
	d.ell(lo + 1, CHAN_DE);
}
/** Đê bao: đê, đường quanh Điện nối ra đường chân đê, các phố chữ L giữa Điện và bìa rừng. */
function deBao(d, v) {
	deBaoWalls(d);
	palaceRoads(d, CHAN_DE);
	streets(d, PALACE_A, d.lo + 1, CHAN_DE, v.split);
}
/**
* Ba vòng thành Cổ Loa quanh Điện theo cách dựng `v`. Phía sông (đông, nam) ba vòng đứng sát nhau. Vòng trong ôm sát
* Điện, hay chừa đường quanh Điện; phía rừng, khu giữa vòng trong và vòng giữa dày `t1` ô, khu giữa vòng giữa và vòng
* ngoài dày `t2` ô (5: một dãy nhà và một phố; 9: hai dãy nhà và một phố giữa).
*/
function ringsOf(v) {
	const a1 = v.tight ? 31 : 30;
	const b1 = v.tight ? DIEN_END + 1 : DIEN_END + 2;
	const a2 = a1 - v.t1 - 1;
	const a3 = a2 - v.t2 - 1;
	return [
		{
			a: a1,
			b: b1
		},
		{
			a: a2,
			b: b1 + 1
		},
		{
			a: a3,
			b: b1 + 2
		}
	];
}
/** Số đoạn thành của các vòng. */
const ringCost = (rings) => rings.reduce((n, r) => n + 4 * (r.b - r.a), 0);
/** Phố trong khu dày `t` ô giữa vòng thành `wall` (phía Điện) và vòng ngoài nó: sát vòng ngoài (5) hay giữa khu (9). */
const bandRoad = (wall, t) => t >= 9 ? wall - 5 : wall - t;
/**
* Cổ Loa: đê bao như mẫu Đê bao; ba vòng thành kín quanh Điện (`ringsOf`); cổng trên vòng ngoài và vòng giữa ở hai
* trục giữa Điện, đoạn trục nối cổng với phố trong khu; phố trong từng khu giữa hai vòng; ngoài vòng ngoài một phố sát
* chân thành (cổng ngoài mở ra phố này), các phố chữ L ra tới bìa rừng, tới đường chân đê.
*/
function coLoaWalls(d, v) {
	d.rings = ringsOf(v);
	for (const { a, b } of d.rings) for (let k = a; k <= b; k++) {
		d.segment("thanh", k, a);
		d.segment("thanh", k, b);
		d.segment("thanh", a, k);
		d.segment("thanh", b, k);
	}
	const [r1, r2, r3] = d.rings;
	const want = wantOf("congThanh", d.level);
	for (const r of want >= 4 ? [r3, r2] : want > 0 ? [r3] : []) {
		for (const s of [slotAt(d, GATE_AXIS, r.a), slotAt(d, r.a, GATE_AXIS)]) if (s) s.cong = true;
		keepGate(d, GATE_AXIS, r.a);
	}
	deBaoWalls(d);
	if (!v.tight) palaceRing(d);
	d.mark(r1.a + 1, r1.a + 1, r1.b - 1, r1.b - 1, KEEP);
	const p1 = bandRoad(r1.a, v.t1);
	d.ell(p1, r1.b);
	d.road(GATE_AXIS, r2.a + 1, GATE_AXIS, r1.a - 1);
	d.road(r2.a + 1, GATE_AXIS, r1.a - 1, GATE_AXIS);
	const p2 = bandRoad(r2.a, v.t2);
	d.ell(p2, r2.b);
	d.road(GATE_AXIS, r3.a + 1, GATE_AXIS, r2.a - 1);
	d.road(r3.a + 1, GATE_AXIS, r2.a - 1, GATE_AXIS);
	const outer = r3.a - 1;
	d.ell(outer, CHAN_DE);
	streets(d, outer, d.lo + 1, CHAN_DE, v.split);
}
/** Chòi canh mẫu Đê bao, Cổ Loa: ngay trong đê dọc hai bờ (số lẻ thì một chòi ở góc rừng). */
function deTowers(d) {
	towersAlong(d, wantOf("choiCanh", d.level), CHAN_DE - 1, d.lo + 2, CHAN_DE - 2, d.lo + 2);
}
/** Chòi canh mẫu Phong Châu: ngay trong lũy, rải hai mặt rừng. */
function luyTowers(d) {
	towersAlong(d, wantOf("choiCanh", d.level), d.lo + 3, d.lo + 4, LAST, d.lo + 3, d.lo + 2);
}
/**
* Cổ Loa giữ sông: ụ nỏ trên vòng thành ngoài, chia đều bốn mặt (bắc, tây phía rừng; hai mặt phía sông), né cổng.
* Chòi canh: ba chỗ dành cho lầu nỏ (hai ở phía sông giữa vòng ngoài và đường chân đê, một ở góc bắc tây), còn lại
* rải ở mặt bắc và mặt tây gần bìa rừng.
*/
function coLoaSongMarks(d) {
	const outer = d.rings[d.rings.length - 1];
	const n = U_NO.limit[d.level - 1] ?? 0;
	const per = Math.ceil(n / 4);
	let left = n;
	const mark = (x, z) => {
		const s = slotAt(d, x, z);
		if (left > 0 && s?.type === "thanh" && !s.uNo && !s.cong) {
			s.uNo = true;
			left--;
		}
	};
	for (const p of spread(per, outer.a + 2, outer.b - 1)) {
		const q = p === GATE_AXIS ? p + 1 : p;
		mark(q, outer.a);
		mark(outer.a, q);
		mark(q, outer.b);
		mark(outer.b, q);
	}
}
function coLoaSongTowers(d) {
	const lo = d.lo;
	const want = wantOf("choiCanh", d.level);
	const outer = d.rings[d.rings.length - 1];
	const lau = [
		[DIEN_END - 2, outer.b + 1],
		[outer.b + 1, DIEN_END - 2],
		[lo + 2, lo + 2]
	];
	for (const [x, z] of lau.slice(0, Math.min(3, want))) {
		const i = freeNear(d, x, z);
		if (i < 0) continue;
		d.put("choiCanh", i % 76, Math.floor(i / 76));
		d.slots[d.slots.length - 1].lau = true;
	}
	towersAlong(d, want - d.count("choiCanh"), lo + 2, lo + 5, outer.b, lo + 2);
}
/** Gần sông (trong đê nếu có đê), gần Điện trước. */
const byRiver = (f) => f.river * 2 + f.dien * .3;
/** Gần Điện. */
const byDien = (f) => f.dien;
/** Kho cách kho khác chừng này ô trở lên thì không bị phạt điểm. */
const KHO_XA = 14;
/**
* Kho: gần Điện, nhưng rải ra, xa các kho đã xếp (người gánh khắp kinh đô có kho gần; giặc phá một kho xong còn phải
* đi xa mới tới kho sau).
*/
const byKho = (f, d) => {
	let p = 0;
	for (const s of d.slots) if (s.type === "kho") p += Math.max(0, KHO_XA - Math.hypot(f.cx - s.x - 1.5, f.cz - s.z - 1.5)) * 3;
	return f.dien + p;
};
/** Trên đồi phía rừng, gần bìa đất. */
const byHill = (f) => f.forest * 2 + f.dien * .2;
/** Trên đường chéo từ Điện về góc rừng, gần Điện trước: trục đền, doanh trại. */
const byAxis = (f) => f.diag * 4 + f.dien + forestSide(f);
/** Trên đường chéo, gần ngã ba sông: doanh trại trong đê, kịp ra chặn thủy quái từ hai bờ sông. */
const byBank = (f) => f.diag * 4 + f.river * 2;
/** Quanh doanh trại. */
const byBarracks = (f, d) => near(d, "doanhTrai", f);
/** Quanh bếp gói bánh. */
const byKitchen = (f, d) => near(d, "bep", f);
/** Gần các bến: kho ngoài thành Cổ Loa cho bến, ruộng khỏi đi vòng tới cổng (tường chắn hẳn dân gánh hàng). */
const byBen = (f, d) => near(d, "ben", f);
/** Cổ Loa: trong đúng số vòng thành `rings` rồi mới tới cách chấm `score`. */
const inRings = (rings, score) => (f, d) => zone(d, f, rings) + score(f, d);
const SPLITS = [
	"in",
	"out",
	"even",
	"wide"
];
const plain = () => [SPLITS.map((split) => ({ split }))];
/**
* Cách dựng vòng thành Cổ Loa ở cấp Điện `level`, trong số đoạn thành tối đa: chừa đường quanh Điện trước, khu giữa
* các vòng hẹp trước (đất ngoài thành rộng cho nhà 8×8, ruộng).
*/
function coLoaVariants(level) {
	const max = BUILDINGS.thanh.limit[level - 1] ?? 0;
	const out = [];
	for (const [t1, t2] of [
		[5, 5],
		[9, 5],
		[5, 9],
		[9, 9]
	]) for (const tight of [false, true]) {
		const v = {
			tight,
			t1,
			t2
		};
		if (ringCost(ringsOf({
			split: "in",
			...v
		})) > max) continue;
		out.push(SPLITS.map((split) => ({
			split,
			...v
		})));
	}
	return out;
}
const RECIPES = {
	phongChau: {
		walls: luyTre,
		towers: luyTowers,
		variants: plain,
		jobs: [
			["doanhTrai", byAxis],
			["ben", byDien],
			["langChai", byDien],
			["benKhoi", byDien],
			["denPhuDong", byAxis],
			["traiGiao", byBarracks],
			[["traiCung", "chuongVoi"], byBarracks],
			[
				"nhaThuoc",
				byBarracks,
				4
			],
			["ruong", byRiver],
			["ruongNep", byRiver],
			["loRen", byBarracks],
			["nhaSan", byDien],
			["kho", byKho],
			["bep", byDien],
			[["vuon", "chuongLon"], byKitchen],
			["thoHo", byDien],
			["baiDa", byHill],
			["xuongMoc", byHill]
		]
	},
	deBao: {
		walls: deBao,
		towers: deTowers,
		variants: plain,
		jobs: [
			["doanhTrai", byBank],
			["ben", byDien],
			["langChai", byDien],
			["benKhoi", byDien],
			[["denPhuDong", "denTanVien"], byAxis],
			["traiGiao", byBarracks],
			[["traiCung", "chuongVoi"], byBarracks],
			[
				"nhaThuoc",
				byBarracks,
				4
			],
			["ruong", byRiver],
			["ruongNep", byRiver],
			["loRen", byBarracks],
			["nhaSan", byDien],
			["kho", byKho],
			["bep", byDien],
			[["vuon", "chuongLon"], byKitchen],
			["thoHo", byDien],
			["baiDa", byHill],
			["xuongMoc", byHill]
		]
	},
	nghiaLinh: {
		rong: 2,
		walls: deBao,
		towers: deTowers,
		variants: plain,
		jobs: [
			["ben", byDien],
			["langChai", byDien],
			["benKhoi", byDien],
			["ruong", byRiver],
			["ruongNep", byRiver],
			["doanhTrai", byAxis],
			[["denPhuDong", "denTanVien"], byAxis],
			["traiGiao", byBarracks],
			[["traiCung", "chuongVoi"], byBarracks],
			[
				"nhaThuoc",
				byBarracks,
				4
			],
			["loRen", byBarracks],
			["nhaSan", byDien],
			["kho", byKho],
			["bep", byDien],
			[["vuon", "chuongLon"], byKitchen],
			["thoHo", byDien],
			["baiDa", byHill],
			["xuongMoc", byHill]
		]
	},
	coLoa: {
		walls: coLoaWalls,
		towers: deTowers,
		variants: coLoaVariants,
		jobs: [
			["doanhTrai", inRings(0, byAxis)],
			["hoKimQuy", inRings(0, byHill)],
			["ben", byDien],
			["langChai", byDien],
			["benKhoi", byDien],
			[
				"kho",
				inRings(0, byBen),
				5,
				2
			],
			["denCoLoa", inRings(1, byAxis)],
			["nhaSan", inRings(2, byDien)],
			["kho", inRings(2, byKho)],
			["bep", inRings(2, byDien)],
			["loRen", inRings(1, byDien)],
			[["vuon", "chuongLon"], inRings(1, byKitchen)],
			["thoHo", inRings(1, byDien)],
			[["denPhuDong", "denTanVien"], inRings(0, byBarracks)],
			["traiGiao", inRings(0, byBarracks)],
			[["traiCung", "chuongVoi"], inRings(0, byBarracks)],
			[
				"nhaThuoc",
				inRings(1, byDien),
				4
			],
			["ruongNep", inRings(0, byRiver)],
			["ruong", inRings(0, byRiver)],
			["baiDa", inRings(0, byHill)],
			["xuongMoc", inRings(0, byHill)]
		]
	},
	coLoaSong: {
		walls: (d, v) => {
			coLoaWalls(d, v);
			coLoaSongMarks(d);
		},
		towers: coLoaSongTowers,
		variants: coLoaVariants,
		jobs: [
			["doanhTrai", inRings(0, byAxis)],
			[
				"hoKimQuy",
				inRings(0, byAxis),
				6
			],
			[
				"denRongTien",
				inRings(0, byAxis),
				10
			],
			["ben", byDien],
			["langChai", byDien],
			["benKhoi", byDien],
			[
				"kho",
				inRings(0, byBen),
				5,
				2
			],
			["denCoLoa", inRings(1, byAxis)],
			["nhaSan", inRings(2, byDien)],
			["kho", inRings(2, byKho)],
			["bep", inRings(2, byDien)],
			["loRen", inRings(1, byDien)],
			[["vuon", "chuongLon"], inRings(1, byKitchen)],
			["thoHo", inRings(1, byDien)],
			[["denPhuDong", "denTanVien"], inRings(0, byBarracks)],
			["denCuong", inRings(0, byAxis)],
			[
				"denHatMon",
				inRings(0, byAxis),
				9
			],
			["traiGiao", inRings(0, byBarracks)],
			[["traiCung", "chuongVoi"], inRings(0, byBarracks)],
			[
				"nhaThuoc",
				inRings(1, byDien),
				4
			],
			["traiNo", inRings(0, byBarracks)],
			["ruong", inRings(0, byRiver)],
			["ruongNep", inRings(0, byRiver)],
			["baiDa", inRings(0, byHill)],
			["xuongMoc", inRings(0, byHill)]
		]
	}
};
/** Dựng mẫu `id` ở cấp Điện `level` trên khung cạnh `side` theo cách `v`. */
function drawWith(id, level, side, v, hem, hep = false) {
	const recipe = RECIPES[id];
	const d = new Draft(level, side, hem, hep ? 1 : recipe.rong);
	d.put("dien", 32, 32);
	recipe.walls(d, v);
	for (const job of recipe.jobs) placeJob(d, job);
	recipe.towers(d);
	d.prune();
	return {
		d,
		thieu: shortfall(d, recipe.jobs)
	};
}
/**
* Dựng mẫu `id` ở cấp Điện `level` trên khung cạnh `side` (mặc định `MAU_KHUNG`): thử từng mức chừa hẻm (`hems`,
* mặc định `HEM_BAC`), mỗi mức các cách dựng khung theo thứ tự ưu tiên, lấy cách đầu tiên xếp đủ mọi công trình
* (không có thì cách thiếu ít nhất).
*/
function veMau(id, level, side = khungOf(id, level), hems = HEM_BAC, hep = false) {
	let best = null;
	search: for (const hem of hems) for (const group of RECIPES[id].variants(level)) for (const v of group) {
		const r = drawWith(id, level, side, v, hem, hep);
		if (!best || r.thieu < best.thieu) best = r;
		if (!best.thieu) break search;
	}
	const d = best.d;
	return {
		slots: d.slots,
		duong: d.roadCells().map((i) => ({
			x: i % 76,
			z: Math.floor(i / 76)
		})),
		thieu: best.thieu
	};
}
const DRAWN = /* @__PURE__ */ new Map();
/** `hep`: mẫu giãn hẻm rộng (`Recipe.rong`) dựng lại với hẻm một ô như các mẫu khác (khi đất đã mở không đủ cho bản giãn). */
function drawn(id, level, khit = false, hep = false) {
	const lv = Math.min(Math.max(Math.round(level), 1), BUILDINGS.dien.maxLevel);
	const key = `${id}:${lv}:${khit ? 1 : 0}:${hep ? 1 : 0}`;
	let ve = DRAWN.get(key);
	if (!ve) {
		ve = veMau(id, lv, void 0, khit ? [0] : HEM_BAC, hep);
		DRAWN.set(key, ve);
	}
	return ve;
}
/**
* Mọi chỗ trong mẫu `id` ở cấp Điện `level` (cả Điện), đều trong khung dựng mẫu ở cấp ấy. `khit`: xếp khít như trước
* khi có hẻm (kinh đô máy Đấu thành giữ bố cục cũ cho cân bằng sao không đổi).
*/
function mauSlots(id, level, khit = false) {
	return drawn(id, level, khit).slots;
}
[...HERO_KINDS];
1 / LOI_DAI.thuVong;
[...TUONG_DA_IDS];
const TUAN_MS = 6048e5;
/** Lệch cho tuần bắt đầu 0 giờ thứ Hai giờ Việt Nam (UTC+7), máy đặt múi giờ nào cũng như nhau; mốc 0 của `now` là thứ Năm. */
const TUAN_LECH$1 = 2844e5;
/** Số thứ tự tuần của thời điểm `now` (mili giây như `Date.now()`). */
const tuanCua = (now) => Math.floor((now + TUAN_LECH$1) / TUAN_MS);
// src/game/vietNamHinh.ts
/** Tỉnh chung cạnh (mã tỉnh), tính từ cạnh chung dài từ 1 km. */
const LANG_GIENG_HINH = {
	"10": [
		"01",
		"02",
		"07",
		"08",
		"11",
		"12"
	],
	"11": [
		"02",
		"03",
		"07",
		"10"
	],
	"12": [
		"01",
		"06",
		"08",
		"09",
		"10",
		"15",
		"16"
	],
	"13": ["14", "15"],
	"14": [
		"09",
		"13",
		"15"
	],
	"15": [
		"09",
		"12",
		"13",
		"14",
		"16"
	],
	"16": [
		"06",
		"12",
		"15",
		"17"
	],
	"17": ["16", "18"],
	"18": ["17", "19"],
	"19": ["18", "20"],
	"20": ["19", "21"],
	"21": ["20", "22"],
	"22": ["21", "24"],
	"23": ["25", "26"],
	"24": ["22", "25"],
	"25": [
		"23",
		"24",
		"26"
	],
	"26": [
		"23",
		"25",
		"28",
		"79"
	],
	"27": [
		"28",
		"31",
		"79"
	],
	"28": [
		"26",
		"27",
		"79"
	],
	"30": ["31", "33"],
	"31": [
		"27",
		"30",
		"32",
		"33",
		"79"
	],
	"32": [
		"31",
		"33",
		"34"
	],
	"33": [
		"30",
		"31",
		"32",
		"34"
	],
	"34": ["32", "33"],
	"79": [
		"26",
		"27",
		"28",
		"31"
	],
	"02": [
		"01",
		"03",
		"04",
		"05",
		"10",
		"11"
	],
	"07": [
		"08",
		"10",
		"11"
	],
	"01": [
		"02",
		"05",
		"06",
		"10",
		"12"
	],
	"04": [
		"02",
		"03",
		"05"
	],
	"05": [
		"01",
		"02",
		"04",
		"06"
	],
	"09": [
		"08",
		"12",
		"14",
		"15"
	],
	"06": [
		"01",
		"05",
		"12",
		"16"
	],
	"03": [
		"02",
		"04",
		"11"
	],
	"08": [
		"07",
		"09",
		"10",
		"12"
	]
};
// src/game/vietNam.ts
/** Mã 34 tỉnh, thành theo tệp hình (mã của nguồn Free-GIS-Data), xếp từ bắc vào nam. */
const TINH_IDS = [
	"07",
	"11",
	"08",
	"09",
	"14",
	"13",
	"15",
	"10",
	"12",
	"02",
	"01",
	"03",
	"04",
	"05",
	"06",
	"16",
	"17",
	"18",
	"19",
	"20",
	"21",
	"22",
	"24",
	"25",
	"23",
	"26",
	"28",
	"79",
	"27",
	"31",
	"30",
	"33",
	"32",
	"34"
];
/** 18 tỉnh từ Hà Tĩnh trở ra: đất Văn Lang từ đầu. */
const DAT_VAN_LANG = TINH_IDS.slice(0, 18);
/**
* 21 tỉnh, thành giáp biển (kể cả bờ đảo). Hình tỉnh không phân biệt bờ biển với biên giới đất liền, nên ghi tay; test
* canh khớp với viền ngoài tính từ hình (`VIEN_NGOAI_KM`).
*/
const GIAP_BIEN = [
	"03",
	"04",
	"05",
	"06",
	"16",
	"17",
	"18",
	"19",
	"20",
	"21",
	"22",
	"24",
	"25",
	"23",
	"26",
	"79",
	"31",
	"30",
	"33",
	"32",
	"34"
];
const laTinh = (v) => typeof v === "string" && TINH_IDS.includes(v);
const giapBien = (id) => GIAP_BIEN.includes(id);
/** Tỉnh chung cạnh (tính từ hình tỉnh). */
const langGieng = (id) => LANG_GIENG_HINH[id] ?? [];
/** Sáu chức Bồ chính (tên ghép "Bồ chính + việc" đặt cho game; sử chỉ có "Bồ chính"). */
const CHUC_IDS = [
	"quan",
	"nong",
	"thuy",
	"thuong",
	"bien",
	"hai"
];
/** Bên võ (quân, biên, hải) và bên văn (nông, thủy, thương): Lạc tướng, Lạc hầu của tỉnh chọn theo hai bên (PR 4). */
const CHUC_VO = [
	"quan",
	"bien",
	"hai"
];
const laChuc = (v) => typeof v === "string" && CHUC_IDS.includes(v);
/** Chức nào có ở tỉnh `id`: Bồ chính hải chỉ ở tỉnh giáp biển. */
const chucCo = (id) => giapBien(id) ? CHUC_IDS : CHUC_IDS.filter((c) => c !== "hai");
/** Mùa thứ mấy (4 tuần một mùa, mỗi mùa bắt đầu 0 giờ thứ Hai giờ Việt Nam). */
const muaCua = (now) => Math.floor(tuanCua(now) / VIET_NAM.muaTuan);
muaCua(Date.UTC(2026, 10, 22, 17));
/** Của mỗi chức góp. Bồ chính quân góp bằng đánh giặc chung (PR 3), nên chưa góp của. */
const CHUC_GOP = {
	quan: [],
	nong: ["gao"],
	thuy: ["datDa"],
	thuong: ["voOc", "go"],
	bien: ["sat"],
	hai: ["go", "sat"]
};
const NGAY_MS$1 = 864e5;
/** Ngày thứ mấy theo giờ Việt Nam (UTC+7): trần góp mỗi ngày tính lại lúc 0 giờ. */
const ngayCua = (now) => Math.floor((now + 252e5) / NGAY_MS$1);
/** Điểm của `luong` của góp khi kho chứa `cap`: 1 điểm mỗi 1% sức chứa, làm tròn xuống. */
const diemGop = (luong, cap) => cap > 0 ? Math.floor(luong * 100 / cap) : 0;
// src/game/save.ts
function toBase64(bytes) {
	let bin = "";
	for (const byte of bytes) bin += String.fromCharCode(byte);
	return btoa(bin);
}
function fromBase64(text) {
	return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}
// src/game/dauThanh.ts
/** Công trình đưa vào bản chụp: bờ bên này, không phải đường đi, trang trí hay cầu. */
const snapped = (b) => !isDecor(b.type) && !isBridge(b.type) && farBankOf(b.x, b.z) === null;
/** Nhiệm vụ đầu của từng chương (để kinh đô dựng lại ở đúng chương). */
const QUEST_OF = {
	1: 0,
	2: 20,
	3: 30,
	4: 40,
	5: 52
};
/**
* Tướng vào trận Đấu thành: bỏ phần chỉ số đồ có sẵn (không tin số gửi lên), tính lại từ món `mon` (`tinhDo`). Không
* món nào thì tướng không đồ.
*/
function ganDoChup(h, mon) {
	const out = { ...h };
	delete out.trangBi;
	if (mon?.length) out.trangBi = tinhDo(h.kind, mon);
	return out;
}
/** Tướng của bản chụp, gắn đồ tính lại từ món trong bản chụp: tướng giữ thành, hay tướng đi đánh của người đánh. */
const tuongChup = (snap) => snap.heroes.map((h) => ganDoChup(h, snap.trangBi?.[h.kind]));
/** Kinh đô dùng một lần dựng từ bản chụp: để đánh và để vẽ. Không đụng tới kinh đô của người chơi. */
function defenderState(snap) {
	const s = createInitialState(0);
	s.questIndex = QUEST_OF[snap.chapter];
	s.buildings = snap.buildings.map((b, i) => {
		const out = {
			id: i + 1,
			type: b.type,
			x: b.x,
			z: b.z,
			level: b.level,
			workers: 0
		};
		if (b.rot) out.rot = b.rot;
		if (b.uNo) out.uNo = "ok";
		out.workers = slotsOf(out);
		return out;
	});
	s.nextId = s.buildings.length + 1;
	const heights = baseHeights();
	for (let k = 0; k + 1 < snap.heights.length; k += 2) heights[snap.heights[k]] = snap.heights[k + 1];
	s.heights = heights;
	s.khoanh = [...snap.khoanh];
	s.resources = { ...snap.resources };
	return s;
}
/** Bên giữ thành của trận, lấy từ bản chụp. */
function defenseOf(snap) {
	return {
		hpMul: DAU_THANH.hpMul[snap.dien - 1],
		siege: DAU_THANH.siege[snap.dien - 1],
		guards: snap.guards.map((g) => ({ ...g })),
		heroes: tuongChup(snap),
		bonus: snap.bonus,
		arms: { ...snap.arms },
		huan: { ...snap.huan },
		crossbows: snap.crossbows,
		walls: snap.walls
	};
}
const SNAP_PREFIX = "TDVS1:";
/** Mã bản chụp dài nhất nhận (kinh đô xây kín chừng vài nghìn ký tự). */
const SNAP_MAX = 64e3;
function encodeSnapshot(snap) {
	return SNAP_PREFIX + toBase64(deflateSync(new TextEncoder().encode(JSON.stringify(snap)), { level: 9 }));
}
/** Đọc mã bản chụp. Mã hỏng hay sai dạng thì trả undefined (chưa kiểm luật: xem `validateSnapshot`). */
function decodeSnapshot(code) {
	const text = code.length > SNAP_MAX ? "" : code.replace(/\s+/g, "");
	if (!text.startsWith(SNAP_PREFIX)) return void 0;
	try {
		const raw = JSON.parse(new TextDecoder().decode(inflateSync(fromBase64(text.slice(6)))));
		return isSnapshotShape(raw) ? raw : void 0;
	} catch {
		return;
	}
}
const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const isNum = (v, lo, hi) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
const isRecordOf = (v, keys, test) => isObj(v) && keys.every((k) => test(v[k]));
/** Bản chụp đúng dạng (kiểu dữ liệu), chưa xét luật. */
function isSnapshotShape(v) {
	if (!isObj(v) || v.v !== 1 || !isInt(v.dien, 1, BUILDINGS.dien.maxLevel) || !isInt(v.chapter, 1, 5)) return false;
	if (!Array.isArray(v.buildings) || v.buildings.length > 2e3) return false;
	for (const b of v.buildings) {
		if (!isObj(b) || typeof b.type !== "string" || !(b.type in BUILDINGS)) return false;
		if (!isInt(b.x, 0, 75) || !isInt(b.z, 0, 75) || !isInt(b.level, 1, 99)) return false;
		if (b.rot !== void 0 && !isInt(b.rot, 1, 3)) return false;
		if (b.uNo !== void 0 && b.uNo !== "ok") return false;
	}
	if (!Array.isArray(v.heights) || v.heights.length % 2 || !v.heights.every((h) => isInt(h, 0, 5776))) return false;
	if (!Array.isArray(v.khoanh) || !v.khoanh.every((k) => isInt(k, 0, 999))) return false;
	if (!isRecordOf(v.resources, RESOURCE_IDS, (x) => isNum(x, 0, 1e9)) || !isNum(v.cap, 0, 1e9)) return false;
	if (!Array.isArray(v.guards)) return false;
	for (const g of v.guards) {
		if (!isObj(g) || !isInt(g.at, 0, 1999) || !UNIT_TYPES.includes(g.kind) || !isInt(g.n, 0, 999)) return false;
		if (g.nu !== void 0 && g.nu !== true) return false;
	}
	if (!isRecordOf(v.troops, UNIT_TYPES, (x) => isInt(x, 0, 9999))) return false;
	if (!Array.isArray(v.heroes) || v.heroes.length > 2 || !v.heroes.every((h) => isObj(h) && HERO_TRUYEN.includes(h.kind))) return false;
	if (v.trangBi !== void 0) {
		if (!isObj(v.trangBi)) return false;
		for (const [kind, list] of Object.entries(v.trangBi)) if (!HERO_TRUYEN.includes(kind) || !Array.isArray(list) || list.length > O_DO.length || !list.every(isObj)) return false;
	}
	if (!isNum(v.bonus, 0, 1) || typeof v.crossbows !== "boolean" || typeof v.walls !== "boolean") return false;
	return isRecordOf(v.arms, UNIT_TYPES, (x) => isInt(x, 0, 9)) && isRecordOf(v.huan, HUAN_BRANCHES, (x) => isInt(x, 0, 9));
}
/**
* Đồ của tướng trong bản chụp hợp luật không: tướng không mang sẵn chỉ số đồ, tướng có món phải là tướng giữ thành,
* mỗi ô một món, từng món có thể là món rơi thật tới chương của bản chụp (`kiemMon`).
*/
function kiemDoChup(snap) {
	if (snap.heroes.some((h) => "trangBi" in h)) return "tướng mang sẵn chỉ số đồ";
	for (const [kind, list] of Object.entries(snap.trangBi ?? {})) {
		if (!snap.heroes.some((h) => h.kind === kind)) return `${kind} không giữ thành mà có đồ`;
		const o = /* @__PURE__ */ new Set();
		for (const m of list) {
			const why = kiemMon(m, snap.chapter);
			if (why) return `${kind}: ${why}`;
			if (o.has(m.o)) return `${kind}: hai món cùng ô ${m.o}`;
			o.add(m.o);
		}
	}
	return null;
}
/**
* Bản chụp có hợp luật không (chống bản chụp sửa tay): số công trình mỗi loại, cấp so với cấp Điện, chỗ đặt không
* chồng nhau, đúng một Điện, ụ nỏ, lính giữ thành, binh khí, huân công, Đền, đồ của tướng, của so với sức chứa kho.
* Trả về lý do sai đầu tiên (để test và nhật ký), hay null nếu hợp luật.
*/
function validateSnapshot(snap) {
	if (!isSnapshotShape(snap)) return "sai dạng";
	const lv = snap.dien - 1;
	const count = /* @__PURE__ */ new Map();
	const grid = /* @__PURE__ */ new Uint8Array(5776);
	for (const b of snap.buildings) {
		const def = BUILDINGS[b.type];
		if (!snapped(b)) return `${b.type}: không chụp loại hay chỗ này`;
		if (b.level > def.maxLevel || dienNeededFor(b.type, b.level) > snap.dien) return `${b.type} cấp ${b.level} vượt Điện ${snap.dien}`;
		if (b.uNo && b.type !== "thanh") return `${b.type}: ụ nỏ chỉ ở trên thành`;
		for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) {
			if (!inGrid(b.x + dx, b.z + dz)) return `${b.type} ra ngoài lưới`;
			const i = (b.z + dz) * 76 + b.x + dx;
			if (grid[i]) return `${b.type} chồng lên công trình khác ở (${b.x + dx}, ${b.z + dz})`;
			grid[i] = 1;
		}
		count.set(b.type, (count.get(b.type) ?? 0) + 1);
	}
	if (count.get("dien") !== 1) return "phải có đúng một Điện";
	if (snap.buildings.find((b) => b.type === "dien").level !== snap.dien) return "cấp Điện không khớp";
	for (const [type, n] of count) if (n > (BUILDINGS[type].limit[lv] ?? 0)) return `${type}: ${n} cái, quá giới hạn`;
	if ((count.get("choiCanh") ?? 0) + 2 * (count.get("lauNo") ?? 0) > (BUILDINGS.choiCanh.limit[lv] ?? 0)) return "quá số chòi canh";
	if (snap.buildings.filter((b) => b.uNo).length > (U_NO.limit[lv] ?? 0)) return "quá số ụ nỏ";
	let space = 0;
	const guarded = {
		giao: 0,
		cung: 0,
		voi: 0,
		no: 0
	};
	for (const g of snap.guards) {
		if (snap.buildings[g.at]?.type !== "doanhTrai") return "lính giữ thành không ở doanh trại";
		space += g.n * UNITS[g.kind].space;
		guarded[g.kind] += g.n;
	}
	if (space > (GUARD_CAP[lv] ?? 0)) return "quá số lính giữ thành";
	if (UNIT_TYPES.some((k) => guarded[k] > snap.troops[k])) return "lính giữ thành nhiều hơn quân đang có";
	const room = snap.buildings.reduce((n, b) => n + (b.type === "doanhTrai" ? (BUILDINGS.doanhTrai.troopCap[b.level - 1] ?? 0) * 5 : 0), 0);
	if (armySpace(snap.troops) > room) return "quá sức chứa doanh trại";
	if (UNIT_TYPES.some((k) => snap.arms[k] > ARMS.length)) return "binh khí quá bậc";
	if (HUAN_BRANCHES.some((k) => snap.huan[k] > HUAN_COST.length)) return "huân công quá bậc";
	if (snap.bonus > .2 + 1e-9) return "Đền cộng quá mức";
	if (snap.crossbows && !count.get("denCoLoa")) return "không có Đền Cổ Loa";
	if (snap.walls && !count.get("hoKimQuy")) return "không có Hồ Kim Quy";
	const doLoi = kiemDoChup(snap);
	if (doLoi) return doLoi;
	const cap = storageCap(defenderState(snap));
	if (snap.cap > cap + 1e-9 || RESOURCE_IDS.some((r) => snap.resources[r] > cap + 1e-9)) return "của quá sức chứa kho";
	return null;
}
/** Tỉ lệ binh chủng lính giữ kinh đô máy (như quân mẫu phó bản; có lính nỏ từ Điện 8, chương 4). */
const BOT_MIX = {
	giao: 14,
	cung: 12,
	voi: 4,
	no: 0
};
const BOT_MIX8 = {
	giao: 11,
	cung: 10,
	voi: 3,
	no: 4
};
/** Mẫu kinh đô máy theo cấp Điện. */
const botMau = (dien) => dien <= 5 ? "phongChau" : dien === 6 ? "deBao" : dien === 7 ? "coLoa" : "coLoaSong";
/** Chương ứng với cấp Điện (Điện 6 mở ở chương 2, Điện 7 chương 3, Điện 8 chương 4, Điện 10 chương 5). */
function chapterAt(dien) {
	let ch = 1;
	for (let lv = 1; lv <= dien; lv++) ch = DIEN_CHAPTER[lv] ?? ch;
	return ch;
}
/** Cấp cao nhất của loại `type` dựng được ở Điện `dien`. */
function topLevel(type, dien) {
	let lv = 1;
	while (lv < BUILDINGS[type].maxLevel && dienNeededFor(type, lv + 1) <= dien) lv++;
	return lv;
}
/**
* Kinh đô máy Điện `dien`: dựng theo mẫu kinh đô của chương ứng cấp ấy (`mauSlots`), mọi công trình ở cấp cao nhất
* cấp Điện cho, cổng thành ở chỗ cổng của mẫu (từ chương 3), ụ nỏ trên thành (từ Điện 8), lính giữ thành đủ
* `GUARD_CAP` chia đều các doanh trại, binh khí theo cấp lò rèn, của bằng `DAU_THANH.botStock` sức chứa kho.
*/
function botSnapshot(dien) {
	const chapter = chapterAt(dien);
	const lv = dien - 1;
	const buildings = [];
	let gates = 0;
	let uNo = 0;
	for (const slot of mauSlots(botMau(dien), dien, true)) {
		let type = slot.type;
		if (slot.cong && chapter >= 3 && gates < (BUILDINGS.congThanh.limit[lv] ?? 0)) {
			type = "congThanh";
			gates++;
		}
		const b = {
			type,
			x: slot.x,
			z: slot.z,
			level: type === "dien" ? dien : topLevel(type, dien)
		};
		if (slot.uNo && type === "thanh" && dien >= 8 && uNo < (U_NO.limit[lv] ?? 0)) {
			b.uNo = "ok";
			uNo++;
		}
		buildings.push(b);
	}
	const barracks = buildings.flatMap((b, i) => b.type === "doanhTrai" ? [i] : []);
	const mix = dien >= 8 ? BOT_MIX8 : BOT_MIX;
	const army = fitArmy({
		giao: mix.giao * 4,
		cung: mix.cung * 4,
		voi: mix.voi * 4,
		no: mix.no * 4
	}, GUARD_CAP[lv] ?? 0);
	const guards = [];
	barracks.forEach((at, i) => {
		for (const kind of UNIT_TYPES) {
			const n = Math.floor(army[kind] / barracks.length) + (i < army[kind] % barracks.length ? 1 : 0);
			if (n > 0) guards.push({
				at,
				kind,
				n
			});
		}
	});
	const has = (t) => buildings.some((b) => b.type === t);
	const arms = dien >= 9 ? 3 : dien >= 7 ? 2 : dien >= 6 ? 1 : 0;
	const snap = {
		v: 1,
		dien,
		chapter,
		buildings,
		heights: [],
		khoanh: frameKhoanh(dien, botMau(dien)),
		resources: {
			gao: 0,
			voOc: 0,
			datDa: 0,
			sat: 0,
			go: 0
		},
		cap: 0,
		guards,
		troops: { ...army },
		heroes: [],
		bonus: has("denPhuDong") ? TEMPLE_BONUS : 0,
		arms: {
			giao: arms,
			cung: arms,
			voi: arms,
			no: arms
		},
		huan: {
			giao: 0,
			cung: 0,
			voi: 0,
			no: 0,
			tuong: 0
		},
		crossbows: has("denCoLoa"),
		walls: has("hoKimQuy")
	};
	const cap = storageCap(defenderState(snap));
	snap.cap = cap;
	for (const r of RESOURCE_IDS) snap.resources[r] = Math.floor(cap * DAU_THANH.botStock);
	return snap;
}
function beginPvp(snap, attack) {
	const def = defenderState(snap);
	return {
		snap,
		attack,
		def,
		battle: startPvp(def, defenseOf(snap), attack),
		inputs: [],
		step: 0,
		acc: 0,
		done: false
	};
}
/** Bước lớn nhất một lần bấm được ghi (trận dài nhất chừng 3600 bước). */
const INPUT_MAX_STEP = 1e4;
/**
* Lọc các lần bấm nhận từ ngoài (máy khách gửi lên máy chủ, hay máy chủ trả về để xem lại): đúng dạng, đúng kỹ năng,
* bước không quá giới hạn, không quá `PVP_MAX_INPUTS` lần. Máy chủ đánh lại và máy khách xem lại cùng lọc như nhau.
*/
function cleanInputs(raw) {
	if (!Array.isArray(raw)) return [];
	const out = [];
	for (const i of raw.slice(0, 600)) {
		if (!i || typeof i !== "object") continue;
		const { s, k } = i;
		if (!Number.isInteger(s) || s < 0 || s > INPUT_MAX_STEP) continue;
		if (k !== "rut" && !SKILL_IDS.includes(k)) continue;
		out.push({
			s,
			k
		});
	}
	return out;
}
/** Chạy đúng một bước: áp các lần bấm của bước này rồi chạy trận thêm `BATTLE_STEP`. */
function stepOnce(run) {
	for (const input of run.inputs) {
		if (input.s !== run.step) continue;
		if (input.k === "rut") retreatField(run.battle);
		else useSkill(run.battle, input.k);
	}
	run.done = stepBattle(run.def, run.battle, BATTLE_STEP);
	run.step++;
}
/** Số bước tối đa một trận (đủ giờ thì trận tự xong). */
const MAX_STEPS = Math.ceil(DAU_THANH.holdS / BATTLE_STEP) + 2;
/** Đánh lại cả trận một mạch từ bản chụp, quân đánh thành và các lần bấm đã ghi. */
function simulatePvp(snap, attack, inputs) {
	const run = beginPvp(snap, attack);
	run.inputs = inputs.map((i) => ({ ...i })).filter((i) => i.k === "rut" || SKILL_IDS.includes(i.k));
	while (!run.done && run.step < MAX_STEPS) stepOnce(run);
	return run;
}
/** Sao, phần trăm phá của trận trên kinh đô `def`. */
function scorePvp(def) {
	const scored = def.buildings.filter(isScored);
	const down = scored.filter((b) => b.damaged).length;
	const pct = scored.length ? down / scored.length : 0;
	const dien = def.buildings.some((b) => b.type === "dien" && b.damaged);
	const kho = def.buildings.filter((b) => b.type === "kho");
	return {
		pct,
		stars: (pct >= DAU_THANH.star1 ? 1 : 0) + (dien ? 1 : 0) + (pct >= 1 ? 1 : 0),
		dien,
		kho: kho.filter((b) => b.damaged).length,
		khoTotal: kho.length
	};
}
/** Phần của mỗi loại người giữ thành có thể bị cướp tối đa (chưa tính phá được bao nhiêu). */
function lootCap(snap) {
	const out = {
		gao: 0,
		voOc: 0,
		datDa: 0,
		sat: 0,
		go: 0
	};
	for (const r of RESOURCE_IDS) out[r] = Math.floor(DAU_THANH.maxLoot * Math.max(0, snap.resources[r] - DAU_THANH.protect * snap.cap));
	return out;
}
/**
* Của cướp được: trong mức tối đa (`lootCap`), tính `khoW` theo số kho bị phá (không có kho thì theo phần trăm
* phá), `dienW` nếu phá Điện, `pctW` theo phần trăm phá; đánh người kém cấp Điện hơn mình thì mỗi cấp giảm một nửa.
*/
function lootPvp(snap, score, atkDien) {
	const khoFrac = score.khoTotal ? score.kho / score.khoTotal : score.pct;
	const share = DAU_THANH.khoW * khoFrac + DAU_THANH.dienW * (score.dien ? 1 : 0) + DAU_THANH.pctW * score.pct;
	const factor = .5 ** Math.max(0, atkDien - snap.dien);
	const cap = lootCap(snap);
	const out = {
		gao: 0,
		voOc: 0,
		datDa: 0,
		sat: 0,
		go: 0
	};
	for (const r of RESOURCE_IDS) out[r] = Math.floor(cap[r] * share * factor);
	return out;
}
/**
* Chiến công sau trận: từ một sao thì người đánh được `trophyBase` cộng chênh lệch (người giữ thành nhiều chiến công
* hơn thì được nhiều hơn), kẹp trong `trophyMin`–`trophyMax`, người giữ thành mất bấy nhiêu; không sao thì ngược lại.
* Không ai xuống dưới 0.
*/
function trophyDelta(atk, def, stars) {
	const win = stars >= 1;
	const gap = win ? def - atk : atk - def;
	const d = Math.min(DAU_THANH.trophyMax, Math.max(DAU_THANH.trophyMin, Math.round(DAU_THANH.trophyBase + gap / DAU_THANH.trophySpread)));
	return win ? {
		atk: d,
		def: -Math.min(d, def)
	} : {
		atk: -Math.min(d, atk),
		def: d
	};
}
// src/game/muaTinh.ts
/**
* Xếp hạng cuối mùa (máy chủ dùng): tỉnh có điểm, điểm cao trước, ngang điểm thì theo thứ tự bắc vào nam; tỉnh 0 điểm
* không có hạng. Trả mỗi tỉnh trong `ds` một dòng, theo thứ tự `TINH_IDS`.
*/
function xepMua(ds) {
	const thu = (id) => TINH_IDS.indexOf(id);
	const co = ds.filter((d) => laTinh(d.tinh) && d.diem > 0).sort((a, b) => b.diem - a.diem || thu(a.tinh) - thu(b.tinh));
	return ds.filter((d) => laTinh(d.tinh)).sort((a, b) => thu(a.tinh) - thu(b.tinh)).map((d) => ({
		tinh: d.tinh,
		hang: d.diem > 0 ? co.indexOf(d) + 1 : null,
		diem: Math.max(0, d.diem),
		diet: d.diet
	}));
}
// src/game/giacChung.ts
const NHOM_GIAC = [
	"bac",
	"tay",
	"bien"
];
const TINH_NHOM = {
	bac: [
		"07",
		"11",
		"08",
		"09",
		"14",
		"13",
		"03"
	],
	tay: [
		"13",
		"15",
		"16",
		"17",
		"18",
		"19",
		"20",
		"21",
		"22",
		"24",
		"25",
		"26",
		"28",
		"27",
		"31",
		"32"
	],
	bien: GIAP_BIEN
};
/** Nền bãi chiến của trận giặc chung theo nhóm: núi biên giới phía bắc, rừng phía tây, bến sông giáp biển. */
const NEN_GIAC = {
	bac: "nui",
	tay: "rung",
	bien: "benSong"
};
/** Lệch cho tuần bắt đầu 0 giờ thứ Hai giờ Việt Nam (như `tuanCua`). */
const TUAN_LECH = 2844e5;
const NGAY_MS = 864e5;
/** Đạo giặc tuần `tuan`: nhóm theo lượt tuần, 3–5 tỉnh chọn theo hạt giống của tuần (xếp bắc vào nam). */
function daoTuan(tuan) {
	const nhom = NHOM_GIAC[(tuan % 3 + 3) % 3];
	const rand = rng(tuan * 2654435 + 97);
	const so = GIAC_CHUNG.tinhMin + Math.floor(rand() * (GIAC_CHUNG.tinhMax - GIAC_CHUNG.tinhMin + 1));
	const con = [...TINH_NHOM[nhom]];
	const chon = [];
	while (chon.length < so && con.length) chon.push(con.splice(Math.floor(rand() * con.length), 1)[0]);
	return {
		nhom,
		tinh: TINH_IDS.filter((id) => chon.includes(id))
	};
}
/** Thứ trong tuần giờ Việt Nam của `now`: 0 là thứ Hai, 6 là Chủ nhật. */
const thuCua = (now) => Math.floor(((now + TUAN_LECH) % TUAN_MS + TUAN_MS) % TUAN_MS / NGAY_MS);
/** Lúc (mili giây) đạo giặc tuần `tuan` tới: 0 giờ thứ `tuNgay` giờ Việt Nam. */
const giacToiLuc = (tuan) => tuan * TUAN_MS - TUAN_LECH + GIAC_CHUNG.tuNgay * NGAY_MS;
/** Lúc đạo giặc tuần `tuan` rút (hết Chủ nhật). */
const giacRutLuc = (tuan) => (tuan + 1) * TUAN_MS - TUAN_LECH;
/** Đạo giặc đang đánh lúc `now` (tuần ấy, từ thứ Sáu), không thì null. */
function giacDangDanh(now) {
	const tuan = tuanCua(now);
	return thuCua(now) >= GIAC_CHUNG.tuNgay ? tuan : null;
}
/** Khoảng ngày (`ngayCua`, `[tu, den)`) của tuần `tuan`: máy chủ đếm người đã góp tuần trước trong khoảng này. */
function ngayTuan(tuan) {
	const tu = ngayCua(tuan * TUAN_MS - TUAN_LECH);
	return {
		tu,
		den: tu + 7
	};
}
/** Máu đạo giặc ở một tỉnh theo số người đã góp ở tỉnh ấy tuần trước. */
const mauDao = (nguoi) => Math.max(GIAC_CHUNG.nguoiMin, Math.max(0, Math.floor(nguoi))) * GIAC_CHUNG.mauNguoi;
/**
* Người ở tỉnh `ta` đánh được đạo giặc ở tỉnh nào lúc giặc đang đánh: tỉnh mình có giặc thì chỉ đánh ở tỉnh mình; không
* thì gửi quân sang tỉnh láng giềng có giặc.
*/
function noiDanh(ta, tinhGiac) {
	if (tinhGiac.includes(ta)) return [ta];
	return langGieng(ta).filter((id) => tinhGiac.includes(id));
}
/** Hệ số sát thương theo chức: quân với mọi đạo, biên với giặc biên giới, hải với giặc biển. */
function heChuc(chuc, nhom) {
	if (chuc === "quan") return GIAC_CHUNG.heChuc;
	if (chuc === "bien" && nhom !== "bien") return GIAC_CHUNG.heChuc;
	if (chuc === "hai" && nhom === "bien") return GIAC_CHUNG.heChuc;
	return 1;
}
/** Sát thương (cũng là điểm tỉnh) của một trận: phần trăm máu giặc đã hạ, nhân hệ số chức. */
const satThuong = (pha, he) => Math.round(Math.max(0, Math.min(1, pha)) * 100 * he);
/** Đánh giúp tỉnh láng giềng: điểm chia đôi, tỉnh mình phần lẻ xuống, tỉnh được giúp phần lẻ lên. */
function chiaDiem(diem, ta, giup) {
	if (ta === giup) return {
		ta: diem,
		giup: 0
	};
	const nua = Math.floor(diem / 2);
	return {
		ta: nua,
		giup: diem - nua
	};
}
/** Màn có quân giặc dùng cho người ở chương `ch`. */
const manGiac = (ch) => GIAC_CHUNG.man[ch];
/**
* Dựng trận giặc chung từ bản chụp người đánh, quân mang đi, nhóm đạo và hạt giống. Tướng là hai tướng đầu của bản
* chụp (đồ tính lại từ món, `tuongChup`), Đền, binh khí, huân công cũng lấy từ bản chụp; không có nữ tướng.
*/
function setupGiac(snap, quan, nhom, seed) {
	const man = STAGES[manGiac(snap.chapter) - 1];
	const tuong = tuongChup(snap);
	return {
		id: seed >>> 0,
		stage: 0,
		enemies: { ...man.enemies },
		hpScale: man.hpScale * GIAC_CHUNG.hpMul,
		army: { ...quan.army },
		rows: { ...quan.rows },
		hero: tuong[0] ?? null,
		hero2: tuong[1] ?? null,
		bonus: snap.bonus,
		arms: { ...snap.arms },
		huan: { ...snap.huan },
		bai: baiOf(NEN_GIAC[nhom], snap.chapter)
	};
}
/** Phần máu giặc đã hạ (0–1) trong trận. Giặc bỏ chạy khỏi bãi tính như đã hạ. */
function phanHa(b) {
	let tong = 0;
	let con = 0;
	for (const f of b.fighters) {
		if (f.side !== "giac") continue;
		tong += f.maxHp;
		if (f.state !== "gone") con += Math.max(0, f.hp);
	}
	return tong > 0 ? (tong - con) / tong : 0;
}
function beginGiac(setup) {
	return {
		battle: startFieldBattle(setup),
		inputs: [],
		step: 0,
		acc: 0,
		done: false
	};
}
function buocGiac(run) {
	for (const i of run.inputs) {
		if (i.s !== run.step) continue;
		if (i.k === "rut") retreatField(run.battle);
		else useSkill(run.battle, i.k);
	}
	run.done = stepField(run.battle, BATTLE_STEP);
	run.step++;
}
/** Số bước nhiều nhất một trận (quá `FIELD.maxS` giây thì trận tự xong). */
const MAX_BUOC = Math.ceil(95 / BATTLE_STEP);
/** Đánh lại cả trận một mạch với các lần bấm nhận từ ngoài (lọc như Đấu thành). */
function simulateGiac(setup, inputs) {
	const run = beginGiac(setup);
	run.inputs = cleanInputs(inputs);
	while (!run.done && run.step < MAX_BUOC) buocGiac(run);
	return run;
}
/**
* Kiểm quân mang đi: đúng dạng, không quá quân trong bản chụp, có quân, không quá số chỗ một trận theo cấp Điện; hàng
* thiếu hay sai thì theo hàng mặc định.
*/
function kiemQuanGiac(snap, army, rows) {
	const a = army;
	if (!a || typeof a !== "object") return { loi: "quân sai dạng" };
	const r = rows && typeof rows === "object" ? rows : {};
	const quan = {
		army: {
			giao: 0,
			cung: 0,
			voi: 0,
			no: 0
		},
		rows: { ...DEFAULT_ROWS }
	};
	for (const k of UNIT_TYPES) {
		const n = a[k] ?? 0;
		if (!Number.isInteger(n) || n < 0) return { loi: "quân sai dạng" };
		if (n > snap.troops[k]) return { loi: "quân nhiều hơn quân đang có" };
		quan.army[k] = n;
		if (r[k] === "tien" || r[k] === "trung" || r[k] === "hau") quan.rows[k] = r[k];
	}
	const space = armySpace(quan.army);
	if (space <= 0) return { loi: "không có quân" };
	if (space > (FIELD_CAP[snap.dien - 1] ?? 0)) return { loi: "quá số chỗ một trận" };
	return { quan };
}
/** Kiểm id tỉnh (máy chủ nhận từ ngoài). */
const laTinhGiac = (id, tuan) => laTinh(id) && daoTuan(tuan).tinh.includes(id);
// src/game/mayChu.ts
/** Số liệu máy chủ dùng (khóa, khiên, giới hạn lượt gọi, ghép trận, giữ dữ liệu). */
const CAU_HINH = {
	unlockDien: DAU_THANH.unlockDien,
	lockS: DAU_THANH.lockS,
	shieldH: DAU_THANH.shieldH,
	rematchH: DAU_THANH.rematchH,
	matchDien: DAU_THANH.matchDien,
	matchDienWide: DAU_THANH.matchDienWide,
	findPerH: DAU_THANH.findPerH,
	attackPerH: DAU_THANH.attackPerH,
	snapPerH: DAU_THANH.snapPerH,
	keepDays: DAU_THANH.keepDays,
	rankTop: DAU_THANH.rankTop,
	rankPerH: DAU_THANH.rankPerH,
	replayPerH: DAU_THANH.replayPerH,
	savePerH: DAU_THANH.savePerH,
	saveMax: DAU_THANH.saveMax,
	gopNgay: VIET_NAM.gopNgay,
	topTinh: VIET_NAM.topTinh,
	doiChucMs: VIET_NAM.doiChucMs,
	gopPerH: VIET_NAM.gopPerH,
	chonPerH: VIET_NAM.chonPerH,
	bangPerH: VIET_NAM.bangPerH,
	giacPerH: GIAC_CHUNG.danhPerH,
	giacTranNgay: GIAC_CHUNG.tranNgay,
	giacXongMs: GIAC_CHUNG.xongMs,
	giuNgay: VIET_NAM.giuNgay,
	ketGiao: MUA_TINH.ketGiao,
	muaTuan: VIET_NAM.muaTuan
};
/** Bỏ dấu tiếng Việt (để bắt từ tục viết không dấu). */
const boDau = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d");
/** Từ tục đứng riêng một chữ: viết có dấu, hay viết tắt không dấu (chữ không dấu dễ trùng chữ thường nên không xét). */
const TU_TUC = /* @__PURE__ */ new Set([
	"địt",
	"đụ",
	"đéo",
	"lồn",
	"cặc",
	"buồi",
	"đĩ",
	"cứt",
	"dm",
	"dmm",
	"dcm",
	"dkm",
	"đm",
	"đmm",
	"đcm",
	"vcl",
	"vkl",
	"vl",
	"cl",
	"clm",
	"cmm",
	"cc",
	"dmcs",
	"fuck",
	"fck",
	"shit",
	"bitch",
	"dick"
]);
/** Từ tục ghép nằm đâu cũng bắt, xét trên tên bỏ khoảng trắng (còn dấu: bỏ dấu thì "lớn mạnh" thành "lonmanh"). */
const TUC_GHEP = [
	"địtmẹ",
	"địtcon",
	"đụmá",
	"đụmẹ",
	"lồnmá",
	"lồnmẹ",
	"vãilồn",
	"cặclồn"
];
/** Từ tục viết không dấu ít khi trùng tên thật, xét trên tên đã bỏ dấu, bỏ khoảng trắng. */
const TUC_GHEP_KHONG_DAU = [
	"fuck",
	"shit",
	"bitch",
	"ditme",
	"ditcon",
	"dume",
	"duma",
	"vcl",
	"vkl",
	"dmm",
	"dcm"
];
/**
* Kiểm tên người chơi Đấu thành: bỏ khoảng trắng thừa, `nameMin`–`nameMax` chữ, chỉ chữ cái (có dấu), chữ số,
* khoảng trắng và `_ . - '`, không có từ tục. Trả về tên đã chuẩn hóa hay lý do sai.
*/
function kiemTen(raw) {
	const ten = (typeof raw === "string" ? raw : "").normalize("NFC").replace(/\s+/g, " ").trim();
	const n = [...ten].length;
	if (n < DAU_THANH.nameMin) return { loi: "ngan" };
	if (n > DAU_THANH.nameMax) return { loi: "dai" };
	if (!/^[\p{L}\p{M}\p{N} _.\-']+$/u.test(ten)) return { loi: "kyTu" };
	const chu = ten.toLowerCase().split(/[\s_.\-']+/);
	if (chu.some((c) => TU_TUC.has(c) || TU_TUC.has(boDau(c)))) return { loi: "tuc" };
	const lien = chu.join("");
	if (TUC_GHEP.some((t) => lien.includes(t)) || TUC_GHEP_KHONG_DAU.some((t) => boDau(lien).includes(t))) return { loi: "tuc" };
	return { ten };
}
/** Nhận mã bản chụp người chơi tải lên: đọc được, hợp luật, Điện đủ cấp mở Đấu thành. */
function nhanBanChup(ma) {
	const snap = typeof ma === "string" ? decodeSnapshot(ma) : void 0;
	if (!snap) return { loi: "mã bản chụp hỏng" };
	const why = validateSnapshot(snap);
	if (why) return { loi: why };
	if (snap.dien < DAU_THANH.unlockDien) return { loi: `Điện cấp ${snap.dien} chưa mở Đấu thành` };
	if (snap.trangBi) for (const k of Object.keys(snap.trangBi)) snap.trangBi[k] = snap.trangBi[k].map(chupMon);
	return {
		ma: encodeSnapshot(snap),
		dien: snap.dien
	};
}
const botCache = /* @__PURE__ */ new Map();
/** Kinh đô máy Điện `dien` (5–10) để đánh khi chưa đủ người chơi. */
function kinhDoMay(dien) {
	const lv = Math.min(10, Math.max(DAU_THANH.unlockDien, Math.round(dien)));
	let hit = botCache.get(lv);
	if (!hit) {
		hit = {
			ma: encodeSnapshot(botSnapshot(lv)),
			dien: lv
		};
		botCache.set(lv, hit);
	}
	return hit;
}
/**
* Bản chụp người giữ thành sau khi bị cướp: kho trong bản chụp trừ đi của bị cướp (không xuống dưới 0), để người đánh
* sau không cướp lại phần đã mất khi người giữ thành chưa mở game tải bản chụp mới. Mã hỏng thì trả nguyên mã.
*/
function truCua(ma, cuop) {
	const snap = decodeSnapshot(ma);
	if (!snap) return ma;
	const c = cuop && typeof cuop === "object" ? cuop : {};
	for (const r of RESOURCE_IDS) {
		const n = c[r];
		if (typeof n === "number" && Number.isFinite(n) && n > 0) snap.resources[r] = Math.max(0, snap.resources[r] - Math.floor(n));
	}
	return encodeSnapshot(snap);
}
/** Đọc mã bản chụp đã lưu ở máy chủ (đã kiểm khi nhận). */
function docMa(ma) {
	const snap = decodeSnapshot(ma);
	if (!snap) throw new Error("mã bản chụp hỏng");
	return snap;
}
/**
* Quân đánh thành, máy chủ dựng khi bắt đầu trận. Quân chọn không quá quân trong bản chụp của chính người đánh, không
* quá số chỗ một trận theo cấp Điện (`FIELD_CAP`); tướng, Đền, binh khí, huân công lấy từ bản chụp ấy (tướng như
* tướng giữ thành trong bản chụp, kể cả đang nghỉ; đồ tính lại từ món trong bản chụp, `tuongChup`). Máy khách đánh
* bằng đúng quân này để đánh lại ra y hệt.
*/
function quanDanh(atkMa, army, side, seed) {
	const atk = docMa(atkMa);
	if (side !== "bac" && side !== "tay") return { loi: "hướng tràn vào sai" };
	const a = army;
	if (!a || typeof a !== "object") return { loi: "quân sai dạng" };
	const chon = {
		giao: 0,
		cung: 0,
		voi: 0,
		no: 0
	};
	for (const k of UNIT_TYPES) {
		const n = a[k] ?? 0;
		if (!Number.isInteger(n) || n < 0) return { loi: "quân sai dạng" };
		if (n > atk.troops[k]) return { loi: "quân nhiều hơn quân đang có" };
		chon[k] = n;
	}
	const space = armySpace(chon);
	if (space <= 0) return { loi: "không có quân" };
	if (space > (FIELD_CAP[atk.dien - 1] ?? 0)) return { loi: "quá số chỗ một trận" };
	return { quan: {
		army: chon,
		heroes: tuongChup(atk),
		side,
		seed: seed >>> 0,
		bonus: atk.bonus,
		arms: { ...atk.arms },
		huan: { ...atk.huan }
	} };
}
/**
* Đánh lại trận từ bản chụp người giữ thành, quân máy chủ đã dựng lúc bắt đầu và các lần bấm máy khách gửi: ra sao,
* phần trăm phá, của cướp, chiến công hai bên, quân người đánh ngã. Kết quả này là kết quả cuối.
* Kinh đô máy (`bot`): không cướp của thật, chiến công nhân `botTrophy`, người giữ thành không có chiến công.
*/
function danhLai(defMa, quan, inputs, opts) {
	const def = docMa(defMa);
	const bam = cleanInputs(inputs);
	const run = simulatePvp(def, quan, bam);
	const score = scorePvp(run.def);
	let cuop = lootPvp(def, score, opts.atkDien);
	let chienCong = trophyDelta(opts.atkTrophies, opts.defTrophies, score.stars);
	if (opts.bot) {
		cuop = {
			gao: 0,
			voOc: 0,
			datDa: 0,
			sat: 0,
			go: 0
		};
		const d = Math.round(DAU_THANH.trophyBase * DAU_THANH.botTrophy);
		chienCong = {
			atk: score.stars >= 1 ? d : -Math.min(d, opts.atkTrophies),
			def: 0
		};
	}
	chienCong = {
		atk: chienCong.atk || 0,
		def: chienCong.def || 0
	};
	for (const r of RESOURCE_IDS) cuop[r] = Math.max(0, cuop[r]);
	return {
		sao: score.stars,
		pct: score.pct,
		dien: score.dien,
		kho: score.kho,
		khoTotal: score.khoTotal,
		cuop,
		chienCong,
		mat: { ...run.battle.lost },
		buoc: run.step,
		bam: bam.length
	};
}
/**
* Chọn đối thủ trong các người chơi máy chủ đã lọc (không phải mình, hết khiên, không bị khóa, chưa đánh trong
* `rematchH` giờ, Điện chênh không quá `matchDienWide`): ưu tiên Điện chênh không quá `matchDien`, rồi ngẫu nhiên
* (`r` trong [0, 1)) trong `matchPick` người chiến công gần mình nhất. Không ai thì null (máy chủ cho kinh đô máy).
*/
function chonDoiThu(me, list, r) {
	const near = list.filter((u) => Math.abs(u.dien - me.dien) <= DAU_THANH.matchDien);
	const pool = near.length ? near : list.filter((u) => Math.abs(u.dien - me.dien) <= DAU_THANH.matchDienWide);
	if (!pool.length) return null;
	const top = [...pool].sort((a, b) => Math.abs(a.trophies - me.trophies) - Math.abs(b.trophies - me.trophies) || (a.id < b.id ? -1 : 1)).slice(0, DAU_THANH.matchPick);
	return top[Math.min(top.length - 1, Math.floor(Math.max(0, r) * top.length))].id;
}
/** FNV-1a 32 bit của một chuỗi. */
function bam32(text) {
	let h = 2166136261;
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 16777619) >>> 0;
	}
	return h.toString(16).padStart(8, "0");
}
/** Tướng của người đánh thử ở Điện `dien` (như test cân bằng Đấu thành): Gióng, Sơn Tinh, An Dương Vương, Cao Lỗ, Hai Bà. */
function tuongThu(dien) {
	if (dien <= 5) return [{
		kind: "giong",
		bamboo: true,
		glow: true,
		non: false
	}];
	if (dien === 6) return [{
		kind: "sonTinh",
		bamboo: false,
		glow: true,
		non: true
	}];
	if (dien === 7) return [{
		kind: "anDuong",
		bamboo: false,
		glow: true,
		non: false,
		kimQuy: true
	}];
	if (dien === 10) return [{
		kind: "trungTrac",
		bamboo: false,
		glow: true,
		non: false
	}, {
		kind: "trungNhi",
		bamboo: false,
		glow: true,
		non: false,
		hieuTrieu: true
	}];
	return [{
		kind: "caoLo",
		bamboo: false,
		glow: false,
		non: false,
		lenhBan: true
	}];
}
/** Quân mẫu một trận (38 chỗ; có lính nỏ từ Điện 8). */
const quanMau = (dien) => dien >= 8 ? {
	giao: 11,
	cung: 10,
	voi: 3,
	no: 4
} : {
	giao: 14,
	cung: 12,
	voi: 4,
	no: 0
};
/** Bộ của tướng `kind`. */
const boCua = (kind) => BO_DO.find((b) => BO_CUA[b] === kind);
/**
* Bốn món bộ `bo` cấp đồ `chuong` hợp luật, gần mạnh nhất có thể (phẩm trần của chương, nấc rút cao, cường hóa trần
* của phẩm), cho trận thử: số giống món người chơi thật mặc nhất.
*/
function boThu(bo, chuong) {
	const pham = PHAM_TRAN[chuong];
	return O_DO.map((o) => {
		const chinh = O_CHINH[o][0];
		const phu = CHI_SO.filter((k) => k !== chinh).slice(0, pham - 1).map((k, i) => ({
			k,
			nac: 5 - i % 2
		}));
		return {
			o,
			bo,
			pham,
			cap: chuong,
			chinh,
			phu,
			cuong: CUONG_HOA_TRAN[pham]
		};
	});
}
/**
* Đồ của tướng thử ở Điện `dien`: mỗi tướng mặc đủ bộ mình (đủ bốn món, kỹ năng mạnh hơn); Điện 9 Cao Lỗ mặc bộ Cổ
* Loa (bộ người khác, không có hiệu ứng bộ). Điện 5, 6 không mặc gì như người chơi chưa có đồ.
*/
function doThu(dien, chuong) {
	const out = {};
	if (dien < 7) return out;
	for (const h of tuongThu(dien)) out[h.kind] = boThu(dien === 9 ? "coLoa" : boCua(h.kind), chuong);
	return out;
}
/**
* Bản chụp để thử máy chủ thật (scripts/thu-may-chu.mjs): kinh đô máy Điện `dien` kèm tướng của cấp ấy (từ Điện 7 có
* mặc đồ), để người thử đánh trận nặng như người chơi thật, và máy chủ kiểm món đồ. Hợp luật như bản chụp người chơi.
*/
function banChupThu(dien) {
	const snap = botSnapshot(dien);
	snap.heroes = tuongThu(dien);
	const trangBi = doThu(dien, snap.chapter);
	if (Object.keys(trangBi).length) snap.trangBi = trangBi;
	return {
		ma: encodeSnapshot(snap),
		quan: quanMau(dien)
	};
}
/** Lịch bấm của trận thử: cứ 150 bước bấm mọi kỹ năng (chưa sẵn sàng thì trận bỏ qua). */
function bamThu() {
	const inputs = [];
	for (let s = 80; s < 3600; s += 150) for (const k of SKILL_IDS) inputs.push({
		s,
		k
	});
	return inputs;
}
/**
* Đánh vài trận cố định trên kinh đô máy Điện 5–10 (có tướng, bấm kỹ năng theo lịch) và ghi dấu trạng thái cuối:
* chỗ đứng, máu từng người, máu từng công trình. Từ Điện 7 tướng đi đánh mặc đồ (`doThu`); Điện 10 kinh đô bị đánh
* cũng có Hai Bà mặc đồ giữ thành. Chạy trên Node, Deno (Edge Function) hay trình duyệt phải ra y hệt
* (`scripts/doi-chieu-deno.mjs`).
*/
function doiChieu() {
	const out = [];
	for (let dien = 5; dien <= 10; dien++) {
		const def = botSnapshot(dien);
		const trangBi = doThu(dien, def.chapter);
		if (dien === 10) {
			def.heroes = tuongThu(dien);
			def.trangBi = trangBi;
		}
		const heroes = tuongThu(dien).map((h) => ganDoChup(h, trangBi[h.kind]));
		const quan = {
			army: quanMau(dien),
			heroes,
			side: dien % 2 ? "bac" : "tay",
			seed: 1e3 + dien,
			bonus: 0,
			arms: { ...def.arms }
		};
		const run = simulatePvp(def, quan, bamThu());
		const score = scorePvp(run.def);
		const people = run.battle.fighters.map((f) => [
			f.kind,
			f.side,
			f.state,
			f.x,
			f.z,
			f.hp
		]);
		const houses = run.def.buildings.map((b) => [
			b.type,
			run.battle.hp[b.id] ?? null,
			b.damaged ?? false
		]);
		out.push(`Điện ${dien} ${quan.side}: ${score.stars} sao, ${Math.round(score.pct * 100)}%, ${run.step} bước, ngã ${JSON.stringify(run.battle.lost)}, dấu ${bam32(JSON.stringify([people, houses]))}`);
	}
	return out;
}
/** Mã tỉnh hợp lệ hay null. */
function kiemTinh(tinh) {
	return laTinh(tinh) ? tinh : null;
}
/** Chức `chuc` ở tỉnh `tinh`: không có chức ấy, hay chức hải ở tỉnh không giáp biển thì báo lỗi. */
function kiemChuc(tinh, chuc) {
	if (!laTinh(tinh) || !laChuc(chuc)) return { loi: "khongCoChuc" };
	return chucCo(tinh).includes(chuc) ? { chuc } : { loi: "chucChiGiapBien" };
}
/** Mùa (4 tuần, từ 0 giờ thứ Hai giờ Việt Nam) và ngày (giờ Việt Nam) của thời điểm `now`, như máy khách tính. */
function muaTinh(now) {
	return muaCua(now);
}
function ngayTinh(now) {
	return ngayCua(now);
}
/**
* Nhận một lần góp của cho tỉnh: bản chụp kinh đô lúc góp (`ma`, kiểm như bản chụp Đấu thành) phải có đủ của trước
* khi trừ; chỉ góp loại của chức `chuc` lo (`CHUC_GOP`). Điểm mỗi loại là phần trăm sức chứa kho làm tròn xuống, sức
* chứa máy chủ tự tính từ công trình trong bản chụp (không tin số gửi lên). Trả điểm, của đã góp (số nguyên) và cấp
* Điện.
*/
function gopTinh(ma, chuc, gop) {
	if (!laChuc(chuc) || !CHUC_GOP[chuc].length) return { loi: "chucKhongGop" };
	const nhan = nhanBanChup(ma);
	if ("loi" in nhan) return {
		loi: "banChup",
		chiTiet: nhan.loi
	};
	const snap = docMa(nhan.ma);
	const cap = storageCap(defenderState(snap));
	if (!gop || typeof gop !== "object" || Array.isArray(gop)) return { loi: "gopSai" };
	const out = {};
	let diem = 0;
	for (const [k, v] of Object.entries(gop)) {
		if (!CHUC_GOP[chuc].includes(k)) return {
			loi: "gopSai",
			chiTiet: k
		};
		if (typeof v !== "number" || !Number.isInteger(v) || v <= 0) return {
			loi: "gopSai",
			chiTiet: k
		};
		const r = k;
		if (snap.resources[r] < v) return {
			loi: "thieuCua",
			chiTiet: r
		};
		out[r] = v;
		diem += diemGop(v, cap);
	}
	if (diem < 1) return { loi: "itQua" };
	return {
		diem,
		gop: out,
		dien: snap.dien
	};
}
/**
* Bản chụp để thử lệnh góp (test Deno, scripts/thu-may-chu.mjs): kinh đô máy Điện `dien`, mỗi loại của `kho` (không
* quá sức chứa), kèm sức chứa kho máy chủ tính để test biết trước điểm.
*/
function banChupGop(dien, kho) {
	const snap = botSnapshot(dien);
	const cap = storageCap(defenderState(snap));
	for (const r of RESOURCE_IDS) snap.resources[r] = Math.min(cap, kho);
	return {
		ma: encodeSnapshot(snap),
		cap
	};
}
/**
* Nhận trận giặc chung lúc bắt đầu: bản chụp kinh đô người đánh (kiểm như Đấu thành) và quân mang đi (`kiemQuanGiac`).
* Trả mã bản chụp đã chuẩn hóa (máy chủ cất để đánh lại) và quân đã kiểm.
*/
function nhanGiac(ma, army, rows) {
	const nhan = nhanBanChup(ma);
	if ("loi" in nhan) return {
		loi: "banChup",
		chiTiet: nhan.loi
	};
	const snap = docMa(nhan.ma);
	const q = kiemQuanGiac(snap, army, rows);
	if ("loi" in q) return {
		loi: "quan",
		chiTiet: q.loi
	};
	return {
		ma: nhan.ma,
		quan: q.quan,
		chuong: snap.chapter
	};
}
/**
* Đánh lại trận giặc chung: cùng bản chụp, quân, nhóm đạo, hạt giống như lúc bắt đầu, các lần bấm máy khách gửi lên.
* Trả phần máu giặc đã hạ, sát thương (đã nhân hệ số chức `he`), số bước, số lần bấm nhận, quân ngã.
*/
function danhGiac(ma, quan, nhom, seed, inputs, he) {
	const run = simulateGiac(setupGiac(docMa(ma), quan, nhom, seed), inputs);
	const pha = phanHa(run.battle);
	return {
		pha,
		sat: satThuong(pha, he),
		buoc: run.step,
		bam: run.inputs.length,
		thang: run.battle.outcome === "win",
		mat: { ...run.battle.lost }
	};
}
/** Bản chụp để thử trận giặc chung (test Deno): kinh đô máy Điện `dien` kèm quân của nó. */
function banChupGiac(dien) {
	const snap = botSnapshot(dien);
	return {
		ma: encodeSnapshot(snap),
		troops: { ...snap.troops },
		chuong: snap.chapter
	};
}
/** Số tuần (từ 0 giờ thứ Hai giờ Việt Nam) của `now`. */
const tuanTinh = (now) => tuanCua(now);
/** 18 tỉnh đất Văn Lang (đã quy về từ đầu) và ba chức bên võ (Lạc tướng chọn trong bên võ, Lạc hầu trong bên văn). */
const datVanLang = DAT_VAN_LANG;
/** Mã 34 tỉnh, xếp bắc vào nam. */
const tinhIds = TINH_IDS;
const chucVo = CHUC_VO;
export { CAU_HINH, bamThu, banChupGiac, banChupGop, banChupThu, chiaDiem, chonDoiThu, chucVo, danhGiac, danhLai, daoTuan, datVanLang, doiChieu, giacDangDanh, giacRutLuc, giacToiLuc, gopTinh, heChuc, kiemChuc, kiemTen, kiemTinh, kinhDoMay, laTinhGiac, mauDao, muaTinh, ngayTinh, ngayTuan, nhanBanChup, nhanGiac, noiDanh, quanDanh, thuCua, tinhIds, truCua, tuanTinh, xepMua };

export const LUAT_MA = "8fcff065230dc1dd";
