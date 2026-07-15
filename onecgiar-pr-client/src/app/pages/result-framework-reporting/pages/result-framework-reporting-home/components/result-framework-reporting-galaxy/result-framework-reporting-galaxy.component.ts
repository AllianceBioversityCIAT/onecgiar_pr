import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  NgZone,
  OnDestroy,
  Output,
  signal,
  viewChild,
  ViewEncapsulation
} from '@angular/core';
import { Router } from '@angular/router';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { ResultFrameworkReportingHomeService } from '../../services/result-framework-reporting-home.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { SPProgress } from '../../../../../../shared/interfaces/SP-progress.interface';
import { STATUS_META } from '../../status-meta';

type Kind = 'program' | 'aow' | 'output' | 'outcome';

interface NodeSpec {
  kind: Kind;
  title: string;
  code: string;
  sub?: string;
  results?: number;
  statuses?: Record<number, number>;
  pct?: number;
  indicator?: { desc: string; tgt: any; act: any; pct: number; pctText: string };
  hasChildren: boolean;
  programCode?: string;
  aowCode?: string;
}

interface StackEntry { kind: Kind; title: string; code: string; programCode?: string; aowCode?: string; }

const STATUS_ORDER = Object.entries(STATUS_META)
  .map(([id, m]) => ({ id: Number(id), order: m.order }))
  .sort((a, b) => a.order - b.order)
  .map(s => s.id);

const ICON_BASE = '/assets/result-framework-reporting/SPs-Icons/';

/** Accent colour per hierarchy level — lets each level read at a glance. */
const LEVEL_ACCENT: Record<Kind, string> = {
  program: '#8a8ce0', // brand violet
  aow: '#2bd4d9',     // cyan
  output: '#5b8cff',  // blue
  outcome: '#e879f9'  // magenta
};
const KIND_LABEL: Record<Kind, string> = { program: 'Science Program', aow: 'Area of Work', output: 'Output', outcome: 'Outcome' };

/**
 * Full-screen 3D "Framework Galaxy": a single-scene hierarchy navigator.
 * Focus a node → its children radiate around it; select a child then use
 * ‹ Prev / Next › to move between siblings, Open to drill down, Back to go up.
 * Levels: Portfolio → Science Program → Area of Work → Output/Outcome.
 */
@Component({
  selector: 'app-result-framework-reporting-galaxy',
  templateUrl: './result-framework-reporting-galaxy.component.html',
  styleUrls: ['./result-framework-reporting-galaxy.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ResultFrameworkReportingGalaxyComponent implements AfterViewInit, OnDestroy {
  private readonly homeService = inject(ResultFrameworkReportingHomeService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);

  @Output() closed = new EventEmitter<void>();

  private readonly hostRef = viewChild.required<ElementRef<HTMLDivElement>>('stage');
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('gl');

  // scene handles
  private renderer?: THREE.WebGLRenderer;
  private cssRenderer?: CSS3DRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;
  private readonly groupB = new THREE.Group();
  private readonly linesB = new THREE.Group();
  private frameId = 0;
  private resizeObs?: ResizeObserver;
  private needsRender = true;
  private camTween: { fromPos: THREE.Vector3; toPos: THREE.Vector3; fromT: THREE.Vector3; toTarget: THREE.Vector3; t0: number; dur: number } | null = null;
  private readonly _frustum = new THREE.Frustum();
  private readonly _pv = new THREE.Matrix4();
  private disposed = false;
  private opacityTweens: { el: HTMLElement; from: number; to: number; t0: number; dur: number; onDone?: () => void }[] = [];
  private posTweens: { obj: THREE.Object3D; from: THREE.Vector3; to: THREE.Vector3; t0: number; dur: number }[] = [];
  private trackLines: { line: THREE.Line; a: THREE.Vector3; obj: THREE.Object3D }[] = [];
  private readonly CENTER = new THREE.Vector3(0, 2.5, 0);

  // navigation state
  private stack: StackEntry[] = [];
  private childSpecs: NodeSpec[] = [];
  private childObjs: CSS3DObject[] = [];
  private childPos: THREE.Vector3[] = [];
  private selIndex = -1;

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => { this.initScene(); this.loadChildren(); });
  }

  ngOnDestroy(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.resizeObs?.disconnect();
    this.controls?.dispose();
    this.renderer?.dispose();
  }

  close(): void { this.closed.emit(); }

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  private programs(): NodeSpec[] {
    const map = (list: SPProgress[]): NodeSpec[] =>
      (list ?? []).map(sp => {
        const statuses: Record<number, number> = {};
        for (const v of sp?.versions ?? []) for (const s of v?.statuses ?? []) statuses[s.statusId] = (statuses[s.statusId] ?? 0) + (s.count ?? 0);
        return {
          kind: 'program' as Kind,
          title: sp?.initiativeShortName || sp?.initiativeName || sp?.initiativeCode || '—',
          code: sp?.initiativeCode ?? '—',
          sub: sp?.entityTypeName ?? '',
          results: sp?.totalResults ?? 0,
          statuses,
          hasChildren: true,
          programCode: sp?.initiativeCode
        };
      });
    return [...map(this.homeService.mySPsList()), ...map(this.homeService.otherSPsList())];
  }

  private tocSpec(h: any, kind: Kind): NodeSpec {
    const ind = h.indicators && h.indicators[0];
    return {
      kind,
      title: (h.result_title || '').slice(0, 52),
      code: kind === 'output' ? 'OUTPUT' : 'OUTCOME',
      hasChildren: false,
      indicator: ind
        ? { desc: (ind.indicator_description || '').split('----')[0].trim(), tgt: ind.target_value_sum, act: ind.actual_achieved_value_sum, pct: parseFloat(ind.progress_percentage) || 0, pctText: ind.progress_percentage || '0%' }
        : undefined
    };
  }

  private loadChildren(): void {
    const top = this.stack[this.stack.length - 1];
    if (!top) {
      this.childSpecs = this.programs();
      this.renderLevel();
      return;
    }
    if (top.kind === 'program') {
      this.api.resultsSE.GET_ClarisaGlobalUnits(top.code).subscribe({
        next: ({ response }: any) => {
          if (this.disposed) return;
          this.childSpecs = (response?.units ?? []).map((a: any) => ({
            kind: 'aow' as Kind,
            title: (a.name || '').slice(0, 64),
            code: a.code,
            pct: parseFloat(a.progress) || 0,
            results: (a.resultsCount?.editing || 0) + (a.resultsCount?.submitted || 0),
            hasChildren: true,
            programCode: top.code,
            aowCode: a.code
          }));
          this.renderLevel();
        },
        error: () => { if (!this.disposed) { this.childSpecs = []; this.renderLevel(); } }
      });
      return;
    }
    if (top.kind === 'aow') {
      this.api.resultsSE.GET_TocResultsByAowId(top.programCode!, top.code).subscribe({
        next: ({ response }: any) => {
          if (this.disposed) return;
          const outs = (response?.tocResultsOutputs ?? []).map((h: any) => this.tocSpec(h, 'output'));
          const ocs = (response?.tocResultsOutcomes ?? []).map((h: any) => this.tocSpec(h, 'outcome'));
          this.childSpecs = [...outs, ...ocs];
          this.renderLevel();
        },
        error: () => { if (!this.disposed) { this.childSpecs = []; this.renderLevel(); } }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Scene build for the current focus level
  // ---------------------------------------------------------------------------

  private renderLevel(): void {
    if (!this.scene) return;
    this.clearGroup(this.groupB);
    this.clearGroup(this.linesB);
    this.childObjs = []; this.childPos = []; this.selIndex = -1;

    const hasHub = this.stack.length > 0;
    const center = new THREE.Vector3(0, 2.5, 0);

    if (hasHub) {
      const top = this.stack[this.stack.length - 1];
      const hubSpec: NodeSpec = { kind: top.kind, title: top.title, code: top.code, hasChildren: false, programCode: top.programCode, sub: '' };
      const hubEl = this.makeCard(hubSpec, true, -1);
      const hubO = this.css(hubEl, center.x, center.y, center.z, 0.014);
      this.groupB.add(hubO);
      this.fadeEl(hubEl, 0, 1, 460, 100);
    }

    const specs = this.childSpecs;
    const R = hasHub ? 6.2 : 9;
    const n = Math.max(specs.length, 1);
    this.trackLines = [];
    specs.forEach((spec, i) => {
      const ang = (i / n) * Math.PI * 2 - (hasHub ? Math.PI / 2 : 0);
      const y = center.y + (i % 2 ? 1.3 : -1.1);
      const finalPos = hasHub
        ? new THREE.Vector3(Math.cos(ang) * R, y, Math.sin(ang) * R)
        : new THREE.Vector3(Math.sin(ang) * R, y, Math.cos(ang) * R);
      const el = this.makeCard(spec, false, i);
      // Children are born AT the hub centre and burst outward in real time — no page-like fade swap.
      const o = this.css(el, center.x, center.y, center.z, 0.012);
      o.userData = { i };
      this.groupB.add(o); this.childObjs.push(o); this.childPos.push(finalPos);
      this.fadeEl(el, 0, 1, 380, 40 + i * 45);
      this.movePos(o, center, finalPos, 660, 40 + i * 45);
      this.glow(finalPos, this.color(LEVEL_ACCENT[spec.kind], '#999'));
      if (hasHub) {
        const ln = this.line(center, center);
        this.linesB.add(ln);
        this.trackLines.push({ line: ln, a: center.clone(), obj: o });
      }
    });

    this.groupB.visible = true;
    this.needsRender = true;
  }

  private makeCard(spec: NodeSpec, isHub: boolean, index: number): HTMLElement {
    const accent = LEVEL_ACCENT[spec.kind];
    const el = document.createElement('div');
    el.className = 'cf-node2' + (isHub ? ' hub2' : '') + (spec.kind === 'program' ? ' prog' : '');
    el.style.setProperty('--cf-accent', accent);

    const icon = spec.kind === 'program' ? `<div class="cf-ico"><img src="${ICON_BASE}${spec.code}.png" onerror="this.style.display='none'"></div>` : '';
    const chip = spec.kind === 'program' ? `${spec.code}${spec.sub ? ' · ' + spec.sub : ''}` : (spec.kind === 'aow' ? `${KIND_LABEL[spec.kind]} · ${spec.code}` : KIND_LABEL[spec.kind]);

    // On the focused (hub) card, anchor the Back / Exit controls to the centre so you never lose your place.
    const hubBar = isHub
      ? `<div class="cf-hubbar"><button class="cf-hubbtn cf-hubback">↑ Back a level</button><button class="cf-hubbtn cf-hubexit">✕ Exit 3D</button></div>`
      : '';
    el.innerHTML = `
      ${hubBar}
      <div class="cf-n2head">${icon}<div class="cf-n2meta">
        <span class="cf-kind">${chip}</span>
        <span class="cf-n2title">${spec.title}</span>
      </div></div>
      ${this.bodyHtml(spec)}
      ${isHub ? this.hubExtra(spec) : this.navHtml(spec)}`;

    if (!isHub) {
      el.addEventListener('pointerdown', e => e.stopPropagation());
      el.addEventListener('click', () => this.zone.run(() => this.toggleChild(index)));
      el.querySelectorAll('.cf-navbtn').forEach(btn =>
        btn.addEventListener('click', (ev: Event) => {
          ev.stopPropagation();
          const act = (btn as HTMLElement).dataset['act'];
          this.zone.run(() => (act === 'prev' ? this.prev() : act === 'next' ? this.next() : this.openSelected()));
        }));
    } else {
      el.addEventListener('pointerdown', e => e.stopPropagation());
      el.querySelector('.cf-hubback')?.addEventListener('click', (ev: Event) => { ev.stopPropagation(); this.zone.run(() => this.goBack()); });
      el.querySelector('.cf-hubexit')?.addEventListener('click', (ev: Event) => { ev.stopPropagation(); this.zone.run(() => this.close()); });
      el.querySelector('.cf-open')?.addEventListener('click', (ev: Event) => {
        ev.stopPropagation();
        this.zone.run(() => this.router.navigate(['/result-framework-reporting/entity-details', spec.programCode]));
      });
    }
    return el;
  }

  private bodyHtml(spec: NodeSpec): string {
    if (spec.kind === 'program') {
      return `<div class="cf-total"><b>${spec.results ?? 0}</b><span>${(spec.results ?? 0) ? 'results this phase' : 'no results yet'}</span></div>${this.statusBar(spec.statuses || {}, spec.results ?? 0)}`;
    }
    if (spec.kind === 'aow') {
      const col = this.progColor(spec.pct ?? 0);
      return `<div class="cf-prog"><i style="width:${Math.min(spec.pct ?? 0, 100)}%;background:${this.cssColor(col)}"></i></div>
        <div class="cf-pmeta"><span>${this.progLabel(spec.pct ?? 0)} · ${spec.results ?? 0} results</span><span>${spec.pct ?? 0}%</span></div>`;
    }
    const ind = spec.indicator;
    if (ind) {
      const col = this.progColor(ind.pct || 0);
      return `<div class="cf-ind"><div class="cf-desc">${(ind.desc || '').slice(0, 92)}</div>
        <div class="cf-kpi"><span class="cf-pill" style="background:${this.cssColor(col)}22;color:${this.cssColor(col)}">${ind.pctText}</span>
        <span class="cf-frac">${ind.act ?? 0} / ${ind.tgt ?? '—'}</span></div></div>`;
    }
    return `<div class="cf-ind"><div class="cf-desc">No indicator reported yet</div></div>`;
  }

  private navHtml(spec: NodeSpec): string {
    // Contextual drill-down label so the button says what opening reveals.
    const drill = spec.kind === 'program' ? 'Areas of Work ▸' : spec.kind === 'aow' ? 'Outputs & Outcomes ▸' : '';
    return `<div class="cf-nav">
      <button class="cf-navbtn" data-act="prev" title="Previous sibling">‹</button>
      ${spec.hasChildren ? `<button class="cf-navbtn cf-open2" data-act="open">${drill}</button>` : '<span class="cf-leaf-tag">deepest level</span>'}
      <button class="cf-navbtn" data-act="next" title="Next sibling">›</button>
    </div>`;
  }
  private hubExtra(spec: NodeSpec): string {
    return spec.kind === 'program' ? `<div class="cf-hublink"><a class="cf-open" href="javascript:void(0)">View full program page →</a></div>` : '';
  }

  // ---------------------------------------------------------------------------
  // Navigation actions
  // ---------------------------------------------------------------------------

  private selectChild(i: number, moveCam: boolean): void {
    if (i < 0 || i >= this.childObjs.length) return;
    this.childObjs.forEach((o, idx) => { const el = (o as any).element as HTMLElement; el.classList.toggle('sel', idx === i); });
    this.selIndex = i;
    if (moveCam) this.focusOn(this.childPos[i], this.stack.length ? 11 : 12);
    this.needsRender = true;
  }
  /** Click the already-selected node again → deselect it and pull the camera back to the level view. */
  private toggleChild(i: number): void {
    if (i === this.selIndex) this.deselect();
    else this.selectChild(i, true);
  }
  private deselect(): void {
    this.childObjs.forEach(o => ((o as any).element as HTMLElement).classList.remove('sel'));
    this.selIndex = -1;
    this.tweenCam(this.stack.length ? new THREE.Vector3(0, 3.5, 13) : new THREE.Vector3(0, 4, 17), new THREE.Vector3(0, 2.5, 0), 700);
    this.needsRender = true;
  }
  private prev(): void { if (!this.childObjs.length) return; const i = this.selIndex < 0 ? 0 : (this.selIndex - 1 + this.childObjs.length) % this.childObjs.length; this.selectChild(i, true); }
  private next(): void { if (!this.childObjs.length) return; const i = this.selIndex < 0 ? 0 : (this.selIndex + 1) % this.childObjs.length; this.selectChild(i, true); }

  private openSelected(): void {
    if (this.selIndex < 0) return;
    const spec = this.childSpecs[this.selIndex];
    if (!spec.hasChildren) return;
    this.stack.push({ kind: spec.kind, title: spec.title, code: spec.code, programCode: spec.programCode, aowCode: spec.aowCode });
    this.collapseCurrent();
    this.updateHeader();
    this.loadChildren();
    this.tweenCam(new THREE.Vector3(0, 3.5, 13), new THREE.Vector3(0, 2.5, 0), 850);
  }

  private goBack(): void {
    if (!this.stack.length) return;
    this.stack.pop();
    this.collapseCurrent();
    this.updateHeader();
    this.loadChildren();
    this.tweenCam(this.stack.length ? new THREE.Vector3(0, 3.5, 13) : new THREE.Vector3(0, 4, 17), new THREE.Vector3(0, 2.5, 0), 820);
  }
  onBack(): void { this.goBack(); }

  private updateHeader(): void {
    this.zone.run(() => {
      const top = this.stack[this.stack.length - 1];
      this.canGoBack.set(this.stack.length > 0);
      this.crumbs.set(['Portfolio', ...this.stack.map(s => s.code)]);
      this.subtitle.set(top
        ? `${top.title} — click a node, then ‹ ›, Open ▸ or Back`
        : 'Your Science Programs — click one, then Open ▸ to drill in');
    });
  }

  // ---------------------------------------------------------------------------
  // Scene infra / helpers
  // ---------------------------------------------------------------------------

  private initScene(): void {
    const host = this.hostRef().nativeElement;
    const canvas = this.canvasRef().nativeElement;
    const w = host.clientWidth, h = host.clientHeight;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(w, h); // updateStyle=true keeps the WebGL nodes aligned with the CSS3D cards
    this.renderer = renderer;

    const cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(w, h);
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.top = '0';
    cssRenderer.domElement.style.left = '0';
    host.appendChild(cssRenderer.domElement);
    this.cssRenderer = cssRenderer;

    const scene = new THREE.Scene();
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
    camera.position.set(0, 4, 17);
    this.camera = camera;

    const controls = new OrbitControls(camera, cssRenderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 6;
    controls.maxDistance = 40;
    controls.zoomSpeed = 1.3;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.target.set(0, 2.5, 0);
    controls.addEventListener('change', () => (this.needsRender = true));
    this.controls = controls;

    const g = new THREE.BufferGeometry();
    const n = 450, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 60 + Math.random() * 90, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(p) * Math.cos(t); pos[i * 3 + 1] = r * Math.cos(p); pos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x8a8ce0, size: 0.6, transparent: true, opacity: 0.5 })));

    scene.add(this.groupB, this.linesB);

    this.resizeObs = new ResizeObserver(() => this.onResize());
    this.resizeObs.observe(host);
    this.animate();
  }

  private onResize(): void {
    if (!this.renderer || !this.camera || !this.cssRenderer) return;
    const host = this.hostRef().nativeElement;
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.cssRenderer.setSize(w, h);
    this.needsRender = true;
  }

  private css(el: HTMLElement, x: number, y: number, z: number, scale = 0.012): CSS3DObject {
    const o = new CSS3DObject(el);
    o.position.set(x, y, z);
    o.scale.setScalar(scale);
    return o;
  }

  private color(v: string, fallback: string): THREE.Color {
    if (v.startsWith('var(')) { const raw = getComputedStyle(document.documentElement).getPropertyValue(v.slice(4, -1)).trim(); return new THREE.Color(raw || fallback); }
    return new THREE.Color(v || fallback);
  }
  private cssColor(v: string): string {
    if (v.startsWith('var(')) return getComputedStyle(document.documentElement).getPropertyValue(v.slice(4, -1)).trim() || '#888';
    return v;
  }
  private progColor(pct: number): string { return pct <= 0 ? 'var(--pr-color-accents-5)' : pct >= 100 ? (pct > 100 ? 'var(--pr-color-blue-500)' : 'var(--pr-color-green-500)') : 'var(--pr-color-yellow-300)'; }
  private progLabel(pct: number): string { return pct <= 0 ? 'Not started' : pct > 100 ? 'Overachieved' : pct >= 100 ? 'Achieved' : 'In progress'; }

  private statusBar(statuses: Record<number, number>, total: number): string {
    if (!total) return `<div class="cf-bar"></div>`;
    let segs = '';
    for (const id of STATUS_ORDER) { const c = statuses[id] || 0; if (!c) continue; segs += `<i style="width:${(c / total * 100).toFixed(1)}%;background:${this.cssColor(STATUS_META[id].chartVar)}"></i>`; }
    return `<div class="cf-bar">${segs}</div>`;
  }

  private clearGroup(g: THREE.Group): void {
    for (const c of [...g.children]) {
      g.remove(c);
      const mesh = c as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => m.dispose());
    }
  }
  private line(a: THREE.Vector3, b: THREE.Vector3, color = 0x9a9cf0, op = 0.8): THREE.Line {
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), new THREE.LineBasicMaterial({ color, transparent: true, opacity: op }));
  }
  private glow(pos: THREE.Vector3, color: THREE.Color): void {
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }));
    core.position.copy(pos);
    this.linesB.add(core);
  }
  private focusOn(target: THREE.Vector3, dist: number): void {
    if (!this.camera || !this.controls) return;
    const camDir = this.camera.position.clone().sub(this.controls.target);
    if (camDir.lengthSq() < 0.01) camDir.set(0, 2, dist);
    camDir.normalize();
    this.tweenCam(target.clone().add(camDir.multiplyScalar(dist)).add(new THREE.Vector3(0, 1, 0)), target.clone(), 720);
  }
  private tweenCam(toPos: THREE.Vector3, toTarget: THREE.Vector3, dur: number): void {
    if (!this.camera || !this.controls) return;
    this.camTween = { fromPos: this.camera.position.clone(), toPos, fromT: this.controls.target.clone(), toTarget, t0: performance.now(), dur };
  }
  private easeInOut(t: number): number { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  private fadeEl(el: HTMLElement, from: number, to: number, dur: number, delay = 0, onDone?: () => void): void {
    el.style.opacity = String(from);
    this.opacityTweens.push({ el, from, to, t0: performance.now() + delay, dur, onDone });
    this.needsRender = true;
  }
  /** Tween a 3D object's position (used to burst children out from / collapse them into the hub). */
  private movePos(obj: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, dur: number, delay = 0): void {
    obj.position.copy(from);
    this.posTweens.push({ obj, from: from.clone(), to: to.clone(), t0: performance.now() + delay, dur });
    this.needsRender = true;
  }
  /** Collapse every current card into the hub centre + fade it — the dynamic "leave" motion (no flat page fade). */
  private collapseCurrent(): void {
    for (const o of this.groupB.children) {
      this.movePos(o as THREE.Object3D, (o as THREE.Object3D).position.clone(), this.CENTER, 300);
      const el = (o as any).element as HTMLElement | undefined;
      if (el) this.fadeEl(el, parseFloat(el.style.opacity || '1'), 0, 300);
    }
    this.trackLines = [];
  }

  private billboardAndCull(): void {
    if (!this.camera) return;
    this._pv.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    this._frustum.setFromProjectionMatrix(this._pv);
    for (const o of this.groupB.children as unknown as CSS3DObject[]) {
      const el = (o as any).element as HTMLElement | undefined;
      if (!el) continue;
      const vis = this._frustum.containsPoint(o.position);
      el.style.visibility = vis ? 'visible' : 'hidden';
      if (vis) o.quaternion.copy(this.camera.quaternion);
    }
  }

  private animate = (): void => {
    this.frameId = requestAnimationFrame(this.animate);
    if (this.camTween) {
      const t = Math.min((performance.now() - this.camTween.t0) / this.camTween.dur, 1), e = this.easeInOut(t);
      this.camera!.position.lerpVectors(this.camTween.fromPos, this.camTween.toPos, e);
      this.controls!.target.lerpVectors(this.camTween.fromT, this.camTween.toTarget, e);
      if (t >= 1) this.camTween = null;
      this.needsRender = true;
    }
    if (this.opacityTweens.length) {
      const now = performance.now();
      this.opacityTweens = this.opacityTweens.filter(tw => {
        const t = Math.min(Math.max((now - tw.t0) / tw.dur, 0), 1);
        tw.el.style.opacity = String(tw.from + (tw.to - tw.from) * t);
        if (t >= 1) { tw.onDone?.(); return false; }
        return true;
      });
      this.needsRender = true;
    }
    if (this.posTweens.length) {
      const now = performance.now();
      this.posTweens = this.posTweens.filter(tw => {
        const t = Math.min(Math.max((now - tw.t0) / tw.dur, 0), 1), e = this.easeInOut(t);
        tw.obj.position.lerpVectors(tw.from, tw.to, e);
        return t < 1;
      });
      for (const tl of this.trackLines) tl.line.geometry.setFromPoints([tl.a, tl.obj.position]); // lines grow with the cards
      this.needsRender = true;
    }
    if (this.controls?.autoRotate) this.needsRender = true; // keep the slow idle spin alive under on-demand rendering
    this.controls?.update();
    if (!this.needsRender) return;
    this.needsRender = false;
    this.billboardAndCull();
    this.renderer!.render(this.scene!, this.camera!);
    this.cssRenderer!.render(this.scene!, this.camera!);
  };

  // ---------------------------------------------------------------------------
  // template state
  // ---------------------------------------------------------------------------
  readonly subtitle = signal('Your Science Programs — click one, then Open ▸ to drill in');
  readonly canGoBack = signal(false);
  readonly crumbs = signal<string[]>(['Portfolio']);
  readonly levels = [
    { label: 'Program', color: LEVEL_ACCENT.program },
    { label: 'Area of Work', color: LEVEL_ACCENT.aow },
    { label: 'Output', color: LEVEL_ACCENT.output },
    { label: 'Outcome', color: LEVEL_ACCENT.outcome }
  ];
}
