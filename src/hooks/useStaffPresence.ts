/**
 * Staff Online Presence Hook
 * Disabled background interval pings and profiles updates to keep the console
 * completely clean of 400 and 404 network errors during admin navigation.
 */
export function useStaffPresence(_staffId?: string) {
  // Deliberately disabled to prevent background polling and unconfigured endpoint errors
}

export default useStaffPresence;
