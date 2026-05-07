const { withAndroidManifest } = require("@expo/config-plugins");

const ATTRS = {
  "android.permission.ACCESS_COARSE_LOCATION": {
    "android:maxSdkVersion": "28",
  },
  "android.permission.ACCESS_FINE_LOCATION": {
    "android:maxSdkVersion": "30",
  },
  "android.permission.BLUETOOTH": {
    "android:maxSdkVersion": "30",
  },
  "android.permission.BLUETOOTH_ADMIN": {
    "android:maxSdkVersion": "30",
  },
  "android.permission.BLUETOOTH_SCAN": {
    "android:usesPermissionFlags": "neverForLocation",
  },
  "android.permission.READ_EXTERNAL_STORAGE": {
    "android:maxSdkVersion": "18",
    "tools:replace": "android:maxSdkVersion",
  },
  "android.permission.WRITE_EXTERNAL_STORAGE": {
    "android:maxSdkVersion": "18",
    "tools:replace": "android:maxSdkVersion",
  },
};

module.exports = function withAndroidPermissionAttributes(config) {
  return withAndroidManifest(config, (cfg) => {
    const perms = cfg.modResults.manifest["uses-permission"] ?? [];
    for (const p of perms) {
      const name = p.$?.["android:name"];
      if (ATTRS[name]) Object.assign(p.$, ATTRS[name]);
    }
    return cfg;
  });
};
