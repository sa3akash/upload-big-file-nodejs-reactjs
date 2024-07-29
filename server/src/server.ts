import express, { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import cors from "cors";

const app = express();
const UPLOAD_DIR = "./uploads"; // Define your upload directory

app.use(cors({ origin: "http://localhost:5173" }));

// Middleware to check if the request size exceeds the limit
app.use((req: Request, res: Response, next: NextFunction) => {
  if (
    req.headers["content-length"] &&
    parseInt(req.headers["content-length"], 10) > 10 * 1024 * 1024
  ) {
    return res.status(413).json({ message: "Payload too large" });
  }
  next();
});

app.use(express.raw({ limit: "10mb", type: "application/octet-stream" }));
app.use('/uploads', express.static('uploads'));



app.post("/upload", (req: Request, res: Response) => {
  const { name, currentChunkIndex, totalChunks } = req.query as {
    name: string;
    currentChunkIndex: string;
    totalChunks: string;
  };

  if (!name || !currentChunkIndex || !totalChunks) {
    return res
      .status(400)
      .json({ message: "Missing required query parameters" });
  }

  const firstChunk = parseInt(currentChunkIndex) === 0;
  const lastChunk = parseInt(currentChunkIndex) === parseInt(totalChunks) - 1;
  const ext = name.split(".").pop();

  const tmpFilename =
    "tmp_" +
    crypto
      .createHash("md5")
      .update(name + req.ip)
      .digest("hex") +
    "." +
    ext;
  const filePath = path.join(UPLOAD_DIR, tmpFilename);

  const data = req.body.toString().split(",")[1];
  const buffer = Buffer.from(data, "base64");

  // Use stream to write chunks to the file
  const writeStream = fs.createWriteStream(filePath, { flags: "a" });
  writeStream.write(buffer);
  writeStream.end();

  writeStream.on("finish", () => {
    if (lastChunk) {
      const finalFilename =
        crypto
          .createHash("md5")
          .update(Date.now().toString())
          .digest("hex")
          .substring(0, 6) +
        "." +
        ext;
      const finalFilePath = path.join(UPLOAD_DIR, finalFilename);
      fs.rename(filePath, finalFilePath, (err) => {
        if (err) {
          console.log("Error renaming file:", err);
          return res.status(500).send("Server error");
        }

        console.log(finalFilePath);

        res.json({ finalFilename });
        // uploadQueue.add('upload', { filePath: finalFilePath });
      });
    } else {
      res.json("ok");
    }
  });

  writeStream.on("error", (err) => {
    console.log("Error writing file:", err);
    res.status(500).send("Server error");
  });
});

app.get("/video/:key", (req, res) => {
  const { key } = req.params;

  const filePath = path.join(UPLOAD_DIR, `${key}.mp4`);

  if (!filePath) {
    return res.status(404).send("Video not found");
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize || start > end) {
      res.status(416).send("Requested range not satisfiable");
      return;
    }

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Content-Type": "video/mp4",     
    });

    const stream = fs.createReadStream(filePath, { start, end });
    stream.pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    });

    fs.createReadStream(filePath).pipe(res);
  }
});

// app.use((err: any, req: Request, res: Response, next: NextFunction) => {
//   res.status(500).json({ message: "error" });
// });

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
