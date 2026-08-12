import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

// Widget Android "Suivi de commande" — rendu à partir des données calculées
// par src/services/widgetService.js#computeOrderWidgetData (mêmes champs
// que le widget iOS, voir targets/widget/widgets.swift). Composant pur, pas
// d'accès direct au contexte React (les widgets tournent dans une tâche
// headless séparée, voir widget-task-handler.js).
export default function OrderTrackingWidget({ data }) {
  const hasOrder = !!data?.hasOrder;

  return (
    <FlexWidget
      // Ouvre directement la commande (deep link vtout://order/:id, voir
      // App.js#linking) plutôt que la racine de l'app quand on en connaît une.
      clickAction={hasOrder ? 'OPEN_URI' : 'OPEN_APP'}
      clickActionData={hasOrder ? { uri: `vtout://order/${data.orderId}` } : undefined}
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

      {hasOrder ? (
        <FlexWidget style={{ flexDirection: 'column', marginTop: 6 }}>
          <TextWidget
            text={data.statusLabel}
            style={{ fontSize: 16, fontWeight: '900', color: '#0f172a' }}
            truncate="END"
            maxLines={1}
          />
          <TextWidget
            text={`Commande #${String(data.orderId).slice(0, 8)}`}
            style={{ fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 2 }}
          />
          <TextWidget
            text={`${data.itemsCount} article${data.itemsCount > 1 ? 's' : ''} · ${data.total} F`}
            style={{ fontSize: 11, fontWeight: '700', color: '#0f172a', marginTop: 10 }}
          />
        </FlexWidget>
      ) : (
        <TextWidget
          text="Aucune commande en cours"
          style={{ fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 8 }}
        />
      )}
    </FlexWidget>
  );
}
