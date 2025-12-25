import React, { useState, useRef } from 'react';
import { detectObjects } from '../utils/yoloInference';
import './ImageDetector.css';

function ImageDetector() {
    const [image, setImage] = useState(null);
    const [detections, setDetections] = useState([]);
    const [loading, setLoading] = useState(false);
    const imageRef = useRef(null);
    const canvasRef = useRef(null);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setImage(event.target.result);
                setDetections([]);
            };
            reader.readAsDataURL(file);
        }
    };

    const runDetection = async () => {
        if (!image) return;

        setLoading(true);
        try {
            const results = await detectObjects(imageRef.current);
            setDetections(results);
            drawDetections(results);
        } catch (error) {
            console.error('Detection error:', error);
            alert('Error running detection: ' + error.message);
        }
        setLoading(false);
    };

    const drawDetections = (detections) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = imageRef.current;

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        detections.forEach((det) => {
            const color = det.className === 'mangoTree' ? '#00FF00' : '#FF0000';

            // Draw bounding box
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeRect(det.x, det.y, det.w, det.h);

            // Draw label
            ctx.fillStyle = color;
            ctx.font = 'bold 16px Arial';
            const label = `${det.className} ${(det.score * 100).toFixed(1)}%`;
            const textWidth = ctx.measureText(label).width;

            ctx.fillRect(det.x, det.y - 24, textWidth + 10, 24);
            ctx.fillStyle = '#000000';
            ctx.fillText(label, det.x + 5, det.y - 6);
        });
    };

    return (
        <div className="image-detector">
            <div className="controls">
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={loading}
                />
                <button
                    onClick={runDetection}
                    disabled={!image || loading}
                >
                    {loading ? 'Detecting...' : 'Run Detection'}
                </button>
            </div>

            {image && (
                <div className="image-container">
                    <img
                        ref={imageRef}
                        src={image}
                        alt="Upload"
                        style={{ display: 'none' }}
                    />
                    <canvas ref={canvasRef} />
                </div>
            )}

            {detections.length > 0 && (
                <div className="results">
                    <h3>✅ Detections: {detections.length}</h3>
                    <ul>
                        {detections.map((det, idx) => (
                            <li key={idx}>
                                <span className={det.className === 'mangoTree' ? 'mango' : 'not-mango'}>
                                    {det.className}
                                </span>
                                - Confidence: {(det.score * 100).toFixed(2)}%
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default ImageDetector;