import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { radius } from '../theme/colors';
import { socketService } from '../services/socketService';

// Miroir de frontend/src/component/Shared/OrderTrackingMap.jsx — carte de
// suivi de livraison en direct (client / vendeur / livreur, position du
// livreur mise à jour via WebSocket sur le canal dynamique
// `order_update_${orderId}`). Contrairement à une première version testée
// avec react-native-maps (nécessitait une clé Google Maps payante/à
// configurer sur Android), on reproduit ici exactement la même techno que
// le web : Leaflet + tuiles OpenStreetMap, gratuites et sans clé API,
// embarquées dans une WebView — même rendu sur iOS et Android, aucune
// config supplémentaire nécessaire.
const COTONOU = { lat: 6.3667, lng: 2.4333 };

const buildHtml = (center, customerPos, supplierPos) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .vtout-pin {
      width: 30px; height: 30px; border-radius: 15px; background: #fff; border: 2px solid #000;
      display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      font-size: 15px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${center.lat}, ${center.lng}], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    function makeIcon(emoji, color) {
      return L.divIcon({
        html: '<div class="vtout-pin" style="border-color:' + color + ';color:' + color + ';">' + emoji + '</div>',
        className: '', iconSize: [30, 30], iconAnchor: [15, 15],
      });
    }

    ${customerPos ? `L.marker([${customerPos[0]}, ${customerPos[1]}], { icon: makeIcon('🧍', '#ef4444') }).addTo(map).bindPopup('Votre position de livraison');` : ''}
    ${supplierPos ? `L.marker([${supplierPos[0]}, ${supplierPos[1]}], { icon: makeIcon('📍', '#10b981') }).addTo(map).bindPopup('Boutique du fournisseur');` : ''}

    let riderMarker = null;
    window.updateRiderPosition = function (lat, lng) {
      if (riderMarker) {
        riderMarker.setLatLng([lat, lng]);
      } else {
        riderMarker = L.marker([lat, lng], { icon: makeIcon('🚴', '#3b82f6') }).addTo(map).bindPopup('Le livreur est ici');
      }
    };
  </script>
</body>
</html>
`;

export default function OrderTrackingMap({ orderId, customerPos, supplierPos }) {
  const webviewRef = useRef(null);

  useEffect(() => {
    if (!orderId) return;
    const handleLocationUpdate = (data) => {
      if (data?.lat && data?.lng) {
        webviewInject(webviewRef, `window.updateRiderPosition && window.updateRiderPosition(${data.lat}, ${data.lng}); true;`);
      }
    };
    socketService.on(`order_update_${orderId}`, handleLocationUpdate);
    return () => socketService.off(`order_update_${orderId}`, handleLocationUpdate);
  }, [orderId]);

  const center = customerPos
    ? { lat: customerPos[0], lng: customerPos[1] }
    : supplierPos
    ? { lat: supplierPos[0], lng: supplierPos[1] }
    : COTONOU;

  const html = buildHtml(center, customerPos, supplierPos);

  return (
    <View style={styles.wrap}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html }}
        style={{ flex: 1 }}
        javaScriptEnabled
        scrollEnabled={false}
      />

      <View style={styles.legend}>
        <LegendItem color="#3b82f6" label="Livreur" />
        <LegendItem color="#ef4444" label="Vous" />
      </View>
    </View>
  );
}

// Ref pas toujours prête au tout premier événement socket (WebView encore
// en train de charger) — no-op silencieux plutôt qu'un crash, la position
// suivante mettra la carte à jour normalement.
function webviewInject(ref, script) {
  ref.current?.injectJavaScript(script);
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
