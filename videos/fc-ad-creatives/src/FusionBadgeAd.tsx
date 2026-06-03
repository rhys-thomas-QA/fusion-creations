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

export type FusionBadgeAdProps = {
  format: Format;
};

type SceneProps = {
  children: ReactNode;
  duration: number;
};

const colours = {
  ink: "#10202b",
  slate: "#42515d",
  muted: "#6d7780",
  cloud: "#f4f7f8",
  paper: "#ffffff",
  teal: "#00a6a6",
  orange: "#f97316",
  gold: "#f6b73c",
};

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const easing = Easing.bezier(0.16, 1, 0.3, 1);

const fade = (frame: number, start: number, end: number) =>
  interpolate(frame, [start, end], [0, 1], {
    ...clamp,
    easing,
  });

const sceneOpacity = (frame: number, duration: number) => {
  const inOpacity = fade(frame, 0, 18);
  const outOpacity = interpolate(frame, [duration - 18, duration], [1, 0], {
    ...clamp,
    easing,
  });

  return Math.min(inOpacity, outOpacity);
};

const titleSize = (format: Format) => {
  if (format === "landscape") {
    return 86;
  }

  if (format === "square") {
    return 74;
  }

  return 96;
};

const bodySize = (format: Format) => {
  if (format === "landscape") {
    return 38;
  }

  if (format === "square") {
    return 34;
  }

  return 42;
};

const padding = (format: Format) => {
  if (format === "landscape") {
    return 96;
  }

  if (format === "square") {
    return 72;
  }

  return 82;
};

const Shell: React.FC<{ children: ReactNode; format: Format }> = ({
  children,
  format,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const isLandscape = format === "landscape";
  const softShift = interpolate(frame, [0, 450], [0, isLandscape ? 70 : 110], {
    ...clamp,
    easing: Easing.inOut(Easing.ease),
  });

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
          width: isLandscape ? width * 0.54 : width * 0.9,
          height: isLandscape ? height * 0.88 : height * 0.5,
          right: isLandscape ? -width * 0.12 : -width * 0.2,
          top: isLandscape ? -height * 0.08 : height * 0.08,
          borderRadius: width,
          background:
            "linear-gradient(135deg, rgba(0, 166, 166, 0.25), rgba(249, 115, 22, 0.24))",
          transform: `translate3d(${softShift}px, ${softShift * 0.35}px, 0)`,
          filter: "blur(5px)",
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

const Scene: React.FC<SceneProps> = ({ children, duration }) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        opacity: sceneOpacity(frame, duration),
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const Kicker: React.FC<{ children: ReactNode }> = ({ children }) => (
  <div
    style={{
      alignSelf: "flex-start",
      borderRadius: 999,
      padding: "12px 20px",
      background: "rgba(255, 255, 255, 0.84)",
      color: colours.slate,
      fontSize: 25,
      fontWeight: 700,
      letterSpacing: 0,
      textTransform: "uppercase",
    }}
  >
    {children}
  </div>
);

const ProductImage: React.FC<{
  src: string;
  alt: string;
  style?: CSSProperties;
  objectPosition?: CSSProperties["objectPosition"];
  objectFit?: CSSProperties["objectFit"];
}> = ({
  src,
  alt,
  style,
  objectPosition = "center",
  objectFit = "cover",
}) => (
  <Img
    src={staticFile(src)}
    alt={alt}
    style={{
      width: "100%",
      height: "100%",
      objectFit,
      objectPosition,
      display: "block",
      ...style,
    }}
  />
);

const CutoutFrame: React.FC<{
  src: string;
  alt: string;
  style?: CSSProperties;
  objectPosition?: CSSProperties["objectPosition"];
  objectFit?: CSSProperties["objectFit"];
}> = ({ src, alt, style, objectPosition, objectFit = "contain" }) => (
  <div
    style={{
      ...style,
    }}
  >
    <ProductImage
      src={src}
      alt={alt}
      objectPosition={objectPosition}
      objectFit={objectFit}
      style={{
        filter: "drop-shadow(0 30px 45px rgba(16, 32, 43, 0.24))",
      }}
    />
  </div>
);

const OpeningScene: React.FC<{ format: Format; duration: number }> = ({
  format,
  duration,
}) => {
  const frame = useCurrentFrame();
  const p = padding(format);
  const isLandscape = format === "landscape";
  const slide = interpolate(frame, [0, 34], [42, 0], {
    ...clamp,
    easing,
  });
  const imageScale = interpolate(frame, [0, duration], [1.06, 1.0], {
    ...clamp,
    easing: Easing.inOut(Easing.ease),
  });

  return (
    <Scene duration={duration}>
      <div
        style={{
          position: "absolute",
          inset: p,
          display: "grid",
          gridTemplateColumns: isLandscape ? "0.92fr 1.08fr" : "1fr",
          gap: isLandscape ? 80 : 44,
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: isLandscape ? 28 : 34,
            transform: `translateY(${slide}px)`,
          }}
        >
          <Kicker>Fusion Creations</Kicker>
          <h1
            style={{
              margin: 0,
              fontSize: titleSize(format),
              lineHeight: 0.94,
              letterSpacing: 0,
              maxWidth: isLandscape ? 760 : 900,
            }}
          >
            Custom badge holders for UK events
          </h1>
          <p
            style={{
              margin: 0,
              color: colours.slate,
              fontSize: bodySize(format),
              lineHeight: 1.22,
              maxWidth: isLandscape ? 660 : 840,
            }}
          >
            3D printed holders with your logo, colours and attendee names.
          </p>
        </div>
        <CutoutFrame
          src="assets/product-lineup.png"
          alt="A row of custom printed badge holders"
          style={{
            height: isLandscape ? 560 : 620,
            transform: `scale(${imageScale}) rotate(${isLandscape ? -2 : 0}deg)`,
          }}
          objectPosition="center"
        />
      </div>
    </Scene>
  );
};

const ProofScene: React.FC<{ format: Format; duration: number }> = ({
  format,
  duration,
}) => {
  const frame = useCurrentFrame();
  const p = padding(format);
  const isLandscape = format === "landscape";
  const lift = interpolate(frame, [0, 28], [38, 0], {
    ...clamp,
    easing,
  });

  return (
    <Scene duration={duration}>
      <div
        style={{
          position: "absolute",
          inset: p,
          display: "grid",
          gridTemplateColumns: isLandscape ? "1fr 0.9fr" : "1fr",
          gap: isLandscape ? 74 : 48,
          alignItems: "center",
        }}
      >
        <CutoutFrame
          src="assets/clearscore-holder.png"
          alt="ClearScore badge holder with personalised name"
          style={{
            height: isLandscape ? 800 : 900,
            transform: `translateY(${lift}px) rotate(${isLandscape ? -3 : -1}deg)`,
          }}
          objectPosition="center"
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 30,
          }}
        >
          <Kicker>Proof from a real event</Kicker>
          <h2
            style={{
              margin: 0,
              fontSize: titleSize(format) * 0.88,
              lineHeight: 0.98,
              letterSpacing: 0,
            }}
          >
            820 personalised holders delivered for ClearScore
          </h2>
          <p
            style={{
              margin: 0,
              color: colours.slate,
              fontSize: bodySize(format),
              lineHeight: 1.24,
            }}
          >
            Names, roles and brand colours prepared for a large team event.
          </p>
        </div>
      </div>
    </Scene>
  );
};

const DetailsScene: React.FC<{ format: Format; duration: number }> = ({
  format,
  duration,
}) => {
  const p = padding(format);
  const isLandscape = format === "landscape";
  const items = [
    "Logo in a second colour",
    "Names and roles",
    "Small batches welcome",
    "Bulk runs handled",
  ];

  return (
    <Scene duration={duration}>
      <div
        style={{
          position: "absolute",
          inset: p,
          display: "grid",
          gridTemplateColumns: isLandscape ? "0.95fr 1.05fr" : "1fr",
          gap: isLandscape ? 82 : 52,
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
          <Kicker>Made to match the brief</Kicker>
          <h2
            style={{
              margin: 0,
              fontSize: titleSize(format) * 0.86,
              lineHeight: 0.98,
              letterSpacing: 0,
            }}
          >
            Branded holders that feel part of the event
          </h2>
          <CutoutFrame
            src="assets/logo-holder.png"
            alt="Custom badge holder with a white logo"
            style={{
              height: isLandscape ? 360 : 430,
              transform: `rotate(${isLandscape ? -3 : -2}deg)`,
            }}
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isLandscape ? "1fr 1fr" : "1fr",
            gap: 22,
          }}
        >
          {items.map((item, index) => (
            <FeatureCard
              key={item}
              index={index}
              text={item}
              format={format}
            />
          ))}
        </div>
      </div>
    </Scene>
  );
};

const FeatureCard: React.FC<{
  index: number;
  text: string;
  format: Format;
}> = ({ index, text, format }) => {
  const frame = useCurrentFrame();
  const reveal = fade(frame, 8 + index * 7, 24 + index * 7);
  const y = interpolate(reveal, [0, 1], [24, 0], clamp);

  return (
    <div
      style={{
        minHeight: format === "vertical" ? 132 : 116,
        borderRadius: 26,
        padding: "30px 34px",
        background: colours.paper,
        boxShadow: "0 18px 55px rgba(16, 32, 43, 0.12)",
        display: "flex",
        alignItems: "center",
        gap: 22,
        opacity: reveal,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 999,
          background: index % 2 === 0 ? colours.teal : colours.orange,
          flex: "0 0 auto",
        }}
      />
      <div
        style={{
          fontSize: format === "landscape" ? 34 : 38,
          fontWeight: 800,
          color: colours.ink,
          lineHeight: 1.08,
        }}
      >
        {text}
      </div>
    </div>
  );
};

const PriceScene: React.FC<{ format: Format; duration: number }> = ({
  format,
  duration,
}) => {
  const p = padding(format);
  const isLandscape = format === "landscape";

  return (
    <Scene duration={duration}>
      <div
        style={{
          position: "absolute",
          inset: p,
          display: "grid",
          gridTemplateColumns: isLandscape ? "1fr 0.9fr" : "1fr",
          gap: isLandscape ? 70 : 44,
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 32,
          }}
        >
          <Kicker>Clear pricing</Kicker>
          <div
            style={{
              borderRadius: 34,
              padding: isLandscape ? "46px 52px" : "52px 50px",
              background: colours.paper,
              boxShadow: "0 26px 80px rgba(16, 32, 43, 0.16)",
            }}
          >
            <div
              style={{
                color: colours.orange,
                fontSize: format === "vertical" ? 108 : 94,
                fontWeight: 900,
                lineHeight: 0.9,
                letterSpacing: 0,
              }}
            >
              From £5.50
            </div>
            <div
              style={{
                marginTop: 22,
                color: colours.slate,
                fontSize: bodySize(format),
                lineHeight: 1.2,
              }}
            >
              Logo-only holders. Personalised names from £6 per unit.
            </div>
          </div>
          <p
            style={{
              margin: 0,
              color: colours.slate,
              fontSize: bodySize(format) * 0.9,
              lineHeight: 1.24,
            }}
          >
            Send your logo, colours, quantity and deadline. I'll come back with
            next steps.
          </p>
        </div>
        <CutoutFrame
          src="assets/product-lineup.png"
          alt="A row of custom printed badge holders"
          style={{
            height: isLandscape ? 520 : 460,
          }}
          objectPosition="center"
          objectFit="contain"
        />
      </div>
    </Scene>
  );
};

const CtaScene: React.FC<{ format: Format; duration: number }> = ({
  format,
  duration,
}) => {
  const p = padding(format);
  const isLandscape = format === "landscape";
  const frame = useCurrentFrame();
  const imageRotation = interpolate(frame, [0, duration], [-2, 2], {
    ...clamp,
    easing: Easing.inOut(Easing.ease),
  });

  return (
    <Scene duration={duration}>
      <div
        style={{
          position: "absolute",
          inset: p,
          display: "grid",
          gridTemplateColumns: isLandscape ? "0.9fr 1.1fr" : "1fr",
          gap: isLandscape ? 82 : 50,
          alignItems: "center",
        }}
      >
        <CutoutFrame
          src="assets/jane-doe-holder.png"
          alt="Close up of a printed badge holder"
          style={{
            height: isLandscape ? 720 : 760,
            transform: `rotate(${imageRotation}deg)`,
          }}
          objectPosition="center"
          objectFit="contain"
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 34,
          }}
        >
          <Kicker>Samples available</Kicker>
          <h2
            style={{
              margin: 0,
              fontSize: titleSize(format) * 0.9,
              lineHeight: 0.98,
              letterSpacing: 0,
            }}
          >
            Want one made for your next event?
          </h2>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              alignSelf: "flex-start",
              borderRadius: 999,
              padding: "24px 34px",
              background: colours.ink,
              color: colours.paper,
              fontSize: bodySize(format) * 0.86,
              fontWeight: 900,
              letterSpacing: 0,
            }}
          >
            fusion-creations.com
          </div>
        </div>
      </div>
    </Scene>
  );
};

export const FusionBadgeAd: React.FC<FusionBadgeAdProps> = ({ format }) => {
  const { fps } = useVideoConfig();

  return (
    <Shell format={format}>
      <Sequence durationInFrames={3 * fps}>
        <OpeningScene format={format} duration={3 * fps} />
      </Sequence>
      <Sequence from={3 * fps} durationInFrames={3 * fps}>
        <ProofScene format={format} duration={3 * fps} />
      </Sequence>
      <Sequence from={6 * fps} durationInFrames={3 * fps}>
        <DetailsScene format={format} duration={3 * fps} />
      </Sequence>
      <Sequence from={9 * fps} durationInFrames={3 * fps}>
        <PriceScene format={format} duration={3 * fps} />
      </Sequence>
      <Sequence from={12 * fps} durationInFrames={3 * fps}>
        <CtaScene format={format} duration={3 * fps} />
      </Sequence>
    </Shell>
  );
};
