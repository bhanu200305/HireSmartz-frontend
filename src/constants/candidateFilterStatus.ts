// Grouped internal status options for categorized dropdown
export const GROUPED_INTERNAL_STATUS_OPTIONS = [
  {
    label: 'All',
    value: 'ALL',
  },
  {
    label: 'Resume Review Awaited',
    value: 'Resume-Review Awaited',
  },
  {
    label: 'AI Agent Call',
    value: 'AI',
    children: [
      { label: 'Canceled', value: 'AI Agent Call-Cancelled' },
      { label: 'Completed', value: 'AI Agent Call-Completed' },
      { label: 'In Progress', value: 'AI Agent Call-In Progress' },
      { label: 'Invitation Sent', value: 'AI Agent Call-Invitation Sent' },
      { label: 'No Show', value: 'AI Agent Call-No Show' },
      { label: 'Not Completed', value: 'AI Agent Call-Not Completed' },
      { label: 'Not Scheduled', value: 'AI Agent Call-Not Scheduled' },
      { label: 'Scheduled', value: 'AI Agent Call-Booking Created' },
      { label: 'Skipped', value: 'AI Agent Call-Skipped' },
    ],
  },
  {
    label: 'AI Video Interview',
    value: 'VIDEO',
    children: [
      { label: 'Canceled', value: 'Video Interview-Cancelled' },
      { label: 'Completed', value: 'Video Interview-Completed' },
      { label: 'In Progress', value: 'Video Interview-In Progress' },
      { label: 'Invitation Sent', value: 'Video Interview-Invitation Sent' },
      { label: 'No Show', value: 'Video Interview-No Show' },
      { label: 'Not Scheduled', value: 'Video Interview-Not Scheduled' },
      { label: 'Scheduled', value: 'Video Interview-Booking Created' },
      { label: 'Skipped', value: 'Video Interview-Skipped' },
    ],
  },
  {
    label: 'In-Person Interview',
    value: 'IN_PERSON',
    children: [
      { label: 'Canceled', value: 'In-person Interview-Cancelled' },
      { label: 'Completed', value: 'In-person Interview-Completed' },
      { label: 'Invitation Sent', value: 'In-person Interview-Invitation Sent' },
      { label: 'No Show', value: 'In-person Interview-No Show' },
      { label: 'Not Scheduled', value: 'In-person Interview-Not Scheduled' },
      { label: 'Scheduled', value: 'In-person Interview-Booking Created' },
      { label: 'Skipped', value: 'In-person Interview-Skipped' },
    ],
  },
];

export const EXTERNAL_STATUS_OPTIONS = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Decision Pending', value: 'DECISION_PENDING' },
  { label: 'In Process', value: 'IN_PROCESS' },
  { label: 'New', value: 'NEW_FILTER_VALUE' },
  { label: 'Not Selected', value: 'NOT_SELECTED' },
  { label: 'Selected', value: 'SELECTED' },
];

// status eligible for advance array
export const ELIGIBLE_FOR_ADVANCE_STATUS = [
  'Resume-Review Awaited',
  'AI Agent Call-Completed',
  'Video Interview-Completed',
  'In-person Interview-Completed',
];
