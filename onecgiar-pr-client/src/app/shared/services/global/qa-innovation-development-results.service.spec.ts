import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiService } from '../api/api.service';
import {
  INNOVATION_LINK_MIN_PHASE_YEAR,
  INNOVATION_LINK_QUESTION,
  QaInnovationDevelopmentResultsService,
  innovationLinkAnswerIsComplete,
  showsInnovationLinkQuestion
} from './qa-innovation-development-results.service';

describe('QaInnovationDevelopmentResultsService (P2-3420 / P2-3421)', () => {
  let service: QaInnovationDevelopmentResultsService;
  let getSpy: jest.Mock;

  const rows = [
    { id: 501, result_code: 5501, title: 'Drought-tolerant bean variety', status_id: 2, phase_year: 2025, acronym: 'P25' },
    { id: 502, result_code: 5502, title: 'Solar-powered irrigation kit', status_id: 2, phase_year: 2024, acronym: 'P22' }
  ];

  beforeEach(() => {
    getSpy = jest.fn().mockReturnValue(of({ response: rows }));
    TestBed.configureTestingModule({
      providers: [
        QaInnovationDevelopmentResultsService,
        { provide: ApiService, useValue: { resultsSE: { GET_qaInnovationDevelopmentResults: getSpy } } }
      ]
    });
    service = TestBed.inject(QaInnovationDevelopmentResultsService);
  });

  it('starts empty and only fetches when a surface asks for it', () => {
    expect(service.options()).toEqual([]);
    expect(getSpy).not.toHaveBeenCalled();
  });

  it('fetches ONCE no matter how many creation surfaces call load — one catalogue, no drift', () => {
    service.load();
    service.load();
    service.load();

    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(service.options()).toHaveLength(2);
  });

  it('precomputes "[Result ID] - [Result Title]" so pr-select can search by ID and by title', () => {
    service.load();

    expect(service.options()[0].display).toBe('5501 - Drought-tolerant bean variety');
    expect(service.options()[1].display).toBe('5502 - Solar-powered irrigation kit');
  });

  it('fails soft: a broken catalogue leaves an empty dropdown, never a broken create screen', () => {
    getSpy.mockReturnValue(throwError(() => new Error('boom')));

    service.load();

    expect(service.options()).toEqual([]);
    expect(service.loading()).toBe(false);
  });
});

describe('showsInnovationLinkQuestion — the 2026 PHASE gate (P2-3420 / P2-3421)', () => {
  const INNOVATION_USE = 2;

  it('shows the question for Innovation use in the 2026 phase', () => {
    expect(showsInnovationLinkQuestion(INNOVATION_USE, INNOVATION_LINK_MIN_PHASE_YEAR)).toBe(true);
  });

  it('shows it for any phase after 2026 too', () => {
    expect(showsInnovationLinkQuestion(INNOVATION_USE, 2027)).toBe(true);
  });

  it('🛑 hides it for a 2025-phase result — those must render exactly as they do today', () => {
    expect(showsInnovationLinkQuestion(INNOVATION_USE, 2025)).toBe(false);
  });

  it('hides it for every other indicator category, even in 2026', () => {
    [1, 5, 6, 7, 8].forEach(typeId => expect(showsInnovationLinkQuestion(typeId, 2026)).toBe(false));
  });

  it('treats an unresolved phase year as the open phase, so the question is never skipped on the first frame', () => {
    expect(showsInnovationLinkQuestion(INNOVATION_USE, null)).toBe(true);
    expect(showsInnovationLinkQuestion(INNOVATION_USE, undefined)).toBe(true);
  });
});

describe('innovationLinkAnswerIsComplete — the create gate', () => {
  it('"No" (the default) is always a complete answer', () => {
    expect(innovationLinkAnswerIsComplete(false, null)).toBe(true);
  });

  it('"Yes" without a chosen innovation blocks the create', () => {
    expect(innovationLinkAnswerIsComplete(true, null)).toBe(false);
  });

  it('"Yes" with a chosen innovation lets the create through', () => {
    expect(innovationLinkAnswerIsComplete(true, 501)).toBe(true);
  });
});

it('quotes the question verbatim — QA reads this string back word for word', () => {
  expect(INNOVATION_LINK_QUESTION).toBe('Are you reporting the use of an innovation that has already been reported and quality assessed?');
});
