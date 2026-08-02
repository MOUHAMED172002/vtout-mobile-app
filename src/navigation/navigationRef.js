import { createNavigationContainerRef } from '@react-navigation/native';

// Permet de naviguer depuis en dehors de l'arbre des écrans (ex: le
// listener de notification push, qui se déclenche même app en arrière-plan
// et n'a pas de prop `navigation` à disposition).
export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}
