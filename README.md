# 🥭 Mango Tree Detector

A React-based web application that uses a YOLOv8 model to detect mango trees in real-time. This application runs object detection entirely in the browser using [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/).

## ✨ Features

- **Real-time Camera Detection**: Uses the device camera to identify mango trees in real-time streams.
- **Image Upload Support**: Analyze existing photos by uploading them directly to the app.
- **Client-Side Inference**: All processing happens locally in your browser using WebAssembly and WebGL - no data is sent to a server.
- **Custom YOLO Model**: specifically trained for detecting mango trees vs. non-mango tree objects.

## 🛠️ Technology Stack

- **Frontend**: React.js
- **ML Engine**: `onnxruntime-web` for running ONNX models in the browser.
- **Model**: YOLOv8 (converted to ONNX format).
- **Styling**: Vanilla CSS.

## 🚀 Getting Started

### Prerequisites

- Node.js installed on your machine.
- A modern web browser with WebGL support (Chrome/Edge/Firefox recommended).

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Ensure Model Files are Present:
   - Make sure you have your trained `model.onnx` and `model_config.json` files placed in the `public/models/` directory.
   - The config file should look like this:
     ```json
     {
       "num_classes": 2,
       "class_names": ["mangoTree", "notMangoTree"],
       "confidence_threshold": 0.5,
       "iou_threshold": 0.45,
       "input_size": 640
     }
     ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## 📁 Project Structure

```
yolo-detector/
├── public/
│   └── models/          # Store .onnx model and config.json here
├── src/
│   ├── components/
│   │   ├── CameraDetector.js  # Real-time webcam detection logic
│   │   ├── ImageDetector.js   # Static image upload detection logic
│   │   └── ...
│   ├── utils/
│   │   └── yoloInference.js   # Core logic for ONNX model loading & inference
│   ├── App.js           # Main application shell
│   └── ...
└── package.json
```

## 🧠 How it Works

1. **Model Loading**: The app fetches the `model.onnx` and `config.json` files from the `public` directory using `ort.InferenceSession.create`.
2. **Preprocessing**: Images (from camera frame or file input) are resized to the target input size (e.g., 640x640) and normalized.
3. **Inference**: The ONNX runtime executes the model on the input tensor.
4. **Post-processing**: The output tensors are parsed to extract bounding boxes and class scores. Non-Maximum Suppression (NMS) is applied to remove overlapping duplicates.
5. **Rendering**: Bounding boxes and labels are drawn onto the canvas overlaying the image/video.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
