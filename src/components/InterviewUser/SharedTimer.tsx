import React, { useEffect, useState, useRef, Ref } from 'react';
import WebSocketService from '../../services/WebsocketService';

type SharedTimerProps = {
  roomName: string | null; // LiveKit room name (replaces Agora channel)
  isJoined: boolean;
  participantIdentity: string; // LiveKit participant identity (replaces uid)
  token: string;
  participantRole: 'CANDIDATE' | 'RECRUITER' | 'INTERVIEWER'; // LiveKit role
  participantName: string; // Participant name (replaces name param)
  setUsers: (users: any[]) => void;
  socketRef: React.MutableRefObject<any>;
  startTime: number | null;
  setStartTime: (time: number) => void;
  bookingId?: number;
};

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const SharedTimer: React.FC<SharedTimerProps> = ({
  roomName,
  isJoined,
  token,
  participantIdentity,
  participantRole,
  participantName,
  setUsers,
  socketRef,
  startTime,
  setStartTime,
  bookingId,
}) => {
  const [elapsed, setElapsed] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (roomName && isJoined) {
      const socket = new WebSocketService();

      socketRef.current = socket.initWebSocket(
        () => {
          // LiveKit room name replaces Agora channel
          socketRef.current?.joinChannel(
            roomName,
            participantIdentity,
            token,
            participantRole,
            participantName,
            bookingId
          );
        },
        (event: any) => {
          const data = JSON.parse(event.data);
          setStartTime(new Date(data.start.time).getTime());
          setUsers(data.users || []);
        }
      );

      return () => {
        socketRef.current?.close();
        setUsers([]);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [roomName, isJoined, participantIdentity, token, participantRole, participantName]);

  useEffect(() => {
    if (startTime && isJoined) {
      const updateElapsed = () => {
        const diff = Math.floor((new Date().getTime() - startTime) / 1000);
        setElapsed(diff);
      };

      updateElapsed(); // Initial call
      timerRef.current = setInterval(updateElapsed, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [startTime, isJoined]);

  if (!roomName) return null;

  return (
    <div className="relative text-white font-medium text-base z-[100]">
      {startTime ? formatTime(elapsed) : '00:00:00'}
    </div>
  );
};

export default SharedTimer;
