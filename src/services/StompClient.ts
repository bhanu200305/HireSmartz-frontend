export class StompClient {
  private socket: WebSocket | null = null;
  private connected = false;
  private subscriptions = new Map<string, (body: any) => void>();
  private reconnectTimeout: any = null;

  constructor(private url: string) {}

  public connect(token?: string, onConnected?: () => void) {
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      let connectFrame = `CONNECT\naccept-version:1.1,1.2\nheart-beat:10000,10000\n`;
      if (token) {
        connectFrame += `passcode:${token}\n`;
        connectFrame += `Authorization:Bearer ${token}\n`;
      }
      connectFrame += `\n\0`;
      this.socket?.send(connectFrame);
    };

    this.socket.onmessage = (event) => {
      const data = event.data;
      if (typeof data !== 'string') return;

      const nullIndex = data.indexOf('\0');
      const frameStr = nullIndex !== -1 ? data.slice(0, nullIndex) : data;

      const parts = frameStr.split('\n\n');
      const headerPart = parts[0] || '';
      const body = parts.slice(1).join('\n\n').trim();

      const headerLines = headerPart.split('\n');
      const command = headerLines[0]?.trim();
      const headers: Record<string, string> = {};

      for (let i = 1; i < headerLines.length; i++) {
        const line = headerLines[i];
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          const key = line.slice(0, colonIdx).trim();
          const val = line.slice(colonIdx + 1).trim();
          headers[key] = val;
        }
      }

      if (command === 'CONNECTED') {
        this.connected = true;
        onConnected?.();
        this.subscriptions.forEach((_, dest) => {
          this.sendSubscribe(dest);
        });
      } else if (command === 'MESSAGE') {
        const dest = headers['destination'];
        if (dest && this.subscriptions.has(dest)) {
          const callback = this.subscriptions.get(dest);
          if (callback) {
            try {
              const parsedBody = body ? JSON.parse(body) : null;
              callback(parsedBody);
            } catch (e) {
              console.error('Error parsing STOMP message body:', e);
              callback(body);
            }
          }
        }
      }
    };

    this.socket.onclose = () => {
      this.connected = false;
      this.scheduleReconnect(token, onConnected);
    };

    this.socket.onerror = (error) => {
      console.error('STOMP socket error:', error);
      this.socket?.close();
    };
  }

  private sendSubscribe(destination: string) {
    if (!this.connected) return;
    const subFrame = `SUBSCRIBE\nid:${destination}\ndestination:${destination}\n\n\0`;
    this.socket?.send(subFrame);
  }

  public subscribe(destination: string, callback: (body: any) => void) {
    this.subscriptions.set(destination, callback);
    if (this.connected) {
      this.sendSubscribe(destination);
    }
  }

  public unsubscribe(destination: string) {
    this.subscriptions.delete(destination);
    if (this.connected && this.socket) {
      const unsubFrame = `UNSUBSCRIBE\nid:${destination}\n\n\0`;
      this.socket.send(unsubFrame);
    }
  }

  private scheduleReconnect(token?: string, onConnected?: () => void) {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      console.log('Attempting to reconnect STOMP WebSocket...');
      this.connect(token, onConnected);
    }, 5000);
  }

  public disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.subscriptions.clear();
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
    this.connected = false;
  }
}
