
# User Journey Map

This document outlines the typical workflow for a Field Technician using FixStream AR.

## Phase 1: Onboarding & Initialization
1.  **Landing**: User opens the app.
2.  **Authentication**:
    *   **Sign In**: User enters credentials or requests a Magic Link via Email.
    *   **Sign Up**: New users provide Full Name and Field of Interest. A `profile` row is automatically created in Supabase.
3.  **Dashboard**: User lands on the Dashboard showing:
    *   Connectivity Status (Network/Battery).
    *   Recent Repair History.
    *   Quick Action: "Start New Diagnosis".

## Phase 2: Diagnostic Capture (Triage)
1.  **Initiation**: User taps "Start Session".
2.  **Environment Setup**:
    *   Camera view opens.
    *   User toggles Flashlight if dark.
    *   Real-time audio visualizer confirms microphone is working.
3.  **Data Collection**:
    *   User points camera at malfunctioning equipment.
    *   User taps **Record**.
    *   App captures 5-10s of video while simultaneously analyzing Audio (FFT) and Vibration (Accelerometer).
4.  **Submission**: App automatically stops recording, calculates telemetry, and transitions to Analysis.

## Phase 3: AI Analysis (The "Thinking" Phase)
1.  **Processing State**: User sees the **Holographic Loader**.
    *   **0-8s**: Video Upload & Optimization.
    *   **8-18s**: Sensor Fusion (Audio/Video correlation).
    *   **18s+**: **System 2 Neural Reasoning** (Gemini 3 Pro engages "Thinking" mode to derive deep insights).
2.  **Results Screen**:
    *   **Diagnosis**: "Hydraulic Pump Cavitation detected."
    *   **Confidence**: "92%".
    *   **Search Grounding**: Links to external web sources validating the finding.
    *   **Reasoning**: Expandable section showing the AI's logic chain.
3.  **Decision**: User chooses "Start Repair".

## Phase 4: AR Execution
1.  **Guidance**: App enters AR Mode.
2.  **Step 1**: "Locate Main Housing".
    *   **AR Overlay**: A green bounding box draws around the housing unit on screen (powered by Flash vision).
    *   **Interaction**: User taps the box to confirm identification.
3.  **Chat Assistance**: User opens the "Expert Chat" to ask: "Is this bolt stripped?". The AI analyzes the current frame and replies.
4.  **Progression**: User navigates through all steps using "Next" / "Previous" buttons.

## Phase 5: Verification (Quality Assurance)
1.  **Completion**: User finishes repair steps.
2.  **Verification Prompt**: "Record 5s of operation to verify fix."
3.  **Comparison**:
    *   User records the now-running machine.
    *   AI compares new audio signature/vibration vs. the pre-repair baseline.
    *   **Result**: "Success: Vibration reduced by 0.5g. Acoustic peak normalized."
4.  **Closure**: User taps "Complete Job".

## Phase 6: Record Keeping
1.  **Sync**: Repair log is updated in Supabase with status `COMPLETED`.
2.  **History**: User can view this session in the "Repairs" tab.
3.  **Profile**: "Repairs Count" increments on the Profile screen.
