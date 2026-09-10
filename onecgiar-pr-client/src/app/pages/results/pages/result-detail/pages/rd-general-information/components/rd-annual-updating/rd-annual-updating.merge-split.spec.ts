import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { RdAnnualUpdatingComponent } from './rd-annual-updating.component';
import { DataControlService } from '../../../../../../../../shared/services/data-control.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

/**
 * P2-3292 Steps 3A / 3B — the "where did this innovation continue" dropdowns.
 *
 * What these pin, in order of what would hurt most:
 *   1. The two dropdowns share ONE stored collection, told apart by `transition_type`. Rebuilding
 *      the array from one of them wipes the other's answers, and a reporter who declared both a
 *      merge and a split would lose whichever they filled first — silently.
 *   2. The reasons are recognised by TEXT. If a catalogue row is ever reworded the dropdown just
 *      stops appearing, with no error, so the strings are asserted verbatim here.
 *   3. A declared merge with no target is the exact state this story exists to prevent, so it must
 *      report incomplete.
 */
const INNOVATION_DEVELOPMENT = 7;
const MERGE_REASON = 'Discontinued: merging with another innovation';
const SPLIT_REASON = 'Discontinued: splitting into multiple innovations';

describe('RdAnnualUpdatingComponent — merge / split targets (P2-3292 Step 3)', () => {
  let dataControlSE: DataControlService;
  let api: ApiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RdAnnualUpdatingComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    dataControlSE = TestBed.inject(DataControlService);
    api = TestBed.inject(ApiService);
  });

  /** The codes every test can select. Real-looking six-digit result codes, as PRMS issues them. */
  const CATALOGUE_CODES = [900, 901, 902, 701, 702, 703];

  /**
   * 🛑 `id` y `result_code` son DELIBERADAMENTE DISTINTOS, y de eso depende que estos candados
   * puedan fallar. Hasta el 4-sep-2026 el catálogo de prueba solo traía `result_code`, así que
   * guardar el código en lugar del id **no era distinguible** y los 35 tests pasaban con un defecto
   * que en prtest hacía que el reportero eligiera una innovación y se guardara OTRA.
   * El desplazamiento (+2500) es arbitrario y existe exactamente para eso: si algún día se igualan,
   * estos candados dejan de vigilar sin avisar.
   */
  const asCatalogue = (codes: number[]) =>
    codes.map(code => ({
      id: code + 2500,
      result_code: code,
      title: `Innovation ${code}`,
      label: `${code} - Innovation ${code}`
    }));

  /** El id interno que corresponde a un código del catálogo de prueba. */
  const idOf = (code: number) => code + 2500;

  /**
   * A component with the 2026 Innovation Development context the story scopes.
   *
   * 🛑 It seeds the CATALOGUE, and that is not decoration. Until 4 Sep 2026 these tests ran with an
   * empty catalogue and asserted on raw ids, so every one of them passed against the binding that
   * caused NG0103 on screen — they could not have failed. `selectedTargets` resolves stored ids
   * against the catalogue, so a test without one exercises the empty path and nothing else.
   */
  const build = (options: any[] = [], discontinued = true, catalogue: number[] = CATALOGUE_CODES) => {
    dataControlSE.currentResult = { id: 11494, result_type_id: INNOVATION_DEVELOPMENT, phase_year: 2026 };
    dataControlSE.reportingCurrentPhase = { ...dataControlSE.reportingCurrentPhase, phaseYear: 2026 };

    const component = TestBed.createComponent(RdAnnualUpdatingComponent).componentInstance;
    component.generalInfoBody.is_discontinued = discontinued;
    component.generalInfoBody.discontinued_options = options;
    component.generalInfoBody.merge_split_targets = [];
    component.mergeSplitCatalogue = asCatalogue(catalogue);
    return component;
  };

  const ticked = (text: string) => ({ option: text, value: true });
  const unticked = (text: string) => ({ option: text, value: false });

  /** What the dropdown shows, expressed as the ids a human can read in an assertion. */
  const shownCodes = (component: any, type: 'merge' | 'split') => component.selectedTargets(type).map((option: any) => option.result_code);

  /** What would travel to the server. */
  const storedFor = (component: any, type: 'merge' | 'split') =>
    (component.generalInfoBody.merge_split_targets ?? [])
      .filter((target: any) => target.transition_type === type)
      .map((target: any) => target.target_result_id);

  describe('when the dropdowns appear', () => {
    it('shows the merge dropdown only when the merging reason is ticked', () => {
      expect(build([ticked(MERGE_REASON)]).showsMergeTargets).toBe(true);
      expect(build([unticked(MERGE_REASON)]).showsMergeTargets).toBe(false);
      expect(build([]).showsMergeTargets).toBe(false);
    });

    it('shows the split dropdown only when the splitting reason is ticked', () => {
      expect(build([ticked(SPLIT_REASON)]).showsSplitTargets).toBe(true);
      expect(build([ticked(MERGE_REASON)]).showsSplitTargets).toBe(false);
    });

    it('shows both when the reporter ticked both reasons', () => {
      const component = build([ticked(MERGE_REASON), ticked(SPLIT_REASON)]);
      expect(component.showsMergeTargets).toBe(true);
      expect(component.showsSplitTargets).toBe(true);
    });

    it('hides them when the innovation is not discontinued at all', () => {
      // The reason cannot be ticked without the innovation being inactive, but the flag is the
      // authority: unticking "inactive" must take the whole block away with it.
      const component = build([ticked(MERGE_REASON)], false);
      expect(component.showsMergeTargets).toBe(false);
    });

    it('does not match a different reason that merely mentions innovations', () => {
      const component = build([ticked('Discontinued: limited W1/W2 resource availability')]);
      expect(component.showsMergeTargets).toBe(false);
      expect(component.showsSplitTargets).toBe(false);
    });

    it('tolerates padded catalogue text', () => {
      expect(build([{ option: `  ${MERGE_REASON}  `, value: true }]).showsMergeTargets).toBe(true);
    });
  });

  describe('the two dropdowns share one collection without erasing each other', () => {
    it('keeps the split targets when the merge selection changes', () => {
      const component = build([ticked(MERGE_REASON), ticked(SPLIT_REASON)]);

      component.onTargetsChange('split', [idOf(701), idOf(702)]);
      component.onTargetsChange('merge', [idOf(900)]);

      expect(shownCodes(component, 'split')).toEqual([701, 702]);
      expect(shownCodes(component, 'merge')).toEqual([900]);
      expect(component.generalInfoBody.merge_split_targets).toHaveLength(3);
    });

    it('replaces only its own type when a selection is reduced', () => {
      const component = build([ticked(MERGE_REASON), ticked(SPLIT_REASON)]);
      component.onTargetsChange('merge', [idOf(900), idOf(901)]);
      component.onTargetsChange('split', [idOf(701)]);

      component.onTargetsChange('merge', [idOf(901)]);

      expect(shownCodes(component, 'merge')).toEqual([901]);
      expect(shownCodes(component, 'split')).toEqual([701]);
    });

    it('clears its own type when the selection is emptied, leaving the other', () => {
      const component = build([ticked(MERGE_REASON), ticked(SPLIT_REASON)]);
      component.onTargetsChange('merge', [idOf(900)]);
      component.onTargetsChange('split', [idOf(701)]);

      component.onTargetsChange('merge', []);

      expect(shownCodes(component, 'merge')).toEqual([]);
      expect(shownCodes(component, 'split')).toEqual([701]);
    });

    it('stores every entry with its transition type, which is how the server tells them apart', () => {
      const component = build([ticked(SPLIT_REASON)]);

      component.onTargetsChange('split', [idOf(701), idOf(702), idOf(703)]);

      expect(component.generalInfoBody.merge_split_targets).toEqual([
        { target_result_id: idOf(701), transition_type: 'split' },
        { target_result_id: idOf(702), transition_type: 'split' },
        { target_result_id: idOf(703), transition_type: 'split' }
      ]);
    });

    it('survives a null selection without throwing', () => {
      const component = build([ticked(MERGE_REASON)]);
      expect(() => component.onTargetsChange('merge', null as any)).not.toThrow();
      expect(shownCodes(component, 'merge')).toEqual([]);
    });
  });

  describe('completeness', () => {
    it('is incomplete while a declared merge names no target', () => {
      expect(build([ticked(MERGE_REASON)]).mergeSplitIsComplete).toBe(false);
    });

    it('becomes complete once a target is named', () => {
      const component = build([ticked(MERGE_REASON)]);
      component.onTargetsChange('merge', [idOf(900)]);
      expect(component.mergeSplitIsComplete).toBe(true);
    });

    it('requires a target for EACH declared transition, not just one of them', () => {
      const component = build([ticked(MERGE_REASON), ticked(SPLIT_REASON)]);
      component.onTargetsChange('merge', [idOf(900)]);
      expect(component.mergeSplitIsComplete).toBe(false);

      component.onTargetsChange('split', [idOf(701)]);
      expect(component.mergeSplitIsComplete).toBe(true);
    });

    it('is complete when neither reason is declared', () => {
      expect(build([]).mergeSplitIsComplete).toBe(true);
    });
  });

  describe('the catalogue', () => {
    it('labels each option as the story asks: innovation id then title', () => {
      const spy = jest
        .spyOn(api.resultsSE, 'GET_mergeSplitTargetInnovations')
        .mockReturnValue(of({ response: [{ result_code: 6432, title: 'Drought-tolerant bean' }] }) as any);

      const component = build([ticked(MERGE_REASON)]);
      component.ensureMergeSplitCatalogue();

      expect(spy).toHaveBeenCalledWith(11494);
      expect(component.mergeSplitCatalogue[0].label).toBe('6432 - Drought-tolerant bean');
    });

    it('is requested once, not on every click', () => {
      const spy = jest.spyOn(api.resultsSE, 'GET_mergeSplitTargetInnovations').mockReturnValue(of({ response: [] }) as any);

      const component = build([ticked(MERGE_REASON)]);
      component.ensureMergeSplitCatalogue();
      component.ensureMergeSplitCatalogue();
      component.ensureMergeSplitCatalogue();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('is not fetched at all while neither dropdown is visible', () => {
      const spy = jest.spyOn(api.resultsSE, 'GET_mergeSplitTargetInnovations');

      build([]).ensureMergeSplitCatalogue();

      expect(spy).not.toHaveBeenCalled();
    });

    it('leaves an empty list and stops loading when the request fails', () => {
      // General Information is a whole screen of unrelated fields; an unreadable catalogue must not
      // cost the reporter any of them.
      jest.spyOn(api.resultsSE, 'GET_mergeSplitTargetInnovations').mockReturnValue(throwError(() => new Error('boom')) as any);

      const component = build([ticked(MERGE_REASON)]);
      expect(() => component.ensureMergeSplitCatalogue()).not.toThrow();
      expect(component.mergeSplitCatalogue).toEqual([]);
      expect(component.mergeSplitCatalogueLoading).toBe(false);
    });
  });

  /**
   * 🛑 EL CANDADO DEL NG0103, y el único de este archivo que habría cazado el defecto.
   *
   * Los demás tests de este archivo llaman a los métodos directamente y **pasaron igual antes y
   * después del arreglo** — no cubren nada de esto. El defecto vivía en la interacción entre el
   * binding y la detección de cambios de Angular: `selectedTargets()` devolvía un array NUEVO en
   * cada llamada, el multi-select veía otra referencia en cada ciclo, hacía `writeValue`, marcaba
   * la vista sucia, y volvía a empezar. En prtest el control se pintaba con los datos correctos y
   * al hacer clic **no seleccionaba nada**, con `NG0103` en consola.
   *
   * `build:dev`, `ng lint` y 8451 tests estaban en verde. Lo encontró abrir la pantalla.
   *
   * Lo que se afirma aquí es la **estabilidad de la referencia**, que es exactamente lo que la
   * detección de cambios necesita: mismo contenido ⇒ mismo array.
   */
  describe('la referencia debe ser estable (candado NG0103)', () => {
    it('devuelve LA MISMA instancia mientras el contenido no cambia', () => {
      const component = build([ticked(MERGE_REASON)]);
      component.onTargetsChange('merge', [idOf(900), idOf(901)]);

      const first = component.selectedTargets('merge');
      const second = component.selectedTargets('merge');
      const third = component.selectedTargets('merge');

      // toBe, no toEqual: toEqual pasa con arrays distintos de igual contenido, que es
      // precisamente el bug.
      expect(second).toBe(first);
      expect(third).toBe(first);
    });

    it('devuelve una instancia NUEVA cuando el contenido sí cambió', () => {
      const component = build([ticked(MERGE_REASON)]);
      component.onTargetsChange('merge', [idOf(900)]);
      const before = component.selectedTargets('merge');

      component.onTargetsChange('merge', [idOf(900), idOf(901)]);
      const after = component.selectedTargets('merge');

      expect(after).not.toBe(before);
      expect(after.map((option: any) => option.result_code)).toEqual([900, 901]);
    });

    it('mantiene estable la referencia de cada tipo por separado', () => {
      const component = build([ticked(MERGE_REASON), ticked(SPLIT_REASON)]);
      component.onTargetsChange('merge', [idOf(900)]);
      component.onTargetsChange('split', [idOf(701)]);

      const mergeRef = component.selectedTargets('merge');
      const splitRef = component.selectedTargets('split');

      // Cambiar un tipo no debe invalidar la referencia del otro: si lo hiciera, el dropdown
      // intacto entraría en el mismo bucle.
      component.onTargetsChange('merge', [idOf(900), idOf(902)]);

      expect(component.selectedTargets('split')).toBe(splitRef);
      expect(component.selectedTargets('merge')).not.toBe(mergeRef);
    });

    it('es estable también con la selección vacía', () => {
      const component = build([ticked(MERGE_REASON)]);

      const first = component.selectedTargets('merge');
      expect(component.selectedTargets('merge')).toBe(first);
      expect(first).toEqual([]);
    });
  });

  /**
   * 🛑 EL OTRO CANDADO DEL NG0103 — la mitad que faltaba, y la que de verdad cerró el bucle.
   *
   * La estabilidad de referencia de arriba era NECESARIA pero NO SUFICIENTE: se desplegó sola
   * (build #2150) y el NG0103 **sobrevivió** a una recarga con caché limpia. El bucle no vivía en
   * nuestro código sino en `PrMultiSelectComponent.writeValue`, que al recibir un id CRUDO remapea
   * el array a objetos — creando una referencia nueva, poniendo su señal y ensuciando la vista en
   * cada pasada. Su propio comentario fija el contrato: *"When every entry is already an object,
   * keep the EXACT array reference ... without re-triggering writeValue."*
   *
   * Por eso lo que se afirma aquí es el TIPO de lo que se entrega. Un `.map(t => Number(...))`
   * vuelve a compilar, vuelve a pasar los tests de arriba, y vuelve a colgar la pantalla.
   */
  describe('lo que se entrega al multi-select deben ser OBJETOS (candado NG0103, 2ª mitad)', () => {
    it('entrega objetos del catálogo, nunca ids crudos', () => {
      const component = build([ticked(MERGE_REASON)]);
      component.onTargetsChange('merge', [idOf(900), idOf(901)]);

      const delivered = component.selectedTargets('merge');

      expect(delivered).toHaveLength(2);
      for (const entry of delivered) {
        // `typeof`, no `toEqual`: es el TIPO lo que decide si writeValue remapea.
        expect(typeof entry).toBe('object');
        expect(entry).not.toBeNull();
      }
    });

    it('entrega LA MISMA instancia que está en el catálogo, no una copia', () => {
      const component = build([ticked(MERGE_REASON)]);
      component.onTargetsChange('merge', [idOf(901)]);

      // Una copia serviría para el tipo pero no para las chips: el control compara contra las
      // opciones que le pasamos en [options].
      expect(component.selectedTargets('merge')[0]).toBe(component.mergeSplitCatalogue.find(o => o.id === idOf(901)));
    });

    it('acepta los OBJETOS que el control emite y guarda el id', () => {
      const component = build([ticked(MERGE_REASON)]);

      // Lo que `pr-multi-select` emite de verdad: copias con `new`/`is_active` encima (línea 362
      // de pr-multi-select.component.ts), no los ids.
      component.onTargetsChange('merge', [
        { id: idOf(900), result_code: 900, title: 'Innovation 900', new: true, is_active: true },
        { id: idOf(902), result_code: 902, title: 'Innovation 902', new: true, is_active: true }
      ] as any);

      expect(storedFor(component, 'merge')).toEqual([idOf(900), idOf(902)]);
      expect(shownCodes(component, 'merge')).toEqual([900, 902]);
    });

    it('sigue aceptando ids crudos, para que un llamador no guarde NaN en silencio', () => {
      const component = build([ticked(MERGE_REASON)]);
      component.onTargetsChange('merge', [idOf(900), String(idOf(901)) as any]);
      expect(storedFor(component, 'merge')).toEqual([idOf(900), idOf(901)]);
    });

    it('descarta la basura en vez de guardarla como NaN', () => {
      const component = build([ticked(MERGE_REASON)]);
      component.onTargetsChange('merge', [idOf(900), null, undefined, {}, 'x'] as any);
      expect(storedFor(component, 'merge')).toEqual([idOf(900)]);
    });
  });

  /**
   * 🛑 EL CANDADO DEL BUG DE DATOS — el defecto más silencioso de todo P2-3292.
   *
   * `target_result_id` es FK a `result.id`. El 4-sep-2026 se guardaba el `result_code`, y el efecto
   * no fue un error: fue **guardar otra innovación**. Medido en prtest: el reportero eligió
   * "test bilateral JD" (id **11438**, code **8970**), se almacenó **8970 como id** — que resultó ser
   * el id de OTRO resultado real — y al releerlo la pantalla mostraba *"Unraveling the genetic
   * architecture of stripe rust resistance in ICARDA spring wheat"*.
   *
   * ⚠️ **Y el FK no protegió.** Aceptó 8970 porque ese id existe. Un FK caza los ids inexistentes,
   * nunca los ids equivocados — y con 11.000 resultados en la tabla, casi cualquier código es
   * también el id de algo. Por eso este candado compara **valores distintos a propósito**
   * (`idOf(code) = code + 2500`): con id y código iguales, no habría nada que detectar.
   */
  describe('lo que se GUARDA es el id, nunca el result_code (candado del bug de datos)', () => {
    it('guarda el id interno del objeto elegido, no su código visible', () => {
      const component = build([ticked(MERGE_REASON)]);
      const opcion = component.mergeSplitCatalogue.find((o: any) => o.result_code === 900);

      component.onTargetsChange('merge', [opcion] as any);

      expect(storedFor(component, 'merge')).toEqual([idOf(900)]);
      // La aserción que de verdad importa: NO el código.
      expect(storedFor(component, 'merge')).not.toContain(900);
    });

    it('sigue MOSTRANDO el código y el título, que es lo que la historia pide ver', () => {
      const component = build([ticked(MERGE_REASON)]);
      component.onTargetsChange('merge', [idOf(900)]);

      const mostrado = component.selectedTargets('merge')[0];
      expect(mostrado.result_code).toBe(900);
      expect(mostrado.label).toBe('900 - Innovation 900');
      // …pero guardado va el id.
      expect(storedFor(component, 'merge')).toEqual([idOf(900)]);
    });

    it('la plantilla entrega el id al desplegable, no el código', () => {
      // Sin esto, el componente puede estar perfecto y la pantalla seguir rota: `optionValue` decide
      // qué valor emite el control, y un test unitario que llama al método directamente no lo ve.
      const html = require('fs').readFileSync(__dirname + '/rd-annual-updating.component.html', 'utf8');
      expect(html).not.toContain('optionValue="result_code"');
      expect((html.match(/optionValue="id"/g) ?? []).length).toBe(2);
    });
  });

  /**
   * El catálogo llega por HTTP y la selección guardada llega con el resultado. Si se leyeran por el
   * mismo camino, un catálogo en vuelo haría desaparecer una respuesta ya guardada.
   */
  describe('el catálogo no manda sobre lo guardado', () => {
    it('no borra lo guardado cuando el catálogo todavía no llegó', () => {
      const component = build([ticked(MERGE_REASON)], true, []);
      component.onTargetsChange('merge', [idOf(900)]);

      // No se puede PINTAR lo que no está en el catálogo...
      expect(component.selectedTargets('merge')).toEqual([]);
      // ...pero sigue guardado, y es lo que viaja al servidor.
      expect(storedFor(component, 'merge')).toEqual([idOf(900)]);
    });

    it('la completitud se mide sobre lo guardado, no sobre lo que el catálogo puede resolver', () => {
      // 🛑 El defecto que este candado evita: con `mergeSplitIsComplete` leyendo `selectedTargets`,
      // abrir un resultado ya guardado marcaba la sección en rojo hasta que llegara el catálogo —
      // y para siempre si la petición fallaba.
      const component = build([ticked(MERGE_REASON)], true, []);
      component.onTargetsChange('merge', [idOf(900)]);

      expect(component.selectedTargets('merge')).toEqual([]);
      expect(component.mergeSplitIsComplete).toBe(true);
    });

    it('pinta la selección en cuanto el catálogo aparece, sin volver a guardar nada', () => {
      const component = build([ticked(MERGE_REASON)], true, []);
      component.onTargetsChange('merge', [idOf(902)]);
      expect(component.selectedTargets('merge')).toEqual([]);

      component.mergeSplitCatalogue = asCatalogue([902]);

      expect(shownCodes(component, 'merge')).toEqual([902]);
      expect(storedFor(component, 'merge')).toEqual([idOf(902)]);
    });

    it('ignora un id que ya no está en el catálogo sin tirar los demás', () => {
      // Pasa de verdad: el target se descontinúa después de haberse declarado, y el repositorio
      // deja de ofrecerlo. La respuesta guardada no se toca.
      const component = build([ticked(MERGE_REASON)], true, [900]);
      component.generalInfoBody.merge_split_targets = [
        { target_result_id: idOf(900), transition_type: 'merge' },
        { target_result_id: 999999, transition_type: 'merge' }
      ];

      expect(shownCodes(component, 'merge')).toEqual([900]);
      expect(storedFor(component, 'merge')).toEqual([idOf(900), 999999]);
    });
  });

  /**
   * El caso de la RECARGA, que es el que el reportero vive: la razón llega ya tildada desde el
   * servidor, así que el catálogo tiene que pedirse al montar o la respuesta guardada se pinta
   * vacía y parece perdida.
   */
  describe('carga del catálogo al montar (caso recarga)', () => {
    const stubNarrative = (component: any) =>
      jest.spyOn(component.api.resultsSE, 'GET_globalNarratives').mockReturnValue(of({ response: { value: '' } }) as any);

    it('pide el catálogo al montar cuando la razón ya venía tildada', () => {
      const spy = jest
        .spyOn(api.resultsSE, 'GET_mergeSplitTargetInnovations')
        .mockReturnValue(of({ response: [{ result_code: 900, title: 'Innovation 900' }] }) as any);

      const component = build([ticked(MERGE_REASON)], true, []);
      stubNarrative(component);
      component.ngOnInit();

      expect(spy).toHaveBeenCalledWith(11494);
      expect(component.mergeSplitCatalogue[0].label).toBe('900 - Innovation 900');
    });

    it('lo pide al montar por is_discontinued, SIN esperar a que lleguen las razones', () => {
      // 🛑 Éste es el candado del defecto: el criterio NO puede ser "una razón está tildada", porque
      // las razones llegan en una petición POSTERIOR (`rd-general-information.component.ts:214`).
      // Con el criterio viejo, en la recarga el catálogo no se pedía nunca y la selección guardada
      // se pintaba vacía — el reportero veía su respuesta como perdida.
      const spy = jest
        .spyOn(api.resultsSE, 'GET_mergeSplitTargetInnovations')
        .mockReturnValue(of({ response: [{ id: 3400, result_code: 900, title: 'Innovation 900' }] }) as any);

      // discontinued_options VACÍO a propósito: es el estado real en ngOnInit.
      const component = build([], true, []);
      stubNarrative(component);
      component.ngOnInit();

      expect(spy).toHaveBeenCalledWith(11494);
    });

    it('NO lo pide cuando la innovación está activa — no hay transición posible que declarar', () => {
      const spy = jest.spyOn(api.resultsSE, 'GET_mergeSplitTargetInnovations');

      const component = build([], false, []);
      stubNarrative(component);
      component.ngOnInit();

      expect(spy).not.toHaveBeenCalled();
    });

    it('montar con la innovación activa no consume el intento: el clic posterior sí lo pide', () => {
      const spy = jest.spyOn(api.resultsSE, 'GET_mergeSplitTargetInnovations').mockReturnValue(of({ response: [] }) as any);

      const component = build([], false, []);
      stubNarrative(component);
      component.ngOnInit();
      expect(spy).not.toHaveBeenCalled();

      // El reportero la marca inactiva y tilda la razón durante la visita.
      component.generalInfoBody.is_discontinued = true;
      component.generalInfoBody.discontinued_options = [ticked(MERGE_REASON)];
      component.ensureMergeSplitCatalogue();

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
