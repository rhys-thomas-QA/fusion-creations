import "./index.css";
import { Composition } from "remotion";
import {
  ClearScoreProofAd,
  type ClearScoreProofAdProps,
} from "./ClearScoreProofAd";
import { FusionBadgeAd, type FusionBadgeAdProps } from "./FusionBadgeAd";

const fps = 30;
const durationInFrames = 15 * fps;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="FusionBadgeAdVertical"
        component={FusionBadgeAd}
        durationInFrames={durationInFrames}
        fps={fps}
        width={1080}
        height={1920}
        defaultProps={{ format: "vertical" } satisfies FusionBadgeAdProps}
      />
      <Composition
        id="FusionBadgeAdSquare"
        component={FusionBadgeAd}
        durationInFrames={durationInFrames}
        fps={fps}
        width={1080}
        height={1080}
        defaultProps={{ format: "square" } satisfies FusionBadgeAdProps}
      />
      <Composition
        id="FusionBadgeAdLandscape"
        component={FusionBadgeAd}
        durationInFrames={durationInFrames}
        fps={fps}
        width={1920}
        height={1080}
        defaultProps={{ format: "landscape" } satisfies FusionBadgeAdProps}
      />
      <Composition
        id="ClearScoreProofAdVertical"
        component={ClearScoreProofAd}
        durationInFrames={durationInFrames}
        fps={fps}
        width={1080}
        height={1920}
        defaultProps={{ format: "vertical" } satisfies ClearScoreProofAdProps}
      />
      <Composition
        id="ClearScoreProofAdSquare"
        component={ClearScoreProofAd}
        durationInFrames={durationInFrames}
        fps={fps}
        width={1080}
        height={1080}
        defaultProps={{ format: "square" } satisfies ClearScoreProofAdProps}
      />
      <Composition
        id="ClearScoreProofAdLandscape"
        component={ClearScoreProofAd}
        durationInFrames={durationInFrames}
        fps={fps}
        width={1920}
        height={1080}
        defaultProps={{ format: "landscape" } satisfies ClearScoreProofAdProps}
      />
    </>
  );
};
