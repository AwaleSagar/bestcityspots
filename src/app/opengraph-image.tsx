import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Best City Spots - Urban Intelligence";
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = "image/png";

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    height: "100%",
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#000",
                    backgroundImage: "radial-gradient(circle at 25% 25%, #1e1b4b 0%, #000 50%)",
                    fontFamily: "sans-serif",
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                {/* Background Orbs */}
                <div
                    style={{
                        position: "absolute",
                        top: "-100px",
                        left: "-100px",
                        width: "600px",
                        height: "600px",
                        borderRadius: "50%",
                        backgroundColor: "rgba(37, 99, 235, 0.2)", // blue-600
                        filter: "blur(80px)",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        bottom: "-100px",
                        right: "-100px",
                        width: "500px",
                        height: "500px",
                        borderRadius: "50%",
                        backgroundColor: "rgba(147, 51, 234, 0.2)", // purple-600
                        filter: "blur(80px)",
                    }}
                />

                {/* Content */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "20px",
                        zIndex: 10,
                    }}
                >
                    <div
                        style={{
                            fontSize: 24,
                            letterSpacing: "0.4em",
                            color: "#60a5fa", // blue-400
                            textTransform: "uppercase",
                            fontWeight: 900,
                        }}
                    >
                        Urban Intelligence
                    </div>

                    <div
                        style={{
                            fontSize: 80,
                            fontWeight: 900,
                            color: "white",
                            lineHeight: 1,
                            letterSpacing: "-0.05em",
                            textAlign: "center",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            textShadow: "0 0 40px rgba(255,255,255,0.2)",
                        }}
                    >
                        <span>BEST CITY</span>
                        <span>SPOTS</span>
                    </div>

                    <div
                        style={{
                            padding: "10px 30px",
                            borderRadius: "50px",
                            border: "1px solid rgba(255,255,255,0.2)",
                            backgroundColor: "rgba(255,255,255,0.05)",
                            color: "rgba(255,255,255,0.6)",
                            fontSize: 24,
                            letterSpacing: "0.1em",
                            marginTop: "20px",
                        }}
                    >
                        ATLAS // INDEX 01
                    </div>
                </div>

                {/* Technical Decor Lines */}
                <div style={{ position: "absolute", top: 40, left: 40, width: 40, height: 1, background: "rgba(255,255,255,0.2)" }} />
                <div style={{ position: "absolute", top: 40, left: 40, width: 1, height: 40, background: "rgba(255,255,255,0.2)" }} />
                <div style={{ position: "absolute", bottom: 40, right: 40, width: 40, height: 1, background: "rgba(255,255,255,0.2)" }} />
                <div style={{ position: "absolute", bottom: 40, right: 40, width: 1, height: 40, background: "rgba(255,255,255,0.2)" }} />
            </div>
        ),
        {
            ...size,
        }
    );
}
