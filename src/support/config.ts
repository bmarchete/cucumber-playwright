import { LaunchOptions } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const browserOptions: LaunchOptions = {
  slowMo: 0,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  firefoxUserPrefs: {
    'media.navigator.streams.fake': true,
    'media.navigator.permission.disabled': true,
  },
};

export const config = {
  browser: process.env.BROWSER || 'chromium',
  browserOptions,
  BASE_URL: 'https://playwright.dev',
  IMG_THRESHOLD: { threshold: 0.4 },
  BASE_API_URL: process.env.BASE_URL || 'https://catfact.ninja/',
};
