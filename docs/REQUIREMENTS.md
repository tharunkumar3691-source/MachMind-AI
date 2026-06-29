
# FixStream AR - Product Requirements Document (PRD)

## 1. Executive Summary
**FixStream AR** is an AI-powered industrial maintenance assistant designed to bridge the gap between inexperienced technicians and complex machinery. By leveraging Multimodal AI (Video, Audio, Telemetry), Augmented Reality (AR), and System 2 Reasoning, the application provides real-time diagnostics, step-by-step repair guidance, and post-repair verification.

## 2. Core Functional Requirements

### 2.1. Authentication & User Profile
*   **Multi-Method Auth**: Support for Email/Password, Magic Link, and Password Recovery flows via Supabase.
*   **Profile Management**: Ability to update avatar, job title, and view personal repair statistics.
*   **Role Management**: Field Technicians can manage their own repair logs.

### 2.2. Dashboard & Triage
*   **Status at a Glance**: Display active tasks, system connectivity status, and quick actions.
*   **Context Awareness**: "Resume Repair" functionality for interrupted sessions.
*   **System Health Monitoring**: Real-time display of device battery, network latency, and storage availability.

### 2.3. Diagnostic Capture (Multimodal Input)
*   **Video Capture**: Record high-fidelity video of equipment (optimized to 720p for bandwidth).
*   **Audio Analysis**: Real-time visualization of audio spectrum (FFT) to detect anomalies (grinding, hissing).
*   **Telemetry Acquisition**: Capture accelerometer data (vibration metrics) during recording.
*   **Upload Capability**: Support for analyzing pre-recorded footage via file upload.

### 2.4. AI Diagnostics & Analysis
*   **Multimodal Fusion**: Synthesis of Video, Audio, and Telemetry data to form a diagnosis.
*   **Deep Reasoning (System 2)**: Utilization of Gemini 3 Pro's "Thinking" capabilities to derive logical conclusions from sensor data.
*   **Web Grounding**: Usage of Google Search Tools to validate equipment specifications and failure modes against real-world data.
*   **Safety First**: Automatic detection of critical hazards (pressure, electrical, thermal) with prominent UI warnings.
*   **Confidence Scoring**: Quantitative assessment of the diagnosis reliability.

### 2.5. AR Repair Guidance
*   **Spatial Anchoring**: Visualization of component locations using 2D bounding boxes overlaid on the equipment image.
*   **Ghost Overlays**: Generative "Ghost Views" showing the expected post-state of a step.
*   **Step-by-Step Navigation**: Linear progression through repair procedures.
*   **Live Expert Chat**: Context-aware AI chat that sees what the user sees to answer specific questions during the repair.

### 2.6. Verification System (Quality Assurance)
*   **Post-Repair Capture**: Recording mechanism identical to diagnostic capture but focused on validation.
*   **Comparative Analysis**: AI comparison of Pre-Repair vs. Post-Repair telemetry (Acoustic/Visual/Vibration).
*   **Pass/Fail Logic**: Automated determination of repair success with recommendations.

### 2.7. Digital Library (Manuals)
*   **Knowledge Repository**: Browse and search PDF/Image manuals stored in the database.
*   **Upload Pipeline**: Facility to add new manuals to the library.
*   *Note: Manuals are currently a reference library for the user and are not automatically ingested into the diagnostic AI context.*

### 2.8. Repair History
*   **Audit Trail**: Complete log of all past repairs, including technician ID, timestamps, and diagnostic data.
*   **Search & Filter**: Retrieval by status (Active/Completed) or keyword.

## 3. Non-Functional Requirements

### 3.1. Performance
*   **Latency**: AI Analysis response time target < 30 seconds (Flash) / < 180 seconds (Pro Thinking).
*   **Optimization**: Video streams are compressed and bitrate-limited (750kbps) to ensure functionality on 4G networks.

### 3.2. Reliability
*   **Fallback Strategies**: Multi-layer model fallback. 
    1. Gemini 3 Pro (High Reasoning)
    2. Gemini 2.5 Flash (High Speed)
    3. Static Emergency Rules (Offline/Total Failure).
*   **Data Persistence**: Cloud synchronization via Supabase.

### 3.3. Accessibility & UI
*   **Industrial UI**: High-contrast, large touch targets suitable for gloved usage.
*   **Internationalization (i18n)**: Full support for English, Spanish, French, and Portuguese.
*   **Dark Mode**: Default dark theme to reduce eye strain in low-light environments.

## 4. Technical Constraints
*   **Browser Support**: Modern mobile browsers (Chrome/Safari) with `getUserMedia` and `DeviceMotion` support.
*   **Connectivity**: Requires active internet connection for Gemini API calls.
