// video.js
const ffmpeg = require('fluent-ffmpeg');

function audioToVideo({ audioPath, imagePath, outVideo }) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(imagePath)         // avatar image
      .loop()                   // hold it for the whole audio length
      .input(audioPath)
      .outputOptions([
        '-c:v libx264',
        '-tune stillimage',
        '-c:a aac',
        '-b:a 192k',
        '-pix_fmt yuv420p',
        '-shortest'
      ])
      .save(outVideo)
      .on('end', () => resolve(outVideo))
      .on('error', reject);
  });
}

module.exports = { audioToVideo };
