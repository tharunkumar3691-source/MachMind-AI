
# Gemini Integration Architecture

## 1. Model Strategy & Selection

FixStream AR utilizes a sophisticated **Tiered Reasoning Architecture** to balance depth of thought with operational resilience. The integration is built on the `@google/genai` SDK.

### Primary Model: Gemini 3 Pro (`gemini-3-pro-preview`)
*   **Role**: The "Brain" of the operation. Handles complex diagnostics, reasoning chains, and verification.
*   **Configuration**:
    *   **Thinking Config**: Enabled with a budget of `2048` tokens. This forces the model to engage in "System 2" thinking (internal monologue) before outputting a diagnosis, significantly reducing hallucinations in technical scenarios.
    *   **Tools**: `googleSearch` enabled for real-time fact-checking against technical specs on the web.
*   **Use Cases**:
    *   Primary Diagnostic Analysis.
    *   Chat with Site Expert.
    *   Verification Analysis (Pre vs Post comparison).

### Fallback Model: Gemini 2.5 Flash (`gemini-2.5-flash`)
*   **Role**: The "High-Speed Backup".
*   **Justification**: If the primary model times out (due to heavy network load or thinking latency) or encounters specific errors, the system seamlessly fails over to Flash. It is faster but performs less deep reasoning.
*   **Use Cases**:
    *   Diagnostic Fallback (when Pro fails).
    *   Spatial Understanding (AR Bounding Box generation) - chosen explicitly for speed.

### Generative Editing: Gemini 2.5 Flash Image (`gemini-2.5-flash-image`)
*   **Role**: Visual Synthesis.
*   **Use Case**: Generating "Ghost Overlays" (schematic wireframes) to visualize the expected future state of a repair step.

### Robust Fallback Architecture
The system implements a `generateWithFallback` strategy in `services/gemini.ts`:
1.  **Attempt 1 (Reasoning)**: Call `gemini-3-pro-preview` with Deep Thinking enabled. Race against a **180s** timeout.
2.  **Attempt 2 (Speed)**: If Attempt 1 fails, call `gemini-2.5-flash` (no thinking budget). Race against a **60s** timeout.
3.  **Attempt 3 (Emergency)**: If both fail (e.g., total offline), return a hardcoded `EMERGENCY_FALLBACK_RESULT` to ensure the UI never hangs.

## 2. Advanced AI Techniques

### 2.1. Multimodal Sensor Fusion
FixStream AR injects non-textual data directly into the prompt context to simulate human sensory perception.

*   **Visual**: Base64 encoded video frames/clips (video payload limited to ~10s / 750kbps bitrate).
*   **Audio**: Textual representation of client-side FFT analysis (Peak Frequency, Avg Decibels).
*   **Mechanical**: Telemetry data from the device accelerometer (Max Vibration in g-force).

**Prompt Injection Example:**
```text
[SENSOR FUSION TELEMETRY]
- Audio Spectrum Peak: 450 Hz
- Audio Amplitude (Avg): 72 dB
- Mechanical Vibration (Max): 0.8g
```

### 2.2. System 2 "Deep Thinking"
We leverage the **Thinking Config** available in Gemini 2.5+ / 3.0 series.
*   **Mechanism**: The model generates hidden "thoughts" to plan the diagnosis before generating the final JSON response.
*   **Benefit**: This mimics the cognitive process of a senior technician analyzing a problem, rather than just pattern-matching.

### 2.3. Google Search Grounding (Web-RAG)
Instead of a static internal vector database, the application utilizes the **Google Search Tool** integrated directly into the model.
*   **Function**: Allows Gemini to query the web for specific equipment manuals, torque specifications, or known failure modes of the identified machinery (e.g., "GX-500 Pump specs").
*   **Output**: The API returns `groundingMetadata`, which we parse to provide clickable "Source Links" in the UI.

### 2.4. Spatial Understanding (AR)
We leverage Gemini's spatial reasoning capabilities to generate 2D bounding boxes (`box_2d` format).
*   **Model**: `gemini-2.5-flash` (Optimized for latency).
*   **Prompt**: "Identify parts relevant to this instruction... Output JSON format: Array of objects { box_2d: [ymin, xmin, ymax, xmax] }."
*   **Visualization**: Coordinates are mapped to CSS percentage values to draw SVG overlays on the client side.

## 3. Data Flow

1.  **Capture**: User records video -> `Blob` (MediaRecorder API).
2.  **Pre-processing**:
    *   Video converted to Base64.
    *   Client-side FFT extracts Audio/Motion metrics into `TelemetryData`.
3.  **Inference**:
    *   `analyzeDiagnosticVideo()` calls Gemini API (Pro -> Flash fallback).
    *   Request includes: Video Base64 + System Prompt + Telemetry String.
4.  **Parsing**: Response text parsed as JSON. Grounding metadata extracted for citations.
5.  **Persistence**: Result stored in Supabase `repairs` table (`jsonb` column).
