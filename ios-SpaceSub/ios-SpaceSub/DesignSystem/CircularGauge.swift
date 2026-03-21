import SwiftUI

enum GaugeStyle {
    case full
    case semi
}

struct CircularGauge: View {
    let value: Double
    let color: Color
    var size: CGFloat = 48
    var lineWidth: CGFloat = 3
    var style: GaugeStyle = .full

    @State private var animatedValue: Double = 0

    var body: some View {
        ZStack {
            switch style {
            case .full:
                fullGauge
            case .semi:
                semiGauge
            }
        }
        .frame(width: size, height: size)
        .onAppear {
            withAnimation(.easeOut(duration: 0.8)) {
                animatedValue = value
            }
        }
        .onChange(of: value) { _, newVal in
            withAnimation(.easeOut(duration: 0.6)) {
                animatedValue = newVal
            }
        }
    }

    private var fullGauge: some View {
        ZStack {
            Circle()
                .stroke(Color.white.opacity(0.04), lineWidth: lineWidth)

            Circle()
                .trim(from: 0, to: animatedValue / 100)
                .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .shadow(color: color.opacity(0.5), radius: 4)
        }
    }

    private var semiGauge: some View {
        ZStack {
            // Background arc (bottom half = 180°)
            Circle()
                .trim(from: 0.25, to: 0.75)
                .stroke(Color.white.opacity(0.04), style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(0))

            // Value arc
            Circle()
                .trim(from: 0.25, to: 0.25 + (animatedValue / 100) * 0.5)
                .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(0))
                .shadow(color: color.opacity(0.5), radius: 4)
        }
    }
}
