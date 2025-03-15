import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import fs from "fs";
import { createCanvas, loadImage } from "canvas";

let mainWindow: BrowserWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile("index.html");
});

ipcMain.handle("select-image", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["jpg", "png", "jpeg"] }],
  });

  return result.canceled ? null : result.filePaths[0];
});

ipcMain.on(
  "generate-images",
  async (
    event: any,
    { imagePath, textList, fontFamily, fontSize, textColor, shadowColor }: any
  ) => {
    if (!imagePath || textList.length === 0) {
      event.reply("generate-images-result", {
        success: false,
        message: "Missing input",
      });
      return;
    }

    const outputDir = path.join(__dirname, "output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    try {
      const image = await loadImage(imagePath);
      const width = image.width;
      const height = image.height;
      const padding = 50;
      const lineHeight = fontSize * 1.2;

      for (let i = 0; i < textList.length; i++) {
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");

        ctx.drawImage(image, 0, 0, width, height);
        ctx.textAlign = "center";
        ctx.font = `${fontSize}px ${fontFamily}`;

        const maxTextWidth = width - 2 * padding;
        const words = textList[i].split(" ");
        let lines: string[] = [];
        let currentLine = "";

        words.forEach((word: any) => {
          let testLine = currentLine + (currentLine ? " " : "") + word;
          let testWidth = ctx.measureText(testLine).width;
          if (testWidth > maxTextWidth) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        });

        lines.push(currentLine);
        const totalTextHeight = lines.length * lineHeight;
        let textY = (height - totalTextHeight) / 2;
        const textX = width / 2;

        lines.forEach((line) => {
          ctx.lineWidth = 6;
          ctx.strokeStyle = "black";
          ctx.strokeText(line, textX, textY);

          ctx.shadowColor = shadowColor;
          ctx.shadowOffsetX = 3;
          ctx.shadowOffsetY = 3;
          ctx.shadowBlur = 5;

          ctx.fillStyle = textColor;
          ctx.fillText(line, textX, textY);

          textY += lineHeight;
        });

        const outputFile = path.join(outputDir, `output_${i + 1}.png`);
        const buffer = canvas.toBuffer("image/png");
        fs.writeFileSync(outputFile, buffer);
      }

      event.reply("generate-images-result", { success: true, outputDir });
    } catch (error: any) {
      event.reply("generate-images-result", {
        success: false,
        message: error.message,
      });
    }
  }
);
