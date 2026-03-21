import SwiftUI

struct AnimatedNumber: View {
    let value: Double
    var prefix: String = ""
    var suffix: String = ""
    var font: Font = .system(size: 20, weight: .heavy, design: .monospaced)
    var decimals: Int = 0

    var body: some View {
        Text(formatted)
            .font(font)
            .contentTransition(.numericText(value: value))
            .animation(.spring(duration: 0.6, bounce: 0.15), value: value)
    }

    private var formatted: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.locale = Locale(identifier: "ru_RU")
        formatter.minimumFractionDigits = decimals
        formatter.maximumFractionDigits = decimals
        formatter.groupingSeparator = " "
        let num = formatter.string(from: NSNumber(value: value)) ?? "\(Int(value))"
        return "\(prefix)\(num)\(suffix)"
    }
}
