/**
 * Meeting Access Screen - Device Testing (LiveKit Version)
 *
 * Allows participants to:
 * - Test microphone
 * - Test camera
 * - Select audio/video devices
 * - Check permissions
 *
 * Replaces Agora device testing with LiveKit's createLocalTracks API
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Button, Select, message, Spin } from 'antd';
import { createLocalTracks, Track } from 'livekit-client';
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaCheck,
  FaTimes,
} from 'react-icons/fa';

interface DeviceInfo {
  deviceId: string;
  kind: 'audioinput' | 'audiooutput' | 'videoinput';
  label: string;
}

interface DeviceState {
  audioDevices: DeviceInfo[];
  videoDevices: DeviceInfo[];
  selectedAudioDevice: string | null;
  selectedVideoDevice: string | null;
  micWorking: boolean | null;
  cameraWorking: boolean | null;
  testingMic: boolean;
  testingCamera: boolean;
  loading: boolean;
}

/**
 * Meeting Access Screen Component
 *
 * Minimal device testing UI for LiveKit
 * Much simpler than Agora version (no track management needed)
 */
const MeetingAccessScreen: React.FC = () => {
  const [state, setState] = useState<DeviceState>({
    audioDevices: [],
    videoDevices: [],
    selectedAudioDevice: null,
    selectedVideoDevice: null,
    micWorking: null,
    cameraWorking: null,
    testingMic: false,
    testingCamera: false,
    loading: true,
  });

  /**
   * Enumerate available media devices
   */
  useEffect(() => {
    const enumerateDevices = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true }));

        // Get available devices
        const devices = await navigator.mediaDevices.enumerateDevices();

        const audioDevices: DeviceInfo[] = devices
          .filter((device) => device.kind === 'audioinput')
          .map((device) => ({
            deviceId: device.deviceId,
            kind: device.kind as 'audioinput',
            label: device.label || `Microphone ${device.deviceId.slice(0, 5)}`,
          }));

        const videoDevices: DeviceInfo[] = devices
          .filter((device) => device.kind === 'videoinput')
          .map((device) => ({
            deviceId: device.deviceId,
            kind: device.kind as 'videoinput',
            label: device.label || `Camera ${device.deviceId.slice(0, 5)}`,
          }));

        setState((prev) => ({
          ...prev,
          audioDevices,
          videoDevices,
          selectedAudioDevice: audioDevices[0]?.deviceId || null,
          selectedVideoDevice: videoDevices[0]?.deviceId || null,
          loading: false,
        }));
      } catch (error) {
        console.error('Failed to enumerate devices:', error);
        message.error('Unable to access media devices');
        setState((prev) => ({ ...prev, loading: false }));
      }
    };

    enumerateDevices();
  }, []);

  /**
   * Test microphone
   */
  const testMicrophone = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, testingMic: true, micWorking: null }));

      const audioTrack = await createLocalTracks({
        audio: {
          deviceId: state.selectedAudioDevice || undefined,
        },
        video: false,
      });

      if (audioTrack && audioTrack.length > 0) {
        // Stop the track to release resources
        audioTrack.forEach((track) => track.stop());

        setState((prev) => ({ ...prev, micWorking: true, testingMic: false }));
        message.success('Microphone working!');
      } else {
        setState((prev) => ({ ...prev, micWorking: false, testingMic: false }));
        message.error('Microphone not working');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Microphone test error:', error);
      setState((prev) => ({ ...prev, micWorking: false, testingMic: false }));

      // Permission denied
      if (errorMsg.includes('Permission denied') || errorMsg.includes('NotAllowedError')) {
        message.error('Microphone permission denied. Check browser settings.');
      } else {
        message.error(`Microphone test failed: ${errorMsg}`);
      }
    }
  }, [state.selectedAudioDevice]);

  /**
   * Test camera
   */
  const testCamera = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, testingCamera: true, cameraWorking: null }));

      const videoTrack = await createLocalTracks({
        audio: false,
        video: {
          deviceId: state.selectedVideoDevice || undefined,
        },
      });

      if (videoTrack && videoTrack.length > 0) {
        // Stop the track to release resources
        videoTrack.forEach((track) => track.stop());

        setState((prev) => ({ ...prev, cameraWorking: true, testingCamera: false }));
        message.success('Camera working!');
      } else {
        setState((prev) => ({ ...prev, cameraWorking: false, testingCamera: false }));
        message.error('Camera not working');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Camera test error:', error);
      setState((prev) => ({ ...prev, cameraWorking: false, testingCamera: false }));

      // Permission denied
      if (errorMsg.includes('Permission denied') || errorMsg.includes('NotAllowedError')) {
        message.error('Camera permission denied. Check browser settings.');
      } else {
        message.error(`Camera test failed: ${errorMsg}`);
      }
    }
  }, [state.selectedVideoDevice]);

  if (state.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto bg-gray-800 rounded-lg p-8">
        <h1 className="text-3xl font-bold text-white mb-8">Device Settings</h1>

        {/* Microphone Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <FaMicrophone /> Microphone
          </h2>

          {state.audioDevices.length > 0 ? (
            <>
              <Select
                className="w-full mb-4"
                placeholder="Select microphone"
                value={state.selectedAudioDevice}
                onChange={(value) =>
                  setState((prev) => ({
                    ...prev,
                    selectedAudioDevice: value,
                    micWorking: null,
                  }))
                }
                options={state.audioDevices.map((device) => ({
                  label: device.label,
                  value: device.deviceId,
                }))}
              />

              <Button
                type="primary"
                onClick={testMicrophone}
                loading={state.testingMic}
                block
                className="mb-4"
              >
                Test Microphone
              </Button>

              {state.micWorking === true && (
                <div className="flex items-center gap-2 text-green-400 p-3 bg-green-900/30 rounded">
                  <FaCheck /> Microphone is working correctly
                </div>
              )}

              {state.micWorking === false && (
                <div className="flex items-center gap-2 text-red-400 p-3 bg-red-900/30 rounded">
                  <FaTimes /> Microphone is not working
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-400">No microphones found</p>
          )}
        </div>

        {/* Camera Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <FaVideo /> Camera
          </h2>

          {state.videoDevices.length > 0 ? (
            <>
              <Select
                className="w-full mb-4"
                placeholder="Select camera"
                value={state.selectedVideoDevice}
                onChange={(value) =>
                  setState((prev) => ({
                    ...prev,
                    selectedVideoDevice: value,
                    cameraWorking: null,
                  }))
                }
                options={state.videoDevices.map((device) => ({
                  label: device.label,
                  value: device.deviceId,
                }))}
              />

              <Button
                type="primary"
                onClick={testCamera}
                loading={state.testingCamera}
                block
                className="mb-4"
              >
                Test Camera
              </Button>

              {state.cameraWorking === true && (
                <div className="flex items-center gap-2 text-green-400 p-3 bg-green-900/30 rounded">
                  <FaCheck /> Camera is working correctly
                </div>
              )}

              {state.cameraWorking === false && (
                <div className="flex items-center gap-2 text-red-400 p-3 bg-red-900/30 rounded">
                  <FaTimes /> Camera is not working
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-400">No cameras found</p>
          )}
        </div>

        {/* Ready to Join */}
        <div className="mt-8 p-4 bg-blue-900/30 rounded-lg text-center">
          {state.micWorking && state.cameraWorking ? (
            <p className="text-green-400 font-semibold">
              ✓ All devices ready! You can now join the interview.
            </p>
          ) : (
            <p className="text-gray-400">Test your devices before joining the interview</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeetingAccessScreen;
