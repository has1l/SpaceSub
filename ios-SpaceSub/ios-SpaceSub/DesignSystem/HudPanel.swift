import SwiftUI

struct HudPanel<Content: View>: View {
    var accent: Color = .signalPrimary
    var glowing: Bool = false
    var scanLine: Bool = false
    let content: () -> Content

    init(
        accent: Color = .signalPrimary,
        glowing: Bool = false,
        scanLine: Bool = false,
        @ViewBuilder content: @escaping () -> Content
    ) {
        self.accent = accent
        self.glowing = glowing
        self.scanLine = scanLine
        self.content = content
    }

    var body: some View {
        content()
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.spaceDeep.opacity(0.8))
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(.ultraThinMaterial.opacity(0.3))
                    )
            )
            .overlay(alignment: .top) {
                // Accent beam
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [.clear, accent.opacity(0.3), .clear],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(height: 1)
            }
            .overlay { cornerBrackets }
            .overlay {
                if scanLine {
                    ScanLineView(color: accent)
                }
            }
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(accent.opacity(glowing ? 0.18 : 0.08), lineWidth: 0.5)
            )
            .shadow(color: accent.opacity(glowing ? 0.08 : 0.03), radius: glowing ? 20 : 10)
            .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var cornerBrackets: some View {
        GeometryReader { geo in
            let size: CGFloat = 16
            let stroke = accent.opacity(0.25)

            // Top-left
            Path { p in
                p.move(to: CGPoint(x: 0, y: size))
                p.addLine(to: CGPoint(x: 0, y: 4))
                p.addQuadCurve(to: CGPoint(x: 4, y: 0), control: CGPoint(x: 0, y: 0))
                p.addLine(to: CGPoint(x: size, y: 0))
            }
            .stroke(stroke, lineWidth: 1)

            // Top-right
            Path { p in
                p.move(to: CGPoint(x: geo.size.width - size, y: 0))
                p.addLine(to: CGPoint(x: geo.size.width - 4, y: 0))
                p.addQuadCurve(to: CGPoint(x: geo.size.width, y: 4), control: CGPoint(x: geo.size.width, y: 0))
                p.addLine(to: CGPoint(x: geo.size.width, y: size))
            }
            .stroke(stroke, lineWidth: 1)

            // Bottom-left
            Path { p in
                p.move(to: CGPoint(x: 0, y: geo.size.height - size))
                p.addLine(to: CGPoint(x: 0, y: geo.size.height - 4))
                p.addQuadCurve(to: CGPoint(x: 4, y: geo.size.height), control: CGPoint(x: 0, y: geo.size.height))
                p.addLine(to: CGPoint(x: size, y: geo.size.height))
            }
            .stroke(stroke, lineWidth: 1)

            // Bottom-right
            Path { p in
                p.move(to: CGPoint(x: geo.size.width - size, y: geo.size.height))
                p.addLine(to: CGPoint(x: geo.size.width - 4, y: geo.size.height))
                p.addQuadCurve(to: CGPoint(x: geo.size.width, y: geo.size.height - 4), control: CGPoint(x: geo.size.width, y: geo.size.height))
                p.addLine(to: CGPoint(x: geo.size.width, y: geo.size.height - size))
            }
            .stroke(stroke, lineWidth: 1)
        }
        .allowsHitTesting(false)
    }
}

// MARK: - Scan Line

private struct ScanLineView: View {
    let color: Color
    @State private var offset: CGFloat = -1

    var body: some View {
        GeometryReader { geo in
            Rectangle()
                .fill(
                    LinearGradient(
                        colors: [.clear, color.opacity(0.12), .clear],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .frame(height: 1)
                .offset(y: offset * geo.size.height)
        }
        .allowsHitTesting(false)
        .onAppear {
            withAnimation(.linear(duration: 4).repeatForever(autoreverses: false)) {
                offset = 1
            }
        }
    }
}
