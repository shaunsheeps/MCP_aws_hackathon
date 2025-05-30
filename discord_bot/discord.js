// discord.js
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const pool = require(path.resolve(__dirname, "../db.js"));
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const express = require("express");

const app = express();
app.get("/", (req, res) => res.send("🤖 Bot is running!"));
app.listen(process.env.PORT, () =>
  console.log(`Express: listening on http://localhost:${process.env.PORT}`)
);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

const PREFIX = "!";

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const [cmd, ...args] = message.content
    .slice(PREFIX.length)
    .trim()
    .split(/\s+/);

  // … your ping and daily_summary handlers …

  // MAKE VIDEO
  if (cmd === "make_video") {
    const dateString = args[0];
    const mentionUser = message.mentions.users.first();
    const developerName = mentionUser
      ? mentionUser.username
      : args.slice(1).join(" ");

    // Validation
    if (
      !dateString ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dateString) ||
      !developerName
    ) {
      return message.reply(`Usage: \`${PREFIX}make_video YYYY-MM-DD @User\``);
    }

    try {
      // 1) Fetch from DB
      const { rows } = await pool.query(
        `SELECT yesterday, today, blockers, accomplishments, team_name
         FROM standup.daily_updates
        WHERE entry_date = $1 AND developer = $2`,
        [dateString, developerName]
      );
      if (rows.length === 0) {
        return message.reply(
          `No standup entry for **${developerName}** on **${dateString}**.`
        );
      }
      const { yesterday, today, blockers, accomplishments, team_name } =
        rows[0];

      // 2) Build the prompt
      const prompt = [
        `Standup for ${developerName} on ${dateString}.`,
        `Team ${team_name}.`,
        `Yesterday: ${yesterday || "nothing to report"}.`,
        `Today: ${today || "nothing planned"}.`,
        `Blockers: ${blockers?.join(", ") || "none"}.`,
        `Accomplishments: ${accomplishments?.join(", ") || "none"}.`,
      ].join(" ");

      // 3) Tell user we’re starting
      await message.channel.send("🚀 Generating video, please wait…");

      // 4) Define where Python will write the MP4
      const outPath = path.resolve(__dirname, `video-${message.id}.mp4`);

      // 5) Spawn Python, wait for it to finish
      await new Promise((resolve, reject) => {
        const py = spawn(
          "python3",
          [
            path.resolve(__dirname, "video_generate.py"),
            prompt,
            outPath,
            "--model",
            "T2V-01",
            "--poll-interval",
            "10",
          ],
          { env: process.env }
        );

        py.stdout.on("data", (data) =>
          console.log("PYTHON stdout:", data.toString())
        );
        py.stderr.on("data", (data) =>
          console.error("PYTHON stderr:", data.toString())
        );
        py.on("close", (code) =>
          code === 0
            ? resolve()
            : reject(new Error(`video_generate.py exited with ${code}`))
        );
      });

      // 6) Send the resulting file
      await message.channel.send({
        content: `🎥 Here’s your standup video for **${developerName}**:`,
        files: [outPath],
      });

      // 7) Cleanup
      fs.unlinkSync(outPath);
    } catch (err) {
      console.error("make_video error:", err);
      await message.reply(
        "❌ Failed to create your video. Check the logs for details."
      );
    }
  }
});

client
  .login(process.env.DISCORD_TOKEN)
  .catch((err) => console.error("❌ Failed to login:", err));
