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
                    .fill(Color.spaceDeep.opacity(0.85))
            )
            .overlay(alignment: .top) {
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
            .overlay { CornerBracketsShape(cornerSize: 16).stroke(accent.opacity(0.25), lineWidth: 1) }
            .overlay {
                if scanLine {
                    ScanLineView(color: accent)
                }
            }
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(accent.opacity(glowing ? 0.18 : 0.08), lineWidth: 0.5)
            )
            .shadow(color: accent.opacity(glowing ? 0.06 : 0.02), radius: glowing ? 12 : 6)
            .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

// MARK: - Corner Brackets (Shape — no GeometryReader)

private struct CornerBracketsShape: Shape {
    let cornerSize: CGFloat

    func path(in rect: CGRect) -> Path {
        var p = Path()
        let s = cornerSize

        // Top-left
        p.move(to: CGPoint(x: rect.minX, y: rect.minY + s))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.minY + 4))
        p.addQuadCurve(to: CGPoint(x: rect.minX + 4, y: rect.minY), control: CGPoint(x: rect.minX, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.minX + s, y: rect.minY))

        // Top-right
        p.move(to: CGPoint(x: rect.maxX - s, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX - 4, y: rect.minY))
        p.addQuadCurve(to: CGPoint(x: rect.maxX, y: rect.minY + 4), control: CGPoint(x: rect.maxX, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.minY + s))

        // Bottom-left
        p.move(to: CGPoint(x: rect.minX, y: rect.maxY - s))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.maxY - 4))
        p.addQuadCurve(to: CGPoint(x: rect.minX + 4, y: rect.maxY), control: CGPoint(x: rect.minX, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.minX + s, y: rect.maxY))

        // Bottom-right
        p.move(to: CGPoint(x: rect.maxX - s, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.maxX - 4, y: rect.maxY))
        p.addQuadCurve(to: CGPoint(x: rect.maxX, y: rect.maxY - 4), control: CGPoint(x: rect.maxX, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - s))

        return p
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
        .drawingGroup()
        .onAppear {
            withAnimation(.linear(duration: 6).repeatForever(autoreverses: false)) {
                offset = 1
            }
        }
    }
}
