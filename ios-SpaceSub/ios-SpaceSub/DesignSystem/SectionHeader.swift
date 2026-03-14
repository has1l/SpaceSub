import SwiftUI

/// Section title with optional trailing content.
struct SectionHeader<Trailing: View>: View {

    let title: String
    var icon: String? = nil
    @ViewBuilder var trailing: () -> Trailing

    init(
        _ title: String,
        icon: String? = nil,
        @ViewBuilder trailing: @escaping () -> Trailing = { EmptyView() }
    ) {
        self.title = title
        self.icon = icon
        self.trailing = trailing
    }

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            if let icon {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Color.signalPrimary.opacity(0.5))
            }

            Text(title)
                .font(.system(size: 14, weight: .semibold))
                .tracking(0.3)
                .foregroundStyle(Color.textSecondary)

            Spacer()

            trailing()
        }
        .padding(.horizontal, 4)
    }
}
