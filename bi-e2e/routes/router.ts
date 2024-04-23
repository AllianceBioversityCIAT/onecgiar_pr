import { Request, Response, Router } from 'express';
import puppeteer from 'puppeteer';

const router = Router();

router.get('/bi-front', async (req: Request, res: Response) => {
  try {
    const url = req?.query?.url || '';
    const urlIsString = typeof url == 'string';
    //? to show navigator use headless: true and slowMo: 250 to see the process slow

    if (urlIsString && !url?.includes('/monitor'))
      return res.status(404).json({ error: 'The route must contain /monitor to be evaluated.' });

    if (typeof url != 'string') return res.status(404).json({ error: 'The route does not exist.' });

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url);

    await page.waitForSelector('.step-4');

    const works = await page.evaluate(() => {
      const element = document.querySelector('.step-4');
      return element ? element.getAttribute('works') : null;
    });

    await browser.close();

    let message;
    const isWorkNotNull = works != null;
    const isWorkTrue = works === 'true';

    if (isWorkNotNull) {
      message = isWorkTrue ? 'Embedding generated successfully.' : "Embedding wasn't generated.";
    } else {
      message = 'Error in the web scraping process.';
    }

    res.json({
      works,
      message,
      url
    });
  } catch (error) {
    res.status(400).json({ error });
  }
});

export default router;
