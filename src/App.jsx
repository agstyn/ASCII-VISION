import { useState } from "react";
import AsciiCanvas from "./components/AsciiCanvas";
import { sliderTickSound } from "./utils/sound";
import "./index.css";

export default function App() {
  const [cols,     setCols]     = useState(100);
  const [contrast, setContrast] = useState(1.2);

  return (
    <div className="app">
      <header>
        <span className="dot" />
        <span className="title">ASCII·CAM</span>
      </header>

      <div className="feed-area">
        <AsciiCanvas cols={cols} contrast={contrast} />
      </div>

      <footer>
        <div className="controls">
          <div className="slider-group">
            <label>
              DETAIL <span>{cols}</span>
            </label>
            <input
              type="range" min="60" max="180" step="5"
              value={cols}
              onChange={e => setCols(Number(e.target.value))}
              onInput={sliderTickSound}
            />
          </div>

          <div className="slider-group">
            <label>
              CONTRAST <span>{contrast.toFixed(1)}</span>
            </label>
            <input
              type="range" min="0.8" max="2.5" step="0.1"
              value={contrast}
              onChange={e => setContrast(Number(e.target.value))}
              onInput={sliderTickSound}
            />
          </div>
        </div>
      </footer>
    </div>
  );
}