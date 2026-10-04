import { useState, useEffect, useRef } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/es';
import clsx from 'clsx';
import {
  LuChevronLeft,
  LuChevronRight,
  LuChevronDown,
  LuCalendarDays,
  LuCircleCheck,
  LuPhone,
  LuSearch,
} from 'react-icons/lu';
import { RxClock } from 'react-icons/rx';
import { useSearchParams } from 'react-router-dom';
import { Loader } from '../../components/shared/ui/loader';
import InterviewConsentModal from '../../components/shared/ui/InterviewConsentModal';
import { showToast } from '../../components/shared';
import { AI_SCHEDULE_WINDOW_DAYS, AI_SLOT_MIN_LEAD_MINUTES } from '../../constants/app.constants';
import {
  InterviewApiError,
  useBookAiSlotMutation,
  useCallNowMutation,
  useGetSchedulingLinkQuery,
  useGetSchedulingSlotsQuery,
  useGetTimezonesQuery,
  useLazyGetAiSlotsQuery,
} from '../../api/interview-service/client';

//  Types

interface AiSlot {
  start_time: string;
  end_time: string;
  displayTime: string;
  remaining: number;
}

interface TimezoneOption {
  id: string;
  label: string;
  offset: string;
}

type LangCode = 'en' | 'es';

//  Translations

const T = {
  en: {
    minutes: 'minutes',
    selectDate: 'Select a date to see available times',
    confirmTitle: 'Confirm Your Booking',
    confirmButton: 'Confirm Booking',
    back: 'Back',
    noSlots: 'No available slots for this day.',
    slotsError: 'Failed to load available slots. Please try again.',
    slotExpired: 'That time has passed. Please pick another slot.',
    bookingError: 'Something went wrong. Please try again.',
    scheduledTitle: 'Interview Scheduled!',
    scheduledBody: 'Your AI screening call has been confirmed. A confirmation will be sent to',
    callNowButton: 'Call me now instead',
    callNowHint: "Don't want to wait for a slot? We can call you right away.",
    callNowConfirm: 'Calling…',
    callNowTitle: "We're calling you now",
    callNowBody:
      'Your phone should ring shortly. Please make sure you’re somewhere quiet and ready to talk.',
    callNowError: "We couldn't start the call. Please pick a slot instead.",
    callNowPromptTitle: 'Ready for your call?',
    callNowPromptBody:
      'Press the button below and we’ll call you right away. Please make sure you’re somewhere quiet with your phone nearby.',
    callNowPromptButton: 'Call me now',
    pickTimeInstead: 'Pick a time instead',
    callAlreadyPlaced: 'We’re already calling you. Please keep your phone nearby.',
    contactUnavailable:
      'We don’t have a phone number for you, so we can’t call right now. Please pick a time instead.',
    linkExpiredTitle: 'Scheduling Link Expired',
    linkExpiredBody: 'This link has expired and cannot be used again.',
    panelTitle: 'Schedule your panel interview',
    panelBody:
      'Your interview is with a panel from the hiring team. Pick a time that works for you on the scheduling page; the panel’s live availability is shown there.',
    panelChooseTime: 'Choose a time',
    panelAfterBooking:
      'Once you’ve picked a time you’ll get a calendar invite by email. You can close this page after booking.',
    panelNotReadyTitle: 'Scheduling isn’t ready yet',
    panelNotReadyBody:
      'The hiring team is still setting up their calendar for this interview. You’ll get an email with a link as soon as it’s ready.',
    invalidTitle: 'Invalid Scheduling Link',
    invalidBody:
      'This scheduling link appears to be invalid or incomplete. Please use the link from your invitation email.',
    english: 'English',
    espanol: 'Español',
    searchTimezone: 'Search timezone...',
    consentTitle: 'Consent to AI-Assisted Interview',
    consentLine1:
      'This interview uses AI technology to conduct, record, and evaluate your responses.',
    consentLine2: 'By proceeding, you acknowledge that:',
    consentLine3: '\u00A0\u00A0• Your responses may be recorded, analyzed and stored.',
    consentLine4: '\u00A0\u00A0• Full consent will be required when the interview begins.',
    consentCheckboxLabel: 'I consent to participate in this AI-assisted recorded interview.',
    cancel: 'Cancel',
    continue: 'Continue',
    successConsentText:
      'You will receive an AI-assisted call at your scheduled time. Consent will be required to begin the interview.',
    weekDays: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  },
  es: {
    minutes: 'minutos',
    selectDate: 'Selecciona una fecha para ver los horarios disponibles',
    confirmTitle: 'Confirma tu reserva',
    confirmButton: 'Confirmar reserva',
    back: 'Atrás',
    noSlots: 'No hay horarios disponibles para este día.',
    slotsError: 'Error al cargar los horarios. Por favor, inténtalo de nuevo.',
    slotExpired: 'Esa hora ya pasó. Por favor, elige otro horario.',
    bookingError: 'Algo salió mal. Por favor, inténtalo de nuevo.',
    scheduledTitle: 'Entrevista programada!',
    scheduledBody:
      'Tu llamada de selección de IA ha sido confirmada. Se enviará una confirmación a',
    callNowButton: 'Llámame ahora',
    callNowHint: '¿No quieres esperar a un horario? Podemos llamarte de inmediato.',
    callNowConfirm: 'Llamando…',
    callNowTitle: 'Te estamos llamando ahora',
    callNowBody:
      'Tu teléfono debería sonar en breve. Asegúrate de estar en un lugar tranquilo y listo para hablar.',
    callNowError: 'No pudimos iniciar la llamada. Por favor, elige un horario.',
    callNowPromptTitle: '¿Listo para tu llamada?',
    callNowPromptBody:
      'Presiona el botón de abajo y te llamaremos de inmediato. Asegúrate de estar en un lugar tranquilo y con tu teléfono cerca.',
    callNowPromptButton: 'Llámame ahora',
    pickTimeInstead: 'Elegir un horario',
    callAlreadyPlaced: 'Ya te estamos llamando. Por favor, mantén tu teléfono cerca.',
    contactUnavailable:
      'No tenemos un número de teléfono tuyo, así que no podemos llamarte ahora. Por favor, elige un horario.',
    linkExpiredTitle: 'Enlace de programación vencido',
    linkExpiredBody: 'Este enlace ha vencido y ya no se puede usar.',
    panelTitle: 'Programa tu entrevista de panel',
    panelBody:
      'Tu entrevista es con un panel del equipo de contratación. Elige un horario que te convenga en la página de programación, donde se muestra la disponibilidad del panel en tiempo real.',
    panelChooseTime: 'Elegir un horario',
    panelAfterBooking:
      'Cuando elijas un horario recibirás una invitación de calendario por correo. Puedes cerrar esta página después de reservar.',
    panelNotReadyTitle: 'La programación aún no está lista',
    panelNotReadyBody:
      'El equipo de contratación todavía está configurando su calendario para esta entrevista. Recibirás un correo con un enlace en cuanto esté listo.',
    invalidTitle: 'Enlace no válido',
    invalidBody:
      'Este enlace de programación parece ser inválido o incompleto. Usa el enlace de tu correo de invitación.',
    english: 'English',
    espanol: 'Español',
    searchTimezone: 'Buscar zona horaria...',
    consentTitle: 'Consentimiento para la entrevista asistida por IA',
    consentLine1:
      'Esta entrevista utiliza tecnología de IA para realizar, grabar y evaluar sus respuestas.',
    consentLine2: 'Al continuar, usted reconoce que:',
    consentLine3: '\u00A0\u00A0• Sus respuestas pueden ser grabadas, analizadas y almacenadas.',
    consentLine4:
      '\u00A0\u00A0• Se requerirá el consentimiento total cuando comience la entrevista.',
    consentCheckboxLabel:
      'Doy mi consentimiento para participar en esta entrevista en video grabada asistida por IA.',
    cancel: 'Cancelar',
    continue: 'Continuar',
    successConsentText:
      'Recibirá una llamada asistida por IA a la hora programada. Se requerirá consentimiento para iniciar la entrevista.',
    weekDays: ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'],
  },
} as const;

//  Constants

const LANG_OPTIONS: { value: LangCode; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
];

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
    You may decline without affecting your candidacy. An alternative interview option (e.g., live
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

//  Component

const AiCallSchedulePage = () => {
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';
  const langParam = (searchParams.get('lang') ?? 'en') as LangCode;
  // `&action=call_now` (the "Call me now" link in the invite email) only
  // pre-selects a confirmation screen — the call is NEVER placed on page
  // load. Email link scanners/prefetchers GET every link in an email before
  // a human sees it, so an auto-fire would ring a candidate who never opened
  // the email; the candidate has to press the button on a real page load.
  const isCallNowAction = searchParams.get('action') === 'call_now';
  // Always use the browser's local timezone — ignore any ?tz= param
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const today = dayjs().startOf('day');
  const maxDate = today.add(AI_SCHEDULE_WINDOW_DAYS, 'day');

  const [lang, setLang] = useState<LangCode>(langParam === 'es' ? 'es' : 'en');
  const [selectedTimezone, setSelectedTimezone] = useState<string>(localTimezone);
  const [tzSearch, setTzSearch] = useState('');
  const [tzDropdownOpen, setTzDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const [currentMonth, setCurrentMonth] = useState<Dayjs>(today);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [slots, setSlots] = useState<AiSlot[]>([]);
  // Authoritative round duration, from the ai-slots response (job-service's
  // recruiter-set value). The `/scheduling/{token}` header duration comes
  // from a different source (scheduling config / a flat 30-min default) and
  // can disagree — prefer this once we have it.
  const [slotDurationMin, setSlotDurationMin] = useState<number | null>(null);
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AiSlot | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [isBooked, setIsBooked] = useState(false);
  const [bookedSlot, setBookedSlot] = useState<AiSlot | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const [calledNow, setCalledNow] = useState(false);
  // call-now outcomes that change what the page offers (see handleCallNow).
  const [callAlreadyPlaced, setCallAlreadyPlaced] = useState(false);
  const [contactUnavailable, setContactUnavailable] = useState(false);
  const [callNowLinkExpired, setCallNowLinkExpired] = useState(false);
  const [callNowPromptDismissed, setCallNowPromptDismissed] = useState(false);

  const tzDropdownRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  const t = T[lang];
  const { data: timezoneData } = useGetTimezonesQuery();
  const [loadAiSlots] = useLazyGetAiSlotsQuery();
  const [bookAiSlot] = useBookAiSlotMutation();
  const [callNow, callNowState] = useCallNowMutation();
  const { data: schedulingLink, error: schedulingError } = useGetSchedulingLinkQuery(token, {
    skip: !token,
  });
  const isPanel = schedulingLink?.interview_type === 'panel';
  const {
    data: panelInfo,
    error: panelInfoError,
    isFetching: isPanelInfoFetching,
  } = useGetSchedulingSlotsQuery(token, { skip: !token || !isPanel });
  const timezones: TimezoneOption[] = (timezoneData?.timezones ?? []).map((timezone) => ({
    id: timezone.id,
    label: timezone.id.replace(/_/g, ' '),
    offset: timezone.utc_offset,
  }));

  //  Apply dayjs locale
  useEffect(() => {
    dayjs.locale(lang);
  }, [lang]);

  //  Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (tzDropdownRef.current && !tzDropdownRef.current.contains(e.target as Node)) {
        setTzDropdownOpen(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isParamsValid = Boolean(token);

  //  Fetch slots
  useEffect(() => {
    if (!selectedDate || !isParamsValid) return;

    const fetchSlots = async (): Promise<void> => {
      setIsSlotsLoading(true);
      setSlotsError(null);
      setSlots([]);
      setSelectedSlot(null);
      setBookingError(null);
      try {
        const response = await loadAiSlots({
          token,
          date: selectedDate.format('YYYY-MM-DD'),
          timezone: selectedTimezone,
        }).unwrap();
        // interview-service returns every slot of the local calendar day
        // (midnight onward), so "today" includes slots that have already
        // passed. Only offer slots at least AI_SLOT_MIN_LEAD_MINUTES out.
        const earliest = dayjs().add(AI_SLOT_MIN_LEAD_MINUTES, 'minute');
        setSlotDurationMin(response.duration_minutes ?? null);
        setSlots(
          response.slots
            .filter((slot) => dayjs(slot.start_time).isAfter(earliest))
            .map((slot) => ({
              ...slot,
              displayTime: `${dayjs(slot.start_time).tz(selectedTimezone).format('h:mm A')} - ${dayjs(slot.end_time).tz(selectedTimezone).format('h:mm A')}`,
            }))
        );
      } catch {
        setSlotsError(t.slotsError);
      } finally {
        setIsSlotsLoading(false);
      }
    };

    fetchSlots();
  }, [selectedDate, selectedTimezone, token, loadAiSlots]);

  const handleBookSlot = async (): Promise<void> => {
    if (!selectedSlot) return;
    // Guard against a slot that lapsed while the picker sat open.
    if (!dayjs(selectedSlot.start_time).isAfter(dayjs().add(AI_SLOT_MIN_LEAD_MINUTES, 'minute'))) {
      setSelectedSlot(null);
      setBookingError(t.slotExpired);
      if (selectedDate) {
        void loadAiSlots({
          token,
          date: selectedDate.format('YYYY-MM-DD'),
          timezone: selectedTimezone,
        });
      }
      return;
    }
    setIsBooking(true);
    setBookingError(null);
    try {
      await bookAiSlot({
        token,
        start_time: selectedSlot.start_time,
        timezone: selectedTimezone,
      }).unwrap();
      setBookedSlot(selectedSlot);
      setIsBooked(true);
    } catch (error) {
      const apiError = error as InterviewApiError;
      const msg =
        apiError.status === 409
          ? 'That slot was just filled. Refreshing available times.'
          : t.bookingError;
      setBookingError(msg);
      showToast({ message: msg, type: 'error' });
      if (apiError.status === 409 && selectedDate) {
        void loadAiSlots({
          token,
          date: selectedDate.format('YYYY-MM-DD'),
          timezone: selectedTimezone,
        });
      }
    } finally {
      setIsBooking(false);
    }
  };

  // POST /scheduling/{token}/call-now — only ever from a button press. The
  // call's outcome (answered / no answer / failed) arrives later like any
  // other audio call's, so success here just means "call initiated".
  const handleCallNow = async (): Promise<void> => {
    if (callAlreadyPlaced || contactUnavailable) return;
    try {
      await callNow(token).unwrap();
      setCalledNow(true);
    } catch (error) {
      const apiError = error as InterviewApiError;
      if (apiError.code === 'CALL_ALREADY_PLACED' || apiError.status === 409) {
        setCallAlreadyPlaced(true);
        showToast({ message: t.callAlreadyPlaced, type: 'info' });
      } else if (apiError.code === 'CANDIDATE_CONTACT_UNAVAILABLE') {
        // No phone on file — steer back to the slot picker.
        setContactUnavailable(true);
        setCallNowPromptDismissed(true);
        showToast({ message: t.contactUnavailable, type: 'warning' });
      } else if (apiError.code === 'SCHEDULING_LINK_EXPIRED' || apiError.status === 410) {
        setCallNowLinkExpired(true);
      } else {
        showToast({ message: apiError.message || t.callNowError, type: 'error' });
      }
    }
  };

  //  Calendar helpers
  const startOfMonth = currentMonth.startOf('month');
  const endOfMonth = currentMonth.endOf('month');
  const leadingBlanks = startOfMonth.day();

  const calendarDays: (Dayjs | null)[] = [
    ...Array.from<null>({ length: leadingBlanks }).fill(null),
    ...Array.from({ length: endOfMonth.date() }, (_, i) => currentMonth.date(i + 1)),
  ];

  const isDateSelectable = (date: Dayjs): boolean =>
    (date.isSame(today, 'day') || date.isAfter(today, 'day')) &&
    (date.isSame(maxDate, 'day') || date.isBefore(maxDate, 'day'));

  const canPrevMonth = currentMonth.isAfter(today, 'month');
  const canNextMonth = currentMonth.isBefore(maxDate, 'month');

  const handleDateSelect = (date: Dayjs): void => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setBookingError(null);
  };

  const handleTimezoneSelect = (tzId: string): void => {
    setSelectedTimezone(tzId);
    setTzDropdownOpen(false);
    setTzSearch('');
    // Clear slots — will refetch for new timezone when selectedDate is still set
    setSlots([]);
    setSelectedSlot(null);
  };

  const filteredTimezones = tzSearch.trim()
    ? timezones.filter(
        (tz) =>
          tz.label.toLowerCase().includes(tzSearch.toLowerCase()) ||
          tz.id.toLowerCase().includes(tzSearch.toLowerCase())
      )
    : timezones;

  const selectedTzLabel =
    timezones.find((tz) => tz.id === selectedTimezone)?.label ??
    selectedTimezone.replace(/_/g, ' ');

  //  Call-now success screen
  if (calledNow) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <LuCircleCheck className="text-green-500 w-16 h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">{t.callNowTitle}</h1>
          <p className="text-gray-500 text-sm">{t.callNowBody}</p>
        </div>
      </div>
    );
  }

  //  Success screen
  if (isBooked && bookedSlot) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <LuCircleCheck className="text-green-500 w-16 h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">{t.scheduledTitle}</h1>
          <p className="text-gray-500 text-sm mb-6">
            {t.scheduledBody} <strong>{email}</strong>.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-left text-sm text-gray-700 space-y-3">
            <div className="flex items-center gap-2">
              <LuCalendarDays className="text-(--primary) w-4 h-4 shrink-0" />
              <span>{selectedDate?.locale(lang).format('dddd, MMM D, YYYY')}</span>
            </div>
            <div className="flex items-center gap-2">
              <RxClock className="text-(--primary) w-4 h-4 shrink-0" />
              <span>{bookedSlot.displayTime}</span>
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-6 text-center leading-relaxed">
            {t.successConsentText}
          </p>
        </div>
      </div>
    );
  }

  //  Invalid link screen
  if (!isParamsValid) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4"></div>
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">{t.invalidTitle}</h1>
          <p className="text-gray-500 text-sm">{t.invalidBody}</p>
        </div>
      </div>
    );
  }

  if (schedulingError) {
    const apiError = schedulingError as InterviewApiError;
    const expired = apiError.status === 410;
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">
            {expired ? 'Scheduling Link Expired' : t.invalidTitle}
          </h1>
          <p className="text-gray-500 text-sm">
            {expired ? 'This link has expired and cannot be used again.' : t.invalidBody}
          </p>
        </div>
      </div>
    );
  }

  // Same screen as an expired link on load, for SCHEDULING_LINK_EXPIRED
  // coming back from the call-now POST itself.
  if (callNowLinkExpired) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">{t.linkExpiredTitle}</h1>
          <p className="text-gray-500 text-sm">{t.linkExpiredBody}</p>
        </div>
      </div>
    );
  }

  //  "Call me now" confirmation (?action=call_now) — audio rounds only.
  if (isCallNowAction && !callNowPromptDismissed) {
    if (!schedulingLink) {
      return (
        <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center px-4">
          <Loader />
        </div>
      );
    }
    if (schedulingLink.interview_type === 'audio') {
      return (
        <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
            <LuPhone className="text-(--primary) w-14 h-14 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-gray-800 mb-2">{t.callNowPromptTitle}</h1>
            <p className="text-gray-500 text-sm mb-6">
              {callAlreadyPlaced ? t.callAlreadyPlaced : t.callNowPromptBody}
            </p>
            <button
              type="button"
              onClick={handleCallNow}
              disabled={callNowState.isLoading || callAlreadyPlaced}
              className="block w-full py-3 rounded-full bg-(--primary) text-white font-semibold text-sm hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {callNowState.isLoading
                ? t.callNowConfirm
                : callAlreadyPlaced
                  ? t.callNowConfirm
                  : t.callNowPromptButton}
            </button>
            <button
              type="button"
              onClick={() => setCallNowPromptDismissed(true)}
              className="mt-4 text-sm font-semibold text-(--primary) hover:underline cursor-pointer"
            >
              {t.pickTimeInstead}
            </button>
          </div>
        </div>
      );
    }
  }

  // PANEL — interview-service has no free/busy integration and no panel-book
  // endpoint, so slot picking still happens on the host's Nylas page.
  // GET /scheduling/{token}/slots tells us whether that page exists yet
  // (`slots_available` / `booking_url`) so we can show a real "not ready"
  // state instead of a blind redirect to nothing.
  if (isPanel) {
    const panelApiError = panelInfoError as InterviewApiError | undefined;
    const bookingUrl = panelInfo?.booking_url ?? schedulingLink?.booking_url ?? null;
    const ready = Boolean(panelInfo?.slots_available && bookingUrl);
    const loading = !panelApiError && !panelInfo;

    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          {loading || isPanelInfoFetching ? (
            <div className="flex justify-center py-6">
              <Loader />
            </div>
          ) : panelApiError ? (
            <>
              <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                {panelApiError.status === 410 ? 'Scheduling Link Expired' : t.invalidTitle}
              </h1>
              <p className="text-gray-500 text-sm">
                {panelApiError.status === 410
                  ? 'This link has already been used or has expired.'
                  : t.invalidBody}
              </p>
            </>
          ) : ready ? (
            <>
              <LuCalendarDays className="text-(--primary) w-14 h-14 mx-auto mb-4" />
              <h1 className="text-2xl font-semibold text-gray-800 mb-2">{t.panelTitle}</h1>
              <p className="text-gray-500 text-sm mb-4">{t.panelBody}</p>
              {panelInfo?.duration_minutes ? (
                <div className="mb-6 flex items-center justify-center gap-2 text-gray-500 text-sm">
                  <RxClock className="w-4 h-4" />
                  <span>
                    {panelInfo.duration_minutes} {t.minutes}
                  </span>
                </div>
              ) : null}
              <a
                href={bookingUrl as string}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 rounded-full bg-(--primary) text-white font-semibold text-sm hover:opacity-90 transition"
              >
                {t.panelChooseTime}
              </a>
              <p className="text-gray-400 text-xs mt-4 leading-relaxed">{t.panelAfterBooking}</p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-4">🗓️</div>
              <h1 className="text-2xl font-semibold text-gray-800 mb-2">{t.panelNotReadyTitle}</h1>
              <p className="text-gray-500 text-sm">{t.panelNotReadyBody}</p>
            </>
          )}
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

  //  Main scheduling UI
  return (
    <div className="h-screen bg-[#f0f4f8] flex items-center justify-center p-4 overflow-hidden">
      <div
        className="bg-white rounded-2xl shadow-lg overflow-visible w-full max-w-3xl flex flex-col"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        {/* Duration badge */}
        <div className="px-6 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <RxClock className="w-4 h-4" />
            <span>
              {slotDurationMin ?? schedulingLink?.duration_minutes ?? 15} {t.minutes}
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 min-h-0">
          {/*  LEFT: Calendar  */}
          <div className="md:w-[52%] p-6 border-b md:border-b-0 md:border-r border-gray-100 overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">
                {currentMonth.locale(lang).format('MMMM')}{' '}
                <span className="font-normal text-gray-500">{currentMonth.format('YYYY')}</span>
              </h2>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentMonth((m) => m.subtract(1, 'month'))}
                  disabled={!canPrevMonth}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <LuChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => setCurrentMonth((m) => m.add(1, 'month'))}
                  disabled={!canNextMonth}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <LuChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {t.weekDays.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1">
              {calendarDays.map((date, idx) => {
                if (!date) return <div key={`blank-${idx}`} />;
                const selectable = isDateSelectable(date);
                const isSelected = selectedDate?.isSame(date, 'day') ?? false;
                const isToday = date.isSame(today, 'day');
                return (
                  <button
                    key={date.format('YYYY-MM-DD')}
                    disabled={!selectable}
                    onClick={() => handleDateSelect(date)}
                    className={clsx(
                      'relative mx-auto w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all',
                      isSelected && 'bg-(--primary) text-white',
                      !isSelected && selectable && 'text-gray-800 font-semibold hover:bg-gray-100',
                      !selectable && 'text-gray-300 cursor-not-allowed font-normal'
                    )}
                  >
                    {date.date()}
                    {isToday && !isSelected && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-(--primary)" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/*  RIGHT: Slots / Confirm  */}
          <div className="md:w-[48%] flex flex-col overflow-hidden">
            {!selectedDate ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm px-6">
                <div className="text-center">
                  <LuCalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>{t.selectDate}</p>
                </div>
              </div>
            ) : selectedSlot ? (
              <div className="flex-1 flex flex-col p-6">
                <p className="text-xs text-gray-400 tracking-wide font-semibold mb-1">
                  {t.confirmTitle}
                </p>
                <h3 className="text-base font-semibold text-gray-800 mb-6">
                  {selectedDate.locale(lang).format('dddd, MMM D, YYYY')}
                </h3>

                <div className="border border-(--primary) rounded-xl px-5 py-4 text-center">
                  <p className="text-(--primary) font-bold text-base">
                    {selectedSlot.displayTime.split(' - ')[0]}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">{selectedSlot.displayTime}</p>
                </div>

                {bookingError && (
                  <p className="text-red-500 text-xs text-center mt-3">{bookingError}</p>
                )}

                <div className="mt-auto pt-6 flex flex-col gap-3">
                  <button
                    onClick={handleBookSlot}
                    disabled={isBooking}
                    className="w-full py-3 rounded-full bg-(--primary) text-white font-semibold text-sm hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isBooking ? <Loader /> : t.confirmButton}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedSlot(null);
                      setBookingError(null);
                    }}
                    className="w-full py-3 rounded-full border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition cursor-pointer"
                  >
                    {t.back}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-5 pt-5 pb-2 shrink-0">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <LuCalendarDays className="w-4 h-4 text-(--primary)" />
                    {selectedDate.locale(lang).format('dddd, MMM D')}
                  </h3>
                </div>
                <div
                  className="flex-1 overflow-y-auto px-5 pb-4 space-y-2"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}
                >
                  {isSlotsLoading ? (
                    <div className="flex justify-center items-center h-40">
                      <Loader />
                    </div>
                  ) : slotsError ? (
                    <div className="text-center text-sm text-red-500 py-10">{slotsError}</div>
                  ) : slots.length === 0 ? (
                    <div className="text-center text-sm text-gray-400 py-10">{t.noSlots}</div>
                  ) : (
                    slots.map((slot, idx) => (
                      <button
                        key={`${slot.start_time}-${idx}`}
                        disabled={slot.remaining === 0}
                        onClick={() => setSelectedSlot(slot)}
                        className="w-full py-3 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-(--primary) hover:text-(--primary) transition-all text-center disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        {slot.displayTime.split(' - ')[0]}
                        {slot.remaining === 0 ? ' (Full)' : ` (${slot.remaining} left)`}
                      </button>
                    ))
                  )}
                </div>
                {schedulingLink?.interview_type === 'audio' && (
                  <div className="border-t border-gray-100 px-5 py-4 shrink-0">
                    <p
                      className={clsx(
                        'text-xs mb-2 text-center',
                        callAlreadyPlaced || contactUnavailable ? 'text-amber-600' : 'text-gray-400'
                      )}
                    >
                      {callAlreadyPlaced
                        ? t.callAlreadyPlaced
                        : contactUnavailable
                          ? t.contactUnavailable
                          : t.callNowHint}
                    </p>
                    <button
                      onClick={handleCallNow}
                      disabled={callNowState.isLoading || callAlreadyPlaced || contactUnavailable}
                      className="w-full py-2.5 rounded-full border border-(--primary) text-(--primary) text-sm font-semibold hover:bg-(--primary)/5 transition disabled:opacity-60 flex items-center justify-center gap-2 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {callNowState.isLoading ? t.callNowConfirm : t.callNowButton}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/*  Bottom bar  */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 shrink-0 relative z-10">
          {/* Timezone dropdown */}
          <div ref={tzDropdownRef} className="relative">
            <button
              onClick={() => {
                setTzDropdownOpen((o) => !o);
                setLangDropdownOpen(false);
              }}
              className="flex items-center gap-1 hover:text-gray-700 transition cursor-pointer"
            >
              <span></span>
              <span className="max-w-36 truncate">{selectedTzLabel}</span>
              <LuChevronDown
                className={clsx('w-3 h-3 transition-transform', tzDropdownOpen && 'rotate-180')}
              />
            </button>

            {tzDropdownOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                {/* Search */}
                <div className="p-2 border-b border-gray-100">
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <LuSearch className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <input
                      // Opens only on an explicit click on the timezone button —
                      // focusing the filter field is the expected next step.
                      // eslint-disable-next-line jsx-a11y/no-autofocus
                      autoFocus
                      type="text"
                      value={tzSearch}
                      onChange={(e) => setTzSearch(e.target.value)}
                      placeholder={t.searchTimezone}
                      className="flex-1 bg-transparent text-xs outline-none text-gray-700 placeholder-gray-400"
                    />
                  </div>
                </div>
                {/* List */}
                <div
                  className="overflow-y-auto"
                  style={{
                    maxHeight: '220px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#cbd5e1 #f1f5f9',
                  }}
                >
                  {filteredTimezones.length === 0 ? (
                    <p className="text-center text-gray-400 text-xs py-4">No results</p>
                  ) : (
                    filteredTimezones.map((tz) => (
                      <button
                        key={tz.id}
                        onClick={() => handleTimezoneSelect(tz.id)}
                        className={clsx(
                          'w-full flex items-center justify-between px-4 py-2.5 text-xs hover:bg-gray-50 transition text-left',
                          tz.id === selectedTimezone &&
                            'bg-brand-50 text-(--primary) font-semibold',
                          'cursor-pointer'
                        )}
                      >
                        <span>{tz.label}</span>
                        <span className="text-gray-400 font-mono ml-2 shrink-0">{tz.offset}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Language dropdown */}
          <div ref={langDropdownRef} className="relative">
            <button
              onClick={() => {
                setLangDropdownOpen((o) => !o);
                setTzDropdownOpen(false);
              }}
              className="flex items-center gap-1 hover:text-gray-700 transition cursor-pointer"
            >
              <span>あa</span>
              <span>{lang === 'en' ? t.english : t.espanol}</span>
              <LuChevronDown
                className={clsx('w-3 h-3 transition-transform', langDropdownOpen && 'rotate-180')}
              />
            </button>

            {langDropdownOpen && (
              <div className="absolute bottom-full right-0 mb-2 w-36 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                {LANG_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setLang(opt.value);
                      setLangDropdownOpen(false);
                    }}
                    className={clsx(
                      'w-full px-4 py-2.5 text-xs text-left hover:bg-gray-50 transition',
                      lang === opt.value && 'bg-brand-50 text-(--primary) font-semibold',
                      'cursor-pointer'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiCallSchedulePage;
