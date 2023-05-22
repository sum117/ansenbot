import axios from "axios";
import console from "console";
import { AttachmentBuilder } from "discord.js";
import type { ArgsOf } from "discordx";
import { Discord, On } from "discordx";
import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ytdl from "ytdl-core";

import { SPINNER_EMOJI } from "../../data/constants";
import deleteDiscordMessage from "../../utils/deleteDiscordMessage";
import handleError from "../../utils/handleError";
import Queue from "../../utils/Queue";
import resizeImage from "../../utils/resizeImage";

@Discord()
export class MergeImageVideo {
  private queue = new Queue();
  @On({ event: "messageCreate" })
  main([message]: ArgsOf<"messageCreate">): void {
    this.queue.enqueue(async () => {
      try {
        if (message.author.bot) {
          return;
        }
        const now = Date.now();

        const ffmpegPathResolved = ffmpegPath;
        const link = message.content;
        if (!ytdl.validateURL(link) || !ffmpegPathResolved) {
          return;
        }
        const loading = await message.channel.send(`${SPINNER_EMOJI} Gerando vídeo...`);
        const info = await ytdl.getInfo(link);

        const imageLink = message.attachments.first()?.url;
        const imageSuffix = imageLink?.split("/").pop();
        if (!imageSuffix || !imageLink) {
          return;
        }

        const outputName = "output" + now + ".mp4";
        const cacheFolderPath = ensureCacheFolder();
        const outputPath = path.join(cacheFolderPath, outputName);
        const imagePath = path.join(cacheFolderPath, now + imageSuffix);
        const audioPath = fs.createWriteStream(path.join(cacheFolderPath, "audio" + now + ".mp3"));
        const streamPath = audioPath.path;
        if (typeof streamPath !== "string") {
          return;
        }

        await axios.get(imageLink, { responseType: "arraybuffer" }).then((res) => {
          resizeImage(res.data).then((buffer) => {
            fs.writeFileSync(imagePath, buffer);
          });
        });

        ytdl(link, { quality: "highestaudio" })
          .pipe(audioPath)
          .on("finish", () => {
            ffmpeg()
              .setFfmpegPath(ffmpegPathResolved)
              .input(imagePath)
              .loop(info.videoDetails.lengthSeconds)
              .input(streamPath)
              .audioCodec("aac")
              .audioBitrate("192k")
              .videoCodec("libx264")
              .videoFilters(["scale='iw-mod(iw,2)':'ih-mod(ih,2)',format=yuv420p"])
              .outputOptions("-tune stillimage")
              .outputOptions("-shortest")
              .outputOptions("-movflags +faststart")
              .on("end", () => {
                try {
                  audioPath.close();
                  fs.unlinkSync(streamPath);
                  const attachment = new AttachmentBuilder(outputPath).setName(outputName);
                  message
                    .reply({
                      files: [attachment],
                    })
                    .then(() => {
                      try {
                        deleteDiscordMessage(loading, 0).catch(console.error);
                        fs.unlinkSync(imagePath);
                        fs.unlinkSync(outputPath);
                      } catch (error) {
                        handleError(message, error);
                      }
                    });
                } catch (error) {
                  handleError(message, error);
                }
              })
              .on("error", (err) => {
                try {
                  console.log(err);
                  audioPath.close();
                  fs.unlinkSync(streamPath);
                  fs.unlinkSync(imagePath);
                  fs.unlinkSync(outputPath);
                } catch (error) {
                  handleError(message, error);
                }
              })
              .saveToFile(outputPath);
          });
      } catch (error) {
        handleError(message, error);
      }
    });
  }
}

function ensureCacheFolder(): string {
  const cachePath = path.join(fileURLToPath(import.meta.url), "..", "..", "..", "..", "cache");
  if (!fs.existsSync(cachePath)) {
    fs.mkdirSync(cachePath);
  }
  return cachePath;
}
