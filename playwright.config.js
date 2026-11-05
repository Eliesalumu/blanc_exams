import { defineConfig } from '@playwright/test';
import fs from 'node:fs';
const windowsEdge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
export default defineConfig({
  testDir:'./tests',testMatch:['browser.spec.js','ai-browser.spec.js'],outputDir:'./test-results/playwright',fullyParallel:false,workers:1,timeout:60000,
  use:{baseURL:'http://127.0.0.1:4173',headless:true,launchOptions:fs.existsSync(windowsEdge)?{executablePath:windowsEdge}:{},screenshot:'only-on-failure',trace:'retain-on-failure'},
  webServer:{command:'node scripts/serve.js',url:'http://127.0.0.1:4173',reuseExistingServer:true,timeout:15000},
});
