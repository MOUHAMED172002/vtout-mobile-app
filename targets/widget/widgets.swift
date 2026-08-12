import WidgetKit
import SwiftUI

// Groupe d'app partagé entre la cible principale et ce widget — doit
// correspondre exactement à ios.entitlements dans app.json et à
// APP_GROUP dans src/services/widgetService.js.
let appGroup = "group.com.vtout.mobile"
let vtoutOrange = Color(red: 0.953, green: 0.443, blue: 0.129) // #f37021
let vtoutBlue = Color(red: 0.0, green: 0.329, blue: 0.651) // #0054a6

// ─────────────────────────────────────────────────────────────────────────
// Widget "Suivi de commande" (client) — lit la dernière commande active
// écrite par src/services/widgetService.js via ExtensionStorage
// (`@bacons/apple-targets`), stockée en JSON dans le UserDefaults partagé
// sous la clé "vtout_order_widget". Se rafraîchit automatiquement toutes
// les 30 min, et immédiatement quand l'app appelle
// ExtensionStorage.reloadWidget() après un changement de statut.
// ─────────────────────────────────────────────────────────────────────────

struct OrderEntry: TimelineEntry {
    let date: Date
    let hasOrder: Bool
    let statusLabel: String
    let itemsCount: Int
    let total: Int
    let orderIdShort: String
}

struct OrderProvider: TimelineProvider {
    func placeholder(in context: Context) -> OrderEntry {
        OrderEntry(date: Date(), hasOrder: true, statusLabel: "Expédiée", itemsCount: 2, total: 12000, orderIdShort: "A1B2C3D4")
    }

    func getSnapshot(in context: Context, completion: @escaping (OrderEntry) -> Void) {
        completion(loadEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<OrderEntry>) -> Void) {
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [loadEntry()], policy: .after(nextUpdate)))
    }

    private func loadEntry() -> OrderEntry {
        let defaults = UserDefaults(suiteName: appGroup)
        guard let data = defaults?.data(forKey: "vtout_order_widget"),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              (json["hasOrder"] as? Bool) == true else {
            return OrderEntry(date: Date(), hasOrder: false, statusLabel: "", itemsCount: 0, total: 0, orderIdShort: "")
        }
        let orderId = json["orderId"] as? String ?? ""
        return OrderEntry(
            date: Date(),
            hasOrder: true,
            statusLabel: json["statusLabel"] as? String ?? "—",
            itemsCount: json["itemsCount"] as? Int ?? 0,
            total: json["total"] as? Int ?? 0,
            orderIdShort: String(orderId.prefix(8))
        )
    }
}

struct OrderWidgetView: View {
    var entry: OrderEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 5) {
                Image(systemName: "shippingbox.fill")
                    .font(.system(size: 11))
                    .foregroundColor(vtoutOrange)
                Text("VTOUT")
                    .font(.system(size: 10, weight: .black))
                    .foregroundColor(.secondary)
                Spacer()
            }

            Spacer(minLength: 2)

            if entry.hasOrder {
                Text(entry.statusLabel)
                    .font(.system(size: 17, weight: .heavy))
                    .lineLimit(1)
                Text("Commande #\(entry.orderIdShort)")
                    .font(.system(size: 10.5, weight: .semibold))
                    .foregroundColor(.secondary)
                Spacer(minLength: 4)
                Text("\(entry.itemsCount) article\(entry.itemsCount > 1 ? "s" : "") · \(entry.total) F")
                    .font(.system(size: 11, weight: .bold))
            } else {
                Text("Aucune commande en cours")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .containerBackground(.background, for: .widget)
    }
}

struct VtoutOrderWidget: Widget {
    let kind: String = "VtoutOrderWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: OrderProvider()) { entry in
            OrderWidgetView(entry: entry)
        }
        .configurationDisplayName("Suivi de commande")
        .description("Statut de votre commande Vtout en cours.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// ─────────────────────────────────────────────────────────────────────────
// Widget "Commandes vendeur" — même mécanisme, clé "vtout_supplier_widget",
// affiché seulement pour un compte ayant l'espace vendeur actif (voir
// widgetService.js — isSupplier).
// ─────────────────────────────────────────────────────────────────────────

struct SupplierEntry: TimelineEntry {
    let date: Date
    let isSupplier: Bool
    let pendingCount: Int
}

struct SupplierProvider: TimelineProvider {
    func placeholder(in context: Context) -> SupplierEntry {
        SupplierEntry(date: Date(), isSupplier: true, pendingCount: 3)
    }

    func getSnapshot(in context: Context, completion: @escaping (SupplierEntry) -> Void) {
        completion(loadEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SupplierEntry>) -> Void) {
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [loadEntry()], policy: .after(nextUpdate)))
    }

    private func loadEntry() -> SupplierEntry {
        let defaults = UserDefaults(suiteName: appGroup)
        guard let data = defaults?.data(forKey: "vtout_supplier_widget"),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              (json["isSupplier"] as? Bool) == true else {
            return SupplierEntry(date: Date(), isSupplier: false, pendingCount: 0)
        }
        return SupplierEntry(date: Date(), isSupplier: true, pendingCount: json["pendingCount"] as? Int ?? 0)
    }
}

struct SupplierWidgetView: View {
    var entry: SupplierEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 5) {
                Image(systemName: "storefront.fill")
                    .font(.system(size: 11))
                    .foregroundColor(vtoutBlue)
                Text("VTOUT BUSINESS")
                    .font(.system(size: 9, weight: .black))
                    .foregroundColor(.secondary)
                Spacer()
            }

            Spacer(minLength: 2)

            if entry.isSupplier {
                Text("\(entry.pendingCount)")
                    .font(.system(size: 32, weight: .black))
                Text(entry.pendingCount > 1 ? "commandes à traiter" : "commande à traiter")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.secondary)
            } else {
                Text("Espace vendeur non actif")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .containerBackground(.background, for: .widget)
    }
}

struct VtoutSupplierWidget: Widget {
    let kind: String = "VtoutSupplierWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SupplierProvider()) { entry in
            SupplierWidgetView(entry: entry)
        }
        .configurationDisplayName("Commandes vendeur")
        .description("Nombre de commandes en attente à traiter.")
        .supportedFamilies([.systemSmall])
    }
}
