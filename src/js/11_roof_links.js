// 판자의 그림과 통행 영역은 같은 구간을 쓴다. 정면 외벽 위를 지나 실제 옥상에 닿게 한다.
let PLANKS = [], PLANK_MASK = null;
const plankAt = (tx, ty) => PLANK_MASK && inMap(tx, ty) ? PLANK_MASK[ty * MW + tx] : 0;
function buildPlanks() {
  PLANKS = []; PLANK_MASK = new Uint8Array(MW * MH);
  for (const [ax, ay, bx, by, z] of STAGE.planks || []) {
    let x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), y0 = Math.min(ay, by), y1 = Math.max(ay, by);
    const ew = x1 - x0 >= y1 - y0, dx = ew ? 1 : 0, dy = ew ? 0 : 1;
    const end = (x, y, sign) => {
      let nx = x + dx * sign, ny = y + dy * sign;
      // 선언된 다리 바로 옆의 같은 높이 건물 외벽만 연장한다. 다른 골목에는 다리를 만들지 않는다.
      while (inMap(nx, ny) && bldAt(nx, ny) >= 0 && lvAt(nx, ny) === z && FRM[ny * MW + nx]) {
        x0 = Math.min(x0, nx); x1 = Math.max(x1, nx); y0 = Math.min(y0, ny); y1 = Math.max(y1, ny);
        nx += dx * sign; ny += dy * sign;
      }
      return inMap(nx, ny) && lvAt(nx, ny) === z && !FRM[ny * MW + nx] ? { x: nx, y: ny } : null;
    };
    const a = end(x0, y0, -1), b = end(x1, y1, 1);
    const p = { x0, y0, x1, y1, z, ew, a, b }; PLANKS.push(p);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inMap(x, y)) PLANK_MASK[y * MW + x] = z;
  }
}
