import { Injectable } from '@nestjs/common';
import {
  CgspaceItemDto,
  CgspacePageMetaDto,
  CgspaceSearchPageDto,
} from './dto/cgspace-item.dto';

@Injectable()
export class CgspaceDiscoveryMapper {
  /**
   * Maps a CGSpace DSpace 7 HAL search response to a PRMS CgspaceSearchPageDto.
   * Traversal: _embedded.searchResult._embedded.objects[] and _embedded.searchResult.page.
   */
  public toPage(halResponse: any): CgspaceSearchPageDto {
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

    const items: CgspaceItemDto[] = objects.map((obj: any) => this.toItem(obj));

    return {
      items,
      page,
    };
  }

  /**
   * Maps a single CGSpace discovery object node to a CgspaceItemDto.
   */
  public toItem(objectNode: any): CgspaceItemDto {
    const indexableObject =
      objectNode?._embedded?.indexableObject || objectNode || {};
    const metadata = indexableObject?.metadata || {};

    const uuid = indexableObject?.uuid || '';
    const handle = indexableObject?.handle || '';
    const handleUrl = handle ? `https://hdl.handle.net/${handle}` : '';
    const itemUrl = uuid ? `https://cgspace.cgiar.org/items/${uuid}` : '';

    const title = metadata['dc.title']?.[0]?.value || '';
    const authors =
      metadata['dc.contributor.author']
        ?.map((m: any) => m?.value)
        ?.filter(Boolean) || [];
    const type = metadata['dcterms.type']?.[0]?.value || '';
    const year = this.parseYear(metadata['dcterms.issued']?.[0]?.value);
    const affiliations =
      metadata['cg.contributor.affiliation']
        ?.map((m: any) => m?.value)
        ?.filter(Boolean) || [];
    const doi = metadata['cg.identifier.doi']?.[0]?.value || null;
    const countries =
      metadata['cg.coverage.country']
        ?.map((m: any) => m?.value)
        ?.filter(Boolean) || [];
    const uri = metadata['dc.identifier.uri']?.[0]?.value || '';

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
    };
  }

  /**
   * Parses publication year from dcterms.issued string (e.g. "2015-06" -> 2015, "2023" -> 2023).
   * Returns null if unparseable or missing.
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
