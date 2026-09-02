import {
  useDisconnectCalendarMutation,
  useGetCalendarGrantStatusQuery,
  useLazyGetCalendarConnectUrlQuery,
} from '../client';

export interface NylasGrantStatus {
  connected: boolean;
  email: string | null;
}
export const {
  useLazyGetCalendarConnectUrlQuery: useLazyGetNylasAuthUrlQuery,
  useGetCalendarGrantStatusQuery: useGetNylasGrantStatusQuery,
  useDisconnectCalendarMutation: useDisconnectNylasGrantMutation,
} = {
  useLazyGetCalendarConnectUrlQuery,
  useGetCalendarGrantStatusQuery,
  useDisconnectCalendarMutation,
};
