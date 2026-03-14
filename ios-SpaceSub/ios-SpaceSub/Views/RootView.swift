import SwiftUI

struct RootView: View {

    @State private var auth = AuthViewModel()

    var body: some View {
        Group {
            switch auth.state {
            case .unknown:
                ProgressView("Loading...")
            case .unauthenticated:
                LoginView(auth: auth)
            case .authenticated:
                MainTabView(auth: auth)
            }
        }
        .onAppear {
            auth.checkExistingSession()
        }
    }
}
