import SwiftUI

struct ParticleField: View {
    var count: Int = 6

    private let particles: [Particle]

    init(count: Int = 6) {
        self.count = count
        self.particles = (0..<count).map { i in
            Particle(
                baseX: CGFloat.random(in: 0.05...0.95),
                baseY: CGFloat.random(in: 0.1...0.9),
                size: CGFloat.random(in: 1...2),
                driftAmplitude: CGFloat.random(in: 10...25),
                period: Double.random(in: 15...30),
                phase: Double.random(in: 0...(.pi * 2)),
                baseOpacity: Double.random(in: 0.06...0.18)
            )
        }
    }

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { context in
            Canvas { gfx, size in
                let time = context.date.timeIntervalSinceReferenceDate
                for p in particles {
                    let x = p.baseX * size.width + p.driftAmplitude * CGFloat(sin(time / p.period * .pi * 2 + p.phase))
                    let y = p.baseY * size.height + p.driftAmplitude * 0.7 * CGFloat(cos(time / p.period * .pi * 2 + p.phase * 1.3))
                    let opacity = p.baseOpacity * (0.5 + 0.5 * sin(time / (p.period * 0.4) + p.phase))
                    let rect = CGRect(x: x - p.size / 2, y: y - p.size / 2, width: p.size, height: p.size)
                    gfx.fill(Circle().path(in: rect), with: .color(Color.white.opacity(max(0.03, opacity))))
                }
            }
        }
        .allowsHitTesting(false)
        .drawingGroup()
    }
}

private struct Particle {
    let baseX: CGFloat
    let baseY: CGFloat
    let size: CGFloat
    let driftAmplitude: CGFloat
    let period: Double
    let phase: Double
    let baseOpacity: Double
}
