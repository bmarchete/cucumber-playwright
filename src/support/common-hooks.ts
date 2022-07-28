/* eslint-disable no-console */
import { ICustomWorld } from './custom-world';
import { config } from './config';
import storageState from '../../storageState.json';
import { Before, After, BeforeAll, AfterAll, Status, setDefaultTimeout } from '@cucumber/cucumber';
import {
  chromium,
  ChromiumBrowser,
  firefox,
  FirefoxBrowser,
  webkit,
  WebKitBrowser,
  ConsoleMessage,
  request,
  expect,
} from '@playwright/test';
import { ITestCaseHookParameter } from '@cucumber/cucumber/lib/support_code_library_builder/types';
import { ensureDir } from 'fs-extra';

let browser: ChromiumBrowser | FirefoxBrowser | WebKitBrowser;
const tracesDir = 'traces';

declare global {
  // eslint-disable-next-line no-var
  var browser: ChromiumBrowser | FirefoxBrowser | WebKitBrowser;
}

const appUrl = process.env.APP_URL || '';
const loginUser = process.env.LOGIN_USER || '';
const loginPassword = process.env.LOGIN_PASSWORD || '';

const isTokenExpired = (): boolean => {
  const { cookies } = storageState;
  const cognitoCookie = cookies.find((o) => o.name === 'cognito');

  if (!cognitoCookie) {
    return true;
  }

  const exp = cognitoCookie.expires;

  const expDate = new Date(0); // The 0 there is the key, which sets the date to the epoch
  expDate.setUTCSeconds(exp);

  if (expDate < new Date()) {
    return true;
  }

  return false;
};

setDefaultTimeout(process.env.PWDEBUG ? -1 : 60 * 1000);

BeforeAll(async function () {
  switch (config.browser) {
    case 'firefox':
      browser = await firefox.launch(config.browserOptions);
      break;
    case 'webkit':
      browser = await webkit.launch(config.browserOptions);
      break;
    default:
      browser = await chromium.launch(config.browserOptions);
  }
  await ensureDir(tracesDir);

  if (isTokenExpired()) {
    // eslint-disable-next-line no-console
    const page = await browser.newPage();
    await page.goto(`${appUrl}/login`);
    await page.locator('[aria-label="login-btn"]').click();

    await page.fill('input[id="signInFormUsername"] >> visible=true', loginUser);
    await page.fill('input[id="signInFormPassword"] >> visible=true', loginPassword);

    await page.locator('text=Sign in').nth(3).click();
    await expect(page).toHaveURL(appUrl);

    await page.locator('text=Users').first().click();
    await page.context().storageState({ path: 'storageState.json' });
  }
});

Before({ tags: '@ignore' }, async function () {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return 'skipped' as any;
});

Before({ tags: '@debug' }, async function (this: ICustomWorld) {
  this.debug = true;
});

Before(async function (this: ICustomWorld, { pickle }: ITestCaseHookParameter) {
  this.startTime = new Date();
  this.testName = pickle.name.replace(/\W/g, '-');
  // customize the [browser context](https://playwright.dev/docs/next/api/class-browser#browsernewcontextoptions)
  this.context = await browser.newContext({
    acceptDownloads: true,
    recordVideo: process.env.PWVIDEO ? { dir: 'screenshots' } : undefined,
    viewport: { width: 1200, height: 800 },
  });

  const { origins } = storageState;
  const origin = origins.find((o) => o.origin === appUrl);

  if (!origin) {
    throw new Error('Origin is not set');
  }

  const idToken = origin.localStorage.find((l) => l.name.includes('idToken'));

  if (!idToken) {
    throw new Error('Idtoken not present');
  }

  this.server = await request.newContext({
    // All requests we send go to this API endpoint.
    baseURL: config.BASE_API_URL,
    extraHTTPHeaders: {
      Authorization: idToken.value,
    },
  });

  await this.context.tracing.start({ screenshots: true, snapshots: true });
  this.page = await this.context.newPage();
  this.page.on('console', async (msg: ConsoleMessage) => {
    if (msg.type() === 'log') {
      await this.attach(msg.text());
    }
  });
  this.feature = pickle;
});

After(async function (this: ICustomWorld, { result }: ITestCaseHookParameter) {
  if (result) {
    await this.attach(`Status: ${result?.status}. Duration:${result.duration?.seconds}s`);

    if (result.status !== Status.PASSED) {
      const image = await this.page?.screenshot();
      image && (await this.attach(image, 'image/png'));
      await this.context?.tracing.stop({
        path: `${tracesDir}/${this.testName}-${
          this.startTime?.toISOString().split('.')[0]
        }trace.zip`,
      });
    }
  }
  await this.page?.close();
  await this.context?.close();
});

AfterAll(async function () {
  await browser.close();
});
