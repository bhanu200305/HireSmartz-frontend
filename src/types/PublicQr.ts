export interface PublicJobLocation {
  id: number;
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
}

export interface PublicJob {
  jobId: number;
  jobTitle: string;
  department: string;
  location: PublicJobLocation | null;
  aiJobDescription: string | null;
  jobType: string;
  minimumSalary: number;
  maximumSalary: number;
  minimumExperience: number;
  maximumExperience: number | null;
  isRemote: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicJobPageable {
  pageNumber: number;
  pageSize: number;
  sort: { sorted: boolean; empty: boolean; unsorted: boolean };
  offset: number;
  paged: boolean;
  unpaged: boolean;
}

export interface PublicJobListResponse {
  content: PublicJob[];
  pageable: PublicJobPageable;
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number: number;
  numberOfElements: number;
  first: boolean;
  empty: boolean;
}

export interface PublicLocationItem {
  locationId: number;
  locationName: string;
  city: string;
  state: string;
  country: string;
}

export interface PublicJobsQueryParams {
  qrCode: string;
  page?: number;
  size?: number;
  search?: string;
  searchFields?: string[];
  locationIds?: number[];
  remote?: boolean;
}

export interface UploadUrlRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  fileUrl: string;
  s3Key: string;
  expiresAt: string;
}

export interface ApplyToJobRequest {
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  phoneNumber: string;
  jobId: number;
  resumeUrl: string;
  s3Key: string;
  fileType: string;
  fileSize: number;
  captchaToken: string;
  smsConsent?: boolean;
}

export interface ApplyLaterPrefill {
  firstName: string;
  lastName: string;
  email: string;
  jobId: number;
  sourceType: 'JOB_SPECIFIC' | 'GENERAL';
}

export interface ApplyLaterRequest {
  firstName?: string;
  lastName?: string;
  email: string;
  countryCode?: string;
  phoneNumber?: string;
  jobId?: number;
  captchaToken: string;
}
