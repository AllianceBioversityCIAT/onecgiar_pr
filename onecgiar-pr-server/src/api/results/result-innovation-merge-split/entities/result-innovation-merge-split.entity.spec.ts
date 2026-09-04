import { getMetadataArgsStorage } from 'typeorm';
import { ResultInnovationMergeSplit } from './result-innovation-merge-split.entity';

/**
 * 🛑 CANDADO DE P2-3589 — el defecto más caro que he metido, y ningún gate lo vio.
 *
 * `origin_result_id` y `target_result_id` estaban declaradas como `@ManyToOne(() => Result, …)`
 * tipadas `number`, sin `@Column`. TypeORM entonces lee
 *
 *     find({ where: { origin_result_id: 11494 } })
 *
 * NO como una comparación escalar sino como una condición anidada sobre la entidad relacionada. El
 * id llega desde SQL crudo, donde mysql2 devuelve los `bigint` como STRING, así que TypeORM recorrió
 * las claves del string —sus índices— y respondió:
 *
 *     Property "0" was not found in "Result". Make sure your query is correct.
 *
 * 🔴 **Y el radio de daño no fue este campo: fue toda la sección.** `replaceForResult` se llama en
 * las DOS ramas de la discontinuación, así que **ningún Innovation Development ni Innovation Use
 * podía guardar General information**, marcase el reportero lo que marcase. Los demás tipos guardaban
 * bien, que es lo que lo hacía invisible: el 500 parecía específico de la descontinuación.
 *
 * ⚠️ Lo que NINGÚN gate del repo detecta, y por eso este candado existe:
 *   · `tsc` no ve la diferencia — un `@ManyToOne` tipado `number` compila igual de bien;
 *   · los tests del repositorio pasaban, porque mockean el `find` y nunca construyen el grafo real;
 *   · `build:dev`, `eslint` y las dos suites estaban en VERDE con el defecto desplegado;
 *   · y el build de Jenkins salió SUCCESS, porque esto no rompe el arranque: rompe en la consulta.
 * Lo encontró `demon` bisecando el payload contra prtest, y la medida que lo cerró fue que un
 * Policy change guardaba 200 con el mismo cuerpo con que un Innovation Development daba 500.
 *
 * Este spec lee los METADATOS de TypeORM, no el comportamiento, porque es la declaración lo que
 * estaba mal. Un test de comportamiento con el `find` mockeado volvería a pasar con el bug puesto.
 */
describe('ResultInnovationMergeSplit — declaración de los ids (candado P2-3589)', () => {
  const columnas = () =>
    getMetadataArgsStorage().columns.filter(
      (c) => c.target === ResultInnovationMergeSplit,
    );

  const relaciones = () =>
    getMetadataArgsStorage().relations.filter(
      (r) => r.target === ResultInnovationMergeSplit,
    );

  const joins = () =>
    getMetadataArgsStorage().joinColumns.filter(
      (j) => j.target === ResultInnovationMergeSplit,
    );

  describe.each(['origin_result_id', 'target_result_id'])('%s', (campo) => {
    it('está declarada como @Column, que es lo que permite compararla como escalar', () => {
      const col = columnas().find((c) => c.propertyName === campo);
      expect(col).toBeDefined();
      expect((col!.options as any).name).toBe(campo);
    });

    it('🛑 NO es una relación: un @ManyToOne sobre este campo reintroduce el 500 de P2-3589', () => {
      // Ésta es LA aserción. Si alguien "simplifica" volviendo a poner el @ManyToOne encima del
      // escalar, el where deja de comparar un número y toda la sección vuelve a devolver 500.
      expect(relaciones().map((r) => r.propertyName)).not.toContain(campo);
    });

    it('la relación vive en su propia propiedad, apuntando a la misma columna', () => {
      // Mismo patrón que `Result.version_id` + `Result.obj_version` (result.entity.ts:266-277).
      const propiedadRelacion = `obj_${campo.replace('_result_id', '')}_result`;
      expect(relaciones().map((r) => r.propertyName)).toContain(
        propiedadRelacion,
      );
      const join = joins().find((j) => j.propertyName === propiedadRelacion);
      expect(join).toBeDefined();
      expect(join!.name).toBe(campo);
    });
  });

  it('el nombre de columna no cambió, así que esto NO necesita migración', () => {
    // Lo que se movió fue la declaración, no el esquema: la tabla sigue teniendo las mismas
    // columnas. Si algún día cambian de nombre, hace falta migración y este test debe caer.
    const nombres = columnas().map((c) => (c.options as any).name);
    expect(nombres).toContain('origin_result_id');
    expect(nombres).toContain('target_result_id');
    expect(nombres).toContain('transition_type');
  });
});
