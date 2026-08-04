class WebSocketService {
  private socketRef: any;
  private timerRef: any;
  private socketConnected: boolean = false;
  //   private static SOCKET_URL = 'ws://192.168.10.109:8081/ws'
  private static SOCKET_URL = `wss://${import.meta.env.VITE_BACKEND_ENDPOINT.replace('https://', '')}/ws`;
  constructor() {
    this.socketRef = null;
    this.timerRef = null;
  }

  public initWebSocket(
    connectedCallback?: () => void,
    messageCallback?: (event: MessageEvent) => void
  ) {
    const socket = new window.WebSocket(`${WebSocketService.SOCKET_URL}`);
    this.socketRef = socket;
    this.socketRef.onopen = () => {
      connectedCallback?.();
    };

    this.socketRef.onmessage = (event: MessageEvent) => {
      messageCallback?.(event);
    };

    return this;
  }

  public onmessage(callback: (event: MessageEvent) => void) {
    if (!this.socketRef) {
      console.error('WebSocket not initialized');
      return;
    }
    this.socketRef.onmessage = callback;
  }

  public joinChannel = async (
    channel: string,
    uid: string,
    _token: string,
    role: string,
    name: string,
    bookingId?: string
  ) => {
    this.socketRef.send(
      JSON.stringify({
        type: 'join-room',
        data: {
          roomId: channel,
          userId: uid,
          name: name,
          role: role,
          bookingId: bookingId || null,
        },
      })
    );
  };

  public sendMessage = (
    type: 'message' | 'join-room' | 'start-screen-share' | 'stop-screen-share',
    data: any
  ) => {
    if (!this.socketRef) {
      return;
    }
    this.socketRef.send(
      JSON.stringify({
        type,
        data,
      })
    );
  };

  public close = () => {
    if (this.socketRef) {
      this.socketRef.close();
      this.socketRef = null;
    }
    if (this.timerRef) {
      clearInterval(this.timerRef);
      this.timerRef = null;
    }
  };
}

export default WebSocketService;
