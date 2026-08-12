import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

// Widget Android "À valider" (admin) — vendeurs + produits en attente de
// validation (voir src/services/widgetService.js#computeAdminWidgetData).
// N'affiche rien si le compte connecté n'est pas admin.
export default function AdminApprovalsWidget({ data }) {
  const isAdmin = !!data?.isAdmin;

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
        text="VTOUT ADMIN"
        style={{ fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1 }}
      />

      {isAdmin ? (
        <FlexWidget style={{ flexDirection: 'column', marginTop: 6 }}>
          <TextWidget text={String(data.pendingCount)} style={{ fontSize: 32, fontWeight: '900', color: '#0054a6' }} />
          <TextWidget
            text={data.pendingCount > 1 ? 'éléments à valider' : 'élément à valider'}
            style={{ fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 2 }}
          />
          <TextWidget
            text={`${data.pendingSuppliers || 0} vendeur(s) · ${data.pendingProducts || 0} produit(s)`}
            style={{ fontSize: 9.5, fontWeight: '700', color: '#94a3b8', marginTop: 6 }}
          />
        </FlexWidget>
      ) : (
        <TextWidget text="Espace admin non actif" style={{ fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 8 }} />
      )}
    </FlexWidget>
  );
}
