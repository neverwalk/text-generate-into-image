import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import fs from "fs";
import { createCanvas, loadImage } from "canvas";
import { registerFont } from "canvas";

const fontPath = path.join(__dirname, "assets/fonts");

// Register Fonts
registerFont(path.join(fontPath, "Lobster.ttf"), { family: "Lobster" });

registerFont(path.join(fontPath, "Lora.ttf"), { family: "Lora" });
registerFont(path.join(fontPath, "Lora-Bold.ttf"), { family: "Lora", weight: "bold" });
registerFont(path.join(fontPath, "Lora-Italic.ttf"), { family: "Lora", style: "italic" });
registerFont(path.join(fontPath, "Lora-BoldItalic.ttf"), { family: "Lora", weight: "bold", style: "italic" });

registerFont(path.join(fontPath, "Merriweather.ttf"), { family: "Merriweather" });
registerFont(path.join(fontPath, "Merriweather-Bold.ttf"), { family: "Merriweather", weight: "bold" });
registerFont(path.join(fontPath, "Merriweather-Italic.ttf"), { family: "Merriweather", style: "italic" });
registerFont(path.join(fontPath, "Merriweather-BoldItalic.ttf"), { family: "Merriweather", weight: "bold", style: "italic" });

registerFont(path.join(fontPath, "Montserrat.ttf"), { family: "Montserrat" });
registerFont(path.join(fontPath, "Montserrat-Bold.ttf"), { family: "Montserrat", weight: "bold" });
registerFont(path.join(fontPath, "Montserrat-Italic.ttf"), { family: "Montserrat", style: "italic" });
registerFont(path.join(fontPath, "Montserrat-BoldItalic.ttf"), { family: "Montserrat", weight: "bold", style: "italic" });

registerFont(path.join(fontPath, "NotoSans.ttf"), { family: "Noto Sans" });
registerFont(path.join(fontPath, "NotoSans-Bold.ttf"), { family: "Noto Sans", weight: "bold" });
registerFont(path.join(fontPath, "NotoSans-Italic.ttf"), { family: "Noto Sans", style: "italic" });
registerFont(path.join(fontPath, "NotoSans-BoldItalic.ttf"), { family: "Noto Sans", weight: "bold", style: "italic" });

registerFont(path.join(fontPath, "Poppins.ttf"), { family: "Poppins" });
registerFont(path.join(fontPath, "Poppins-Bold.ttf"), { family: "Poppins", weight: "bold" });
registerFont(path.join(fontPath, "Poppins-Italic.ttf"), { family: "Poppins", style: "italic" });
registerFont(path.join(fontPath, "Poppins-BoldItalic.ttf"), { family: "Poppins", weight: "bold", style: "italic" });

registerFont(path.join(fontPath, "Roboto.ttf"), { family: "Roboto" });
registerFont(path.join(fontPath, "Roboto-Bold.ttf"), { family: "Roboto", weight: "bold" });
registerFont(path.join(fontPath, "Roboto-Italic.ttf"), { family: "Roboto", style: "italic" });
registerFont(path.join(fontPath, "Roboto-BoldItalic.ttf"), { family: "Roboto", weight: "bold", style: "italic" });

let mainWindow: BrowserWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
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

ipcMain.on("generate-images", async (event, { 
  imagePath, textList, fontFamily, fontSize, textColor, shadowColor, isBold, isItalic, isUnderline, padding 
}) => {
  if (!imagePath || textList.length === 0) {
      event.reply("generate-images-result", { success: false, message: "Missing input" });
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
      const lineHeight = fontSize * 1.2;

      for (let i = 0; i < textList.length; i++) {
          const canvas = createCanvas(width, height);
          const ctx = canvas.getContext("2d");

          ctx.drawImage(image, 0, 0, width, height);
          ctx.textAlign = "center";

          // Apply custom font styles
          let fontStyle = "";
          if (isBold) fontStyle += "bold ";
          if (isItalic) fontStyle += "italic ";

          ctx.font = `${fontStyle} ${fontSize}px '${fontFamily}', sans-serif`;

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

          lines.forEach(line => {
              ctx.lineWidth = 6;
              ctx.strokeStyle = "black";
              ctx.strokeText(line, textX, textY);

              ctx.shadowColor = shadowColor;
              ctx.shadowOffsetX = 3;
              ctx.shadowOffsetY = 3;
              ctx.shadowBlur = 5;

              ctx.fillStyle = textColor;
              ctx.fillText(line, textX, textY);

              // Apply underline
              if (isUnderline) {
                  const textWidth = ctx.measureText(line).width;
                  ctx.fillRect(textX - textWidth / 2, textY + 5, textWidth, 3);
              }

              textY += lineHeight;
          });

          const outputFile = path.join(outputDir, `output_${i + 1}.png`);
          const buffer = canvas.toBuffer("image/png");
          fs.writeFileSync(outputFile, buffer);
      }

      event.reply("generate-images-result", { success: true, outputDir });
  } catch (error: any) {
      event.reply("generate-images-result", { success: false, message: error.message });
  }
});
