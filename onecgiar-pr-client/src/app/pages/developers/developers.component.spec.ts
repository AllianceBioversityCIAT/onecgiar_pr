import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DevelopersComponent } from './developers.component';
import { FooterService } from '../../shared/components/footer/footer.service';

describe('DevelopersComponent', () => {
  let component: DevelopersComponent;
  let fixture: ComponentFixture<DevelopersComponent>;
  let footerServiceMock: Partial<FooterService>;

  beforeEach(async () => {
    footerServiceMock = {
      displayContactUs: false
    };

    await TestBed.configureTestingModule({
      imports: [DevelopersComponent],
      providers: [{ provide: FooterService, useValue: footerServiceMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(DevelopersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates successfully', () => {
    expect(component).toBeTruthy();
  });

  it('renders the header title and subtext', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const h1 = compiled.querySelector('h1');
    expect(h1?.textContent?.trim()).toBe('Developers');

    const subtext = compiled.querySelector('header p');
    expect(subtext?.textContent).toContain(
      'Send W3 results to PRMS directly from your own platform, in a standard format, individually or in bulk, instead of reporting them by hand.'
    );
  });

  it('renders the "How to integrate" card with 5 numbered steps', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const steps = compiled.querySelectorAll('ol li');
    expect(steps.length).toBe(5);

    expect(steps[0].textContent).toContain('Request your test API key');
    expect(steps[1].textContent).toContain('Read the field documentation');
    expect(steps[2].textContent).toContain('Send a result to the test environment');
    expect(steps[2].textContent).toContain('external_reference');
    expect(steps[3].textContent).toContain('Register a webhook');
    expect(steps[4].textContent).toContain('Request your production key and switch');
  });

  it('renders the "Get an API key" card with x-api-key explanation and button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Get an API key');
    expect(compiled.textContent).toContain('CLARISA API key in the');
    expect(compiled.textContent).toContain('x-api-key');

    const button = compiled.querySelector('button');
    expect(button?.textContent?.trim()).toBe('Request an API key');
  });

  it('renders the "Environments" card with TEST and PRODUCTION endpoints', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Environments');
    expect(compiled.textContent).toContain('TEST');
    expect(compiled.textContent).toContain('PRODUCTION');

    // Test endpoints
    expect(component.testEndpoints.length).toBe(3);
    expect(component.testEndpoints[0].url).toBe('https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com/docs/');
    expect(component.testEndpoints[1].url).toBe('https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com/ingest');
    expect(component.testEndpoints[2].url).toBe('https://0w16ghmybe.execute-api.us-east-1.amazonaws.com/ingest');

    // Production endpoints
    expect(component.productionEndpoints.length).toBe(3);
    expect(component.productionEndpoints[0].url).toBe('https://v6a9z2e4y5.execute-api.us-east-1.amazonaws.com/docs');
    expect(component.productionEndpoints[1].url).toBe('https://v6a9z2e4y5.execute-api.us-east-1.amazonaws.com/ingest');
    expect(component.productionEndpoints[2].url).toBe('https://b1a4fsvgni.execute-api.us-east-1.amazonaws.com/ingest');

    expect(compiled.textContent).toContain('Use single result ingest for one to ten results, and bulk ingest for more.');
  });

  it('renders the right column cards: Field documentation, Result decision webhooks, and What you still do in PRMS', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Field documentation');
    expect(compiled.textContent).toContain('Open the field documentation');

    expect(compiled.textContent).toContain('Result decision webhooks');
    expect(compiled.textContent).toContain('Set up webhooks');

    expect(compiled.textContent).toContain('What you still do in PRMS');
    expect(compiled.textContent).toContain('Confidential evidence');
    expect(compiled.textContent).toContain('Fields beyond the minimum data standards');
    expect(compiled.textContent).toContain('keep_editing');
  });

  it('renders the footer with contact support link', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Questions about the API?');
    expect(compiled.textContent).toContain('Contact the PRMS technical team.');
  });

  it('triggers window.open on requestApiKey', () => {
    const spy = jest.spyOn(window, 'open').mockImplementation(() => null);
    component.requestApiKey();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('mailto:PRMSTechSupport@cgiar.org'), '_self');
    spy.mockRestore();
  });

  it('triggers footerService.displayContactUs on contactSupport when service is available', () => {
    const event = new MouseEvent('click');
    jest.spyOn(event, 'preventDefault');

    component.contactSupport(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(footerServiceMock.displayContactUs).toBe(true);
  });
});
