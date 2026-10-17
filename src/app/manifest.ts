import type { MetadataRoute } from "next";

// Added to a home screen, BACulator opens full-screen like an app, straight onto the night screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BACulator",
    short_name: "BACulator",
    description: "Add drinks in one tap and see an estimate of your blood alcohol.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#121110",
    theme_color: "#121110",
    icons: [{ src: "/BACULATROR.png", sizes: "any", type: "image/png" }],
  };
}
