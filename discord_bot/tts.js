// tts.js
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

async function textToSpeech(text, outPath) {
  const res = await axios.post(
    'https://api.minimaxi.chat/audio/create-mp3',
    { text },
    {
      headers: {
        Authorization: `Bearer ${process.env.MINIMAX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer'
    }
  );
  fs.writeFileSync(outPath, Buffer.from(res.data), 'binary');
  return outPath;
}

module.exports = { textToSpeech };
