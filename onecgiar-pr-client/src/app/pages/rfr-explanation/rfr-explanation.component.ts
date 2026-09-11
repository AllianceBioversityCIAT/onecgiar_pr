import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

type Lang = 'en' | 'es';
interface Bi {
  en: string;
  es: string;
}

@Component({
  selector: 'app-rfr-explanation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rfr-explanation.component.html',
  styleUrls: ['./rfr-explanation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RfrExplanationComponent {
  readonly lang = signal<Lang>('en');

  setLang(l: Lang): void {
    this.lang.set(l);
  }

  /** Pick the string for the active language. */
  L = (b: Bi): string => (this.lang() === 'en' ? b.en : b.es);

  // ---- Hero ------------------------------------------------------------
  readonly hero = {
    kicker: { en: 'PRMS · Reporting, explained', es: 'PRMS · El reporte, explicado' },
    title: { en: 'Results Framework & Reporting', es: 'Results Framework & Reporting' },
    subtitle: {
      en: 'How a Science Program reports its research results — connected to the goals it set out to achieve.',
      es: 'Cómo un Programa Científico reporta sus resultados de investigación — conectados a las metas que se propuso lograr.'
    }
  };

  // ---- What is it (analogy) -------------------------------------------
  readonly what = {
    heading: { en: 'What is it, in one idea?', es: '¿Qué es, en una sola idea?' },
    lead: {
      en: 'The page where a program logs each result and pins it to the goal it answers — so its progress can be seen.',
      es: 'La página donde un programa anota cada resultado y lo pega a la meta que responde — para que se vea su avance.'
    },
    analogyTitle: { en: 'Think of a program report card', es: 'Piénsalo como el boletín de notas de un programa' },
    analogy: {
      en: 'The program set goals at the start (its Theory of Change). Through the year it achieves things (results). RFR is where each achievement is written down against the goal it responds to.',
      es: 'El programa se puso metas al inicio (su Teoría de Cambio). Durante el año logra cosas (resultados). RFR es donde cada logro se anota contra la meta que responde.'
    }
  };

  // ---- Mental chain ----------------------------------------------------
  readonly chain: { icon: string; label: Bi; desc: Bi }[] = [
    {
      icon: 'account_tree',
      label: { en: 'Program', es: 'Programa' },
      desc: { en: 'The Science Program that reports (e.g. SP01 Breeding for Tomorrow).', es: 'El Programa Científico que reporta (ej. SP01 Breeding for Tomorrow).' }
    },
    {
      icon: 'event_available',
      label: { en: 'Phase', es: 'Fase' },
      desc: { en: 'The active reporting cycle (P25 · Reporting 2026).', es: 'El ciclo de reporte activo (P25 · Reporting 2026).' }
    },
    {
      icon: 'schema',
      label: { en: 'ToC', es: 'ToC' },
      desc: { en: "The program's results framework (Theory of Change).", es: 'El marco de resultados del programa (Teoría de Cambio).' }
    },
    {
      icon: 'folder_open',
      label: { en: 'AOW', es: 'AOW' },
      desc: { en: 'Area of Work — a program\'s ToC subdivision (e.g. Market Intelligence).', es: 'Área de Trabajo — subdivisión del ToC (ej. Market Intelligence).' }
    },
    {
      icon: 'flag',
      label: { en: 'Indicator', es: 'Indicador' },
      desc: { en: 'A measurable goal: target vs achieved vs %.', es: 'Una meta medible: target vs logrado vs %.' }
    },
    {
      icon: 'inventory_2',
      label: { en: 'Result', es: 'Resultado' },
      desc: { en: 'What you actually report and complete.', es: 'Lo que realmente reportas y completas.' }
    }
  ];

  // ---- Output vs Outcome ----------------------------------------------
  readonly oo = {
    heading: { en: 'Output vs Outcome', es: 'Output vs Outcome' },
    sub: {
      en: 'The core distinction of the whole framework.',
      es: 'La distinción central de todo el framework.'
    },
    output: {
      tag: { en: 'OUTPUT', es: 'OUTPUT' },
      title: { en: 'What I produce', es: 'Lo que produzco' },
      body: { en: 'A thing that exists: a study, a new crop variety, an endpoint, a test suite.', es: 'Una cosa que existe: un estudio, una variedad, un endpoint, una suite de tests.' },
      dev: { en: 'Dev: a shipped feature / a new API.', es: 'Dev: una feature entregada / una API nueva.' }
    },
    outcome: {
      tag: { en: 'OUTCOME', es: 'OUTCOME' },
      title: { en: 'The change because someone used it', es: 'El cambio porque alguien lo usó' },
      body: { en: 'Someone changed their behavior: they adopted it, they reprioritized, they got access.', es: 'Alguien cambió su comportamiento: lo adoptó, repriorizó, obtuvo acceso.' },
      dev: { en: 'Dev: users adopt the feature and work differently.', es: 'Dev: los usuarios adoptan la feature y trabajan distinto.' }
    },
    rule: {
      en: 'No use → no outcome. That is why an outcome is worth more and sits higher: it depends on others adopting your output.',
      es: 'Sin uso → no hay outcome. Por eso el outcome vale más y está más arriba: depende de que otros adopten tu output.'
    }
  };

  // ---- The 4 steps -----------------------------------------------------
  readonly steps: { n: number; icon: string; title: Bi; body: Bi }[] = [
    {
      n: 1,
      icon: 'home',
      title: { en: 'Home — pick your program', es: 'Home — elige tu programa' },
      body: { en: 'You see your Science Programs with their reporting status (donut by status, % submitted).', es: 'Ves tus Programas Científicos con su estado de reporte (dona por estado, % enviado).' }
    },
    {
      n: 2,
      icon: 'dashboard',
      title: { en: 'Dashboard — see the ToC', es: 'Dashboard — ve el ToC' },
      body: { en: "The program's ToC split into AOWs, its indicators, and pending bilateral results.", es: 'El ToC del programa dividido en AOWs, sus indicadores y los bilaterales pendientes.' }
    },
    {
      n: 3,
      icon: 'edit_note',
      title: { en: 'Report — one of three paths', es: 'Reporta — uno de tres caminos' },
      body: { en: 'Planned (against an indicator), Emerging (unplanned), or Bilateral review (admin approves).', es: 'Planned (contra un indicador), Emerging (no planeado), o Bilateral review (admin aprueba).' }
    },
    {
      n: 4,
      icon: 'task_alt',
      title: { en: 'Result Detail — complete & submit', es: 'Result Detail — completa y envía' },
      body: { en: 'Every path lands in the editor: fill evidence, geography, partners… then Submit.', es: 'Todo camino cae en el editor: llena evidencias, geografía, partners… y Submit.' }
    }
  ];

  // ---- Two paths -------------------------------------------------------
  readonly paths = {
    heading: { en: 'Planned vs Emerging', es: 'Planned vs Emerging' },
    sub: { en: 'One question: was it in the plan or not?', es: 'Una pregunta: ¿estaba en el plan o no?' },
    planned: {
      tag: { en: 'PLANNED', es: 'PLANNED' },
      icon: 'checklist',
      title: { en: 'It was in the ToC', es: 'Estaba en el ToC' },
      points: [
        { en: 'The program said upfront "I will achieve X" — the indicator already exists.', es: 'El programa dijo al inicio "voy a lograr X" — el indicador ya existe.' },
        { en: 'You report: "here it is, I did it, I contribute this number to that goal".', es: 'Reportas: "aquí está, lo cumplí, aporto este número a esa meta".' },
        { en: 'Expected. Linked to a pre-existing indicator.', es: 'Esperado. Enganchado a un indicador que ya existía.' }
      ] as Bi[],
      dev: { en: 'A sprint task that was in the planned backlog.', es: 'Una tarea del sprint que estaba en el backlog planeado.' }
    },
    emerging: {
      tag: { en: 'EMERGING', es: 'EMERGING' },
      icon: 'auto_awesome',
      title: { en: 'Nobody planned it', es: 'Nadie lo planeó' },
      points: [
        { en: 'It came up along the way — there is no indicator to attach it to.', es: 'Surgió en el camino — no hay indicador al cual engancharlo.' },
        { en: 'You report the result plus a justification of why, even though unplanned.', es: 'Reportas el resultado más una justificación de por qué, aunque no estaba en el plan.' },
        { en: 'Unexpected. Feeds next year\'s ToC (adaptive management).', es: 'Inesperado. Alimenta el ToC del próximo año (adaptive management).' }
      ] as Bi[],
      dev: { en: 'A bug/opportunity that appeared mid-sprint and you shipped anyway.', es: 'Un bug/oportunidad que apareció a mitad de sprint y también resolviste.' }
    }
  };

  // ---- Real example ----------------------------------------------------
  readonly example = {
    heading: { en: 'A real example', es: 'Un ejemplo real' },
    program: { en: 'SP01 · Breeding for Tomorrow', es: 'SP01 · Breeding for Tomorrow' },
    flow: [
      {
        icon: 'folder_open',
        label: { en: 'AOW02 · Accelerated Breeding', es: 'AOW02 · Accelerated Breeding' },
        text: { en: 'You work inside this Area of Work.', es: 'Trabajas dentro de esta Área de Trabajo.' }
      },
      {
        icon: 'flag',
        label: { en: 'Indicator: "Number of innovations"', es: 'Indicador: "Number of innovations"' },
        text: { en: 'A planned KPI in the 2026 ToC.', es: 'Un KPI planeado en el ToC 2026.' }
      },
      {
        icon: 'science',
        label: { en: 'Output: a faster-maturing bean variety', es: 'Output: una variedad de frijol más rápida' },
        text: { en: 'You report it against the indicator (Planned).', es: 'La reportas contra el indicador (Planned).' }
      },
      {
        icon: 'trending_up',
        label: { en: 'Outcome: farmers plant it & harvest more', es: 'Outcome: los agricultores la siembran y cosechan más' },
        text: { en: 'The change that happens because it gets used.', es: 'El cambio que ocurre porque se usa.' }
      }
    ]
  };

  // ---- Hierarchy tree (from the reporting diagram) --------------------
  readonly tree = {
    heading: { en: 'The full reporting map', es: 'El mapa completo del reporte' },
    sub: { en: 'How a program branches down to a reportable indicator.', es: 'Cómo un programa se ramifica hasta un indicador reportable.' },
    root: { en: 'Science Programs / Accelerators', es: 'Science Programs / Accelerators' },
    planned: { en: 'Results planned', es: 'Results planned' },
    emerging: { en: 'Emerging results', es: 'Emerging results' },
    aow: { en: 'Areas of Work (AOW)', es: 'Áreas de Trabajo (AOW)' },
    levels: [
      { en: 'High-Level Outputs', es: 'High-Level Outputs' },
      { en: 'Intermediate Outcomes', es: 'Outcomes Intermedios' },
      { en: '2030 Outcomes', es: '2030 Outcomes' }
    ] as Bi[],
    kpi: { en: 'KPIs', es: 'KPIs' },
    identified: { en: 'Indicator typology identified', es: 'Tipología identificada' },
    notIdentified: { en: 'Typology not identified → pick manually', es: 'Tipología no identificada → elegir manual' }
  };

  readonly footer = {
    en: 'Conceptual guide · PRMS Results Framework & Reporting',
    es: 'Guía conceptual · PRMS Results Framework & Reporting'
  };
}
