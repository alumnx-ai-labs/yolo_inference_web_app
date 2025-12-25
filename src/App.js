import React, { useState } from "react";
import CameraDetector from "./components/CameraDetector";
import ImageDetector from "./components/ImageDetector";
import "./App.css";

function App() {
  const [mode, setMode] = useState("camera"); // 'camera' or 'image'

  return (
    <div className="App">
      <header className="App-header">
        <h1>🥭 Mango Tree Detector</h1>

        <div className="mode-selector">
          <button
            className={mode === "camera" ? "active" : ""}
            onClick={() => setMode("camera")}
          >
            📹 Camera
          </button>
          <button
            className={mode === "image" ? "active" : ""}
            onClick={() => setMode("image")}
          >
            🖼️ Image Upload
          </button>
        </div>

        {mode === "camera" ? <CameraDetector /> : <ImageDetector />}
      </header>
    </div>
  );
}

export default App;
