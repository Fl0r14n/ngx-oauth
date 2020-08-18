const PROXY_CONFIG = [
  {
    context: [
      '/rest/v2/**',
      '/occ/v2/**',
      '/authorizationserver/**',
      '/medias/**'
    ],
    target: 'https://localhost:9002',
    secure: false
  }
];

module.exports = PROXY_CONFIG;
