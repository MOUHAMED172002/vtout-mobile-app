import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

// Widget Android "acheteur" — une seule chose affichée à la fois, la plus
// utile dans l'instant (voir src/services/widgetService.js#
// computeBuyerWidgetData pour la logique de priorité, partagée avec le
// widget iOS dans targets/widget/widgets.swift) :
//   1. mode "order"    — commande active en cours
//   2. mode "cart"     — panier non finalisé (rappel)
//   3. mode "winback"  — aucune commande depuis 3 jours (relance douce)
//   4. mode "idle"     — rien d'urgent
//   5. mode "signed_out" — pas connecté
export default function BuyerWidget({ data }) {
  const mode = data?.mode || 'signed_out';

  return (
    <FlexWidget
      clickAction={mode === 'order' ? 'OPEN_URI' : 'OPEN_APP'}
      clickActionData={mode === 'order' ? { uri: `vtout://order/${data.orderId}` } : undefined}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: 16,
        backgroundColor: '#ffffff',
        borderRadius: 20,
      }}
    >
      <TextWidget
        text="VTOUT"
        style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1 }}
      />

      {mode === 'order' && (
        <FlexWidget style={{ flexDirection: 'column', marginTop: 6 }}>
          <TextWidget text={data.statusLabel} style={{ fontSize: 16, fontWeight: '900', color: '#0f172a' }} truncate="END" maxLines={1} />
          <TextWidget text={`Commande #${String(data.orderId).slice(0, 8)}`} style={{ fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 2 }} />
          <TextWidget text={`${data.itemsCount} article${data.itemsCount > 1 ? 's' : ''} · ${data.total} F`} style={{ fontSize: 11, fontWeight: '700', color: '#0f172a', marginTop: 10 }} />
        </FlexWidget>
      )}

      {mode === 'cart' && (
        <FlexWidget style={{ flexDirection: 'column', marginTop: 6 }}>
          <TextWidget text="Panier en attente" style={{ fontSize: 16, fontWeight: '900', color: '#f37021' }} />
          <TextWidget text={`${data.itemsCount} article${data.itemsCount > 1 ? 's' : ''} · ${data.total} F`} style={{ fontSize: 11, fontWeight: '700', color: '#0f172a', marginTop: 4 }} />
          <TextWidget text="Finalisez votre commande" style={{ fontSize: 10.5, fontWeight: '600', color: '#64748b', marginTop: 8 }} />
        </FlexWidget>
      )}

      {mode === 'winback' && (
        <FlexWidget style={{ flexDirection: 'column', marginTop: 6 }}>
          <TextWidget text="On ne vous a pas vu récemment" style={{ fontSize: 14, fontWeight: '900', color: '#0f172a' }} />
          <TextWidget text="Découvrez les nouveautés Vtout" style={{ fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 6 }} />
        </FlexWidget>
      )}

      {mode === 'idle' && (
        <TextWidget text="Tout est à jour, à bientôt !" style={{ fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 8 }} />
      )}

      {mode === 'signed_out' && (
        <TextWidget text="Connectez-vous pour voir votre activité" style={{ fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 8 }} />
      )}
    </FlexWidget>
  );
}
