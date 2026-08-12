/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'VtoutWidget',
  displayName: 'Vtout',
  colors: {
    $accent: '#f37021',
  },
  entitlements: {
    // Même App Group que la cible principale (voir ios.entitlements dans
    // app.json) — c'est ce qui permet au widget de lire les données écrites
    // par src/services/widgetService.js via ExtensionStorage.
    'com.apple.security.application-groups':
      config.ios.entitlements['com.apple.security.application-groups'],
  },
});
