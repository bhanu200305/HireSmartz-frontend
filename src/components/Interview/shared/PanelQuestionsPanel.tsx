import { useEffect, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import { MdClose } from 'react-icons/md';

export type PanelQuestionItem = {
  question_text: string;
  scoring_sections?: string[];
};

/**
 * A Hiring Panel round's reference question set, pushed over the LiveKit
 * data channel by ai-service once the room opens (see that service's
 * `livekit_room_data_publisher.py`). Ported from Flow A's identical
 * `InterviewLiveKit.tsx`, which had the only listener for this message —
 * Flow B (`InterviewRoomLayout.tsx`, what the real `/interviewer-join` link
 * actually renders) never subscribed to it at all, so ai-service's push was
 * received by the LiveKit SDK and silently dropped.
 */
export type PanelQuestionsMessage = {
  resume_based: PanelQuestionItem[];
  jd_based: PanelQuestionItem[];
  instructions: string;
};

/**
 * Subscribes to the room's data channel and returns the latest Hiring Panel
 * question set received. `isInterviewer` gates it the same way Flow A's
 * `isRecruiter` check does — ai-service already targets
 * `destination_identities` at the interviewer, this is a defensive
 * fallback for the documented broadcast case, not the primary guard.
 */
export function usePanelQuestions(isInterviewer: boolean): PanelQuestionsMessage | null {
  const room = useRoomContext();
  const [panelQuestions, setPanelQuestions] = useState<PanelQuestionsMessage | null>(null);

  useEffect(() => {
    if (!room || !isInterviewer) return undefined;

    const handleDataReceived = (payload: Uint8Array) => {
      let decoded: any;
      try {
        decoded = JSON.parse(new TextDecoder().decode(payload));
      } catch {
        return;
      }

      if (decoded.resume_based !== undefined || decoded.instructions !== undefined) {
        setPanelQuestions({
          resume_based: Array.isArray(decoded.resume_based) ? decoded.resume_based : [],
          jd_based: Array.isArray(decoded.jd_based) ? decoded.jd_based : [],
          instructions: typeof decoded.instructions === 'string' ? decoded.instructions : '',
        });
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, isInterviewer]);

  return panelQuestions;
}

const QuestionList = ({ title, items }: { title: string; items: PanelQuestionItem[] }) => {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {title}
      </h4>
      <ol className="list-decimal space-y-3 pl-5">
        {items.map((q, idx) => (
          <li key={idx} className="text-sm leading-relaxed text-neutral-200">
            {q.question_text}
            {q.scoring_sections && q.scoring_sections.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {q.scoring_sections.map((section) => (
                  <span
                    key={section}
                    className="rounded-full bg-neutral-700/70 px-2 py-0.5 text-[10px] text-neutral-300"
                  >
                    {section}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
};

export type PanelQuestionsPanelProps = {
  open: boolean;
  onClose: () => void;
  panelQuestions: PanelQuestionsMessage | null;
  className?: string;
};

// Self-contained floating card, same shape as `ChatPanel`/`SettingsPanel` in
// this folder — Flow B has no `Sidebar` wrapper to embed into.
export const PanelQuestionsPanel = ({
  open,
  onClose,
  panelQuestions,
  className,
}: PanelQuestionsPanelProps) => {
  if (!open) return null;

  const hasQuestions =
    !!panelQuestions &&
    (panelQuestions.resume_based.length > 0 || panelQuestions.jd_based.length > 0);

  return (
    <div
      className={`flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 ${className ?? ''}`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">Panel Questions</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel questions"
          className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <MdClose size={18} />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-3">
        {panelQuestions?.instructions && (
          <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-amber-100">
            {panelQuestions.instructions}
          </div>
        )}

        {!hasQuestions ? (
          <p className="text-sm text-neutral-400">No panel questions received yet.</p>
        ) : (
          <>
            <QuestionList title="Resume-based" items={panelQuestions!.resume_based} />
            <QuestionList title="JD-based" items={panelQuestions!.jd_based} />
          </>
        )}
      </div>
    </div>
  );
};

export default PanelQuestionsPanel;
