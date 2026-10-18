import { Composition } from "remotion";

import { AddFlow, AddFlowLoop } from "./AddFlow";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="AddFlow" component={AddFlow} durationInFrames={285} fps={30} width={1080} height={1920} />
      <Composition id="AddFlowLoop" component={AddFlowLoop} durationInFrames={300} fps={30} width={1600} height={1000} />
    </>
  );
};
