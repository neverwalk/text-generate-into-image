import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import fs from "fs";
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";

// Determine font path based on environment
const fontPath = app.isPackaged
  ? path.join(app.getAppPath(), "assets", "fonts") // Production mode (after packaging)
  : path.join(__dirname, "assets", "fonts"); // Development mode

// List of fonts to register
const fonts = [
  { name: "Lobster", file: "Lobster.ttf" },
  { name: "Lora Regular", file: "Lora.ttf" },
  { name: "Lora Bold", file: "Lora-Bold.ttf" },
  { name: "Lora Italic", file: "Lora-Italic.ttf" },
  { name: "Lora Bold Italic", file: "Lora-BoldItalic.ttf" },
  { name: "Merriweather Regular", file: "Merriweather.ttf" },
  { name: "Merriweather Bold", file: "Merriweather-Bold.ttf" },
  { name: "Merriweather Italic", file: "Merriweather-Italic.ttf" },
  { name: "Merriweather Bold Italic", file: "Merriweather-BoldItalic.ttf" },
  { name: "Montserrat Regular", file: "Montserrat.ttf" },
  { name: "Montserrat Bold", file: "Montserrat-Bold.ttf" },
  { name: "Montserrat Italic", file: "Montserrat-Italic.ttf" },
  { name: "Montserrat Bold Italic", file: "Montserrat-BoldItalic.ttf" },
  { name: "Noto Sans Regular", file: "NotoSans.ttf" },
  { name: "Noto Sans Bold", file: "NotoSans-Bold.ttf" },
  { name: "Noto Sans Italic", file: "NotoSans-Italic.ttf" },
  { name: "Noto Sans Bold Italic", file: "NotoSans-BoldItalic.ttf" },
  { name: "Poppins Regular", file: "Poppins.ttf" },
  { name: "Poppins Bold", file: "Poppins-Bold.ttf" },
  { name: "Poppins Italic", file: "Poppins-Italic.ttf" },
  { name: "Poppins Bold Italic", file: "Poppins-BoldItalic.ttf" },
  { name: "Roboto Regular", file: "Roboto.ttf" },
  { name: "Roboto Bold", file: "Roboto-Bold.ttf" },
  { name: "Roboto Italic", file: "Roboto-Italic.ttf" },
  { name: "Roboto Bold Italic", file: "Roboto-BoldItalic.ttf" },
];

// Register fonts using @napi-rs/canvas GlobalFonts
fonts.forEach(({ name, file }) => {
  const fontFilePath = path.join(fontPath, file);
  if (fs.existsSync(fontFilePath)) {
    const success = GlobalFonts.registerFromPath(fontFilePath, name);
    if (success) {
      console.log(`✅ Registered font: ${name}`);
    } else {
      console.warn(`⚠️ Failed to register font: ${name}`);
    }
  } else {
    console.warn(`⚠️ Font file not found: ${fontFilePath}`);
  }
});

// Log available fonts
console.log("📌 Available Fonts:", GlobalFonts.families);

let mainWindow: BrowserWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 900,
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
    event,
    {
      imagePath,
      textList,
      fontFamily,
      fontSize,
      textColor,
      shadowColor,
      enableShadow,
      enableStroke,
      isBold,
      isItalic,
      isUnderline,
      padding,
      textAlign,
      textPosition,
    }
  ) => {
    if (!imagePath || textList.length === 0) {
      event.reply("generate-images-result", { success: false, message: "Missing input" });
      return;
    }

    const outputDir = path.join(app.getAppPath(), "dist/output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
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

        // Thiết lập căn chỉnh văn bản
        ctx.textAlign = textAlign as CanvasTextAlign;

        // Determine font style
        let fontStyle = "";
        if (isBold && isItalic) fontStyle = "bold italic";
        else if (isBold) fontStyle = "bold";
        else if (isItalic) fontStyle = "italic";

        // Set font correctly
        const fullFontName = `${fontStyle} ${fontSize}px '${fontFamily}'`;
        console.log("Applying font:", fullFontName);
        ctx.font = fullFontName;

        // Xử lý xuống dòng tự động
        const maxTextWidth = width - 2 * padding;
        const words = textList[i].split(" ");
        let lines: string[] = [];
        let currentLine = "";

        words.forEach((word: any) => {
          let testLine = currentLine ? `${currentLine} ${word}` : word;
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

        // Xác định vị trí văn bản
        let textY = textPosition === "top" ? padding : textPosition === "center" ? (height - totalTextHeight) / 2 : height - totalTextHeight - padding;
        let textX = textAlign === "left" ? padding : textAlign === "right" ? width - padding : width / 2;

        lines.forEach((line) => {
          // Vẽ outline chữ đen để dễ đọc
          if (enableStroke) {
            ctx.lineWidth = 3;
            ctx.strokeStyle = "black";
            ctx.strokeText(line, textX, textY);
          }

          // Nếu enableShadow được bật, thêm bóng đổ
          if (enableShadow) {
            ctx.shadowColor = shadowColor;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
            ctx.shadowBlur = 5;
          } else {
            ctx.shadowColor = "transparent";
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = 0;
          }

          // Vẽ chữ
          ctx.fillStyle = textColor;
          ctx.fillText(line, textX, textY);

          // Kẻ underline nếu được bật
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
  }
);
