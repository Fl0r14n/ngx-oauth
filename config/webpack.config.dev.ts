process.env.NODE_ENV = 'development';

import {config} from './webpack.config';

config.devServer.proxy = [{
  context: ['/rest/v2/**', '/authorizationserver/**'],
  target: 'https://localhost:9002',
  secure: false
}];

module.exports = config;
