import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import App from './App';
import { widgetTaskHandler } from './src/widgets/widget-task-handler';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// No-op sur iOS/web (voir react-native-android-widget/src/AndroidWidget.ts) —
// sûr à appeler inconditionnellement ici. Voir src/widgets/widget-task-handler.js.
registerWidgetTaskHandler(widgetTaskHandler);
