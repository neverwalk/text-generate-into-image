const { ipcRenderer } = require("electron");

document.getElementById("select-image")?.addEventListener("click", async () => {
  const imagePath = await ipcRenderer.invoke("select-image");
  if (imagePath) {
    (document.getElementById("image-path") as HTMLParagraphElement).innerText =
      imagePath;
  }
});

document.getElementById("generate")?.addEventListener("click", () => {
  const imagePath = (
    document.getElementById("image-path") as HTMLParagraphElement
  ).innerText;
  const textInput = (
    document.getElementById("text-input") as HTMLTextAreaElement
  ).value.trim();
  const textList = textInput.split("\n").filter((line) => line.trim() !== "");
  const fontFamily = (
    document.getElementById("font-family") as HTMLSelectElement
  ).value;
  const fontSize = parseInt(
    (document.getElementById("font-size") as HTMLInputElement).value,
    10
  );
  const textColor = (document.getElementById("text-color") as HTMLInputElement)
    .value;
  const shadowColor = (
    document.getElementById("shadow-color") as HTMLInputElement
  ).value;

  ipcRenderer.send("generate-images", {
    imagePath,
    textList,
    fontFamily,
    fontSize,
    textColor,
    shadowColor,
  });
});

ipcRenderer.on(
  "generate-images-result",
  (event: any, { success, outputDir, message }: any) => {
    if (success) {
      (
        document.getElementById("status") as HTMLParagraphElement
      ).innerText = `✅ Images saved to: ${outputDir}`;
    } else {
      (
        document.getElementById("status") as HTMLParagraphElement
      ).innerText = `❌ Error: ${message}`;
    }
  }
);
