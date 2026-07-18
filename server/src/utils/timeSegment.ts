import { TimeSegment } from "@prisma/client";

/**
 * Maps a point in time to one of four segments used to keep separate
 * insulin-dosing coefficients, since sensitivity commonly varies through the day.
 *   MORNING  06:00-11:00
 *   DAY      11:00-17:00
 *   EVENING  17:00-23:00
 *   NIGHT    23:00-06:00
 */
export function getTimeSegment(date: Date): TimeSegment {
  const hour = date.getHours();
  if (hour >= 6 && hour < 11) return TimeSegment.MORNING;
  if (hour >= 11 && hour < 17) return TimeSegment.DAY;
  if (hour >= 17 && hour < 23) return TimeSegment.EVENING;
  return TimeSegment.NIGHT;
}
