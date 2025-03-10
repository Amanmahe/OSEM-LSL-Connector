"use client";

import React, { useRef, useState, useEffect } from 'react';
import { core } from "@tauri-apps/api";
import { Wifi } from 'lucide-react';

const App = () => {
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [channels, setChannels] = useState(8);
  const [connect, setConnect] = useState(false);

  const ws1 = useRef<WebSocket | null>(null);
  const ws2 = useRef<WebSocket | null>(null);

  const isProcessing = useRef(false);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    if (target) {
      target.classList.add("scale-95", "shadow-active");
      setTimeout(() => {
        target.classList.remove("scale-95", "shadow-active");
      }, 100);
    }
  };

  const initializeWebSocket = (url: string, deviceRef: React.MutableRefObject<WebSocket | null>, onOpenCallback: () => void) => {
    return new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocket(url);
      deviceRef.current = socket;

      socket.onopen = () => {
        console.log(`WebSocket connection established: ${url}`);
          const channelConfig = [];
      channelConfig.push(
        { command: "reset", parameters: [] },
        { command: "sdatac", parameters: [] },
        { command: "wreg", parameters: [0x01, 0b10010011] },
        { command: "wreg", parameters: [0x02, 0xC0] },
        { command: "wreg", parameters: [0x03, 0xEC] },
        { command: "wreg", parameters: [0x15, 0b00100000] },
        { command: "wreg", parameters: [0x05, 0x60] },
        { command: "wreg", parameters: [0x06, 0x60] },
        { command: "wreg", parameters: [0x07, 0x60] },
        { command: "wreg", parameters: [0x08, 0x60] },
        { command: "wreg", parameters: [0x09, 0x60] },
        { command: "wreg", parameters: [0x0A, 0x60] },
        { command: "wreg", parameters: [0x0B, 0x60] },
        { command: "wreg", parameters: [0x0C, 0x60] },
        { command: "status", parameters: [] },
        { command: "rdatac", parameters: [] }
      );

      channelConfig.forEach((cmd) =>socket.send(JSON.stringify(cmd)));
      console.log(channelConfig);
        onOpenCallback();
        resolve(socket);
      };

      socket.onerror = (error) => {
        console.error(`WebSocket error on ${url}:`, error);
        reject(error);
      };
    });
  };

  useEffect(() => {
    if (!connect) return;

    let device1Connected = false;
    let device2Connected = false;

    initializeWebSocket("ws://192.168.0.22:81", ws1, () => { device1Connected = true; })
      .then(() => initializeWebSocket("ws://192.168.0.100:81", ws2, () => { device2Connected = true; }))
      .catch(() => console.warn("Second device not available, using single device."))
      .finally(() => {
        setDeviceConnected(true);
        setChannels(device2Connected ? 16 : 8);
      });

    return () => {
      if (ws1.current) ws1.current.close();
      if (ws2.current) ws2.current.close();
      setDeviceConnected(false);
    };
  }, [connect]);

  const handleWebSocketMessage = (event: MessageEvent, deviceIndex: number) => {
    isProcessing.current = true;
    const data = event.data;

    if (typeof data === "string") {
      console.warn("Unexpected string data received:", data);
      return;
    }

    if (data instanceof Blob) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const buffer = Buffer.from(reader.result as ArrayBuffer);
        const blockSize = 32;
        for (let blockLocation = 0; blockLocation < buffer.length; blockLocation += blockSize) {
          const block = buffer.slice(blockLocation, blockLocation + blockSize);
          const channelData: number[] = [];
          for (let channel = 0; channel < 8; channel++) {
            const offset = 8 + channel * 3;
            const sample = block.readIntBE(offset, 3);
            channelData.push(sample);
          }
          // Start sending data continuously at intervals
       
          core.invoke('start_streaming_1', { channelData: channelData })
            .then((response) => {
              console.log('Data sent to backend successfully:', response);
            })
            .catch((error) => {
              console.error('Error sending data to backend:', error);
            });            
          // console.log(channelData);

        }
      };
      reader.readAsArrayBuffer(data);
    } else {
      console.error("Unexpected data format received:", data);
    }
  };

  const handleWebSocketMessage2= (event: MessageEvent, deviceIndex: number) => {
    isProcessing.current = true;
    const data = event.data;

    if (typeof data === "string") {
      console.warn("Unexpected string data received:", data);
      return;
    }

    if (data instanceof Blob) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const buffer = Buffer.from(reader.result as ArrayBuffer);
        const blockSize = 32;
        for (let blockLocation = 0; blockLocation < buffer.length; blockLocation += blockSize) {
          const block = buffer.slice(blockLocation, blockLocation + blockSize);
          const channelData: number[] = [];
          for (let channel = 0; channel < 8; channel++) {
            const offset = 8 + channel * 3;
            const sample = block.readIntBE(offset, 3);
            channelData.push(sample);
          }
          // Start sending data continuously at intervals
       
          core.invoke('start_streaming_2', { channelData: channelData })
            .then((response) => {
              console.log('Data sent to backend successfully:', response);
            })
            .catch((error) => {
              console.error('Error sending data to backend:', error);
            });            
          // console.log(channelData);

        }
      };
      reader.readAsArrayBuffer(data);
    } else {
      console.error("Unexpected data format received:", data);
    }
  };

  useEffect(() => {
    if (ws1.current) ws1.current.onmessage = (event) => handleWebSocketMessage(event, 0);
    if (ws2.current) ws2.current.onmessage = (event) => handleWebSocketMessage2(event, 1);
  }, [channels]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-200">
      <div
        onClick={() => setConnect(true)}
        onMouseDown={handleMouseDown}
        className={`
          flex items-center justify-center w-28 h-28 rounded-full cursor-pointer bg-gray-200 shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff]
          transition-all duration-600 relative ${isProcessing.current ? 'animate-[rotateShadow_1.5s_linear_infinite]' : ''}
        `}
        style={{ pointerEvents: isProcessing.current ? 'none' : 'auto' }}
      >
        <Wifi
          size={40}
          className={`transition-colors duration-300 ${deviceConnected ? 'text-green-500' : 'text-gray-500'}`}
        />
      </div>
    </div>
  );
};

export default App;
