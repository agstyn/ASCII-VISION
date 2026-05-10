import { useEffect, useRef, useState, useCallback } from "react";
import { frameToAscii } from "../utils/asciiConverter";
import { shutterSound, filterClickSound, startupSound } from "../utils/sound";

const FILTERS = [
  { id: "white",  label: "W",     color: "#ffffff" },
  { id: "red",    label: "R",     color: "#ff3333" },
  { id: "green",  label: "G",     color: "#33ff66" },
  { id: "blue",   label: "B",     color: "#3399ff" },
  { id: "yellow", label: "Y",     color: "#ffee33" },
  { id: "color",  label: "COLOR", color: null      },
];

export default function AsciiCanvas({ cols, contrast }) {
  const videoRef     = useRef(null);
  const captureCanvas = useRef(document.createElement("canvas"));
  const preRef       = useRef(null);
  const colorCanvas  = useRef(null);
  const wrapperRef   = useRef(null);
  const animRef      = useRef(null);

  const colsRef      = useRef(cols);
  const contrastRef  = useRef(contrast);
  const filterRef    = useRef("white");
  const rowsRef      = useRef(40);
  const startedRef   = useRef(false);

  const [filter, setFilter] = useState("white");
  const [flash,  setFlash]  = useState(false);

  // keep refs in sync every render
  colsRef.current     = cols;
  contrastRef.current = contrast;
  filterRef.current   = filter;

  // ── font sizing ────────────────────────────────────────────────────────────
  function fitFontSize(rows) {
    const wrapper = wrapperRef.current;
    const pre     = preRef.current;
    if (!wrapper || !pre) return;
    const W  = wrapper.clientWidth;
    const H  = wrapper.clientHeight;
    const fs = Math.min(W / (colsRef.current * 0.55), H / (rows * 1.1));
    pre.style.fontSize = `${Math.max(1, fs)}px`;
  }

  useEffect(() => {
    const onResize = () => fitFontSize(rowsRef.current);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    fitFontSize(rowsRef.current);
  }, [cols]);

  // ── camera + render loop ───────────────────────────────────────────────────
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: "user" },
          audio: false,
        });

        // startup sound fires on first user-gesture-granted camera
        if (!startedRef.current) {
          startedRef.current = true;
          startupSound();
        }

        videoRef.current.srcObject = stream;
        videoRef.current.play();
        videoRef.current.onloadedmetadata = () => startLoop();
      } catch (err) {
        console.error("Camera error:", err);
      }
    }

    function startLoop() {
      const video   = videoRef.current;
      const capture = captureCanvas.current;
      capture.width  = video.videoWidth;
      capture.height = video.videoHeight;
      const ctx = capture.getContext("2d");

      function draw() {
        // mirror
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -capture.width, 0, capture.width, capture.height);
        ctx.restore();

        const imageData = ctx.getImageData(0, 0, capture.width, capture.height);
        const grid = frameToAscii(imageData, colsRef.current, contrastRef.current);

        if (grid.length !== rowsRef.current) {
          rowsRef.current = grid.length;
          fitFontSize(grid.length);
        }

        if (filterRef.current === "color") {
          renderColor(grid);
        } else {
          renderText(grid, filterRef.current);
        }

        animRef.current = requestAnimationFrame(draw);
      }
      draw();
    }

    startCamera();

    return () => {
      cancelAnimationFrame(animRef.current);
      if (videoRef.current?.srcObject)
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── renderers ──────────────────────────────────────────────────────────────
  function renderText(grid, currentFilter) {
    const pre = preRef.current;
    const cvs = colorCanvas.current;
    if (!pre) return;

    pre.style.display = "block";
    if (cvs) cvs.style.display = "none";

    pre.style.color = FILTERS.find(f => f.id === currentFilter)?.color || "#fff";

    let text = "";
    for (const line of grid) {
      text += line.map(c => c.ch).join("") + "\n";
    }
    pre.textContent = text;
  }

  function renderColor(grid) {
    const pre     = preRef.current;
    const cvs     = colorCanvas.current;
    const wrapper = wrapperRef.current;
    if (!cvs || !wrapper) return;

    if (pre) pre.style.display = "none";
    cvs.style.display = "block";

    const W = wrapper.clientWidth;
    const H = wrapper.clientHeight;
    cvs.width  = W;
    cvs.height = H;

    const rows  = grid.length;
    const cols  = grid[0]?.length || 1;
    const cellW = W / cols;
    const cellH = H / rows;
    const fs    = Math.max(1, Math.min(cellW / 0.55, cellH / 1.1));

    const ctx = cvs.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    ctx.font         = `${fs}px "Courier New", monospace`;
    ctx.textBaseline = "top";

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const { ch, pr, pg, pb } = grid[r][c];
        ctx.fillStyle = `rgb(${pr},${pg},${pb})`;
        ctx.fillText(ch, c * cellW, r * cellH);
      }
    }
  }

  // ── shutter ────────────────────────────────────────────────────────────────
  const handleShutter = useCallback(() => {
    shutterSound();
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const currentFilter = filterRef.current;

    if (currentFilter === "color") {
      const cvs = colorCanvas.current;
      if (!cvs) return;
      cvs.toBlob(blob => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href     = url;
        link.download = `ascii-cam-${Date.now()}.png`;
        link.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    } else {
      const pre = preRef.current;
      if (!pre) return;
      const ascii  = pre.textContent;
      const lines  = ascii.split("\n");
      const maxLen = Math.max(...lines.map(l => l.length));
      const fs     = 8;
      const lh     = fs * 1.15;

      const off    = document.createElement("canvas");
      off.width    = maxLen * fs * 0.6;
      off.height   = lines.length * lh;

      const ctx = off.getContext("2d");
      ctx.fillStyle    = "#000";
      ctx.fillRect(0, 0, off.width, off.height);
      ctx.fillStyle    = FILTERS.find(f => f.id === currentFilter)?.color || "#fff";
      ctx.font         = `${fs}px "Courier New", monospace`;
      ctx.textBaseline = "top";
      lines.forEach((line, i) => ctx.fillText(line, 0, i * lh));

      off.toBlob(blob => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href     = url;
        link.download = `ascii-cam-${Date.now()}.png`;
        link.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    }
  }, []);

  const activeColor = FILTERS.find(f => f.id === filter)?.color || "#fff";

  return (
    <div className="canvas-wrapper" ref={wrapperRef}>
      {flash && <div className="flash-overlay" />}

      <video ref={videoRef} style={{ display: "none" }} muted playsInline />

      {/* text / single-color mode */}
      <pre ref={preRef} className="ascii-output" />

      {/* color mode canvas */}
      <canvas
        ref={colorCanvas}
        style={{
          display:  "none",
          position: "absolute",
          inset:    0,
          width:    "100%",
          height:   "100%",
        }}
      />

      {/* filter bar */}
      <div className="filter-bar">
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`filter-btn ${filter === f.id ? "active" : ""}`}
            style={{
              color:       f.color || "#fff",
              borderColor: filter === f.id ? (f.color || "#fff") : "#333",
            }}
            onClick={() => {
              filterClickSound();
              setFilter(f.id);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* shutter */}
      <button
        className="shutter-btn"
        onClick={handleShutter}
        style={{ borderColor: activeColor }}
        aria-label="Capture"
      >
        <span className="shutter-ring" style={{ background: activeColor }} />
      </button>
    </div>
  );
}