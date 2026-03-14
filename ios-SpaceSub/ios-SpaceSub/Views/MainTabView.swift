import SwiftUI

enum AppTab: Hashable {
    case dashboard
    case subscriptions
    case connect
}

struct MainTabView: View {

    var auth: AuthViewModel
    @State private var selectedTab: AppTab = .dashboard

    init(auth: AuthViewModel) {
        self.auth = auth

        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(Color.spaceVoid.opacity(0.95))
        appearance.shadowColor = .clear

        let itemAppearance = UITabBarItemAppearance()
        itemAppearance.normal.iconColor = UIColor(Color.textMuted)
        itemAppearance.normal.titleTextAttributes = [.foregroundColor: UIColor(Color.textMuted)]
        itemAppearance.selected.iconColor = UIColor(Color.signalPrimary)
        itemAppearance.selected.titleTextAttributes = [.foregroundColor: UIColor(Color.signalPrimary)]

        appearance.stackedLayoutAppearance = itemAppearance
        appearance.inlineLayoutAppearance = itemAppearance
        appearance.compactInlineLayoutAppearance = itemAppearance

        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            Tab("Панель", systemImage: "house.fill", value: .dashboard) {
                DashboardView(auth: auth, selectedTab: $selectedTab)
            }

            Tab("Подписки", systemImage: "antenna.radiowaves.left.and.right", value: .subscriptions) {
                SubscriptionsView(auth: auth)
            }

            Tab("Подключение", systemImage: "link.badge.plus", value: .connect) {
                ConnectFlexView(auth: auth, selectedTab: $selectedTab)
            }
        }
    }
}
