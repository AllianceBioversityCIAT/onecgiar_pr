import { Injectable, signal } from '@angular/core';
import { ResultsApiService } from '../../../shared/services/api/results-api.service';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

type NotionDataError = {
  error: boolean;
  status: number;
  message: string;
};

@Injectable({
  providedIn: 'root'
})
export class WhatsNewService {
  notionData = signal<any>(null);
  notionDataLoading = signal<boolean>(false);
  notionDataError = signal<NotionDataError | null>(null);
  activeNotionPageData = signal<any>(null);

  private readonly maxRecursionDepth = 3;

  constructor(private readonly resultsApiService: ResultsApiService) {}

  getWhatsNewPages() {
    this.notionDataLoading.set(true);
    this.resultsApiService.getNotionData().subscribe({
      next: res => {
        res.results.sort((a, b) => {
          const aDate = a?.properties?.['Released date']?.date?.start ? new Date(a.properties['Released date'].date.start).getTime() : 0;
          const bDate = b?.properties?.['Released date']?.date?.start ? new Date(b.properties['Released date'].date.start).getTime() : 0;
          return bDate - aDate;
        });

        this.notionData.set(res);
        this.notionDataLoading.set(false);
      },
      error: err => {
        this.notionDataLoading.set(false);
        console.error('error', err);
      }
    });
  }

  getNotionBlockChildren(notionBlockId: string) {
    this.notionDataLoading.set(true);

    this.resultsApiService?.getNotionPage(notionBlockId)?.subscribe({
      next: pageRes => {
        if (pageRes.error) {
          this.notionDataError.set({
            error: true,
            status: pageRes.status,
            message: pageRes.message
          });
          this.notionDataLoading.set(false);
          return;
        }

        this.activeNotionPageData.set({
          headerInfo: {
            id: pageRes.id,
            cover: pageRes.cover,
            properties: pageRes.properties
          }
        });

        this.getBlockChildren(notionBlockId);
      }
    });
  }

  private getBlockChildren(notionBlockId: string) {
    this.resultsApiService.getNotionBlockChildren(notionBlockId).subscribe({
      next: res => {
        // Procesar los bloques recursivamente
        this.processBlocksRecursively(res.results, 0).subscribe({
          next: processedBlocks => {
            this.activeNotionPageData.set({
              ...this.activeNotionPageData(),
              blocks: processedBlocks
            });
            this.notionDataLoading.set(false);
            this.notionDataError.set(null);
          },
          error: err => {
            this.notionDataLoading.set(false);
            console.error('Error processing blocks recursively:', err);
          }
        });
      },
      error: err => {
        this.notionDataLoading.set(false);
        console.error('Error fetching notion blocks:', err);
      }
    });
  }

  private processBlocksRecursively(blocks: any[], depth: number): Observable<any[]> {
    // Verificar límite de profundidad para evitar recursión infinita
    if (depth >= this.maxRecursionDepth) {
      return of(blocks);
    }

    // Si no hay bloques, devolver array vacío
    if (!blocks || blocks?.length === 0) {
      return of([]);
    }

    // Procesar cada bloque
    const processedBlocksObservables = blocks.map(block => {
      // Verificar si el bloque tiene hijos
      if (block.has_children) {
        // Obtener los bloques hijos recursivamente
        return this.resultsApiService?.getNotionBlockChildren(block.id)?.pipe(
          switchMap(childrenRes => {
            // Procesar los bloques hijos recursivamente
            return this.processBlocksRecursively(childrenRes.results, depth + 1).pipe(
              map(processedChildren => {
                // Devolver el bloque original con sus hijos procesados
                return {
                  ...block,
                  children: processedChildren
                };
              })
            );
          }),
          catchError(err => {
            console.error(`Error al procesar bloques hijos para el bloque ${block.id}:`, err);
            // En caso de error, devolver el bloque original sin hijos
            return of(block);
          })
        );
      } else {
        // Si el bloque no tiene hijos, devolverlo tal cual
        return of(block);
      }
    });

    // Combinar todos los observables en uno solo
    return forkJoin(processedBlocksObservables);
  }

  getColor(color: string) {
    switch (color) {
      case 'default':
        return '#313131';
      case 'gray':
        return '#414141';
      case 'brown':
        return '#674133';
      case 'orange':
        return '#7E4E29';
      case 'yellow':
        return '#97703D';
      case 'green':
        return '#2D6044';
      case 'blue':
        return '#2F5168';
      case 'purple':
        return '#53376C';
      case 'pink':
        return '#69334C';
      case 'red':
        return '#793C3B';
      default:
        return '#313131';
    }
  }
}
