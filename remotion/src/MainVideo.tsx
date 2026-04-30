import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { loadFont } from "@remotion/google-fonts/Inter";

import { AmbientBackground } from "./components/AmbientBackground";
import { SceneLogo } from "./scenes/SceneLogo";
import { SceneSend } from "./scenes/SceneSend";
import { SceneReceive } from "./scenes/SceneReceive";
import { SceneCapture } from "./scenes/SceneCapture";
import { SceneBrief } from "./scenes/SceneBrief";
import { SceneClosing } from "./scenes/SceneClosing";

loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] });

// Scene durations (in frames @ 30fps).
const D_LOGO = 45;
const D_SEND = 135;
const D_RECEIVE = 135;
const D_CAPTURE = 210;
const D_BRIEF = 165;
const D_CLOSING = 105;
const TRANSITION = 18;

// TransitionSeries overlaps reduce total. 5 transitions × 18 frames overlap.
export const TOTAL_FRAMES =
  D_LOGO + D_SEND + D_RECEIVE + D_CAPTURE + D_BRIEF + D_CLOSING - 5 * TRANSITION;

const fadeTiming = linearTiming({ durationInFrames: TRANSITION });

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "hsl(220, 25%, 97%)" }}>
      <AmbientBackground />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={D_LOGO}>
          <SceneLogo />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeTiming} />

        <TransitionSeries.Sequence durationInFrames={D_SEND}>
          <SceneSend />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeTiming} />

        <TransitionSeries.Sequence durationInFrames={D_RECEIVE}>
          <SceneReceive />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeTiming} />

        <TransitionSeries.Sequence durationInFrames={D_CAPTURE}>
          <SceneCapture />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeTiming} />

        <TransitionSeries.Sequence durationInFrames={D_BRIEF}>
          <SceneBrief />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeTiming} />

        <TransitionSeries.Sequence durationInFrames={D_CLOSING}>
          <SceneClosing />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
