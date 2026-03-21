import SwiftUI

struct TrendSparkline: View {
    let data: [Double]
    var color: Color = .signalPrimary
    var width: CGFloat = 80
    var height: CGFloat = 24

    @State private var progress: CGFloat = 0

    var body: some View {
        if data.count >= 2 {
            ZStack(alignment: .trailing) {
                sparkPath
                    .trim(from: 0, to: progress)
                    .stroke(color, style: StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .round))
                    .shadow(color: color.opacity(0.5), radius: 2)

                // Last point
                Circle()
                    .fill(color)
                    .frame(width: 4, height: 4)
                    .shadow(color: color.opacity(0.6), radius: 3)
                    .offset(x: 0, y: lastPointY - height / 2)
                    .opacity(progress > 0.9 ? 1 : 0)
            }
            .frame(width: width, height: height)
            .onAppear {
                withAnimation(.easeOut(duration: 0.8)) {
                    progress = 1
                }
            }
        }
    }

    private var sparkPath: Path {
        Path { path in
            guard data.count >= 2 else { return }
            let vals = Array(data.suffix(6))
            let maxVal = vals.max() ?? 1
            let minVal = vals.min() ?? 0
            let range = maxVal - minVal > 0 ? maxVal - minVal : 1

            for (i, v) in vals.enumerated() {
                let x = CGFloat(i) / CGFloat(vals.count - 1) * width
                let y = height - ((v - minVal) / range) * (height - 4) - 2
                if i == 0 {
                    path.move(to: CGPoint(x: x, y: y))
                } else {
                    path.addLine(to: CGPoint(x: x, y: y))
                }
            }
        }
    }

    private var lastPointY: CGFloat {
        guard data.count >= 2 else { return height / 2 }
        let vals = Array(data.suffix(6))
        let maxVal = vals.max() ?? 1
        let minVal = vals.min() ?? 0
        let range = maxVal - minVal > 0 ? maxVal - minVal : 1
        let last = vals.last ?? 0
        return height - ((last - minVal) / range) * (height - 4) - 2
    }
}
