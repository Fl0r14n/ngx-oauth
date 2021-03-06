const PROXY_CONFIG = [
  {
    context: [
      '/rest/v2/**',
      '/occ/v2/**',
      '/authorizationserver/**',
      '/o/**',
      '/medias/**',
      '/auth/**',
      '/static/**',
    ],
    // target: 'https://localhost:9002',
    // secure: false,

    target: 'http://localhost:8080',
    changeOrigin: true,
    secure: false,

    // target: 'https://some.domain',
    // changeOrigin: true,
    // secure: true
  }
];

module.exports = PROXY_CONFIG;
