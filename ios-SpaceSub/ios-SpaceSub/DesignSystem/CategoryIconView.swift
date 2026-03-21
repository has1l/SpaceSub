import SwiftUI

struct CategoryIconView: View {
    let category: String
    var size: CGFloat = 16
    var color: Color = .signalPrimary

    var body: some View {
        Image(systemName: Self.iconMapping[category] ?? "ellipsis.circle.fill")
            .font(.system(size: size, weight: .medium))
            .foregroundStyle(color)
    }

    private static let iconMapping: [String: String] = [
        "Развлечения": "play.rectangle.fill",
        "Музыка": "waveform",
        "Продуктивность": "square.grid.2x2.fill",
        "Облако и хостинг": "cloud.fill",
        "Безопасность": "lock.shield.fill",
        "Образование": "graduationcap.fill",
        "Игры": "gamecontroller.fill",
        "Фитнес": "heart.text.clipboard",
        "Новости": "newspaper.fill",
    ]
}
