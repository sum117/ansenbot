import imageKit from "./imageKit";

export default function getCombinedImageUrl(firstUrl: string, secondUrl: string): string {
  return imageKit.url({
    path: "white-canvas_hc5p34kAV.png",
    transformation: [
      {
        width: 768,
        height: 512,
        aspectRatio: "1:1",
        cropMode: "pad",
        background: "transparent",
      },
      {
        overlayImage: secondUrl,
        overlayWidth: "384",
        overlayHeight: "512",
        overlayX: "0",
        overlayY: "0",
      },
      {
        overlayImage: firstUrl,
        overlayWidth: "384",
        overlayHeight: "512",
        overlayX: "384",
        overlayY: "0",
      },
    ],
  });
}
