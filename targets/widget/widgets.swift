import WidgetKit
import SwiftUI

// Groupe d'app partagé entre la cible principale et ce widget — doit
// correspondre exactement à ios.entitlements dans app.json et à
// APP_GROUP dans src/services/widgetService.js.
let appGroup = "group.com.vtout.mobile"
let vtoutOrange = Color(red: 0.953, green: 0.443, blue: 0.129) // #f37021
let vtoutBlue = Color(red: 0.0, green: 0.329, blue: 0.651) // #0054a6

// ─────────────────────────────────────────────────────────────────────────
// Widget "acheteur" — une seule chose affichée à la fois, la plus utile
// dans l'instant (mêmes 5 modes que src/services/widgetService.js#
// computeBuyerWidgetData, mêmes clés JSON écrites par ExtensionStorage,
// même logique de priorité que src/widgets/BuyerWidget.js) :
//   1. "order"    — commande active en cours
//   2. "cart"     — panier non finalisé (rappel)
//   3. "winback"  — aucune commande depuis 3 jours (relance douce)
//   4. "idle"     — rien d'urgent
//   5. "signed_out" (ou clé absente) — pas connecté
// ─────────────────────────────────────────────────────────────────────────

struct BuyerEntry: TimelineEntry {
    let date: Date
    let mode: String
    let orderId: String
    let orderIdShort: String
    let statusLabel: String
    let itemsCount: Int
    let total: Int
}

struct BuyerProvider: TimelineProvider {
    func placeholder(in context: Context) -> BuyerEntry {
        BuyerEntry(date: Date(), mode: "order", orderId: "", orderIdShort: "A1B2C3D4", statusLabel: "Expédiée", itemsCount: 2, total: 12000)
    }

    func getSnapshot(in context: Context, completion: @escaping (BuyerEntry) -> Void) {
        completion(loadEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BuyerEntry>) -> Void) {
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [loadEntry()], policy: .after(nextUpdate)))
    }

    private func loadEntry() -> BuyerEntry {
        let defaults = UserDefaults(suiteName: appGroup)
        guard let data = defaults?.data(forKey: "vtout_buyer_widget"),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let mode = json["mode"] as? String else {
            return BuyerEntry(date: Date(), mode: "signed_out", orderId: "", orderIdShort: "", statusLabel: "", itemsCount: 0, total: 0)
        }
        let orderId = json["orderId"] as? String ?? ""
        return BuyerEntry(
            date: Date(),
            mode: mode,
            orderId: orderId,
            orderIdShort: String(orderId.prefix(8)),
            statusLabel: json["statusLabel"] as? String ?? "—",
            itemsCount: json["itemsCount"] as? Int ?? 0,
            total: json["total"] as? Int ?? 0
        )
    }
}

struct BuyerWidgetView: View {
    var entry: BuyerEntry

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

            switch entry.mode {
            case "order":
                Text(entry.statusLabel)
                    .font(.system(size: 17, weight: .heavy))
                    .lineLimit(1)
                Text("Commande #\(entry.orderIdShort)")
                    .font(.system(size: 10.5, weight: .semibold))
                    .foregroundColor(.secondary)
                Spacer(minLength: 4)
                Text("\(entry.itemsCount) article\(entry.itemsCount > 1 ? "s" : "") · \(entry.total) F")
                    .font(.system(size: 11, weight: .bold))
            case "cart":
                Text("Panier en attente")
                    .font(.system(size: 16, weight: .heavy))
                    .foregroundColor(vtoutOrange)
                Text("\(entry.itemsCount) article\(entry.itemsCount > 1 ? "s" : "") · \(entry.total) F")
                    .font(.system(size: 11, weight: .bold))
                Spacer(minLength: 4)
                Text("Finalisez votre commande")
                    .font(.system(size: 10.5, weight: .semibold))
                    .foregroundColor(.secondary)
            case "winback":
                Text("On ne vous a pas vu récemment")
                    .font(.system(size: 14, weight: .heavy))
                    .lineLimit(2)
                Spacer(minLength: 6)
                Text("Découvrez les nouveautés Vtout")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.secondary)
            case "idle":
                Text("Tout est à jour, à bientôt !")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.secondary)
            default:
                Text("Connectez-vous pour voir votre activité")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .containerBackground(.background, for: .widget)
        // Ouvre directement la commande (voir App.js#linking, écran
        // OrderDetail toujours monté dans RootNavigator quel que soit
        // l'espace actif) plutôt que la racine de l'app dans les autres
        // modes — même URL que le widget Android (BuyerWidget.js).
        .widgetURL(entry.mode == "order" ? URL(string: "vtout://order/\(entry.orderId)") : nil)
    }
}

struct VtoutOrderWidget: Widget {
    let kind: String = "VtoutOrderWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: BuyerProvider()) { entry in
            BuyerWidgetView(entry: entry)
        }
        .configurationDisplayName("Mon activité Vtout")
        .description("Votre commande en cours, votre panier en attente, ou une petite relance.")
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
