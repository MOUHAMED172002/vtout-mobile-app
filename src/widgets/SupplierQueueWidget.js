import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

// Widget Android "Commandes vendeur" — nombre de commandes en attente à
// traiter (status en_attente, voir src/services/widgetService.js#
// computeSupplierWidgetData). N'affiche rien de sensible si l'espace
// vendeur n'est pas actif sur ce compte (isSupplier: false).
export default function SupplierQueueWidget({ data }) {
  const isSupplier = !!data?.isSupplier;

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
        text="VTOUT BUSINESS"
        style={{ fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1 }}
      />

      {isSupplier ? (
        <FlexWidget style={{ flexDirection: 'column', marginTop: 6 }}>
          <TextWidget
            text={String(data.pendingCount)}
            style={{ fontSize: 32, fontWeight: '900', color: '#0054a6' }}
          />
          <TextWidget
            text={data.pendingCount > 1 ? 'commandes à traiter' : 'commande à traiter'}
            style={{ fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 2 }}
          />
        </FlexWidget>
      ) : (
        <TextWidget
          text="Espace vendeur non actif"
          style={{ fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 8 }}
        />
      )}
    </FlexWidget>
  );
}
