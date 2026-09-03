import { Injectable } from '@angular/core';

/** Above this, the PNG is dropped rather than sent (the server caps at 10MB). */
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Takes a picture of the current screen for a bug report.
 *
 * 🛑 It must be `modern-screenshot`, NOT html2canvas. html2canvas parses CSS
 * colour functions itself and throws `Attempting to parse an unsupported color
 * function "oklab"` on this app — Tailwind 4 emits every colour as oklab/oklch.
 * Verified in the browser on 3-sep-2026: the build passed and the capture was
 * dead. modern-screenshot renders through an SVG `foreignObject`, so the
 * BROWSER resolves the CSS and modern colour spaces work by definition.
 *
 * Loaded with a dynamic import on purpose: it only matters the moment someone
 * reports a bug, so it must not sit in the initial bundle. It is also never
 * allowed to break the flow — every failure resolves to null and the report
 * goes out without an image.
 */
@Injectable({ providedIn: 'root' })
export class ScreenshotService {
  /**
   * @param timeoutMs give up and return null past this, so opening the modal
   *        never feels stuck on a heavy page.
   * @returns a `data:image/png;base64,...` string, or null.
   */
  async capture(timeoutMs = 2500): Promise<string | null> {
    if (typeof document === 'undefined') return null;

    try {
      return await Promise.race([
        this.render(),
        new Promise<null>(resolve => setTimeout(() => resolve(null), timeoutMs))
      ]);
    } catch {
      return null;
    }
  }

  private async render(): Promise<string | null> {
    const { domToPng } = await import('modern-screenshot');

    const dataUrl = await domToPng(document.body, {
      // Half scale: enough to read a screen, a quarter of the bytes.
      scale: 0.5,
      // Only what the user can actually see — a full results table would
      // otherwise render thousands of rows nobody asked about.
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#ffffff',
      // Skip the reporting modal itself: the user wants the screen behind it.
      filter: (node: Node) => !(node instanceof Element && node.classList?.contains('pr-dialog-mask'))
    });

    if (!dataUrl) return null;
    // A data URL is ~4/3 of the raw bytes.
    if (dataUrl.length * 0.75 > MAX_BYTES) return null;
    return dataUrl;
  }
}
