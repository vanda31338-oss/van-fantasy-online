import Phaser from 'phaser';
import { NPCS } from '../data/npcs';
import { Bus } from '../core/EventBus';
import { GameState } from '../core/GameState';
import { rng } from '../gfx/procedural/PixelCanvas';
import { T, TILE } from '../gfx/procedural/environment';
import { Npc } from '../entities/Npc';
import { WorldScene } from './WorldScene';

const W = 52;
const H = 34;

/** Vanheim — the main town hub. */
export class TownScene extends WorldScene {
  readonly isTown = true;
  npcs: Npc[] = [];
  private respawn = false;

  constructor() {
    super('Town');
  }

  init(data: { respawn?: boolean }) {
    this.respawn = !!data?.respawn;
    this.npcs = [];
  }

  protected bgm() {
    return 'bgm_town';
  }

  protected playerSpawn() {
    return this.respawn ? { x: 26 * TILE, y: 23 * TILE } : { x: 27 * TILE, y: 13 * TILE };
  }

  protected buildMap() {
    const r = rng(1234);
    const tiles: number[][] = [];
    for (let y = 0; y < H; y++) {
      const row: number[] = [];
      for (let x = 0; x < W; x++) {
        const v = r();
        row.push(v < 0.08 ? T.GRASS_FLOWER : v < 0.45 ? T.GRASS2 : T.GRASS);
      }
      tiles.push(row);
    }
    const fill = (x0: number, y0: number, x1: number, y1: number, t: number | (() => number)) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (tiles[y]?.[x] !== undefined) tiles[y][x] = typeof t === 'function' ? t() : t;
    };
    const cobble = () => (r() < 0.5 ? T.COBBLE : T.COBBLE2);
    // castle courtyard + plaza
    fill(18, 9, 33, 10, cobble);
    fill(17, 11, 34, 23, cobble);
    // roads
    fill(24, 24, 27, 33, T.PATH);
    fill(3, 17, 16, 19, T.PATH);
    fill(9, 20, 10, 28, T.PATH);
    fill(35, 17, 48, 19, T.PATH);
    fill(40, 20, 41, 26, T.PATH);
    fill(34, 26, 48, 27, T.PATH);
    this.addTileLayer(tiles);

    const solids: { x: number; y: number; w: number; h: number; color: number }[] = [];
    // Castle backdrop (blocks the whole north edge)
    this.add.image(26 * TILE, 9 * TILE + 8, 'bld_castle').setOrigin(0.5, 1).setDepth(9 * TILE);
    this.addBlocker(this.mapW / 2, 70, this.mapW, 140);
    solids.push({ x: 0, y: 0, w: this.mapW, h: 140, color: 0x3a6a3a });
    solids.push({ x: 26 * TILE - 180, y: 0, w: 360, h: 150, color: 0xd8d0e8 });

    // Buildings
    const house = (key: string, tx: number, ty: number) => {
      const x = tx * TILE, y = ty * TILE;
      this.addProp(key, x, y, { w: 56, h: 30 });
      solids.push({ x: x - 32, y: y - 40, w: 64, h: 40, color: 0xb0603a });
    };
    house('bld_house_red', 5, 16);
    house('bld_house_blue', 14, 15);
    house('bld_house_green', 16, 33);
    house('bld_house_blue', 36, 33);
    house('bld_house_red', 48, 33);
    house('bld_house_green', 37, 15);
    // Rune tower
    this.addProp('bld_tower', 47 * TILE, 16 * TILE, { w: 30, h: 20 });
    solids.push({ x: 47 * TILE - 20, y: 16 * TILE - 40, w: 40, h: 40, color: 0x7a5ad0 });
    // Shops
    this.addProp('prop_stall', 8 * TILE, 20 * TILE, { w: 50, h: 12 });
    solids.push({ x: 8 * TILE - 28, y: 20 * TILE - 24, w: 56, h: 24, color: 0xe8455a });
    this.addProp('prop_forge', 8 * TILE, 28 * TILE, { w: 44, h: 14 });
    solids.push({ x: 8 * TILE - 24, y: 28 * TILE - 24, w: 48, h: 24, color: 0x7a6a72 });
    this.addProp('prop_crate', 4 * TILE, 21 * TILE, { w: 12, h: 6 });
    this.addProp('prop_crate', 5 * TILE, 21 * TILE + 4, { w: 12, h: 6 });
    // Fountain
    this.addProp('prop_fountain', 26 * TILE, 19 * TILE, { w: 46, h: 16 });
    solids.push({ x: 26 * TILE - 24, y: 19 * TILE - 24, w: 48, h: 24, color: 0x4aa8e8 });
    // Dungeon portal
    this.addProp('prop_portal', 26 * TILE, 32 * TILE, { w: 30, h: 8 });
    this.vfx.play('portal_swirl', 26 * TILE, 32 * TILE - 10, { depth: 32 * TILE + 1 });
    solids.push({ x: 26 * TILE - 16, y: 32 * TILE - 30, w: 32, h: 30, color: 0x7a4ad8 });
    // Lamps around the plaza
    for (const [x, y] of [[17, 11], [34, 11], [17, 23], [34, 23], [23, 27], [28, 27]]) this.addProp('prop_lamp', x * TILE + 8, y * TILE + 14, { w: 6, h: 4 });
    // Trees around the border
    const treeAt = (tx: number, ty: number, kind = 'prop_tree') => {
      this.addProp(kind, tx * TILE, ty * TILE, { w: 10, h: 8 });
      solids.push({ x: tx * TILE - 8, y: ty * TILE - 16, w: 16, h: 16, color: 0x2f8040 });
    };
    for (let ty = 11; ty <= 33; ty += 3) {
      treeAt(1, ty, ty % 2 ? 'prop_tree' : 'prop_pine');
      treeAt(51, ty, ty % 2 ? 'prop_pine' : 'prop_tree');
    }
    for (let tx = 4; tx <= 48; tx += 4) if (tx < 21 || tx > 30) treeAt(tx, 34 + (tx % 8 === 0 ? 0 : 0), tx % 8 ? 'prop_tree' : 'prop_pine');
    for (const [tx, ty] of [[3, 25], [19, 30], [31, 30], [45, 22], [49, 26], [30, 6], [3, 12]]) treeAt(tx, ty);
    for (const [tx, ty] of [[20, 26], [32, 26], [15, 22], [36, 22], [44, 12], [7, 23], [48, 20]]) this.addProp('prop_bush', tx * TILE, ty * TILE, { w: 16, h: 6 });
    for (const [tx, ty] of [[13, 24], [38, 21], [22, 31], [29, 31], [46, 29], [5, 30]]) this.addProp('prop_flowers', tx * TILE, ty * TILE);
    this.addProp('prop_rock', 47 * TILE, 24 * TILE, { w: 14, h: 6 });
    this.addProp('prop_rock', 3 * TILE, 28 * TILE, { w: 14, h: 6 });

    // NPCs
    for (const def of NPCS) {
      const npc = new Npc(this, def);
      this.npcs.push(npc);
      this.addBlocker(npc.x, npc.y - 3, 12, 6);
    }
    this.events.on('npc-tap', (npc: Npc) => this.walkToNpc(npc));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off('npc-tap'));
    this.refreshMarkers();

    const colorOf = (t: number) =>
      t === T.PATH ? 0xdcbc84 : t === T.COBBLE || t === T.COBBLE2 ? 0xc8c0d4 : t === T.WATER ? 0x4aa8e8 : 0x6cbf44;
    this.buildMinimap('minimap_town', tiles, colorOf, solids);
  }

  refreshMarkers() {
    for (const n of this.npcs) {
      if (n.def.id === 'elder_rowan') n.setMarker(GameState.char.flags.metElder ? null : '!');
      else n.setMarker(null);
    }
  }

  walkToNpc(npc: Npc) {
    const p = this.player;
    if (p.dead) return;
    p.moveTarget = {
      x: npc.x, y: npc.y, range: 30,
      onArrive: () => {
        p.faceTowards(npc.x);
        Bus.emit('npc:talk', npc.def);
        if (npc.def.id === 'elder_rowan' && !GameState.char.flags.metElder) {
          GameState.char.flags.metElder = true;
          GameState.save();
          this.refreshMarkers();
        }
      },
    };
  }

  /** Talk to the nearest NPC in reach (keyboard F / interact). */
  interactNearest() {
    let best: Npc | null = null;
    let bd = 48;
    for (const n of this.npcs) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, n.x, n.y);
      if (d < bd) {
        bd = d;
        best = n;
      }
    }
    if (best) this.walkToNpc(best);
  }

  create() {
    super.create();
    this.input.keyboard?.on('keydown-F', () => this.interactNearest());
    if (this.respawn) this.time.delayedCall(400, () => this.toast('You were revived in Vanheim.'));
  }
}
