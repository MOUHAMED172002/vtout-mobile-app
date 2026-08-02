import { colors } from '../theme/colors';

export const ORDER_STATUS_LABELS = {
  en_attente: 'En attente',
  pending_payment: 'Paiement en attente',
  confirmée: 'Confirmée',
  confirmee: 'Confirmée',
  expédiée: 'Expédiée',
  expediee: 'Expédiée',
  livrée: 'Livrée',
  livree: 'Livrée',
  annulée: 'Annulée',
  annulee: 'Annulée',
};

export const ORDER_STATUS_COLORS = {
  en_attente: colors.warning,
  pending_payment: colors.warning,
  confirmée: colors.secondary,
  confirmee: colors.secondary,
  expédiée: colors.primary,
  expediee: colors.primary,
  livrée: colors.success,
  livree: colors.success,
  annulée: colors.danger,
  annulee: colors.danger,
};

export const getOrderStatusLabel = (status) => ORDER_STATUS_LABELS[status] || status;
export const getOrderStatusColor = (status) => ORDER_STATUS_COLORS[status] || colors.textMuted;
