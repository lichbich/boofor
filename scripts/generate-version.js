const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "../public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const buildId = Date.now();
const versionData = {
  buildId,
  version: "1.0.4",
  updatedAt: new Date().toISOString(),
};

fs.writeFileSync(
  path.join(publicDir, "version.json"),
  JSON.stringify(versionData, null, 2)
);

console.log("Successfully generated public/version.json:", versionData);
