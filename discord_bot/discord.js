// discord.js
const path = require("path");

//get the db file and the .env file
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});
const pool = require(path.resolve(__dirname, "../db.js"));

require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const express = require("express");

// --- Express server for health checks / keep-alive ---
const app = express();
app.get("/", (req, res) => res.send("🤖 Bot is running!"));
app.listen(process.env.PORT, () =>
  console.log(`Express: listening on http://localhost:${process.env.PORT}`)
);

// --- Discord client setup ---
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

// Simple prefix command handler
const PREFIX = "!";
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const [cmd, ...args] = message.content
    .trim()
    .substring(PREFIX.length)
    .split(/\s+/);

  if (cmd === "ping") {
    return message.channel.send("Pong! 🏓");
  }

  //calls the server to print out summaries of that day cmd = daily_summary subcmd='5-2025-05-30'
  if (cmd === "daily_summary") {
    const dateString = args[0];
    // 1) Validate input
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return message.channel.send(
        `Usage: \`${PREFIX}daily_summary <YYYY-MM-DD>\``
      );
    }

    try {
      // 2) Query the DB
      const { rows } = await pool.query(
        `SELECT developer,
                yesterday,
                today,
                blockers,
                accomplishments,
                team_name
           FROM standup.daily_updates
          WHERE entry_date = $1`,
        [dateString]
      );

      if (rows.length === 0) {
        return message.channel.send(
          `No standup entries found for **${dateString}**.`
        );
      }

      // 3) Build a single embed with one field per developer
      const embed = new EmbedBuilder()
        .setTitle(`📋 Standup for ${dateString}`)
        .setColor("#00AAFF")
        .setFooter({ text: "Standup Bot" });

      // 1. map each DB row into a proper field-object
      const fields = rows.map((row) => ({
        name: row.developer, // string
        value: [
          `**Team:** ${row.team_name}`,
          `**Yesterday:** ${row.yesterday ?? "—"}`,
          `**Today:** ${row.today ?? "—"}`,
          `**Blockers:** ${row.blockers?.join(", ") ?? "None"}`,
          `**Accomplishments:** ${row.accomplishments?.join(", ") ?? "None"}`,
        ].join("\n"),
        inline: false, // boolean
      }));

      // 2. add them all at once
      embed.addFields(...fields);

      return message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error("DB error on daily_summary:", err);
      return message.channel.send(
        `❌ There was an error fetching the summary.`
      );
    }
  }

  //Make video function that takes the info and has an avatar read out the information 

});

client
  .login(process.env.DISCORD_TOKEN)
  .catch((err) => console.error("❌ Failed to login:", err));
