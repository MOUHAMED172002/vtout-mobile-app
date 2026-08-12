import React from 'react';
import BuyerWidget from './BuyerWidget';
import SupplierQueueWidget from './SupplierQueueWidget';
import DeliveryQueueWidget from './DeliveryQueueWidget';
import AdminApprovalsWidget from './AdminApprovalsWidget';
import {
  computeBuyerWidgetData,
  computeSupplierWidgetData,
  computeDeliveryWidgetData,
  computeAdminWidgetData,
} from '../services/widgetService';

// Tâche headless Android (voir index.js#registerWidgetTaskHandler) —
// exécutée par l'OS indépendamment de l'app au premier ajout du widget, à
// chaque redessin périodique (updatePeriodMillis, voir app.json plugin
// react-native-android-widget) et à chaque redimensionnement. Recalcule ses
// propres données (même logique que widgetService.js#refreshWidgets, qui
// gère lui le cas où l'app est ouverte et pousse une mise à jour
// immédiate) — les deux chemins coexistent, celui-ci est le filet de
// sécurité qui garde le widget à jour même si l'app n'a pas tourné depuis
// un moment.
export async function widgetTaskHandler(props) {
  const { widgetInfo, renderWidget } = props;

  switch (widgetInfo.widgetName) {
    case 'OrderTracking': {
      const data = await computeBuyerWidgetData();
      renderWidget(<BuyerWidget data={data} />);
      break;
    }
    case 'SupplierQueue': {
      const data = await computeSupplierWidgetData();
      renderWidget(<SupplierQueueWidget data={data} />);
      break;
    }
    case 'DeliveryQueue': {
      const data = await computeDeliveryWidgetData();
      renderWidget(<DeliveryQueueWidget data={data} />);
      break;
    }
    case 'AdminApprovals': {
      const data = await computeAdminWidgetData();
      renderWidget(<AdminApprovalsWidget data={data} />);
      break;
    }
    default:
      break;
  }
}
