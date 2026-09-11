import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api/api.service';

export interface UserIdentity {
  name: string;
  firstName: string;
  email: string;
  isAdmin: boolean;
  readOnly: boolean;
}

export interface MyResult {
  code: string;
  title: string;
  versionId: string | number;
  statusName?: string;
  phaseName?: string;
}

/**
 * Grounds the assistant in the CURRENT user's real data (name, role, assigned
 * results) so it can greet by name, answer role questions, and open one of the
 * user's own results — instead of relying on the small model's weak knowledge.
 */
@Injectable({ providedIn: 'root' })
export class UserContextService {
  private readonly api = inject(ApiService);
  private resultsCache: MyResult[] | null = null;
  private inflight: Promise<MyResult[]> | null = null;

  identity(): UserIdentity {
    const user = this.api.authSE.localStorageUser;
    const name = user?.user_name?.trim() || '';
    return {
      name,
      firstName: name.split(/\s+/)[0] || '',
      email: user?.email || '',
      isAdmin: this.api.rolesSE.isAdmin,
      readOnly: this.api.rolesSE.readOnly
    };
  }

  /** The user's results (respecting their role), fetched once and cached. */
  async myResults(): Promise<MyResult[]> {
    if (this.resultsCache) return this.resultsCache;
    const userId = this.api.authSE.localStorageUser?.id;
    if (!userId) return [];
    this.inflight ??= firstValueFrom(this.api.resultsSE.GET_AllResultsWithUseRole(userId))
      .then((resp: unknown) => {
        const items = (resp as { response?: { items?: unknown[] } })?.response?.items ?? [];
        this.resultsCache = items.map((r: Record<string, unknown>) => ({
          code: String(r['result_code'] ?? r['id'] ?? ''),
          title: String(r['title'] ?? ''),
          versionId: (r['version_id'] as string | number) ?? '',
          statusName: r['status_name'] as string | undefined,
          phaseName: r['phase_name'] as string | undefined
        }));
        return this.resultsCache;
      })
      .catch(() => {
        this.resultsCache = [];
        return this.resultsCache;
      })
      .finally(() => (this.inflight = null));
    return this.inflight;
  }

  /** Best-effort match of a free-text query (title keyword or code) against the user's results. */
  async findResults(query: string, limit = 5): Promise<MyResult[]> {
    const q = normalize(query);
    if (!q) return [];
    const results = await this.myResults();
    // Exact code match wins outright.
    const byCode = results.find(r => normalize(r.code) === q);
    if (byCode) return [byCode];
    return results
      .map(r => ({ r, s: titleScore(q, normalize(r.title), normalize(r.code)) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map(x => x.r);
  }
}

function normalize(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function titleScore(query: string, title: string, code: string): number {
  if (!title && !code) return 0;
  if (code.includes(query)) return 90;
  if (title.includes(query)) return 70;
  const qWords = query.split(/\s+/).filter(w => w.length > 2);
  const tWords = new Set(title.split(/\s+/).filter(w => w.length > 2));
  const overlap = qWords.filter(w => tWords.has(w)).length;
  return overlap > 0 ? overlap * 10 : 0;
}
