import SwiftUI

struct SpaceBackground: View {

    var body: some View {
        ZStack {
            // Layer 0: Deep void gradient
            SpaceGradient.cosmicBg
                .ignoresSafeArea()

            // Layer 1: Grid overlay
            GridOverlay()
                .opacity(0.025)
                .ignoresSafeArea()

            // Layer 2: Animated starfield
            StarfieldView()
                .ignoresSafeArea()

            // Layer 3: Ambient glow spots
            AmbientGlow()
                .ignoresSafeArea()
        }
    }
}

// MARK: - Grid Overlay

private struct GridOverlay: View {
    let spacing: CGFloat = 80

    var body: some View {
        Canvas { context, size in
            let cols = Int(size.width / spacing) + 1
            let rows = Int(size.height / spacing) + 1

            for col in 0...cols {
                let x = CGFloat(col) * spacing
                var path = Path()
                path.move(to: CGPoint(x: x, y: 0))
                path.addLine(to: CGPoint(x: x, y: size.height))
                context.stroke(path, with: .color(Color.signalPrimary.opacity(0.5)), lineWidth: 0.5)
            }

            for row in 0...rows {
                let y = CGFloat(row) * spacing
                var path = Path()
                path.move(to: CGPoint(x: 0, y: y))
                path.addLine(to: CGPoint(x: size.width, y: y))
                context.stroke(path, with: .color(Color.signalPrimary.opacity(0.5)), lineWidth: 0.5)
            }
        }
        .drawingGroup()
    }
}

// MARK: - Starfield

private struct StarfieldView: View {

    @State private var phase: CGFloat = 0

    private static let stars: [(x: CGFloat, y: CGFloat, size: CGFloat, brightness: CGFloat, speed: CGFloat)] = {
        var result: [(CGFloat, CGFloat, CGFloat, CGFloat, CGFloat)] = []
        for i in 0..<40 {
            let seed = Double(i)
            result.append((
                CGFloat((seed * 173.7).truncatingRemainder(dividingBy: 1000)) / 1000,
                CGFloat((seed * 259.3).truncatingRemainder(dividingBy: 1000)) / 1000,
                CGFloat(1 + (seed * 37.3).truncatingRemainder(dividingBy: 100) / 100),
                CGFloat(0.2 + (seed * 91.7).truncatingRemainder(dividingBy: 100) / 200),
                CGFloat(0.3 + (seed * 53.1).truncatingRemainder(dividingBy: 100) / 143)
            ))
        }
        return result
    }()

    var body: some View {
        Canvas { context, size in
            for star in Self.stars {
                let pulseFactor = 0.5 + 0.5 * sin(phase * star.speed + star.x * 10)
                let alpha = star.brightness * pulseFactor

                let point = CGPoint(x: star.x * size.width, y: star.y * size.height)
                let rect = CGRect(
                    x: point.x - star.size / 2,
                    y: point.y - star.size / 2,
                    width: star.size,
                    height: star.size
                )

                let isTeal = star.brightness > 0.5
                let color = isTeal
                    ? Color.signalPrimary.opacity(alpha * 0.6)
                    : Color.white.opacity(alpha * 0.4)

                context.fill(Circle().path(in: rect), with: .color(color))

                if star.size > 1.2 {
                    let glowRect = rect.insetBy(dx: -1.5, dy: -1.5)
                    context.fill(
                        Circle().path(in: glowRect),
                        with: .color(color.opacity(0.12))
                    )
                }
            }
        }
        .drawingGroup()
        .onAppear {
            withAnimation(.linear(duration: 12).repeatForever(autoreverses: false)) {
                phase = .pi * 2
            }
        }
    }
}

// MARK: - Ambient Glow

private struct AmbientGlow: View {
    var body: some View {
        GeometryReader { geo in
            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [Color.signalPrimary.opacity(0.04), .clear],
                            center: .center,
                            startRadius: 0,
                            endRadius: 200
                        )
                    )
                    .frame(width: 400, height: 400)
                    .position(x: geo.size.width * 0.8, y: geo.size.height * 0.15)

                Circle()
                    .fill(
                        RadialGradient(
                            colors: [Color.signalSecondary.opacity(0.03), .clear],
                            center: .center,
                            startRadius: 0,
                            endRadius: 250
                        )
                    )
                    .frame(width: 500, height: 500)
                    .position(x: geo.size.width * 0.1, y: geo.size.height * 0.7)
            }
        }
    }
}
