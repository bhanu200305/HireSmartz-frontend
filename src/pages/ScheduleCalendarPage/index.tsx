import { useState } from 'react';
import '@nylas/react/style.css';
import { NylasScheduling } from '@nylas/react';
import type { LANGUAGE_CODE } from '@nylas/react';
import { useSearchParams } from 'react-router-dom';
import { NYLAS_SCHEDULER_API_URL, NYLAS_CLIENT_ID } from '../../constants/app.constants';
import InterviewConsentModal from '../../components/shared/ui/InterviewConsentModal';

type LangCode = 'en' | 'es';

const T = {
  en: {
    consentTitle: 'Consent to AI-Assisted Interview',
    consentLine1:
      'This interview uses AI technology to conduct, record, and evaluate your responses.',
    consentLine2: 'By proceeding, you acknowledge that:',
    consentLine3: '\u00A0\u00A0• Your responses may be recorded, analyzed and stored.',
    consentLine4: '\u00A0\u00A0• Full consent will be required when the interview begins.',
    consentCheckboxLabel: 'I consent to participate in this AI-assisted recorded interview.',
    cancel: 'CANCEL',
    continue: 'CONTINUE',
  },
  es: {
    consentTitle: 'Consentimiento para la entrevista asistida por IA',
    consentLine1:
      'Esta entrevista utiliza tecnología de IA para realizar, grabar y evaluar sus respuestas.',
    consentLine2: 'Al continuar, usted reconoce que:',
    consentLine3: '\u00A0\u00A0• Sus respuestas pueden ser grabadas, analizadas y almacenadas.',
    consentLine4:
      '\u00A0\u00A0• Se requerirá el consentimiento total cuando comience la entrevista.',
    consentCheckboxLabel:
      'Doy mi consentimiento para participar en esta entrevista en video grabada asistida por IA.',
    cancel: 'CANCELAR',
    continue: 'CONTINUAR',
  },
} as const;

const voiceConsentDescriptionEn = (
  <div className="space-y-4 text-left">
    <p>Before proceeding, please review and confirm the following:</p>
    <p>
      This interview will be conducted using an AI voice agent. By checking the box below, you agree
      to:
    </p>
    <ul className="list-disc pl-6 space-y-1">
      <li>
        Have this call <strong>recorded</strong>
      </li>
      <li>
        Have your responses <strong>analyzed using AI-based tools</strong> as part of the evaluation
        process
      </li>
      <li>
        Allow the recording to be <strong>stored and reviewed</strong> by authorized personnel
        and/or hiring partners
      </li>
    </ul>
  </div>
);

const voiceConsentDisclaimerEn = (
  <p className="mt-4">
    You may decline without affecting your candidacy — an alternative interview option (e.g., live
    call with a recruiter) is available upon request. Please contact the hiring manager directly.
  </p>
);

const voiceConsentDescriptionEs = (
  <div className="space-y-4 text-left">
    <p>Antes de continuar, revise y confirme lo siguiente:</p>
    <p>
      Esta entrevista se realizará utilizando un agente de voz de IA. Al marcar la casilla a
      continuación, acepta:
    </p>
    <ul className="list-disc pl-6 space-y-1">
      <li>
        Que esta llamada sea <strong>grabada</strong>
      </li>
      <li>
        Que sus respuestas sean <strong>analizadas utilizando herramientas basadas en IA</strong>{' '}
        como parte del proceso de evaluación
      </li>
      <li>
        Permitir que la grabación sea <strong>almacenada y revisada</strong> por personal autorizado
        y/o socios de contratación
      </li>
    </ul>
  </div>
);

const voiceConsentDisclaimerEs = (
  <p className="mt-4">
    Puede rechazarla sin afectar su candidatura; hay una opción de entrevista alternativa (por
    ejemplo, una llamada en vivo con un reclutador) disponible a solicitud. Comuníquese directamente
    con el gerente de contratación.
  </p>
);

/**
 * ScheduleCalendarPage
 *
 * A public-facing page that embeds the Nylas booking UI for candidates
 * to schedule interviews with recruiters / hiring managers.
 *
 * URL params:
 *  - config_id  (required) - Nylas Scheduling Page configurationId
 *  - name       (optional) - candidate name pre-fill
 *  - email      (optional) - candidate email pre-fill
 *  - lang       (optional) - language code (e.g. "en" | "es" | "fr" | "de" | "ja" | "ko" | "nl" | "sv" | "zh")
 *
 * Timezone is always detected from the browser's local settings (Intl API).
 *
 * Example:
 *   /schedule-calendar?config_id=abc123&name=Jane%20Doe&email=jane@example.com&lang=es
 *
 * This route is PUBLIC - candidates do not need a CFP account.
 */
const ScheduleCalendarPage = () => {
  const [searchParams] = useSearchParams();
  const roundTypeParam = (
    searchParams.get('roundtype') || searchParams.get('roundType')
  )?.toLowerCase();
  const [hasConsent, setHasConsent] = useState(roundTypeParam === 'inperson');

  const configId = searchParams.get('config_id') ?? '';
  const candidateName = searchParams.get('name') ?? '';
  const candidateEmail = searchParams.get('email') ?? '';
  const langParam = searchParams.get('lang') ?? undefined;

  // Always use the browser's local timezone — ignore any ?tz= param
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const lang = (langParam === 'es' ? 'es' : 'en') as LangCode;
  const t = T[lang];

  const bookingInfo =
    candidateName || candidateEmail
      ? {
          primaryParticipant: {
            name: candidateName,
            email: candidateEmail,
          },
        }
      : undefined;

  const defaultSchedulerState = { selectedTimezone: localTimezone };

  if (!configId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f0f4f8] px-4">
        <div className="bg-white rounded-2xl shadow-md p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">&#128197;</div>
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">No Calendar Found</h1>
          <p className="text-gray-500 text-sm">
            The scheduling link you followed is missing a configuration ID. Please check the link
            and try again, or contact the recruiter for a valid booking link.
          </p>
        </div>
      </div>
    );
  }

  if (!hasConsent) {
    const description = lang === 'es' ? voiceConsentDescriptionEs : voiceConsentDescriptionEn;
    const disclaimer = lang === 'es' ? voiceConsentDisclaimerEs : voiceConsentDisclaimerEn;
    const title =
      lang === 'es'
        ? 'Consentimiento para la entrevista asistida por IA'
        : 'Consent for AI-Assisted Interview';
    const consentLabel =
      lang === 'es'
        ? 'He leído y acepto lo anterior, y doy mi consentimiento para esta entrevista grabada y asistida por IA.'
        : 'I have read and agree to the above, and I consent to this recorded, AI-assisted interview.';
    return (
      <InterviewConsentModal
        title={title}
        description={description}
        disclaimer={disclaimer}
        consentLabel={consentLabel}
        cancelText={t.cancel}
        continueText={t.continue}
        requireCheckbox={true}
        panelClassName="max-w-2xl"
        onCancel={() => window.close()}
        onContinue={() => setHasConsent(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-3xl">
        <NylasScheduling
          schedulerApiUrl={NYLAS_SCHEDULER_API_URL}
          clientId={NYLAS_CLIENT_ID}
          configurationId={configId}
          bookingInfo={bookingInfo}
          nylasBranding={false}
          defaultLanguage={langParam as LANGUAGE_CODE}
          defaultSchedulerState={defaultSchedulerState}
        />
      </div>
    </div>
  );
};

export default ScheduleCalendarPage;
