import React from 'react';
import { showToast } from '../../components';
import { Filters, DateTimeRange } from '../../types';
import { MIME_SIGNATURES } from '../../constants/file.constants';
import { ZodTypeAny } from 'zod';
import { jwtDecode } from 'jwt-decode';
import dayjs from 'dayjs';
import { StatusModalType } from './enums';
import { FeedItem } from '../../api/audit-service/Dashboard/ActivityStream';
import { STATUS_MAP } from '../../constants/statusConstant';

export const validateDraft = <T>(data: Partial<T>, schema: ZodTypeAny) => {
  const draftResult = schema.safeParse(data);

  if (!draftResult.success) {
    const errors: Record<string, { message: string }> = {};
    draftResult.error.issues.forEach((issue) => {
      const path = issue.path.join('.');
      errors[path] = { message: issue.message };
    });

    return {
      values: {},
      errors: Object.keys(errors).length > 0 ? errors : null,
    };
  }

  return { values: data, errors: null };
};

export const validatePhoneNumber = (phone: string): boolean => {
  return /^\(\d{3}\) \d{3}-\d{4}$/.test(phone);
};
export const changeNullValuesToEmptyArray = <T>(obj: T): T => {
  const newObj = { ...obj } as T;
  for (const key in newObj) {
    if (newObj[key] === null) {
      newObj[key] = [] as any;
    }
  }
  return newObj;
};

export const convertToCamelCase = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) =>
      index === 0 ? match.toLowerCase() : match.toUpperCase()
    )
    .replace(/\s+/g, '');
};

export const makeFirstLetterUpperCase = <T>(data: T): T => {
  switch (typeof data) {
    case 'string':
      return (data.charAt(0).toUpperCase() + data.slice(1)) as T;
    default:
      return '' as T;
  }
};

export const capitalizeWordsAdvanced = (text: string): string => {
  if (!text || typeof text !== 'string') return text;

  return text
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;

      const isAcronym =
        word.length > 1 &&
        (word === word.toUpperCase() || (word.length <= 4 && /^[A-Z0-9]+$/.test(word)));

      if (isAcronym) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

export const snakeToCamelCase = (str: string, delimeter: string = ' '): string => {
  return str.replace(/([-_][a-z])/g, (group) =>
    group.toUpperCase().replace('-', delimeter).replace('_', delimeter)
  );
};

export const getFullURL = (to: string, withoutbase: boolean = false): string => {
  const currentUrl = new URL(window.location.href);
  const baseUrl = currentUrl.origin;
  const path = currentUrl.pathname;
  const search = currentUrl.search;

  const fullUrl = new URL(to, baseUrl + path);
  if (!fullUrl.search && search) {
    fullUrl.search = search;
  }

  return withoutbase ? fullUrl.pathname + fullUrl.search : fullUrl.href;
};

export const handleCopy = (text: string) => {
  navigator.clipboard.writeText(text);
  showToast({
    message: 'Copied to clipboard.',
    type: 'success',
  });
};

export const detectMimeTypeFromBase64 = (base64: string, fallbackExtension: string = '') => {
  const clean = base64.replace(/^data:.*;base64,/, '').slice(0, 20);
  for (const sig in MIME_SIGNATURES) {
    if (clean.startsWith(sig)) {
      const match = MIME_SIGNATURES[sig];
      if (typeof match === 'string') return match;
      return match[fallbackExtension] || 'application/octet-stream';
    }
  }
  return 'application/octet-stream';
};

export const base64toBlob = (data: string) => {
  const base64WithoutPrefix = data.replace(/^data:.*;base64,/, '');
  const bytes = atob(base64WithoutPrefix);
  let length = bytes.length;
  const out = new Uint8Array(length);

  while (length--) {
    out[length] = bytes.charCodeAt(length);
  }

  return new Blob([out], { type: detectMimeTypeFromBase64(data) });
};

// export const handleDateValue = (filters: Filters): DateTimeRange => {
//   return {
//     startDate: filters.startDateTime.split('T')[0],
//     startTime: filters.startDateTime.split('T').pop() || '',
//     endDate: filters.endDateTime.split('T')[0],
//     endTime: filters.endDateTime.split('T').pop() || ''
//   }
// }
export const handleDateValue = (filters: Filters): DateTimeRange => {
  if (!filters.startDateTime && !filters.endDateTime) {
    return {
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
    };
  }

  const parseDateTime = (dateTimeString: string) => {
    if (!dateTimeString) return { date: '', time: '' };

    try {
      const dateTime = dayjs(dateTimeString);
      if (!dateTime.isValid()) return { date: '', time: '' };

      const date = dateTime.format('YYYY-MM-DD');
      const time = dateTime.format('HH:mm:ss');

      // Only return time if it's not midnight (default time)
      const isMidnight = time === '00:00:00';

      return {
        date,
        time: isMidnight ? '' : time,
      };
    } catch (error) {
      console.error('Error parsing date time:', error);
      return { date: '', time: '' };
    }
  };

  const start = parseDateTime(filters.startDateTime);
  const end = parseDateTime(filters.endDateTime);

  return {
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
  };
};

export const formattedDate = (startDate: string) => {
  const date = new Date(startDate);
  const formattedDate = date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return formattedDate;
};

export const formattedDateEpoch = (startDate: string) => {
  const epochInMs = parseFloat(startDate) * 1000;
  const date = new Date(epochInMs);
  return formattedDate(date.toUTCString());
};

export const formattedTime = (startDate: string) => {
  const date = new Date(startDate);
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return formattedTime;
};

export const formattedDateTime = (startDate: string): string => {
  return `${formattedDate(startDate)} ${formattedTime(startDate)}`;
};

export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';

  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 0) return '';

  if (cleaned.length <= 3) {
    return `(${cleaned}`;
  }
  if (cleaned.length <= 6) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  }
  if (cleaned.length <= 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  }

  // More than 10 digits — preserve all digits beyond position 10
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}${cleaned.slice(10)}`;
};

export const cleanPhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

export function getPersistedState(key: string, defaultValue: boolean) {
  const value = sessionStorage.getItem(key);
  return value !== null ? JSON.parse(value) : defaultValue;
}
export const generateJobProfileCode = (name?: string) => {
  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map((word) => word[0]?.toUpperCase())
      .join('');
  };

  const initials = getInitials(name || 'CFP');
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${initials}-${randomPart}`;
};

export const formatEnumString = (input: string): string => {
  if (input === 'AI') {
    return 'AI';
  } else {
    return input
      .toLowerCase()
      .replace(/_/g, '-')
      .replace(/^([a-z])/g, (m) => m.toUpperCase());
  }
};

// Cosmetic display formatter only — does not change what value is passed in
// or when it's "N/A" vs a real number, just how a missing value reads on screen.
export const formatStatValue = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return 'Not enough data yet';
  if (typeof value === 'number') return Number.isNaN(value) ? 'Not enough data yet' : String(value);
  const trimmed = value.trim();
  if (trimmed === '' || trimmed.toUpperCase() === 'N/A') return 'Not enough data yet';
  return trimmed;
};

export const getStatusStyle = (status: string) => {
  switch (status) {
    case 'SELECTED':
    case 'INTERVIEW_COMPLETED':
    case 'COMPLETED':
    case 'SHORTLISTED':
    case 'SCORED':
      return 'bg-green-100 text-green-700 border border-green-500';

    case 'NOT_SELECTED':
    case 'EXPIRED':
    case 'CANCELLED':
    case 'NO_SHOW':
    case 'REJECTED_NON_COMPLIANCE':
    case 'REJECTED_TECHNICAL':
    case 'BOOKING_CANCELLED':
    case 'SKIPPED':
    case 'AI_CALL_NOT_COMPLETED':
      return 'bg-red-100 text-red-700 border border-red-500';

    case 'AWAITED':
    case 'BOOKING_CREATED':
    case 'SCHEDULED':
    case 'PENDING_CANDIDATE_ACTION':
    case 'IN_PROGRESS':
    case 'RESCHEDULED':
    case 'UNDER_REVIEW':
    case 'INVITATION_SENT':
    case 'AI_CALL_IN_PROGRESS':
    case 'IN_REVIEW':
    case 'AI_CALLBACK_STARTED':
      return 'bg-brand-100 text-brand-700 border border-brand-500';

    default:
      return;
  }
};

export const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (reader.result) {
        resolve((reader.result as string).split(',')[1]);
      } else {
        reject(new Error('Failed to read file.'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

export const compressImage = (
  file: File,
  targetSizeMB = 5,
  maxDimension = 1280,
  jpegQuality = 0.8
): Promise<File> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('File is not an image'));
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      let { width, height } = img;

      if (width > maxDimension || height > maxDimension) {
        const scale = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const step = 0.08;

      (function exportBlob(q: number) {
        canvas.toBlob(
          async (blob) => {
            if (!blob) return reject(new Error('Canvas export failed'));

            if (blob.size / 1024 / 1024 <= targetSizeMB || q <= 0.3) {
              const compressedFile = new File([blob], file.name, { type: mime });
              resolve(compressedFile);
            } else {
              exportBlob(q - step);
            }
          },
          mime,
          mime === 'image/png' ? undefined : q
        );
      })(jpegQuality);
    };

    img.onerror = () => reject(new Error('Image load error'));
    img.src = URL.createObjectURL(file);
  });

export const safeDecodeToken = <T = unknown>(token?: string | null): T | undefined => {
  if (!token) return;
  try {
    return jwtDecode<T>(token);
  } catch (error) {
    console.error('Failed to decode token:', error);
    return undefined;
  }
};

export const normalizeValue = (value?: string): string => (value ?? '').trim();

export const arraysEqual = (arr1: any, arr2: any) => {
  if (!arr1 || !arr2) return arr1 === arr2;
  if (arr1.length !== arr2.length) return false;

  const sorted1 = [...arr1].sort();
  const sorted2 = [...arr2].sort();

  return sorted1.every((value, index) => value === sorted2[index]);
};

export const getTimeDifferenceInMinutes = (startTime: string | Date, endTime: string | Date) => {
  const start = new Date(startTime);
  const end = new Date(endTime);

  const diffMs = end.getTime() - start.getTime(); // difference in milliseconds
  return diffMs / (1000 * 60); // convert to minutes
};

export type CandidateRoundLike = {
  sequence?: number | string | null;
  round?: {
    id?: number | string | null;
    name?: string | null;
  } | null;
};

const toPositiveSequence = (value?: number | string | null): number | undefined => {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0) return undefined;
  return normalized;
};

export const getDisplayRoundNumber = (
  rounds: CandidateRoundLike[],
  sequence?: number | string | null
): number | undefined => {
  const normalizedSequence = toPositiveSequence(sequence);
  if (!normalizedSequence) return undefined;

  const orderedSequences = Array.from(
    new Set(
      (rounds || [])
        .map((round) => toPositiveSequence(round?.sequence))
        .filter((seq): seq is number => Boolean(seq))
    )
  ).sort((a, b) => a - b);

  const index = orderedSequences.indexOf(normalizedSequence);
  return index >= 0 ? index + 1 : undefined;
};

export const formatRoundLabel = (
  roundName?: string | null,
  displayNumber?: number
): string | undefined => {
  if (!roundName) return undefined;
  return displayNumber && displayNumber > 0 ? `${roundName} - Round ${displayNumber}` : roundName;
};

export const resolveRoundSequenceByRound = (
  rounds: CandidateRoundLike[],
  roundId?: number | string | null,
  roundName?: string | null
): number | undefined => {
  if (!rounds?.length) return undefined;

  const normalizedRoundId = Number(roundId);
  if (Number.isFinite(normalizedRoundId) && normalizedRoundId > 0) {
    const byId = rounds.find((round) => Number(round?.round?.id) === normalizedRoundId);
    const sequenceById = toPositiveSequence(byId?.sequence);
    if (sequenceById) return sequenceById;
  }

  if (roundName) {
    const byName = rounds.find((round) => round?.round?.name === roundName);
    const sequenceByName = toPositiveSequence(byName?.sequence);
    if (sequenceByName) return sequenceByName;
  }

  return undefined;
};

export const getModalContent = (
  statusType: StatusModalType,
  options: {
    candidateName?: string;
    currentRound?: string;
    nextRound?: string;
    isBulkAction?: boolean;
    count?: number | null;
  } = {}
): { title: string; subtitle: string | React.ReactNode } => {
  const { candidateName, currentRound, nextRound, isBulkAction = false, count = null } = options;
  switch (statusType) {
    case StatusModalType.SELECTED:
      return {
        title: 'Offer Stage',
        subtitle: isBulkAction
          ? `You are selecting ${count} candidates mentioned below for this position. Are you sure you want to proceed?`
          : 'Would you like to finalize the selection now?',
      };
    case StatusModalType.NOT_SELECTED:
      return {
        title: 'Final Status',
        subtitle: isBulkAction
          ? `You are rejecting ${count} candidates mentioned below for this position. Are you sure you want to proceed?`
          : 'Are you sure you want to proceed with rejecting this candidate?',
      };
    case StatusModalType.ADVANCE: {
      if (isBulkAction) {
        return {
          title: 'Advance Candidate',
          subtitle: '',
        };
      }
      const nextRoundName = nextRound || 'Decision Pending';
      const subtitle = currentRound
        ? React.createElement(
            'span',
            null,
            'You are advancing candidate ',
            React.createElement('strong', null, candidateName || ''),
            ' from ',
            React.createElement('strong', null, currentRound),
            ' to ',
            React.createElement('strong', null, nextRoundName),
            '.',
            React.createElement('br', null),
            'Are you sure you want to proceed?'
          )
        : React.createElement(
            'span',
            null,
            'You are advancing candidate ',
            React.createElement('strong', null, candidateName || ''),
            ' to ',
            React.createElement('strong', null, nextRoundName),
            '.',
            React.createElement('br', null),
            'Are you sure you want to proceed?'
          );
      return { title: 'Advance Candidate', subtitle };
    }
    case StatusModalType.REACTIVATE:
      return {
        title: "Reactivate Candidate's Application",
        subtitle: 'Would you like to reactivate the candidate’s profile for reconsideration?',
      };
    case StatusModalType.FINAL_ROUND_SHORTLIST:
      return {
        title: 'Final Round Shortlist',
        subtitle: isBulkAction
          ? `You are shortlisting ${count} candidates mentioned below for the final round. Are you sure you want to proceed?`
          : `You are shortlisting candidate ${candidateName || ''} for the final round. Are you sure you want to proceed?`,
      };
    default:
      return { title: 'Update Status', subtitle: 'Update candidate status' };
  }
};

export const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const findAllMatches = (text: string, highlight: string) => {
  const words = highlight.split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (words.length === 0) return [];

  const regex = new RegExp(`(${words.join('|')})`, 'gi');
  const matches: Array<{ start: number; end: number }> = [];
  let match;
  regex.lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  matches.sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const current of matches) {
    const last = merged[merged.length - 1];
    if (last && current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }
  return merged;
};

export const mapStreamItemToFeedItem = (eventData: any): FeedItem | null => {
  try {
    const data = eventData?.payload || eventData;

    if (!data || !data.id) {
      return null;
    }

    const mappedItem: FeedItem = {
      id: data.id,
      title: data.title,
      createdAt: data.createdAt,
      entityType: data.entityType,
      jobOpeningId: data.jobOpeningId,
      candidateId: data.candidateId,
      titleParams: data.titleParams || {},
    };
    return mappedItem;
  } catch {
    return null;
  }
};
export const formatStatus = (status: any) => {
  if (!status) return 'N/A';

  const key = status.toUpperCase().replace(/ /g, '_');
  return (
    STATUS_MAP[key] ||
    status
      .split('_')
      .map((word: any) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  );
};
