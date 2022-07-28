import { ICustomWorld } from '../support/custom-world';
import { compareToBaseImage, getImagePath } from '../utils/compareImages';
import { Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

Then('Snapshot {string}', async function (this: ICustomWorld, name: string) {
  const { page } = this;
  await page?.screenshot({ path: getImagePath(this, name) });
});

Then('Snapshot', async function (this: ICustomWorld) {
  const { page } = this;
  const image = await page?.screenshot();
  image && (await this.attach(image, 'image/png'));
});

Then('debug', async function () {
  // eslint-disable-next-line no-debugger
  debugger;
});

Then('Screen matches the base image {string}', async function (this: ICustomWorld, name: string) {
  await this.page?.waitForTimeout(1000);
  const screenshot = await this.page!.screenshot();
  await compareToBaseImage(this, name, screenshot as Buffer);
});

Then(
  'We see {string} as the environment name',
  async function (this: ICustomWorld, environment: string) {
    const response = this.serverResponse;
    expect(response?.ok()).toBeTruthy();
    const body = await response?.json();
    expect(body['ENVIRONMENT_NAME']).toBe(environment);
  },
);
