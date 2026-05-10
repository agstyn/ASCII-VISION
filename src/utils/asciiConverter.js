const CHARS = "@%#*+=-:. ";

export function frameToAscii(imageData, cols, contrast) {
  const { data, width, height } = imageData;
  const cellW = width / cols;
  const cellH = cellW * 2.15;
  const rows  = Math.max(1, Math.floor(height / cellH));
  const result = [];

  for (let row = 0; row < rows; row++) {
    const line = [];
    for (let col = 0; col < cols; col++) {
      const x = Math.floor(col * cellW);
      const y = Math.floor(row * cellH);
      const i = (y * width + x) * 4;

      const pr = Math.min(255, data[i]     * contrast);
      const pg = Math.min(255, data[i + 1] * contrast);
      const pb = Math.min(255, data[i + 2] * contrast);

      const brightness = Math.min(255, 0.299 * pr + 0.587 * pg + 0.114 * pb);
      const charIndex  = Math.floor((brightness / 255) * (CHARS.length - 1));

      line.push({
        ch: CHARS[charIndex],
        pr: Math.round(pr),
        pg: Math.round(pg),
        pb: Math.round(pb),
      });
    }
    result.push(line);
  }

  return result;
}