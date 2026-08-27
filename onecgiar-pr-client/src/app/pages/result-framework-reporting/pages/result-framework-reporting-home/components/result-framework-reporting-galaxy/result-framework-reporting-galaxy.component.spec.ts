import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

/**
 * `three` (and its ESM examples) never render in jsdom — there is no WebGL and the
 * package ships untranspiled ESM. This stub keeps just enough vector math for the
 * component's own logic (positions, tweens, frustum culling) to be exercised.
 * `three`, `three/examples/jsm/**` all resolve to the same mapped module, so one
 * factory covers THREE + OrbitControls + CSS3DRenderer/CSS3DObject.
 */
jest.mock('three', () => {
  class Vector3 {
    constructor(
      public x = 0,
      public y = 0,
      public z = 0
    ) {}
    set(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
    setScalar(s: number) {
      this.x = s;
      this.y = s;
      this.z = s;
      return this;
    }
    clone() {
      return new Vector3(this.x, this.y, this.z);
    }
    copy(v: any) {
      this.x = v.x;
      this.y = v.y;
      this.z = v.z;
      return this;
    }
    add(v: any) {
      this.x += v.x;
      this.y += v.y;
      this.z += v.z;
      return this;
    }
    sub(v: any) {
      this.x -= v.x;
      this.y -= v.y;
      this.z -= v.z;
      return this;
    }
    multiplyScalar(s: number) {
      this.x *= s;
      this.y *= s;
      this.z *= s;
      return this;
    }
    lengthSq() {
      return this.x * this.x + this.y * this.y + this.z * this.z;
    }
    normalize() {
      const l = Math.sqrt(this.lengthSq()) || 1;
      return this.multiplyScalar(1 / l);
    }
    lerpVectors(a: any, b: any, t: number) {
      this.x = a.x + (b.x - a.x) * t;
      this.y = a.y + (b.y - a.y) * t;
      this.z = a.z + (b.z - a.z) * t;
      return this;
    }
  }

  class Object3D {
    position = new Vector3();
    scale = new Vector3(1, 1, 1);
    quaternion = { copy: jest.fn() };
    children: any[] = [];
    visible = true;
    userData: any = {};
    add(...objs: any[]) {
      this.children.push(...objs);
      return this;
    }
    remove(obj: any) {
      const i = this.children.indexOf(obj);
      if (i >= 0) this.children.splice(i, 1);
      return this;
    }
  }

  class Group extends Object3D {}
  class Scene extends Object3D {}

  class PerspectiveCamera extends Object3D {
    aspect = 1;
    projectionMatrix = { id: 'proj' };
    matrixWorldInverse = { id: 'inv' };
    constructor(..._args: any[]) {
      super();
    }
    updateProjectionMatrix() {}
  }

  class Disposable {
    dispose = jest.fn();
  }

  class BufferGeometry extends Disposable {
    attributes: any = {};
    setAttribute(name: string, value: any) {
      this.attributes[name] = value;
      return this;
    }
    setFromPoints(points: any[]) {
      this.attributes['points'] = points;
      return this;
    }
  }

  class SphereGeometry extends Disposable {
    constructor(..._args: any[]) {
      super();
    }
  }

  class Material extends Disposable {
    constructor(public params: any = {}) {
      super();
    }
  }

  class Mesh extends Object3D {
    constructor(
      public geometry: any = new BufferGeometry(),
      public material: any = new Material()
    ) {
      super();
    }
  }

  class Line extends Mesh {}
  class Points extends Mesh {}

  class WebGLRenderer {
    constructor(public params: any = {}) {}
    setPixelRatio = jest.fn();
    setSize = jest.fn();
    render = jest.fn();
    dispose = jest.fn();
  }

  class CSS3DRenderer {
    domElement = document.createElement('div');
    setSize = jest.fn();
    render = jest.fn();
  }

  class CSS3DObject extends Object3D {
    constructor(public element: HTMLElement) {
      super();
    }
  }

  class OrbitControls {
    target = new Vector3();
    enableDamping = false;
    dampingFactor = 0;
    enablePan = true;
    minDistance = 0;
    maxDistance = 0;
    zoomSpeed = 1;
    autoRotate = false;
    autoRotateSpeed = 0;
    constructor(
      public camera: any,
      public dom: any
    ) {}
    addEventListener = jest.fn();
    update = jest.fn();
    dispose = jest.fn();
  }

  class Frustum {
    setFromProjectionMatrix = jest.fn();
    containsPoint() {
      return (globalThis as any).__frustumContains !== false;
    }
  }

  class Matrix4 {
    multiplyMatrices = jest.fn();
  }

  return {
    __esModule: true,
    Vector3,
    Object3D,
    Group,
    Scene,
    PerspectiveCamera,
    BufferGeometry,
    BufferAttribute: class {
      constructor(..._args: any[]) {}
    },
    SphereGeometry,
    MeshBasicMaterial: Material,
    PointsMaterial: Material,
    LineBasicMaterial: Material,
    Mesh,
    Line,
    Points,
    Color: class {
      constructor(public value: any) {}
    },
    WebGLRenderer,
    Frustum,
    Matrix4,
    CSS3DRenderer,
    CSS3DObject,
    OrbitControls
  };
});

import { ResultFrameworkReportingGalaxyComponent } from './result-framework-reporting-galaxy.component';
import { ResultFrameworkReportingHomeService } from '../../services/result-framework-reporting-home.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';

const asAny = (c: ResultFrameworkReportingGalaxyComponent) => c as any;

describe('ResultFrameworkReportingGalaxyComponent', () => {
  let component: ResultFrameworkReportingGalaxyComponent;
  let fixture: ComponentFixture<ResultFrameworkReportingGalaxyComponent>;
  let homeMock: any;
  let apiMock: any;
  let routerMock: any;

  const build = async (detect = false) => {
    await TestBed.configureTestingModule({
      imports: [ResultFrameworkReportingGalaxyComponent],
      providers: [
        { provide: ResultFrameworkReportingHomeService, useValue: homeMock },
        { provide: ApiService, useValue: apiMock },
        { provide: Router, useValue: routerMock }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultFrameworkReportingGalaxyComponent);
    component = fixture.componentInstance;
    if (detect) fixture.detectChanges();
    return component;
  };

  /** Minimal scene handles so the private render/animate paths can run. */
  const attachScene = () => {
    const three = jest.requireMock('three') as any;
    const scene = new three.Scene();
    const camera = new three.PerspectiveCamera();
    const controls = new three.OrbitControls(camera, document.createElement('div'));
    asAny(component).scene = scene;
    asAny(component).camera = camera;
    asAny(component).controls = controls;
    asAny(component).renderer = new three.WebGLRenderer();
    asAny(component).cssRenderer = new three.CSS3DRenderer();
    return { scene, camera, controls };
  };

  beforeEach(() => {
    (globalThis as any).__frustumContains = true;
    (globalThis as any).ResizeObserver = class {
      constructor(public cb: any) {}
      observe = jest.fn();
      disconnect = jest.fn();
    };

    homeMock = {
      mySPsList: signal<any[]>([]),
      otherSPsList: signal<any[]>([]),
      otherProjectsList: signal<any[]>([])
    };

    apiMock = {
      resultsSE: {
        GET_ClarisaGlobalUnits: jest.fn().mockReturnValue(of({ response: { units: [] } })),
        GET_TocResultsByAowId: jest.fn().mockReturnValue(of({ response: { tocResultsOutputs: [], tocResultsOutcomes: [] } }))
      }
    };

    routerMock = { navigate: jest.fn() };
  });

  afterEach(() => {
    component?.ngOnDestroy();
    jest.restoreAllMocks();
  });

  // ------------------------------------------------------------------- programs
  describe('programs()', () => {
    it('returns an empty list when nothing is loaded', async () => {
      await build();
      expect(asAny(component).programs()).toEqual([]);
    });

    it('maps my + other Science Programs and aggregates the status counts', async () => {
      homeMock.mySPsList.set([
        {
          initiativeCode: 'SP1',
          initiativeShortName: 'Short 1',
          initiativeName: 'Long 1',
          entityTypeName: 'Science Program',
          totalResults: 6,
          versions: [
            { statuses: [{ statusId: 1, count: 2 }] },
            { statuses: [{ statusId: 1, count: 3 }, { statusId: 3, count: 1 }] }
          ]
        }
      ]);
      homeMock.otherSPsList.set([{ initiativeCode: 'SP2', initiativeName: 'Long 2' }]);
      await build();

      const specs = asAny(component).programs();
      expect(specs).toHaveLength(2);
      expect(specs[0]).toMatchObject({ kind: 'program', title: 'Short 1', code: 'SP1', results: 6, hasChildren: true });
      expect(specs[0].statuses).toEqual({ 1: 5, 3: 1 });
      expect(specs[1]).toMatchObject({ title: 'Long 2', code: 'SP2', sub: '', results: 0 });
    });

    it('falls back through short name → name → code → em dash', async () => {
      homeMock.mySPsList.set([
        { initiativeCode: 'SP3', initiativeShortName: '', initiativeName: '', versions: [{ statuses: [{ statusId: 2 }] }] },
        {}
      ]);
      await build();

      const specs = asAny(component).programs();
      expect(specs[0].title).toBe('SP3');
      expect(specs[0].statuses).toEqual({ 2: 0 });
      expect(specs[1].title).toBe('—');
      expect(specs[1].code).toBe('—');
    });

    it('tolerates a null list and versions without statuses', async () => {
      homeMock.mySPsList.set([{ initiativeCode: 'SP4', versions: [{ statuses: undefined }, null] }]);
      homeMock.otherSPsList.set(null);
      await build();
      expect(asAny(component).programs()).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------- tocSpec
  describe('tocSpec()', () => {
    it('builds an output spec from the first indicator', async () => {
      await build();
      const spec = asAny(component).tocSpec(
        {
          result_title: 'A title',
          indicators: [
            { indicator_description: 'Main text ---- footnote', target_value_sum: 10, actual_achieved_value_sum: 4, progress_percentage: '40%' }
          ]
        },
        'output'
      );

      expect(spec.code).toBe('OUTPUT');
      expect(spec.hasChildren).toBe(false);
      expect(spec.indicator).toEqual({ desc: 'Main text', tgt: 10, act: 4, pct: 40, pctText: '40%' });
    });

    it('builds an outcome spec with no indicator and empty title', async () => {
      await build();
      const spec = asAny(component).tocSpec({ indicators: [] }, 'outcome');
      expect(spec.code).toBe('OUTCOME');
      expect(spec.title).toBe('');
      expect(spec.indicator).toBeUndefined();
    });

    it('defaults an unparseable progress percentage to 0', async () => {
      await build();
      const spec = asAny(component).tocSpec({ result_title: 'T', indicators: [{ progress_percentage: 'n/a' }] }, 'output');
      expect(spec.indicator.pct).toBe(0);
      expect(spec.indicator.pctText).toBe('n/a');
      expect(spec.indicator.desc).toBe('');
    });

    it('defaults a missing percentage text to 0%', async () => {
      await build();
      const spec = asAny(component).tocSpec({ result_title: 'T', indicators: [{}] }, 'output');
      expect(spec.indicator.pctText).toBe('0%');
    });
  });

  // --------------------------------------------------------------- loadChildren
  describe('loadChildren()', () => {
    it('loads the portfolio level (Science Programs) when the stack is empty', async () => {
      homeMock.mySPsList.set([{ initiativeCode: 'SP1', initiativeName: 'One' }]);
      await build();
      const render = jest.spyOn(asAny(component), 'renderLevel').mockImplementation(() => {});

      asAny(component).loadChildren();
      expect(asAny(component).childSpecs).toHaveLength(1);
      expect(render).toHaveBeenCalled();
    });

    it('maps the Areas of Work of a program', async () => {
      apiMock.resultsSE.GET_ClarisaGlobalUnits.mockReturnValue(
        of({ response: { units: [{ name: 'AoW 1', code: 'A1', progress: '55', resultsCount: { editing: 2, submitted: 3 } }, { code: 'A2' }] } })
      );
      await build();
      jest.spyOn(asAny(component), 'renderLevel').mockImplementation(() => {});
      asAny(component).stack = [{ kind: 'program', title: 'One', code: 'SP1' }];

      asAny(component).loadChildren();
      const specs = asAny(component).childSpecs;
      expect(specs[0]).toMatchObject({ kind: 'aow', title: 'AoW 1', code: 'A1', pct: 55, results: 5, programCode: 'SP1' });
      expect(specs[1]).toMatchObject({ title: '', pct: 0, results: 0 });
    });

    it('empties the level when the Areas of Work request fails', async () => {
      apiMock.resultsSE.GET_ClarisaGlobalUnits.mockReturnValue(throwError(() => new Error('boom')));
      await build();
      const render = jest.spyOn(asAny(component), 'renderLevel').mockImplementation(() => {});
      asAny(component).stack = [{ kind: 'program', title: 'One', code: 'SP1' }];

      asAny(component).loadChildren();
      expect(asAny(component).childSpecs).toEqual([]);
      expect(render).toHaveBeenCalled();
    });

    it('ignores a late Areas of Work response once destroyed', async () => {
      await build();
      const render = jest.spyOn(asAny(component), 'renderLevel').mockImplementation(() => {});
      asAny(component).disposed = true;
      asAny(component).stack = [{ kind: 'program', title: 'One', code: 'SP1' }];

      asAny(component).loadChildren();
      expect(render).not.toHaveBeenCalled();
    });

    it('ignores a late Areas of Work failure once destroyed', async () => {
      apiMock.resultsSE.GET_ClarisaGlobalUnits.mockReturnValue(throwError(() => new Error('boom')));
      await build();
      const render = jest.spyOn(asAny(component), 'renderLevel').mockImplementation(() => {});
      asAny(component).disposed = true;
      asAny(component).stack = [{ kind: 'program', title: 'One', code: 'SP1' }];

      asAny(component).loadChildren();
      expect(render).not.toHaveBeenCalled();
    });

    it('merges outputs and outcomes for an Area of Work', async () => {
      apiMock.resultsSE.GET_TocResultsByAowId.mockReturnValue(
        of({ response: { tocResultsOutputs: [{ result_title: 'O1' }], tocResultsOutcomes: [{ result_title: 'C1' }, { result_title: 'C2' }] } })
      );
      await build();
      jest.spyOn(asAny(component), 'renderLevel').mockImplementation(() => {});
      asAny(component).stack = [{ kind: 'aow', title: 'AoW', code: 'A1', programCode: 'SP1' }];

      asAny(component).loadChildren();
      const specs = asAny(component).childSpecs;
      expect(specs.map((s: any) => s.kind)).toEqual(['output', 'outcome', 'outcome']);
      expect(apiMock.resultsSE.GET_TocResultsByAowId).toHaveBeenCalledWith('SP1', 'A1');
    });

    it('tolerates an empty ToC payload and a failed ToC request', async () => {
      apiMock.resultsSE.GET_TocResultsByAowId.mockReturnValue(of({ response: null }));
      await build();
      jest.spyOn(asAny(component), 'renderLevel').mockImplementation(() => {});
      asAny(component).stack = [{ kind: 'aow', title: 'AoW', code: 'A1', programCode: 'SP1' }];
      asAny(component).loadChildren();
      expect(asAny(component).childSpecs).toEqual([]);

      apiMock.resultsSE.GET_TocResultsByAowId.mockReturnValue(throwError(() => new Error('nope')));
      asAny(component).childSpecs = [{}];
      asAny(component).loadChildren();
      expect(asAny(component).childSpecs).toEqual([]);
    });

    it('ignores a late ToC response once destroyed', async () => {
      await build();
      const render = jest.spyOn(asAny(component), 'renderLevel').mockImplementation(() => {});
      asAny(component).disposed = true;
      asAny(component).stack = [{ kind: 'aow', title: 'AoW', code: 'A1', programCode: 'SP1' }];
      asAny(component).loadChildren();
      expect(render).not.toHaveBeenCalled();

      apiMock.resultsSE.GET_TocResultsByAowId.mockReturnValue(throwError(() => new Error('nope')));
      asAny(component).loadChildren();
      expect(render).not.toHaveBeenCalled();
    });

    it('does nothing for a leaf level', async () => {
      await build();
      asAny(component).stack = [{ kind: 'output', title: 'x', code: 'OUTPUT' }];
      asAny(component).loadChildren();
      expect(apiMock.resultsSE.GET_ClarisaGlobalUnits).not.toHaveBeenCalled();
      expect(apiMock.resultsSE.GET_TocResultsByAowId).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------- renderLevel
  describe('renderLevel()', () => {
    it('does nothing before the scene exists', async () => {
      await build();
      asAny(component).childSpecs = [{ kind: 'program', title: 'x', code: 'SP1', hasChildren: true }];
      asAny(component).renderLevel();
      expect(asAny(component).childObjs).toEqual([]);
    });

    it('lays out the portfolio ring with no hub card', async () => {
      await build();
      attachScene();
      asAny(component).childSpecs = [
        { kind: 'program', title: 'A', code: 'SP1', results: 3, statuses: { 1: 3 }, hasChildren: true },
        { kind: 'program', title: 'B', code: 'SP2', results: 0, statuses: {}, hasChildren: true }
      ];

      asAny(component).renderLevel();
      expect(asAny(component).childObjs).toHaveLength(2);
      expect(asAny(component).trackLines).toHaveLength(0);
      expect(asAny(component).groupB.children).toHaveLength(2);
    });

    it('adds the hub card and the connecting lines when drilled in', async () => {
      await build();
      attachScene();
      asAny(component).stack = [{ kind: 'program', title: 'A', code: 'SP1', programCode: 'SP1' }];
      asAny(component).childSpecs = [{ kind: 'aow', title: 'AoW', code: 'A1', pct: 10, results: 1, hasChildren: true }];

      asAny(component).renderLevel();
      expect(asAny(component).childObjs).toHaveLength(1);
      expect(asAny(component).trackLines).toHaveLength(1);
      // hub + one child
      expect(asAny(component).groupB.children).toHaveLength(2);
    });

    it('handles an empty level', async () => {
      await build();
      attachScene();
      asAny(component).childSpecs = [];
      asAny(component).renderLevel();
      expect(asAny(component).childObjs).toEqual([]);
    });
  });

  // ------------------------------------------------------------------- makeCard
  describe('card markup', () => {
    const spec = (over: any = {}) => ({ kind: 'program', title: 'Card', code: 'SP1', hasChildren: true, ...over });

    it('renders a program card with results and a status bar', async () => {
      await build();
      const el = asAny(component).makeCard(spec({ results: 4, sub: 'Science Program', statuses: { 1: 2, 3: 2 } }), false, 0);
      expect(el.className).toContain('prog');
      expect(el.innerHTML).toContain('results this phase');
      expect(el.innerHTML).toContain('SP1 · Science Program');
      expect(el.querySelectorAll('.cf-bar i')).toHaveLength(2);
      expect(el.innerHTML).toContain('Areas of Work ▸');
    });

    it('renders a program card with no results yet and no sub label', async () => {
      await build();
      const el = asAny(component).makeCard(spec({ results: 0, statuses: {} }), false, 0);
      expect(el.innerHTML).toContain('no results yet');
      expect(el.innerHTML).not.toContain(' · ');
    });

    it('renders an Area of Work card with its progress bar', async () => {
      await build();
      const el = asAny(component).makeCard(spec({ kind: 'aow', pct: 150, results: 2 }), false, 0);
      expect(el.innerHTML).toContain('Overachieved');
      expect(el.innerHTML).toContain('Outputs &amp; Outcomes ▸');
    });

    it('renders an indicator card and the deepest-level tag', async () => {
      await build();
      const el = asAny(component).makeCard(
        spec({ kind: 'output', hasChildren: false, indicator: { desc: 'Some indicator', tgt: 8, act: 2, pct: 25, pctText: '25%' } }),
        false,
        0
      );
      expect(el.innerHTML).toContain('Some indicator');
      expect(el.innerHTML).toContain('2 / 8');
      expect(el.innerHTML).toContain('deepest level');
    });

    it('renders the fallback body when the leaf has no indicator', async () => {
      await build();
      const el = asAny(component).makeCard(spec({ kind: 'outcome', hasChildren: false }), false, 0);
      expect(el.innerHTML).toContain('No indicator reported yet');
    });

    it('renders an indicator card with missing target / actual values', async () => {
      await build();
      const el = asAny(component).makeCard(spec({ kind: 'output', hasChildren: false, indicator: { pctText: '0%', pct: 0 } }), false, 0);
      expect(el.innerHTML).toContain('0 / —');
    });

    it('renders the hub card with its Back / Exit bar and program link', async () => {
      await build();
      const el = asAny(component).makeCard(spec({ programCode: 'SP1', results: 0, statuses: {} }), true, -1);
      expect(el.className).toContain('hub2');
      expect(el.querySelector('.cf-hubback')).toBeTruthy();
      expect(el.querySelector('.cf-open')).toBeTruthy();
    });

    it('omits the program link on a non-program hub', async () => {
      await build();
      const el = asAny(component).makeCard(spec({ kind: 'aow', pct: 0 }), true, -1);
      expect(el.querySelector('.cf-open')).toBeNull();
    });
  });

  describe('card interactions', () => {
    it('a click on a child card toggles its selection', async () => {
      await build();
      const toggle = jest.spyOn(asAny(component), 'toggleChild').mockImplementation(() => {});
      const el = asAny(component).makeCard({ kind: 'program', title: 'A', code: 'SP1', hasChildren: true, results: 0, statuses: {} }, false, 2);

      el.dispatchEvent(new MouseEvent('pointerdown'));
      el.dispatchEvent(new MouseEvent('click'));
      expect(toggle).toHaveBeenCalledWith(2);
    });

    it('the ‹ › and open buttons drive the sibling navigation', async () => {
      await build();
      const prev = jest.spyOn(asAny(component), 'prev').mockImplementation(() => {});
      const next = jest.spyOn(asAny(component), 'next').mockImplementation(() => {});
      const open = jest.spyOn(asAny(component), 'openSelected').mockImplementation(() => {});
      const el = asAny(component).makeCard({ kind: 'program', title: 'A', code: 'SP1', hasChildren: true, results: 0, statuses: {} }, false, 0);

      const buttons = el.querySelectorAll('.cf-navbtn');
      buttons.forEach((b: Element) => b.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      expect(prev).toHaveBeenCalled();
      expect(open).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('the hub buttons go back, exit and open the program page', async () => {
      await build();
      const back = jest.spyOn(asAny(component), 'goBack').mockImplementation(() => {});
      const closed = jest.spyOn(component.closed, 'emit');
      const el = asAny(component).makeCard(
        { kind: 'program', title: 'A', code: 'SP1', programCode: 'SP1', hasChildren: false, results: 0, statuses: {} },
        true,
        -1
      );

      el.querySelector('.cf-hubback').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      el.querySelector('.cf-hubexit').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      el.querySelector('.cf-open').dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(back).toHaveBeenCalled();
      expect(closed).toHaveBeenCalled();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/result-framework-reporting/entity-details', 'SP1']);
    });
  });

  // ----------------------------------------------------------------- navigation
  describe('navigation', () => {
    const seedLevel = (count: number, hasChildren = true) => {
      attachScene();
      asAny(component).childSpecs = Array.from({ length: count }, (_v, i) => ({
        kind: 'program',
        title: `P${i}`,
        code: `SP${i}`,
        hasChildren,
        results: 0,
        statuses: {},
        programCode: `SP${i}`
      }));
      asAny(component).renderLevel();
    };

    it('selectChild ignores an out-of-range index', async () => {
      await build();
      seedLevel(2);
      asAny(component).selectChild(-1, false);
      asAny(component).selectChild(9, false);
      expect(asAny(component).selIndex).toBe(-1);
    });

    it('selectChild marks the card and can move the camera', async () => {
      await build();
      seedLevel(2);
      asAny(component).selectChild(1, false);
      expect(asAny(component).selIndex).toBe(1);
      expect(asAny(component).childObjs[1].element.classList.contains('sel')).toBe(true);

      asAny(component).selectChild(0, true);
      expect(asAny(component).camTween).not.toBeNull();
    });

    it('selectChild focuses closer once inside a level', async () => {
      await build();
      seedLevel(1);
      asAny(component).stack = [{ kind: 'program', title: 'A', code: 'SP1' }];
      asAny(component).selectChild(0, true);
      expect(asAny(component).selIndex).toBe(0);
    });

    it('toggleChild deselects the already selected card', async () => {
      await build();
      seedLevel(2);
      asAny(component).toggleChild(0);
      expect(asAny(component).selIndex).toBe(0);
      asAny(component).toggleChild(0);
      expect(asAny(component).selIndex).toBe(-1);
    });

    it('deselect pulls the camera back from both the root and a nested level', async () => {
      await build();
      seedLevel(1);
      asAny(component).deselect();
      expect(asAny(component).camTween.toPos.z).toBe(17);

      asAny(component).stack = [{ kind: 'program', title: 'A', code: 'SP1' }];
      asAny(component).deselect();
      expect(asAny(component).camTween.toPos.z).toBe(13);
    });

    it('prev / next are no-ops on an empty level', async () => {
      await build();
      asAny(component).prev();
      asAny(component).next();
      expect(asAny(component).selIndex).toBe(-1);
    });

    it('prev / next wrap around the ring', async () => {
      await build();
      seedLevel(3);
      asAny(component).next();
      expect(asAny(component).selIndex).toBe(0);
      asAny(component).next();
      expect(asAny(component).selIndex).toBe(1);
      asAny(component).prev();
      expect(asAny(component).selIndex).toBe(0);
      asAny(component).prev();
      expect(asAny(component).selIndex).toBe(2);

      asAny(component).selIndex = -1;
      asAny(component).prev();
      expect(asAny(component).selIndex).toBe(0);
    });

    it('openSelected does nothing without a selection', async () => {
      await build();
      seedLevel(2);
      asAny(component).openSelected();
      expect(asAny(component).stack).toEqual([]);
    });

    it('openSelected does nothing on a leaf node', async () => {
      await build();
      seedLevel(1, false);
      asAny(component).selectChild(0, false);
      asAny(component).openSelected();
      expect(asAny(component).stack).toEqual([]);
    });

    it('openSelected drills into the selected node', async () => {
      await build();
      seedLevel(2);
      const load = jest.spyOn(asAny(component), 'loadChildren').mockImplementation(() => {});
      asAny(component).selectChild(1, false);

      asAny(component).openSelected();
      expect(asAny(component).stack).toHaveLength(1);
      expect(component.canGoBack()).toBe(true);
      expect(component.crumbs()).toEqual(['Portfolio', 'SP1']);
      expect(component.subtitle()).toContain('P1');
      expect(load).toHaveBeenCalled();
    });

    it('goBack does nothing at the root and pops one level otherwise', async () => {
      await build();
      attachScene();
      component.onBack();
      expect(asAny(component).stack).toEqual([]);

      jest.spyOn(asAny(component), 'loadChildren').mockImplementation(() => {});
      asAny(component).stack = [{ kind: 'program', title: 'A', code: 'SP1' }];
      component.onBack();
      expect(asAny(component).stack).toEqual([]);
      expect(component.canGoBack()).toBe(false);
      expect(component.crumbs()).toEqual(['Portfolio']);
      expect(component.subtitle()).toContain('Your Science Programs');
    });

    it('close emits the closed output', async () => {
      await build();
      const spy = jest.spyOn(component.closed, 'emit');
      component.close();
      expect(spy).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------- helpers
  describe('colour + progress helpers', () => {
    it('color resolves a CSS variable and falls back', async () => {
      await build();
      jest.spyOn(window, 'getComputedStyle').mockReturnValue({ getPropertyValue: () => ' #ff0000 ' } as any);
      expect(asAny(component).color('var(--pr-color-primary-300)', '#999').value).toBe('#ff0000');

      jest.spyOn(window, 'getComputedStyle').mockReturnValue({ getPropertyValue: () => '' } as any);
      expect(asAny(component).color('var(--nope)', '#999').value).toBe('#999');
      expect(asAny(component).color('#123456', '#999').value).toBe('#123456');
      expect(asAny(component).color('', '#999').value).toBe('#999');
    });

    it('cssColor resolves a CSS variable and falls back to grey', async () => {
      await build();
      jest.spyOn(window, 'getComputedStyle').mockReturnValue({ getPropertyValue: () => ' #abcdef ' } as any);
      expect(asAny(component).cssColor('var(--x)')).toBe('#abcdef');

      jest.spyOn(window, 'getComputedStyle').mockReturnValue({ getPropertyValue: () => '' } as any);
      expect(asAny(component).cssColor('var(--x)')).toBe('#888');
      expect(asAny(component).cssColor('#111')).toBe('#111');
    });

    it('progColor covers every progress band', async () => {
      await build();
      expect(asAny(component).progColor(0)).toBe('var(--pr-color-accents-5)');
      expect(asAny(component).progColor(-5)).toBe('var(--pr-color-accents-5)');
      expect(asAny(component).progColor(50)).toBe('var(--pr-color-yellow-300)');
      expect(asAny(component).progColor(100)).toBe('var(--pr-color-green-500)');
      expect(asAny(component).progColor(140)).toBe('var(--pr-color-blue-500)');
    });

    it('progLabel covers every progress band', async () => {
      await build();
      expect(asAny(component).progLabel(0)).toBe('Not started');
      expect(asAny(component).progLabel(50)).toBe('In progress');
      expect(asAny(component).progLabel(100)).toBe('Achieved');
      expect(asAny(component).progLabel(101)).toBe('Overachieved');
    });

    it('statusBar renders nothing without results and skips empty statuses', async () => {
      await build();
      expect(asAny(component).statusBar({}, 0)).toBe('<div class="cf-bar"></div>');

      const html = asAny(component).statusBar({ 1: 5, 3: 0, 999: 7 }, 10);
      expect(html).toContain('width:50.0%');
      expect(html.match(/<i /g)).toHaveLength(1);
    });

    it('easeInOut is symmetric around the midpoint', async () => {
      await build();
      expect(asAny(component).easeInOut(0)).toBe(0);
      expect(asAny(component).easeInOut(0.25)).toBeCloseTo(0.125);
      expect(asAny(component).easeInOut(1)).toBe(1);
    });
  });

  describe('scene helpers', () => {
    it('clearGroup disposes geometries and single or array materials', async () => {
      await build();
      const three = jest.requireMock('three') as any;
      const group = new three.Group();
      const geometry = new three.BufferGeometry();
      const materialA = new three.MeshBasicMaterial();
      const materialB = new three.MeshBasicMaterial();
      const meshSingle = new three.Mesh(geometry, materialA);
      const meshArray = new three.Mesh(new three.BufferGeometry(), [materialB]);
      const bare = new three.Object3D();
      (bare as any).geometry = undefined;
      (bare as any).material = undefined;
      group.add(meshSingle, meshArray, bare);

      asAny(component).clearGroup(group);
      expect(group.children).toHaveLength(0);
      expect(geometry.dispose).toHaveBeenCalled();
      expect(materialA.dispose).toHaveBeenCalled();
      expect(materialB.dispose).toHaveBeenCalled();
    });

    it('focusOn and tweenCam bail out without a camera', async () => {
      await build();
      const three = jest.requireMock('three') as any;
      asAny(component).focusOn(new three.Vector3(1, 1, 1), 10);
      asAny(component).tweenCam(new three.Vector3(), new three.Vector3(), 100);
      expect(asAny(component).camTween).toBeNull();
    });

    it('focusOn falls back to a default direction when the camera sits on the target', async () => {
      await build();
      const { camera, controls } = attachScene();
      camera.position.set(0, 0, 0);
      controls.target.set(0, 0, 0);

      const three = jest.requireMock('three') as any;
      asAny(component).focusOn(new three.Vector3(2, 2, 2), 10);
      expect(asAny(component).camTween).not.toBeNull();
      expect(asAny(component).camTween.dur).toBe(720);
    });

    it('collapseCurrent pulls every card into the centre', async () => {
      await build();
      attachScene();
      asAny(component).childSpecs = [{ kind: 'program', title: 'A', code: 'SP1', hasChildren: true, results: 0, statuses: {} }];
      asAny(component).renderLevel();
      // a plain object with no DOM element must not break the collapse
      asAny(component).groupB.add(new (jest.requireMock('three') as any).Object3D());

      asAny(component).collapseCurrent();
      expect(asAny(component).trackLines).toEqual([]);
      expect(asAny(component).posTweens.length).toBeGreaterThan(0);
    });

    it('billboardAndCull hides the cards outside the frustum', async () => {
      await build();
      attachScene();
      asAny(component).childSpecs = [{ kind: 'program', title: 'A', code: 'SP1', hasChildren: true, results: 0, statuses: {} }];
      asAny(component).renderLevel();
      const el = asAny(component).childObjs[0].element as HTMLElement;

      asAny(component).billboardAndCull();
      expect(el.style.visibility).toBe('visible');

      (globalThis as any).__frustumContains = false;
      asAny(component).billboardAndCull();
      expect(el.style.visibility).toBe('hidden');
    });

    it('billboardAndCull bails out without a camera and skips element-less objects', async () => {
      await build();
      attachScene();
      const three = jest.requireMock('three') as any;
      asAny(component).groupB.add(new three.Object3D());
      expect(() => asAny(component).billboardAndCull()).not.toThrow();

      asAny(component).camera = undefined;
      expect(() => asAny(component).billboardAndCull()).not.toThrow();
    });
  });

  // -------------------------------------------------------------------- animate
  describe('animate loop', () => {
    beforeEach(() => {
      jest.spyOn(window, 'requestAnimationFrame').mockReturnValue(1 as any);
    });

    it('renders one frame and then idles until something changes', async () => {
      await build();
      const { controls } = attachScene();
      controls.autoRotate = false;

      asAny(component).needsRender = true;
      asAny(component).animate();
      expect(asAny(component).renderer.render).toHaveBeenCalledTimes(1);

      asAny(component).animate();
      expect(asAny(component).renderer.render).toHaveBeenCalledTimes(1);
    });

    it('keeps rendering while the idle auto-rotation is on', async () => {
      await build();
      const { controls } = attachScene();
      controls.autoRotate = true;
      asAny(component).needsRender = false;

      asAny(component).animate();
      expect(asAny(component).renderer.render).toHaveBeenCalled();
      expect(controls.update).toHaveBeenCalled();
    });

    it('finishes the camera tween', async () => {
      await build();
      const three = jest.requireMock('three') as any;
      attachScene();
      asAny(component).tweenCam(new three.Vector3(0, 0, 10), new three.Vector3(0, 1, 0), 100);
      asAny(component).camTween.t0 = performance.now() - 1000;

      asAny(component).animate();
      expect(asAny(component).camTween).toBeNull();
      expect(asAny(component).camera.position.z).toBe(10);
    });

    it('keeps a camera tween alive mid-flight', async () => {
      await build();
      const three = jest.requireMock('three') as any;
      attachScene();
      asAny(component).tweenCam(new three.Vector3(0, 0, 10), new three.Vector3(0, 1, 0), 10000);

      asAny(component).animate();
      expect(asAny(component).camTween).not.toBeNull();
    });

    it('runs the opacity tweens to completion and fires the callback', async () => {
      await build();
      attachScene();
      const el = document.createElement('div');
      const onDone = jest.fn();
      asAny(component).fadeEl(el, 0, 1, 100, 0, onDone);
      asAny(component).opacityTweens[0].t0 = performance.now() - 1000;

      asAny(component).animate();
      expect(el.style.opacity).toBe('1');
      expect(onDone).toHaveBeenCalled();
      expect(asAny(component).opacityTweens).toHaveLength(0);
    });

    it('keeps a delayed opacity tween pending', async () => {
      await build();
      attachScene();
      const el = document.createElement('div');
      asAny(component).fadeEl(el, 0, 1, 100, 5000);

      asAny(component).animate();
      expect(asAny(component).opacityTweens).toHaveLength(1);
      expect(el.style.opacity).toBe('0');
    });

    it('runs the position tweens and grows the tracking lines', async () => {
      await build();
      const three = jest.requireMock('three') as any;
      attachScene();
      const obj = new three.Object3D();
      const line = new three.Line();
      asAny(component).movePos(obj, new three.Vector3(0, 0, 0), new three.Vector3(4, 0, 0), 100);
      asAny(component).posTweens[0].t0 = performance.now() - 1000;
      asAny(component).trackLines = [{ line, a: new three.Vector3(), obj }];

      asAny(component).animate();
      expect(obj.position.x).toBe(4);
      expect(asAny(component).posTweens).toHaveLength(0);
      expect(line.geometry.attributes['points']).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------- scene startup
  describe('scene lifecycle', () => {
    it('initialises the whole scene on view init', async () => {
      jest.spyOn(window, 'requestAnimationFrame').mockReturnValue(1 as any);
      await build(true);

      expect(asAny(component).renderer).toBeDefined();
      expect(asAny(component).cssRenderer).toBeDefined();
      expect(asAny(component).controls.autoRotate).toBe(true);
      expect(asAny(component).resizeObs.observe).toHaveBeenCalled();
      // the portfolio level was requested straight away
      expect(asAny(component).childSpecs).toEqual([]);
    });

    it('onResize bails out before the renderer exists', async () => {
      await build();
      expect(() => asAny(component).onResize()).not.toThrow();
    });

    it('onResize bails out on a zero-sized host and resizes otherwise', async () => {
      jest.spyOn(window, 'requestAnimationFrame').mockReturnValue(1 as any);
      await build(true);
      const renderer = asAny(component).renderer;
      renderer.setSize.mockClear();

      // jsdom reports 0×0 → nothing to do
      asAny(component).onResize();
      expect(renderer.setSize).not.toHaveBeenCalled();

      const host = asAny(component).hostRef().nativeElement as HTMLElement;
      Object.defineProperty(host, 'clientWidth', { value: 800, configurable: true });
      Object.defineProperty(host, 'clientHeight', { value: 400, configurable: true });
      asAny(component).onResize();
      expect(renderer.setSize).toHaveBeenCalledWith(800, 400);
      expect(asAny(component).camera.aspect).toBe(2);
    });

    it('ngOnDestroy tears the scene down', async () => {
      jest.spyOn(window, 'requestAnimationFrame').mockReturnValue(1 as any);
      await build(true);
      const { renderer, controls, resizeObs } = asAny(component);

      component.ngOnDestroy();
      expect(asAny(component).disposed).toBe(true);
      expect(renderer.dispose).toHaveBeenCalled();
      expect(controls.dispose).toHaveBeenCalled();
      expect(resizeObs.disconnect).toHaveBeenCalled();
    });

    it('exposes the level legend', async () => {
      await build();
      expect(component.levels.map(l => l.label)).toEqual(['Program', 'Area of Work', 'Output', 'Outcome']);
    });
  });
});
