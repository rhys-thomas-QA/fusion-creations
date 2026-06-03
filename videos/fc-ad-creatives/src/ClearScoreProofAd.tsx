import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type Format = "vertical" | "square" | "landscape";

export type ClearScoreProofAdProps = {
  format: Format;
};

const colours = {
  ink: "#10202b",
  slate: "#3f4d57",
  muted: "#69747c",
  paper: "#ffffff",
  cloud: "#f4f7f8",
  teal: "#00a6a6",
  orange: "#f97316",
  navy: "#132736",
} as const;

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

const fade = (frame: number, start: number, end: number) =>
  interpolate(frame, [start, end], [0, 1], {
    ...clamp,
    easing: easeOut,
  });

const sceneOpacity = (frame: number, duration: number) => {
  const inOpacity = fade(frame, 0, 16);
  const outOpacity = interpolate(frame, [duration - 16, duration], [1, 0], {
    ...clamp,
    easing: easeOut,
  });

  return Math.min(inOpacity, outOpacity);
};

const layout = (format: Format) => {
  if (format === "landscape") {
    return {
      padding: 94,
      title: 86,
      body: 37,
      eyebrow: 24,
      radius: 36,
    };
  }

  if (format === "square") {
    return {
      padding: 58,
      title: 58,
      body: 29,
      eyebrow: 22,
      radius: 30,
    };
  }

  return {
    padding: 78,
    title: 94,
    body: 40,
    eyebrow: 24,
    radius: 34,
  };
};

const Shell: React.FC<{ children: ReactNode; format: Format }> = ({
  children,
  format,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const drift = interpolate(frame, [0, 450], [0, 90], {
    ...clamp,
    easing: Easing.inOut(Easing.ease),
  });
  const isLandscape = format === "landscape";

  return (
    <AbsoluteFill
      style={{
        background: colours.cloud,
        color: colours.ink,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: isLandscape ? width * 0.42 : width * 0.92,
          height: isLandscape ? height * 0.72 : height * 0.42,
          left: isLandscape ? width * 0.52 : -width * 0.24,
          top: isLandscape ? -height * 0.08 : height * 0.2,
          borderRadius: width,
          background:
            "linear-gradient(135deg, rgba(249, 115, 22, 0.24), rgba(0, 166, 166, 0.24))",
          transform: `translate3d(${drift * 0.36}px, ${drift * 0.18}px, 0)`,
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

const Scene: React.FC<{ children: ReactNode; duration: number }> = ({
  children,
  duration,
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity(frame, duration) }}>
      {children}
    </AbsoluteFill>
  );
};

const Eyebrow: React.FC<{ children: ReactNode; format: Format }> = ({
  children,
  format,
}) => (
  <div
    style={{
      alignSelf: "flex-start",
      borderRadius: 999,
      padding: "11px 18px",
      background: "rgba(255, 255, 255, 0.88)",
      color: colours.slate,
      fontSize: layout(format).eyebrow,
      fontWeight: 800,
      letterSpacing: 0,
      textTransform: "uppercase",
    }}
  >
    {children}
  </div>
);

const Photo: React.FC<{
  src: string;
  alt: string;
  style?: CSSProperties;
  objectFit?: CSSProperties["objectFit"];
  objectPosition?: CSSProperties["objectPosition"];
}> = ({
  src,
  alt,
  style,
  objectFit = "cover",
  objectPosition = "center",
}) => (
  <Img
    src={staticFile(src)}
    alt={alt}
    style={{
      width: "100%",
      height: "100%",
      display: "block",
      objectFit,
      objectPosition,
      ...style,
    }}
  />
);

const Card: React.FC<{ children: ReactNode; format: Format; style?: CSSProperties }> = ({
  children,
  format,
  style,
}) => (
  <div
    style={{
      borderRadius: layout(format).radius,
      background: colours.paper,
      boxShadow: "0 26px 80px rgba(16, 32, 43, 0.18)",
      ...style,
    }}
  >
    {children}
  </div>
);

const OpeningScene: React.FC<{ format: Format; duration: number }> = ({
  format,
  duration,
}) => {
  const frame = useCurrentFrame();
  const l = layout(format);
  const isLandscape = format === "landscape";
  const isSquare = format === "square";
  const imageScale = interpolate(frame, [0, duration], [1.04, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.ease),
  });
  const textY = interpolate(frame, [0, 26], [42, 0], {
    ...clamp,
    easing: easeOut,
  });

  return (
    <Scene duration={duration}>
      <div
        style={{
          position: "absolute",
          inset: l.padding,
          display: "grid",
          gridTemplateColumns: isLandscape
            ? "1fr 0.9fr"
            : isSquare
              ? "1fr 0.95fr"
              : "1fr",
          gap: isLandscape ? 78 : isSquare ? 38 : 42,
          alignItems: "center",
        }}
      >
        <Card
          format={format}
          style={{
            height: isLandscape ? 790 : isSquare ? 470 : 900,
            overflow: "hidden",
            transform: `scale(${imageScale})`,
          }}
        >
          <Photo
            src="assets/clearscore-820-desk.jpg"
            alt="Hundreds of ClearScore badge holders sorted on a desk"
            objectPosition={isLandscape ? "center" : "48% 50%"}
          />
        </Card>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            transform: `translateY(${textY}px)`,
          }}
        >
          <Eyebrow format={format}>Real event proof</Eyebrow>
          <h1
            style={{
              margin: 0,
              fontSize: l.title,
              lineHeight: 0.94,
              letterSpacing: 0,
            }}
          >
            820 badge holders for one ClearScore event
          </h1>
          <p
            style={{
              margin: 0,
              color: colours.slate,
              fontSize: l.body,
              lineHeight: 1.2,
            }}
          >
            I made each holder with the event logo, colours and attendee
            details.
          </p>
        </div>
      </div>
    </Scene>
  );
};

const CloseUpScene: React.FC<{ format: Format; duration: number }> = ({
  format,
  duration,
}) => {
  const l = layout(format);
  const isLandscape = format === "landscape";

  return (
    <Scene duration={duration}>
      <div
        style={{
          position: "absolute",
          inset: l.padding,
          display: "grid",
          gridTemplateColumns: isLandscape ? "0.85fr 1.15fr" : "1fr",
          gap: isLandscape ? 74 : 42,
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
          }}
        >
          <Eyebrow format={format}>Personalised finish</Eyebrow>
          <h2
            style={{
              margin: 0,
              fontSize: l.title * 0.86,
              lineHeight: 0.98,
              letterSpacing: 0,
            }}
          >
            Names, roles, logo and brand colours
          </h2>
          <p
            style={{
              margin: 0,
              color: colours.slate,
              fontSize: l.body,
              lineHeight: 1.22,
            }}
          >
            Each holder arrives ready to hand out. No labels, stickers or
            last-minute sorting.
          </p>
        </div>
        <Card
          format={format}
          style={{
            height: isLandscape ? 780 : format === "square" ? 460 : 820,
            overflow: "hidden",
          }}
        >
          <Photo
            src="assets/clearscore-holder.png"
            alt="Close up of a personalised ClearScore badge holder"
            objectFit="contain"
          />
        </Card>
      </div>
    </Scene>
  );
};

const ProcessScene: React.FC<{ format: Format; duration: number }> = ({
  format,
  duration,
}) => {
  const frame = useCurrentFrame();
  const l = layout(format);
  const isLandscape = format === "landscape";
  const stats = [
    ["820", "holders printed"],
    ["2 colours", "body and details"],
    ["Sorted", "before delivery"],
  ];

  return (
    <Scene duration={duration}>
      <div
        style={{
          position: "absolute",
          inset: l.padding,
          display: "grid",
          gridTemplateColumns: isLandscape ? "1.1fr 0.9fr" : "1fr",
          gap: isLandscape ? 72 : 34,
          alignItems: "center",
        }}
      >
        <Card
          format={format}
          style={{
            padding: isLandscape ? 46 : 42,
            display: "grid",
            gap: 22,
          }}
        >
          {stats.map(([big, small], index) => {
            const opacity = fade(frame, 6 + index * 8, 22 + index * 8);
            const y = interpolate(opacity, [0, 1], [20, 0], clamp);

            return (
              <div
                key={big}
                style={{
                  display: "grid",
                  gridTemplateColumns: "0.35fr 0.65fr",
                  gap: 22,
                  alignItems: "center",
                  opacity,
                  transform: `translateY(${y}px)`,
                }}
              >
                <div
                  style={{
                    color: index === 1 ? colours.teal : colours.orange,
                    fontSize: isLandscape ? 68 : 72,
                    fontWeight: 900,
                    lineHeight: 0.94,
                  }}
                >
                  {big}
                </div>
                <div
                  style={{
                    color: colours.slate,
                    fontSize: l.body * 0.9,
                    fontWeight: 800,
                    lineHeight: 1.1,
                  }}
                >
                  {small}
                </div>
              </div>
            );
          })}
        </Card>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
          }}
        >
          <Eyebrow format={format}>Less sorting on the day</Eyebrow>
          <h2
            style={{
              margin: 0,
              fontSize: l.title * 0.84,
              lineHeight: 0.98,
              letterSpacing: 0,
            }}
          >
            Packed so the team can hand them out quickly
          </h2>
        </div>
      </div>
    </Scene>
  );
};

const OfferScene: React.FC<{ format: Format; duration: number }> = ({
  format,
  duration,
}) => {
  const l = layout(format);
  const isLandscape = format === "landscape";

  return (
    <Scene duration={duration}>
      <div
        style={{
          position: "absolute",
          inset: l.padding,
          display: "grid",
          gridTemplateColumns: isLandscape ? "0.9fr 1.1fr" : "1fr",
          gap: isLandscape ? 70 : 42,
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 30,
          }}
        >
          <Eyebrow format={format}>For event teams</Eyebrow>
          <h2
            style={{
              margin: 0,
              fontSize: l.title * 0.88,
              lineHeight: 0.98,
              letterSpacing: 0,
            }}
          >
            Small batches, bulk runs and staff onboarding
          </h2>
        </div>
        <Card
          format={format}
          style={{
            padding: isLandscape ? "54px 58px" : "50px 48px",
          }}
        >
          <div
            style={{
              color: colours.orange,
              fontSize: isLandscape ? 82 : 94,
              fontWeight: 900,
              lineHeight: 0.92,
            }}
          >
            From £5.50
          </div>
          <p
            style={{
              margin: "22px 0 0",
              color: colours.slate,
              fontSize: l.body,
              lineHeight: 1.2,
            }}
          >
            Personalised names from £6 per unit.
          </p>
        </Card>
      </div>
    </Scene>
  );
};

const CtaScene: React.FC<{ format: Format; duration: number }> = ({
  format,
  duration,
}) => {
  const frame = useCurrentFrame();
  const l = layout(format);
  const isLandscape = format === "landscape";
  const imageScale = interpolate(frame, [0, duration], [1, 1.035], {
    ...clamp,
    easing: Easing.inOut(Easing.ease),
  });

  return (
    <Scene duration={duration}>
      <div
        style={{
          position: "absolute",
          inset: l.padding,
          display: "grid",
          gridTemplateColumns: isLandscape ? "1fr 0.9fr" : "1fr",
          gap: isLandscape ? 74 : 42,
          alignItems: "center",
        }}
      >
        <Card
          format={format}
          style={{
            height: isLandscape ? 760 : format === "square" ? 480 : 700,
            overflow: "hidden",
            transform: `scale(${imageScale})`,
          }}
        >
          <Photo
            src="assets/clearscore-820-desk.jpg"
            alt="ClearScore badge holders laid out by team"
            objectPosition={isLandscape ? "center" : "52% 52%"}
          />
        </Card>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 30,
          }}
        >
          <Eyebrow format={format}>Planning a badge run?</Eyebrow>
          <h2
            style={{
              margin: 0,
              fontSize: l.title * 0.9,
              lineHeight: 0.98,
              letterSpacing: 0,
            }}
          >
            Send your logo, quantity and deadline
          </h2>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              alignSelf: "flex-start",
              borderRadius: 999,
              padding: "24px 34px",
              background: colours.navy,
              color: colours.paper,
              fontSize: l.body * 0.86,
              fontWeight: 900,
            }}
          >
            fusion-creations.com
          </div>
        </div>
      </div>
    </Scene>
  );
};

export const ClearScoreProofAd: React.FC<ClearScoreProofAdProps> = ({
  format,
}) => {
  const { fps } = useVideoConfig();

  return (
    <Shell format={format}>
      <Sequence durationInFrames={3 * fps}>
        <OpeningScene format={format} duration={3 * fps} />
      </Sequence>
      <Sequence from={3 * fps} durationInFrames={3 * fps}>
        <CloseUpScene format={format} duration={3 * fps} />
      </Sequence>
      <Sequence from={6 * fps} durationInFrames={3 * fps}>
        <ProcessScene format={format} duration={3 * fps} />
      </Sequence>
      <Sequence from={9 * fps} durationInFrames={3 * fps}>
        <OfferScene format={format} duration={3 * fps} />
      </Sequence>
      <Sequence from={12 * fps} durationInFrames={3 * fps}>
        <CtaScene format={format} duration={3 * fps} />
      </Sequence>
    </Shell>
  );
};
