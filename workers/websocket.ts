self.onmessage = (event) => {
    const { action, websocketUrl, channelConfigs } = event.data;

    if (action === "startWebSocket") {
        const socket = new WebSocket(websocketUrl);

        socket.onopen = () => {
            console.log("WebSocket connection established.");
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
            // Send channel configurations dynamically

            channelConfig.forEach((cmd) => socket.send(JSON.stringify(cmd)));

            self.postMessage({ action: "status", message: "WebSocket connected" });
        };

        socket.onmessage = async (event) => {
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
          let newData: number[][] = Array.from({ length: 8 }, () => []); // Ensure newData has 8 empty arrays
          const sampleRate = 2000; // 2000 samples per second
          const sampleInterval = 1000 / sampleRate; // 0.5 ms per sample
          for (let blockLocation = 0; blockLocation < buffer.length; blockLocation += blockSize) {
            const block = buffer.slice(blockLocation, blockLocation + blockSize);
            const channelData = [];
            for (let channel = 0; channel < 8; channel++) {
              const offset = 8 + channel * 3;
              const sample = block.readIntBE(offset, 3);
              channelData.push(sample);
              newData[channel].push(sample);
            }
            const timestamp = Date.now();
            self.postMessage({ action: "eegData", timestamp: timestamp, data: channelData });

            // console.log("Current newData[0] length:", newData[0].length)
          }
        };
        reader.readAsArrayBuffer(data);
      } else {
        console.error("Unexpected data format received:", data);
      }

        };

        socket.onclose = () => {
            self.postMessage({ action: "status", message: "WebSocket disconnected" });
        };
    }
};
