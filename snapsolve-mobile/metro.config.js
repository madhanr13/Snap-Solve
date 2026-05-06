const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Workaround for Windows path issue with node:sea
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Skip problematic paths
      if (req.url && req.url.includes('node:sea')) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
