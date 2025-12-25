import React, { useRef, useEffect, useState } from 'react';
import { detectObjects } from '../utils/yoloInference';
import './CameraDetector.css';

function CameraDetector() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [fps, setFps] = useState(0);
    const animationFrameRef = useRef(null);
    const lastFrameTimeRef = useRef(Date.now());

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Use back camera on mobile
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            videoRef.current.srcObject = stream;
            videoRef.current.play();
            setIsStreaming(true);

            // Wait for video to be ready
            videoRef.current.onloadedmetadata = () => {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                detectFrame();
            };
        } catch (error) {
            console.error('Camera access error:', error);
            alert('Could not access camera: ' + error.message);
        }
    };

    const stopCamera = () => {
        const stream = videoRef.current?.srcObject;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        setIsStreaming(false);
    };

    const detectFrame = async () => {
        if (!isStreaming || !videoRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        try {
            // Run detection on current video frame
            const detections = await detectObjects(video);

            // Draw video frame
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Draw detections
            drawDetections(ctx, detections);

            // Calculate FPS
            const now = Date.now();
            const actualFps = 1000 / (now - lastFrameTimeRef.current);
            lastFrameTimeRef.current = now;
            setFps(actualFps.toFixed(1));

        } catch (error) {
            console.error('Detection error:', error);
        }

        // Continue detection loop
        animationFrameRef.current = requestAnimationFrame(detectFrame);
    };

    const drawDetections = (ctx, detections) => {
        detections.forEach((det) => {
            // Choose color based on class
            const color = det.className === 'mangoTree' ? '#00FF00' : '#FF0000';

            // Draw bounding box
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeRect(det.x, det.y, det.w, det.h);

            // Draw label background
            const label = `${det.className} ${(det.score * 100).toFixed(1)}%`;
            ctx.font = 'bold 18px Arial';
            const textMetrics = ctx.measureText(label);
            const textWidth = textMetrics.width;
            const textHeight = 24;

            ctx.fillStyle = color;
            ctx.fillRect(det.x, det.y - textHeight - 4, textWidth + 10, textHeight + 4);

            // Draw label text
            ctx.fillStyle = '#000000';
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
                    style={{ display: 'none' }}
                    playsInline
                    muted
                />
                <canvas ref={canvasRef} />
            </div>
        </div>
    );
}

export default CameraDetector;