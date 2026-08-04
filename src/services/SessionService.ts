class SessionService {
  static getSessionId(): string {
    let sessionId = sessionStorage.getItem(import.meta.env.SESSION_kEY);
    if (!sessionId) {
      sessionId = `vid_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      sessionStorage.setItem(import.meta.env.SESSION_KEY, sessionId);
    }
    return sessionId;
  }
}

export default SessionService;
