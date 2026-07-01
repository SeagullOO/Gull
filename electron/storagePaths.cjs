const path = require("path");

function resolveDataPath(appRoot, config = {}) {
  return config.customPath || path.join(appRoot, "data");
}

module.exports = { resolveDataPath };
