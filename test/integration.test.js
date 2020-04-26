// eslint is looking for `puppeteer` at root level package.json
// eslint-disable-next-line import/no-unresolved
const puppeteer = require('puppeteer');
const path = require('path');

const waitForWikiLoad = async (page) => {
    await page.waitForSelector('#TP_splash_screen', { hidden: true });
    await page.waitForSelector('body.tc-body.tc-dirty', { hidden: true });
};

describe('jest-image-snapshot usage with an image received from puppeteer', () => {
    let browser;
    let page;

    beforeAll(async () => {
        browser = await puppeteer.launch();
    });

    beforeEach(async () => {
        page = await browser.newPage();
        await page.goto(
            `file:${path.join(__dirname, '..', 'output', 'index.html')}`,
            {
                waitUntil: [ 'load', 'domcontentloaded', 'networkidle0' ],
            }
        );
        await waitForWikiLoad(page);
    });

    it('works', async () => {
        const image = await page.screenshot();
        expect(image).toMatchImageSnapshot();
    });

    afterAll(async () => {
        await browser.close();
    });
});
