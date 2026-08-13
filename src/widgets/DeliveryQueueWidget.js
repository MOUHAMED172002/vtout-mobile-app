import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

// Widget Android "Mes livraisons" — nombre de livraisons actives assignées
// (voir src/services/widgetService.js#computeDeliveryWidgetData). N'affiche
// rien de sensible si l'espace livreur n'est pas actif sur ce compte.
export default function DeliveryQueueWidget({ data }) {
  const isDelivery = !!data?.isDelivery;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
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
        text="VTOUT LIVREUR"
        style={{ fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1 }}
      />

      {isDelivery ? (
        <FlexWidget style={{ flexDirection: 'column', marginTop: 6 }}>
          <TextWidget text={String(data.activeCount)} style={{ fontSize: 32, fontWeight: '900', color: '#f37021' }} />
          <TextWidget
            text={data.activeCount > 1 ? 'livraisons en cours' : 'livraison en cours'}
            style={{ fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 2 }}
          />
        </FlexWidget>
      ) : (
        <TextWidget text="Espace livreur non actif" style={{ fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 8 }} />
      )}
    </FlexWidget>
  );
}
