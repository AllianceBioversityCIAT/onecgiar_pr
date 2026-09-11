import { Injectable } from '@nestjs/common';
import {
  CgspaceItemDto,
  CgspacePageMetaDto,
  CgspaceSearchPageDto,
} from './dto/cgspace-item.dto';
import { RepositoryAdapter } from './repositories.config';

@Injectable()
export class CgspaceDiscoveryMapper {
  /**
   * Maps a DSpace 7 HAL search response to a PRMS CgspaceSearchPageDto, using `adapter` to read
   * that repository's metadata field names, item host and key (`KPM-DD-1`, design.md §5).
   * Traversal: _embedded.searchResult._embedded.objects[] and _embedded.searchResult.page.
   */
  public toPage(
    halResponse: any,
    adapter: RepositoryAdapter,
  ): CgspaceSearchPageDto {
    const rawObjects = halResponse?._embedded?.searchResult?._embedded?.objects;
    const objects = Array.isArray(rawObjects) ? rawObjects : [];
    const rawPage = halResponse?._embedded?.searchResult?.page;

    const page: CgspacePageMetaDto = {
      number: typeof rawPage?.number === 'number' ? rawPage.number : 0,
      size:
        typeof rawPage?.size === 'number' ? rawPage.size : objects.length || 10,
      totalElements:
        typeof rawPage?.totalElements === 'number'
          ? rawPage.totalElements
          : objects.length,
      totalPages:
        typeof rawPage?.totalPages === 'number'
          ? rawPage.totalPages
          : objects.length > 0
            ? 1
            : 0,
    };

    const items: CgspaceItemDto[] = objects.map((obj: any) =>
      this.toItem(obj, adapter),
    );

    return {
      items,
      page,
    };
  }

  /**
   * Maps a single discovery object node to a CgspaceItemDto using `adapter.fields.*` for title,
   * type, year, authors, affiliation, DOI and URI (`KPM-DD-1`, design.md §5). `handleUrl` is
   * always built from `hdl.handle.net`; `itemUrl` is built from `adapter.itemHost`; `countries`
   * stays `cg.coverage.country` regardless of adapter (no repository lacks it, design.md §3.3).
   */
  public toItem(objectNode: any, adapter: RepositoryAdapter): CgspaceItemDto {
    const indexableObject =
      objectNode?._embedded?.indexableObject || objectNode || {};
    const metadata = indexableObject?.metadata || {};

    const uuid = indexableObject?.uuid || '';
    const handle = indexableObject?.handle || '';
    const handleUrl = handle ? `https://hdl.handle.net/${handle}` : '';
    const itemUrl = uuid ? `https://${adapter.itemHost}/items/${uuid}` : '';

    const title = metadata[adapter.fields.title]?.[0]?.value || '';
    const authors = this.mapAuthors(metadata, adapter.fields.authors);
    const type = metadata[adapter.fields.type]?.[0]?.value || '';
    const year = this.parseYear(metadata[adapter.fields.year]?.[0]?.value);
    const affiliations = adapter.fields.affiliation
      ? metadata[adapter.fields.affiliation]
          ?.map((m: any) => m?.value)
          ?.filter(Boolean) || []
      : [];
    const doi = metadata[adapter.fields.doi]?.[0]?.value || null;
    const countries =
      metadata['cg.coverage.country']
        ?.map((m: any) => m?.value)
        ?.filter(Boolean) || [];
    const uri = metadata[adapter.fields.uri]?.[0]?.value || '';

    return {
      uuid,
      handle,
      handleUrl,
      itemUrl,
      title,
      type,
      year,
      authors,
      affiliations,
      countries,
      doi,
      uri,
      repository: adapter.key,
    };
  }

  /**
   * Ordered concat of every `authorFields` metadata key's values, de-duplicated on exact value
   * (first occurrence wins), per `KPM-T-3` work order.
   */
  private mapAuthors(metadata: any, authorFields: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const field of authorFields) {
      const values: string[] =
        metadata[field]?.map((m: any) => m?.value)?.filter(Boolean) || [];
      for (const value of values) {
        if (!seen.has(value)) {
          seen.add(value);
          result.push(value);
        }
      }
    }
    return result;
  }

  /**
   * Parses publication year from the adapter's year field string (e.g. "2015-06" -> 2015,
   * "2023" -> 2023). Returns null if unparseable or missing.
   */
  public parseYear(issued?: string | null): number | null {
    if (!issued || typeof issued !== 'string') {
      return null;
    }
    const match = issued.trim().match(/^(\d{4})/);
    if (!match) {
      return null;
    }
    const parsed = parseInt(match[1], 10);
    return isNaN(parsed) ? null : parsed;
  }
}
