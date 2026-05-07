const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const SOURCE_DIR = "assets/android-drawables";

module.exports = function withTabDrawables(config) {
  return withDangerousMod(config, [
    "android",
    (cfg) => {
      const sourceDir = path.join(cfg.modRequest.projectRoot, SOURCE_DIR);
      const destDir = path.join(
        cfg.modRequest.platformProjectRoot,
        "app/src/main/res/drawable"
      );

      fs.mkdirSync(destDir, { recursive: true });

      for (const file of fs.readdirSync(sourceDir)) {
        if (file.endsWith(".xml")) {
          fs.copyFileSync(
            path.join(sourceDir, file),
            path.join(destDir, file)
          );
        }
      }

      return cfg;
    },
  ]);
};
