# Media & Sensor Processing Techniques

FixStream AR relies heavily on client-side processing to prepare raw sensor data for AI analysis. This document details the specific browser APIs and algorithms used.

## 1. Audio Processing (Web Audio API)

We do not send raw audio files to Gemini for telemetry; instead, we analyze the audio stream locally to extract quantitative metrics.

### 1.1. FFT Analysis
*   **Node Chain**: `MediaStreamSource` -> `AnalyserNode` -> `Destination`.
*   **FFT Size**: 256. This provides 128 frequency bins, offering a balance between performance and frequency resolution.
*   **Sampling Rate**: Typically 44.1kHz or 48kHz (Device dependent).

### 1.2. Metric Extraction
*   **Decibels (dB)**: Calculated by averaging the values of the frequency bins (0-255 range) and mapping them to a relative dB scale (approx 30dB - 90dB).
    *   *Algorithm*: `Sum(bins) / Count / 255 * 100 + Offset`.
*   **Peak Frequency (Hz)**: Identified by finding the bin with the highest amplitude.
    *   *Calculation*: `PeakIndex * (SampleRate / 2) / BinCount`.
    *   *Nyquist Limit*: We analyze up to ~22kHz.

## 2. Video Processing

### 2.1. Capture Pipeline
*   **API**: `navigator.mediaDevices.getUserMedia`.
*   **Constraints**:
    *   `video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }`.
    *   Resolution is capped at 720p to reduce upload latency to Gemini without sacrificing too much detail.
*   **Recording**: `MediaRecorder` API.
    *   **MIME Type Selection**: Dynamic fallback logic: `video/webm;codecs=vp9` -> `video/webm` -> `video/mp4`.

### 2.2. Frame Extraction (For AR)
To send static images to Gemini (for spatial coordinates or ghost overlays), we extract frames from the video blob.

*   **Technique**:
    1.  Create an off-screen `<video>` element.
    2.  Load the `Blob` URL.
    3.  Seek to specific timestamp or play briefly.
    4.  Draw video frame to an off-screen `<canvas>`.
    5.  `canvas.toDataURL('image/jpeg', 0.85)` to get optimized Base64.

## 3. Telemetry (Sensors)

### 3.1. Accelerometer
*   **Event**: `window.DeviceMotionEvent`.
*   **Data**: `event.acceleration` (x, y, z).
*   **Algorithm**:
    *   Calculate Magnitude Vector: `sqrt(x^2 + y^2 + z^2)`.
    *   Track `maxVibration` over the recording session.
    *   *Filter*: We ignore gravity (using `acceleration` instead of `accelerationIncludingGravity`) to detect pure vibration.

## 4. Optimization Techniques

### 4.1. Payload Size Management
*   **Video Limits**: Recordings are strictly limited to 10 seconds via `setTimeout` to ensure the Base64 string stays within API payload limits.
*   **Canvas Resizing**: When extracting frames, we cap the width at 800px. This significantly reduces the token count for Gemini vision processing while maintaining enough detail for component identification.

### 4.2. Offline Analysis
*   **Uploads**: The app supports analyzing pre-recorded videos.
*   **Processing**: When a user uploads a video file, we play it back in a hidden video element at **2.0x speed** to rapidly extract the audio telemetry (FFT) before sending the file to the AI.
