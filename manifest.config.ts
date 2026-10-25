import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Amazon Video Saver',
  version: '1.0.0',
  description:
    'Download product videos from Amazon listings with one click. Supports quality selection and multiple Amazon domains.',
  permissions: ['activeTab', 'downloads', 'storage', 'offscreen'],
  host_permissions: [
    '*://*.amazon.com/*',
    '*://*.amazon.in/*',
    '*://*.amazon.co.uk/*',
    '*://*.amazon.de/*',
    '*://*.amazon.ca/*',
    '*://*.amazon.com.au/*',
    '*://*.amazon.co.jp/*',
    '*://*.media-amazon.com/*',
    '*://*.ssl-images-amazon.com/*',
    '*://*.cloudfront.net/*',
  ],
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: [
        '*://*.amazon.com/*/dp/*',
        '*://*.amazon.in/*/dp/*',
        '*://*.amazon.co.uk/*/dp/*',
        '*://*.amazon.de/*/dp/*',
        '*://*.amazon.ca/*/dp/*',
        '*://*.amazon.com.au/*/dp/*',
        '*://*.amazon.co.jp/*/dp/*',
        '*://*.amazon.com/dp/*',
        '*://*.amazon.in/dp/*',
        '*://*.amazon.co.uk/dp/*',
        '*://*.amazon.de/dp/*',
        '*://*.amazon.ca/dp/*',
        '*://*.amazon.com.au/dp/*',
        '*://*.amazon.co.jp/dp/*',
      ],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  action: {
    default_popup: 'src/popup/popup.html',
    default_icon: {
      '16': 'assets/icons/icon-16.png',
      '32': 'assets/icons/icon-32.png',
      '48': 'assets/icons/icon-48.png',
      '128': 'assets/icons/icon-128.png',
    },
  },
  icons: {
    '16': 'assets/icons/icon-16.png',
    '48': 'assets/icons/icon-48.png',
    '128': 'assets/icons/icon-128.png',
  },
});
