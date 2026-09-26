/**
 * Application Route Constants
 * Public Admin URL has changed to a custom secure hidden path.
 */
export const SECURE_ADMIN_PORTAL_PATH = '/management/secret-hq';

export const ADMIN_ROUTES = {
  root: SECURE_ADMIN_PORTAL_PATH,
  login: `${SECURE_ADMIN_PORTAL_PATH}/login`,
  dashboard: `${SECURE_ADMIN_PORTAL_PATH}/dashboard`,
  hotels: `${SECURE_ADMIN_PORTAL_PATH}/hotels`,
  packages: `${SECURE_ADMIN_PORTAL_PATH}/packages`,
  inquiries: `${SECURE_ADMIN_PORTAL_PATH}/inquiries`,
  admins: `${SECURE_ADMIN_PORTAL_PATH}/admins`,
  staff: `${SECURE_ADMIN_PORTAL_PATH}/staff`,
  cities: `${SECURE_ADMIN_PORTAL_PATH}/cities`,
  reviews: `${SECURE_ADMIN_PORTAL_PATH}/reviews`,
  settings: `${SECURE_ADMIN_PORTAL_PATH}/settings`,
} as const;