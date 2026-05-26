export const environment = {
  production: false,
  // En dev local: appels directs (le proxy Angular dans proxy.conf.json gère le CORS)
  apiBase:    'http://localhost:4200/proxy/api',
  assetsBase: 'http://localhost:4200/proxy/assets',
  bucketBase: 'http://localhost:4200/proxy/bucket',
};
