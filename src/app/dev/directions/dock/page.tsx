import { DockLab } from "./DockLab";

const SWITZER = "https://api.fontshare.com/v2/css?f[]=switzer@400,500,600&display=swap";

export default function Page() {
  return (
    <>
      <link rel="stylesheet" href={SWITZER} precedence="default" />
      <DockLab />
    </>
  );
}
