import SwiftUI

struct CategoryIconView: View {
    let category: String
    var size: CGFloat = 16
    var color: Color = .signalPrimary

    var body: some View {
        Image(systemName: symbolName)
            .font(.system(size: size, weight: .medium))
            .foregroundStyle(color)
    }

    private var symbolName: String {
        switch category {
        case "Развлечения": return "play.rectangle.fill"
        case "Музыка": return "waveform"
        case "Продуктивность": return "square.grid.2x2.fill"
        case "Облако и хостинг": return "cloud.fill"
        case "Безопасность": return "lock.shield.fill"
        case "Образование": return "graduationcap.fill"
        case "Игры": return "gamecontroller.fill"
        case "Фитнес": return "heart.text.clipboard"
        case "Новости": return "newspaper.fill"
        default: return "ellipsis.circle.fill"
        }
    }
}
