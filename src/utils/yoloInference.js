import * as ort from 'onnxruntime-web';

let session = null;
let config = null;

export async function loadModel() {
    if (!session) {
        console.log('🔄 Loading model and config...');
        [session, config] = await Promise.all([
            ort.InferenceSession.create('/models/model.onnx'),
            fetch('/models/model_config.json').then(r => r.json())
        ]);
        console.log('✅ Model loaded:', config);
        console.log('📊 Model inputs:', session.inputNames);
        console.log('📊 Model outputs:', session.outputNames);
    }
    return { session, config };
}

function preprocessImage(image, inputSize) {
    console.log('🖼️ Preprocessing image...');
    console.log('   Input dimensions:', image.width, 'x', image.height);
    console.log('   Target size:', inputSize);

    const canvas = document.createElement('canvas');
    canvas.width = inputSize;
    canvas.height = inputSize;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(image, 0, 0, inputSize, inputSize);
    const imageData = ctx.getImageData(0, 0, inputSize, inputSize);

    const pixels = imageData.data;
    const red = [], green = [], blue = [];

    for (let i = 0; i < pixels.length; i += 4) {
        red.push(pixels[i] / 255.0);
        green.push(pixels[i + 1] / 255.0);
        blue.push(pixels[i + 2] / 255.0);
    }

    const input = [...red, ...green, ...blue];
    const tensor = new ort.Tensor('float32', input, [1, 3, inputSize, inputSize]);

    console.log('✅ Preprocessed tensor shape:', tensor.dims);
    console.log('   Tensor data length:', tensor.data.length);
    console.log('   Sample values:', tensor.data.slice(0, 10));

    return tensor;
}

function nms(boxes, scores, iouThreshold) {
    console.log('🔍 Running NMS...');
    console.log('   Input boxes:', boxes.length);
    console.log('   IoU threshold:', iouThreshold);

    const indices = scores
        .map((score, idx) => ({ score, idx }))
        .sort((a, b) => b.score - a.score)
        .map(item => item.idx);

    const keep = [];
    const suppressed = new Set();

    for (const idx of indices) {
        if (suppressed.has(idx)) continue;
        keep.push(idx);

        const box1 = boxes[idx];
        for (const idx2 of indices) {
            if (idx === idx2 || suppressed.has(idx2)) continue;
            const box2 = boxes[idx2];
            if (iou(box1, box2) > iouThreshold) {
                suppressed.add(idx2);
            }
        }
    }

    console.log('✅ NMS kept:', keep.length, 'boxes');
    return keep;
}

function iou(box1, box2) {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.w, box2.x + box2.w);
    const y2 = Math.min(box1.y + box1.h, box2.y + box2.h);

    const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const area1 = box1.w * box1.h;
    const area2 = box2.w * box2.h;
    const union = area1 + area2 - intersection;

    return intersection / union;
}

function postProcess(output, config, originalWidth, originalHeight) {
    console.log('📦 Post-processing output...');
    console.log('   Output shape:', output.dims);
    console.log('   Output data length:', output.data.length);
    console.log('   Output type:', output.type);

    const { num_classes, class_names, confidence_threshold, iou_threshold, input_size } = config;

    console.log('⚙️ Config:', {
        num_classes,
        class_names,
        confidence_threshold,
        iou_threshold,
        input_size
    });

    const outputData = output.data;

    // YOLOv8 output format is [1, 4+num_classes, 8400]
    // We need to transpose it to [8400, 4+num_classes]
    const numBoxes = output.dims[2]; // 8400
    const numFields = output.dims[1]; // 4 + num_classes

    console.log('   Number of boxes:', numBoxes);
    console.log('   Fields per box:', numFields, '(4 coords + ' + num_classes + ' classes)');

    const detections = [];
    let maxConfidence = 0;
    let totalAboveThreshold = 0;

    for (let i = 0; i < numBoxes; i++) {
        // Get class scores for this box
        const scores = [];
        for (let j = 0; j < num_classes; j++) {
            const score = outputData[i + (4 + j) * numBoxes];
            scores.push(score);
        }

        const maxScore = Math.max(...scores);
        const classId = scores.indexOf(maxScore);

        if (maxScore > maxConfidence) maxConfidence = maxScore;

        if (maxScore > confidence_threshold) {
            totalAboveThreshold++;

            // YOLOv8 format: x_center, y_center, width, height
            const x_center = outputData[i];
            const y_center = outputData[i + numBoxes];
            const w = outputData[i + 2 * numBoxes];
            const h = outputData[i + 3 * numBoxes];

            // Convert to top-left corner format and scale to original image
            const x = (x_center - w / 2) * (originalWidth / input_size);
            const y = (y_center - h / 2) * (originalHeight / input_size);
            const width = w * (originalWidth / input_size);
            const height = h * (originalHeight / input_size);

            detections.push({
                x,
                y,
                w: width,
                h: height,
                score: maxScore,
                classId,
                className: class_names[classId]
            });
        }
    }

    console.log('📊 Detection stats:');
    console.log('   Max confidence found:', maxConfidence);
    console.log('   Boxes above threshold:', totalAboveThreshold);
    console.log('   Detections before NMS:', detections.length);

    if (detections.length > 0) {
        console.log('   Sample detection:', detections[0]);
    }

    if (detections.length === 0) {
        console.warn('⚠️ No detections found! Try lowering confidence_threshold');
        return [];
    }

    const boxes = detections.map(d => ({ x: d.x, y: d.y, w: d.w, h: d.h }));
    const scores = detections.map(d => d.score);
    const keepIndices = nms(boxes, scores, iou_threshold);

    const finalDetections = keepIndices.map(idx => detections[idx]);
    console.log('✅ Final detections after NMS:', finalDetections.length);

    return finalDetections;
}

export async function detectObjects(imageElement) {
    console.log('🚀 Starting detection...');
    console.log('   Image element:', imageElement.tagName);
    console.log('   Image size:', imageElement.width, 'x', imageElement.height);

    const { session, config } = await loadModel();

    const inputTensor = preprocessImage(imageElement, config.input_size);

    console.log('🔮 Running inference...');
    const feeds = { images: inputTensor };
    const startTime = performance.now();
    const results = await session.run(feeds);
    const inferenceTime = performance.now() - startTime;

    console.log('✅ Inference completed in', inferenceTime.toFixed(2), 'ms');
    console.log('   Output keys:', Object.keys(results));

    const output = results[session.outputNames[0]];

    const detections = postProcess(output, config, imageElement.width, imageElement.height);

    console.log('🎯 Returning', detections.length, 'detections');
    return detections;
}