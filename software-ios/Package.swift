// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "BixtxAgent",
    platforms: [
        .iOS(.v16),
    ],
    products: [
        .library(name: "BixtxAgent", targets: ["BixtxAgent"]),
    ],
    targets: [
        .target(
            name: "BixtxAgent",
            dependencies: [],
            path: "Sources/BixtxAgent",
            swiftSettings: [
                .unsafeFlags(["-O", "-whole-module-optimization"], .when(configuration: .release)),
            ]
        ),
    ]
)
