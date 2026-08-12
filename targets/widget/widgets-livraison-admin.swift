import WidgetKit
import SwiftUI

// ─────────────────────────────────────────────────────────────────────────
// Widget "Mes livraisons" (livreur) — nombre de livraisons actives
// assignées, écrit par src/services/widgetService.js#
// computeDeliveryWidgetData sous la clé "vtout_delivery_widget".
// ─────────────────────────────────────────────────────────────────────────

struct DeliveryEntry: TimelineEntry {
    let date: Date
    let isDelivery: Bool
    let activeCount: Int
}

struct DeliveryProvider: TimelineProvider {
    func placeholder(in context: Context) -> DeliveryEntry {
        DeliveryEntry(date: Date(), isDelivery: true, activeCount: 2)
    }

    func getSnapshot(in context: Context, completion: @escaping (DeliveryEntry) -> Void) {
        completion(loadEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DeliveryEntry>) -> Void) {
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [loadEntry()], policy: .after(nextUpdate)))
    }

    private func loadEntry() -> DeliveryEntry {
        let defaults = UserDefaults(suiteName: appGroup)
        guard let data = defaults?.data(forKey: "vtout_delivery_widget"),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              (json["isDelivery"] as? Bool) == true else {
            return DeliveryEntry(date: Date(), isDelivery: false, activeCount: 0)
        }
        return DeliveryEntry(date: Date(), isDelivery: true, activeCount: json["activeCount"] as? Int ?? 0)
    }
}

struct DeliveryWidgetView: View {
    var entry: DeliveryEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 5) {
                Image(systemName: "bicycle")
                    .font(.system(size: 11))
                    .foregroundColor(vtoutOrange)
                Text("VTOUT LIVREUR")
                    .font(.system(size: 9, weight: .black))
                    .foregroundColor(.secondary)
                Spacer()
            }

            Spacer(minLength: 2)

            if entry.isDelivery {
                Text("\(entry.activeCount)")
                    .font(.system(size: 32, weight: .black))
                    .foregroundColor(vtoutOrange)
                Text(entry.activeCount > 1 ? "livraisons en cours" : "livraison en cours")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.secondary)
            } else {
                Text("Espace livreur non actif")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .containerBackground(.background, for: .widget)
    }
}

struct VtoutDeliveryWidget: Widget {
    let kind: String = "VtoutDeliveryWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DeliveryProvider()) { entry in
            DeliveryWidgetView(entry: entry)
        }
        .configurationDisplayName("Mes livraisons")
        .description("Nombre de livraisons actives assignées.")
        .supportedFamilies([.systemSmall])
    }
}

// ─────────────────────────────────────────────────────────────────────────
// Widget "À valider" (admin) — vendeurs + produits en attente de
// validation, écrit sous la clé "vtout_admin_widget".
// ─────────────────────────────────────────────────────────────────────────

struct AdminEntry: TimelineEntry {
    let date: Date
    let isAdmin: Bool
    let pendingCount: Int
    let pendingSuppliers: Int
    let pendingProducts: Int
}

struct AdminProvider: TimelineProvider {
    func placeholder(in context: Context) -> AdminEntry {
        AdminEntry(date: Date(), isAdmin: true, pendingCount: 5, pendingSuppliers: 2, pendingProducts: 3)
    }

    func getSnapshot(in context: Context, completion: @escaping (AdminEntry) -> Void) {
        completion(loadEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<AdminEntry>) -> Void) {
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [loadEntry()], policy: .after(nextUpdate)))
    }

    private func loadEntry() -> AdminEntry {
        let defaults = UserDefaults(suiteName: appGroup)
        guard let data = defaults?.data(forKey: "vtout_admin_widget"),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              (json["isAdmin"] as? Bool) == true else {
            return AdminEntry(date: Date(), isAdmin: false, pendingCount: 0, pendingSuppliers: 0, pendingProducts: 0)
        }
        return AdminEntry(
            date: Date(),
            isAdmin: true,
            pendingCount: json["pendingCount"] as? Int ?? 0,
            pendingSuppliers: json["pendingSuppliers"] as? Int ?? 0,
            pendingProducts: json["pendingProducts"] as? Int ?? 0
        )
    }
}

struct AdminWidgetView: View {
    var entry: AdminEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 5) {
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 11))
                    .foregroundColor(vtoutBlue)
                Text("VTOUT ADMIN")
                    .font(.system(size: 9, weight: .black))
                    .foregroundColor(.secondary)
                Spacer()
            }

            Spacer(minLength: 2)

            if entry.isAdmin {
                Text("\(entry.pendingCount)")
                    .font(.system(size: 32, weight: .black))
                    .foregroundColor(vtoutBlue)
                Text(entry.pendingCount > 1 ? "éléments à valider" : "élément à valider")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.secondary)
                Text("\(entry.pendingSuppliers) vendeur(s) · \(entry.pendingProducts) produit(s)")
                    .font(.system(size: 9.5, weight: .bold))
                    .foregroundColor(.secondary)
                    .padding(.top, 4)
            } else {
                Text("Espace admin non actif")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .containerBackground(.background, for: .widget)
    }
}

struct VtoutAdminWidget: Widget {
    let kind: String = "VtoutAdminWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: AdminProvider()) { entry in
            AdminWidgetView(entry: entry)
        }
        .configurationDisplayName("À valider")
        .description("Vendeurs et produits en attente de validation.")
        .supportedFamilies([.systemSmall])
    }
}
