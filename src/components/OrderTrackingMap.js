import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme/colors';
import { socketService } from '../services/socketService';

// Miroir de frontend/src/component/Shared/OrderTrackingMap.jsx — carte de
// suivi de livraison en direct (position du client, du vendeur, et du
// livreur mise à jour via WebSocket sur le canal dynamique
// `order_update_${orderId}`). Nécessite react-native-maps (module natif) :
// invisible en Expo Go, testable uniquement via un build EAS. Sur Android,
// react-native-maps a toujours besoin d'une clé Google Maps
// (app.json → expo.android.config.googleMaps.apiKey, encore vide) ; iOS
// utilise Apple Maps par défaut, aucune clé requise.
const COTONOU = { latitude: 6.3667, longitude: 2.4333 };

export default function OrderTrackingMap({ orderId, customerPos, supplierPos }) {
  const [riderPos, setRiderPos] = useState(null);

  useEffect(() => {
    if (!orderId) return;
    const handleLocationUpdate = (data) => {
      if (data?.lat && data?.lng) setRiderPos({ latitude: data.lat, longitude: data.lng });
    };
    socketService.on(`order_update_${orderId}`, handleLocationUpdate);
    return () => socketService.off(`order_update_${orderId}`, handleLocationUpdate);
  }, [orderId]);

  const center = useMemo(() => {
    if (customerPos) return { latitude: customerPos[0], longitude: customerPos[1] };
    if (supplierPos) return { latitude: supplierPos[0], longitude: supplierPos[1] };
    return COTONOU;
  }, [customerPos, supplierPos]);

  return (
    <View style={styles.wrap}>
      <MapView
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...center, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        region={{ ...center, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
      >
        {customerPos && (
          <Marker coordinate={{ latitude: customerPos[0], longitude: customerPos[1] }} title="Votre position de livraison">
            <MapPin icon="person" color="#ef4444" />
          </Marker>
        )}
        {supplierPos && (
          <Marker coordinate={{ latitude: supplierPos[0], longitude: supplierPos[1] }} title="Boutique du fournisseur">
            <MapPin icon="location" color="#10b981" />
          </Marker>
        )}
        {riderPos && (
          <Marker coordinate={riderPos} title="Le livreur est ici">
            <MapPin icon="bicycle" color="#3b82f6" />
          </Marker>
        )}
      </MapView>

      <View style={styles.legend}>
        <LegendItem color="#3b82f6" label="Livreur" />
        <LegendItem color="#ef4444" label="Vous" />
      </View>
    </View>
  );
}

function MapPin({ icon, color }) {
  return (
    <View style={[pinStyles.wrap, { borderColor: color }]}>
      <Ionicons name={icon} size={16} color={color} />
    </View>
  );
}

function LegendItem({ color, label }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 260, borderRadius: radius.xl, overflow: 'hidden', position: 'relative' },
  legend: {
    position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 9.5, fontWeight: '800', color: '#334155', textTransform: 'uppercase' },
});

const pinStyles = StyleSheet.create({
  wrap: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#fff', borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
  },
});
