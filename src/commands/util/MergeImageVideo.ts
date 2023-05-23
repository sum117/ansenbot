import axios from "axios";
import { AttachmentBuilder } from "discord.js";
import type { ArgsOf } from "discordx";
import { Discord, On } from "discordx";
import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { videoInfo } from "ytdl-core";
import ytdl from "ytdl-core";

import { SPINNER_EMOJI } from "../../data/constants";
import deleteDiscordMessage from "../../utils/deleteDiscordMessage";
import handleError from "../../utils/handleError";
import Queue from "../../utils/Queue";
import resizeImage from "../../utils/resizeImage";

interface GetPathsResult {
  outputName: string;
  cacheFolderPath: string;
  outputPath: string;
  imagePath: string;
  audioFileStream: fs.WriteStream;
  audioPath: string | Buffer;
}

@Discord()
export class MergeImageVideo {
  private queue = new Queue();

  @On({ event: "messageCreate" })
  public main([message]: ArgsOf<"messageCreate">): void {
    this.queue.enqueue(async () => {
      try {
        if (message.author.bot) {
          return;
        }

        if (!ffmpegPath) {
          return;
        }

        const audioLink = message.content;
        if (!ytdl.validateURL(audioLink)) {
          return;
        }

        const imageAttachment = message.attachments.first();
        if (!imageAttachment) {
          return;
        }

        const imageLink = imageAttachment.url;
        const imageSuffix = imageLink?.split("/").pop();
        if (!imageSuffix) {
          return;
        }

        const paths = this.getPaths(imageSuffix);
        if (typeof paths.audioPath !== "string") {
          return;
        }

        const loading = await message.channel.send(`${SPINNER_EMOJI} Gerando vídeo...`);
        const info = await ytdl.getInfo(audioLink);

        await this.downloadDiscordImage(imageLink, paths.imagePath);
        await this.downloadYoutubeAudio(audioLink, paths.audioFileStream);
        await this.mergeYoutubeAudioAndImage(paths.imagePath, info, paths.audioPath);

        await deleteDiscordMessage(loading, 0);

        const attachment = new AttachmentBuilder(paths.outputPath).setName(paths.outputName);

        await message.reply({ files: [attachment] });

        paths.audioFileStream.close();
        fs.unlinkSync(paths.audioPath);
        fs.unlinkSync(paths.imagePath);
        fs.unlinkSync(paths.outputPath);
      } catch (error) {
        handleError(message, error);
      }
    });
  }

  private getPaths(imageSuffix: string): GetPathsResult {
    const now = Date.now();
    const outputName = "output" + now + ".mp4";
    const cacheFolderPath = ensureCacheFolder();
    const outputPath = path.join(cacheFolderPath, outputName);
    const imagePath = path.join(cacheFolderPath, now + imageSuffix);
    const audioFileStream = fs.createWriteStream(
      path.join(cacheFolderPath, "audio" + now + ".mp3")
    );
    const audioPath = audioFileStream.path;
    return { outputName, cacheFolderPath, outputPath, imagePath, audioFileStream, audioPath };
  }

  private downloadDiscordImage(link: string, imagePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      axios
        .get(link, { responseType: "arraybuffer" })
        .then((res) => {
          resizeImage(res.data)
            .then((buffer) => fs.writeFile(imagePath, buffer, {}, () => resolve()))
            .catch(reject);
        })
        .catch(reject);
    });
  }

  private downloadYoutubeAudio(audioLink: string, audioFileStream: fs.WriteStream): Promise<void> {
    return new Promise((resolve, reject) => {
      ytdl(audioLink, { quality: "highestaudio" })
        .pipe(audioFileStream)
        .on("finish", resolve)
        .on("error", reject);
    });
  }

  private mergeYoutubeAudioAndImage(
    imagePath: string,
    info: videoInfo,
    audioPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .setFfmpegPath(ffmpegPath!)
        .input(imagePath)
        .loop(info.videoDetails.lengthSeconds)
        .input(audioPath)
        .audioCodec("aac")
        .audioBitrate("192k")
        .videoCodec("libx264")
        .videoFilters(["scale='iw-mod(iw,2)':'ih-mod(ih,2)',format=yuv420p"])
        .outputOptions("-tune stillimage")
        .outputOptions("-shortest")
        .outputOptions("-movflags +faststart")
        .on("end", resolve)
        .on("error", reject);
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
