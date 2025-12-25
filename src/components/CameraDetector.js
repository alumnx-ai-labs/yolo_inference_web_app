import React, { useRef, useEffect, useState } from 'react';
import { detectObjects } from '../utils/yoloInference';
import './CameraDetector.css';

function CameraDetector() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [fps, setFps] = useState(0);
    const [error, setError] = useState(null);
    const animationFrameRef = useRef(null);
    const lastFrameTimeRef = useRef(Date.now());
    const isProcessingRef = useRef(false);

    const startCamera = async () => {
        console.log('📹 Starting camera...');
        setError(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            console.log('✅ Camera stream acquired');
            console.log('   Video tracks:', stream.getVideoTracks().length);
            console.log('   Track settings:', stream.getVideoTracks()[0].getSettings());

            videoRef.current.srcObject = stream;

            videoRef.current.onloadedmetadata = () => {
                console.log('📺 Video metadata loaded');
                console.log('   Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);

                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;

                console.log('   Canvas dimensions:', canvasRef.current.width, 'x', canvasRef.current.height);
            };

            videoRef.current.onplay = () => {
                console.log('▶️ Video playing');
                setIsStreaming(true);
                detectFrame();
            };

            await videoRef.current.play();
            console.log('✅ Video play() called');

        } catch (error) {
            console.error('❌ Camera error:', error);
            setError(error.message);
            alert('Could not access camera: ' + error.message);
        }
    };

    const stopCamera = () => {
        console.log('⏹️ Stopping camera...');

        const stream = videoRef.current?.srcObject;
        if (stream) {
            stream.getTracks().forEach(track => {
                console.log('   Stopping track:', track.label);
                track.stop();
            });
        }

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            console.log('   Cancelled animation frame');
        }

        setIsStreaming(false);
        isProcessingRef.current = false;
        console.log('✅ Camera stopped');
    };

    const detectFrame = async () => {
        console.log('🔄 detectFrame called');
        console.log('   isStreaming:', isStreaming);
        console.log('   videoRef.current:', videoRef.current ? 'exists' : 'null');
        console.log('   canvasRef.current:', canvasRef.current ? 'exists' : 'null');

        if (!videoRef.current || !canvasRef.current) {
            console.warn('⚠️ Missing video or canvas ref');
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;

        console.log('   Video readyState:', video.readyState);
        console.log('   Video paused:', video.paused);
        console.log('   Video dimensions:', video.videoWidth, 'x', video.videoHeight);

        // Check if video is ready
        if (video.readyState !== video.HAVE_ENOUGH_DATA) {
            console.log('⏳ Video not ready, waiting...');
            animationFrameRef.current = requestAnimationFrame(detectFrame);
            return;
        }

        // Prevent multiple simultaneous detections
        if (isProcessingRef.current) {
            console.log('⏭️ Skipping frame (already processing)');
            animationFrameRef.current = requestAnimationFrame(detectFrame);
            return;
        }

        isProcessingRef.current = true;
        const frameStartTime = performance.now();

        const ctx = canvas.getContext('2d');

        try {
            console.log('🎬 Processing frame...');

            // Draw video frame to canvas first
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            console.log('   Drew video frame to canvas');

            // Run detection on current video frame
            const detectionStart = performance.now();
            const detections = await detectObjects(video);
            const detectionTime = performance.now() - detectionStart;

            console.log('✅ Detection complete:', detections.length, 'objects in', detectionTime.toFixed(2), 'ms');

            // Draw detections
            drawDetections(ctx, detections);

            // Calculate FPS
            const now = Date.now();
            const actualFps = 1000 / (now - lastFrameTimeRef.current);
            lastFrameTimeRef.current = now;
            setFps(actualFps.toFixed(1));

            const totalFrameTime = performance.now() - frameStartTime;
            console.log('⏱️ Total frame time:', totalFrameTime.toFixed(2), 'ms');

        } catch (error) {
            console.error('❌ Detection error:', error);
            setError(error.message);
        } finally {
            isProcessingRef.current = false;
        }

        // Continue detection loop
        animationFrameRef.current = requestAnimationFrame(detectFrame);
    };

    const drawDetections = (ctx, detections) => {
        console.log('🎨 Drawing', detections.length, 'detections');

        detections.forEach((det, idx) => {
            console.log(`   Detection ${idx}:`, det.className, det.score.toFixed(3),
                `at [${det.x.toFixed(0)}, ${det.y.toFixed(0)}, ${det.w.toFixed(0)}, ${det.h.toFixed(0)}]`);

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
        console.log('🔧 CameraDetector mounted');
        return () => {
            console.log('🔧 CameraDetector unmounting');
            stopCamera();
        };
    }, []);

    useEffect(() => {
        console.log('🔄 isStreaming changed to:', isStreaming);
    }, [isStreaming]);

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

            {error && (
                <div style={{ color: 'red', padding: '10px', margin: '10px' }}>
                    Error: {error}
                </div>
            )}

            <div className="video-container">
                <video
                    ref={videoRef}
                    style={{ display: 'none' }}
                    playsInline
                    muted
                    autoPlay
                />
                <canvas ref={canvasRef} />
            </div>
        </div>
    );
}

export default CameraDetector;