import React, { useRef, useEffect, useState } from "react";
import { detectObjects } from "../utils/yoloInference";
import "./CameraDetector.css";

function CameraDetector() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [fps, setFps] = useState(0);
  const [detectionSummary, setDetectionSummary] = useState({
    mangoTree: 0,
    notMangoTree: 0,
  });
  const animationFrameRef = useRef(null);
  const lastFrameTimeRef = useRef(Date.now());
  const isProcessingRef = useRef(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      videoRef.current.srcObject = stream;

      videoRef.current.onloadedmetadata = () => {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
      };

      videoRef.current.onplay = () => {
        setIsStreaming(true);
        detectFrame();
      };

      await videoRef.current.play();
    } catch (error) {
      console.error("Camera error:", error);
      alert("Could not access camera: " + error.message);
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsStreaming(false);
    isProcessingRef.current = false;
  };

  const detectFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    if (isProcessingRef.current) {
      animationFrameRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    isProcessingRef.current = true;
    const ctx = canvas.getContext("2d");

    try {
      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Run detection
      const detections = await detectObjects(video);

      // Count detections by class
      const summary = { mangoTree: 0, notMangoTree: 0 };
      detections.forEach((det) => {
        if (det.className === "mangoTree") summary.mangoTree++;
        else summary.notMangoTree++;
      });
      setDetectionSummary(summary);

      // Draw detections
      drawDetections(ctx, detections);

      // Calculate FPS
      const now = Date.now();
      const actualFps = 1000 / (now - lastFrameTimeRef.current);
      lastFrameTimeRef.current = now;
      setFps(actualFps.toFixed(1));
    } catch (error) {
      console.error("Detection error:", error);
    } finally {
      isProcessingRef.current = false;
    }

    animationFrameRef.current = requestAnimationFrame(detectFrame);
  };

  const drawDetections = (ctx, detections) => {
    detections.forEach((det) => {
      const color = det.className === "mangoTree" ? "#00FF00" : "#FF0000";

      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(det.x, det.y, det.w, det.h);

      // Draw label
      const label = `${det.className} ${(det.score * 100).toFixed(1)}%`;
      ctx.font = "bold 18px Arial";
      const textMetrics = ctx.measureText(label);
      const textWidth = textMetrics.width;
      const textHeight = 24;

      ctx.fillStyle = color;
      ctx.fillRect(
        det.x,
        det.y - textHeight - 4,
        textWidth + 10,
        textHeight + 4
      );

      ctx.fillStyle = "#000000";
      ctx.fillText(label, det.x + 5, det.y - 8);
    });
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="camera-detector">
      <h2>Live Camera Detection</h2>

      <div className="camera-controls">
        {!isStreaming ? (
          <button onClick={startCamera} className="start-btn">
            Start Camera
          </button>
        ) : (
          <button onClick={stopCamera} className="stop-btn">
            Stop Camera
          </button>
        )}
        {isStreaming && <div className="fps-counter">FPS: {fps}</div>}
      </div>

      <div className="video-container">
        <video
          ref={videoRef}
          style={{ display: "none" }}
          playsInline
          muted
          autoPlay
        />
        <canvas ref={canvasRef} />
      </div>

      {isStreaming && (
        <div className="detection-summary">
          <h3>🎯 Live Detections</h3>
          <div className="detection-counts">
            <div className="count-item mango">
              <span className="emoji">🥭</span>
              <span className="label">Mango Trees:</span>
              <span className="value">{detectionSummary.mangoTree}</span>
            </div>
            <div className="count-item not-mango">
              <span className="emoji">🌳</span>
              <span className="label">Other Trees:</span>
              <span className="value">{detectionSummary.notMangoTree}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CameraDetector;
