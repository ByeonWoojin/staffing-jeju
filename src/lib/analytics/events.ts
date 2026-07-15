export const ANALYTICS_EVENTS = {
  LANDING_VIEW: "landing_view",
  AUTH_START: "auth_start",
  LOGIN: "login",
  SIGN_UP: "sign_up",
  LOGOUT: "logout",

  JOB_LIST_VIEW: "job_list_view",
  JOB_FILTER_APPLY: "job_filter_apply",
  JOB_DETAIL_VIEW: "job_detail_view",

  FAVORITE_ADD: "favorite_add",
  FAVORITE_REMOVE: "favorite_remove",

  APPLICATION_START: "application_start",
  APPLICATION_SUBMIT: "application_submit",
  APPLICATION_CANCEL: "application_cancel",

  GUESTHOUSE_CREATE: "guesthouse_create",

  JOB_POST_START: "job_post_start",
  JOB_POST_CREATE: "job_post_create",
  JOB_POST_STATUS_CHANGE: "job_post_status_change",

  APPLICANT_DETAIL_VIEW: "applicant_detail_view",
  APPLICATION_STATUS_CHANGE: "application_status_change",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsProperty = string | number | boolean | null | undefined;

export type AnalyticsProperties = Record<string, AnalyticsProperty>;

