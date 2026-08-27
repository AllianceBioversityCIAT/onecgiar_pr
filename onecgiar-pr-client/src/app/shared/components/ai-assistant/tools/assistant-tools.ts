import { Router } from '@angular/router';
import { RolesService } from '../../../services/global/roles.service';
import { AssistantTool, ResultCard, ToolResult } from './assistant-tool.types';
import { MyResult, UserContextService } from '../user-context.service';

const MAX_RESULT_CARDS = 8;

/** Base navbar sections the assistant can navigate to (MVP). */
export type SectionSlug =
  | 'results-framework-reporting'
  | 'results-center'
  | 'innovation-packages'
  | 'quality-assurance'
  | 'my-admin'
  | 'admin-module'
  | 'whats-new'
  | 'notifications';

interface SectionDef {
  slug: SectionSlug;
  /** Exact router path (verified against shared/routing/routing-data.ts). */
  path: string;
  label: { en: string; es: string };
  aliases: { en: string[]; es: string[] };
  /** True → gated behind admin role. */
  adminOnly?: boolean;
}

export const NAVIGATE_SECTIONS: readonly SectionDef[] = [
  {
    slug: 'results-framework-reporting',
    path: '/result-framework-reporting',
    label: { en: 'Results Framework & Reporting', es: 'Marco de Resultados y Reporte' },
    aliases: { en: ['results framework', 'framework', 'reporting home', 'home'], es: ['marco de resultados', 'inicio', 'reporte'] }
  },
  {
    slug: 'results-center',
    path: '/result/results-outlet/results-list',
    label: { en: 'Results Center', es: 'Centro de Resultados' },
    aliases: { en: ['results center', 'results list', 'my results', 'results'], es: ['centro de resultados', 'lista de resultados', 'mis resultados', 'resultados'] }
  },
  {
    slug: 'innovation-packages',
    path: '/ipsr',
    label: { en: 'Innovation Packages', es: 'Paquetes de Innovación' },
    aliases: { en: ['innovation packages', 'ipsr', 'innovation package'], es: ['paquetes de innovación', 'innovación'] }
  },
  {
    slug: 'quality-assurance',
    path: '/quality-assurance',
    label: { en: 'Quality Assurance', es: 'Aseguramiento de Calidad' },
    aliases: { en: ['quality assurance', 'qa', 'quality'], es: ['aseguramiento de calidad', 'calidad'] }
  },
  {
    slug: 'my-admin',
    path: '/init-admin-module',
    label: { en: 'My Admin', es: 'Mi Administración' },
    aliases: { en: ['my admin', 'admin home', 'init admin'], es: ['mi admin', 'mi administración'] }
  },
  {
    slug: 'admin-module',
    path: '/admin-module',
    label: { en: 'Admin Module', es: 'Módulo de Administración' },
    aliases: { en: ['admin module', 'administration', 'admin panel', 'user management'], es: ['módulo de administración', 'administración', 'gestión de usuarios'] },
    adminOnly: true
  },
  {
    slug: 'whats-new',
    path: '/whats-new',
    label: { en: "What's New", es: 'Novedades' },
    aliases: { en: ["what's new", 'whats new', 'news', 'release notes'], es: ['novedades', 'qué hay de nuevo', 'notas de versión'] }
  },
  {
    slug: 'notifications',
    path: '/result/results-outlet/results-notifications/requests',
    label: { en: 'Notifications', es: 'Notificaciones' },
    aliases: { en: ['notifications', 'requests', 'my requests'], es: ['notificaciones', 'solicitudes', 'mis solicitudes'] }
  }
] as const;

const SECTION_BY_SLUG = new Map(NAVIGATE_SECTIONS.map(s => [s.slug, s]));

export const navigateTool: AssistantTool = {
  name: 'navigate',
  description: 'Navigate the user to a base section of the app (the navbar destinations).',
  argsSchema: {
    section: {
      type: 'string',
      enum: NAVIGATE_SECTIONS.map(s => s.slug),
      description: 'The destination section slug.'
    }
  },
  aliases: {
    en: ['go to', 'take me to', 'open', 'navigate to', 'show me'],
    es: ['ir a', 'llévame a', 'abre', 'navega a', 'muéstrame', 'muestrame']
  },
  validate(args, injector) {
    const slug = args['section'] as SectionSlug;
    const section = SECTION_BY_SLUG.get(slug);
    if (!section) return { ok: false, error: `Unknown section "${String(slug)}".` };
    if (section.adminOnly) {
      const rolesSE = injector.get(RolesService);
      if (!rolesSE.isAdmin) {
        return { ok: false, error: `Section "${section.slug}" is restricted to administrators.` };
      }
    }
    return { ok: true };
  },
  async run(args, injector): Promise<ToolResult> {
    const section = SECTION_BY_SLUG.get(args['section'] as SectionSlug)!;
    await injector.get(Router).navigate([section.path]);
    return { ok: true, summaryForUser: `Navigating to ${section.label.en}.` };
  }
};

/** URL map: how to build the deep link to a result's detail (verified against results-list). */
export function buildResultDetailUrl(code: string, versionId: string | number): string {
  return `/result/result-detail/${code}/general-information?phase=${versionId}`;
}

function toCard(r: MyResult): ResultCard {
  return { code: r.code, title: r.title, status: r.statusName, url: buildResultDetailUrl(r.code, r.versionId) };
}

/**
 * Lists the user's own results as clickable cards in the chat. The list is NEVER
 * fed to the model (avoids saturating a small model) — the tool renders it and
 * the user clicks to open.
 */
export const listMyResultsTool: AssistantTool = {
  name: 'list_my_results',
  description: "Show the user's own results as a clickable list. Use for \"what are my results\" / \"muéstrame mis resultados\".",
  activityLabel: 'Trayendo tus resultados… / Loading your results…',
  argsSchema: {},
  aliases: {
    en: ['my results', 'what are my results', 'list my results', 'show my results'],
    es: ['mis resultados', 'cuáles son mis resultados', 'muéstrame mis resultados', 'lista de mis resultados']
  },
  validate() {
    return { ok: true };
  },
  async run(_args, injector): Promise<ToolResult> {
    const results = await injector.get(UserContextService).myResults();
    if (!results.length) {
      return { ok: true, summaryForUser: '', dataForModel: { kind: 'my_results', count: 0 } };
    }
    const cards = results.slice(0, MAX_RESULT_CARDS).map(toCard);
    const more = results.length > MAX_RESULT_CARDS ? ` (+${results.length - MAX_RESULT_CARDS} more)` : '';
    return { ok: true, summaryForUser: `You have ${results.length} result(s)${more}:`, cards };
  }
};

/**
 * Opens one of the user's own results. Deterministic matching (reliable even
 * with a small model): a numeric query is looked up by result code; free text is
 * compared against titles and codes. One match → open it; otherwise render the
 * candidates as clickable cards.
 */
export const openResultTool: AssistantTool = {
  name: 'open_result',
  description: "Open one of the user's own results by title keyword or result code. Use for \"open my result about maize\" / \"abre mi resultado 5844\".",
  activityLabel: 'Buscando en tus resultados… / Searching your results…',
  argsSchema: {
    query: { type: 'string', description: 'A keyword from the result title, or the result code.' }
  },
  aliases: {
    en: ['open my result', 'open result', 'go to my result'],
    es: ['abre mi resultado', 'abrir resultado', 've a mi resultado']
  },
  validate(args) {
    const query = String(args['query'] ?? '').trim();
    return query ? { ok: true } : { ok: false, error: 'No result to look up.' };
  },
  async run(args, injector): Promise<ToolResult> {
    const query = String(args['query'] ?? '').trim();
    const matches = await injector.get(UserContextService).findResults(query);
    if (matches.length === 1) {
      const r = matches[0];
      await injector.get(Router).navigateByUrl(buildResultDetailUrl(r.code, r.versionId));
      return { ok: true, summaryForUser: `Opening result ${r.code}: ${r.title}` };
    }
    if (matches.length > 1) {
      return { ok: true, summaryForUser: `I found ${matches.length} results — pick one:`, cards: matches.slice(0, MAX_RESULT_CARDS).map(toCard) };
    }
    return { ok: true, summaryForUser: '', dataForModel: { kind: 'open_result', query, found: false } };
  }
};

/** The registry. New tools are added here — everything else derives from it. */
export const ASSISTANT_TOOLS: readonly AssistantTool[] = [navigateTool, listMyResultsTool, openResultTool];

/** Build the `tool` enum (registered names + 'none') for the response schema. */
export function toolNameEnum(): string[] {
  return ['none', ...ASSISTANT_TOOLS.map(t => t.name)];
}
