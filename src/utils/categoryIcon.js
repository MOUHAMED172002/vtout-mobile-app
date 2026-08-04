import * as LucideIcons from 'lucide-react-native';

const EMOJI_REGEX = /\p{Emoji}/u;

// Résout l'icône d'une catégorie : soit un emoji stocké tel quel (ex: "👗"),
// soit le nom d'une icône Lucide (ex: "Smartphone") — même convention que
// le back-office web (frontend/src/component/Category/Category*.jsx).
export const resolveCategoryIcon = (iconValue, fallback = 'Package') => {
  const isEmoji = !!iconValue && EMOJI_REGEX.test(iconValue);
  const IconComponent = (!isEmoji && iconValue && LucideIcons[iconValue]) ? LucideIcons[iconValue] : LucideIcons[fallback];
  return { isEmoji, emoji: isEmoji ? iconValue : null, IconComponent };
};
