package com.bkkozhikode.connectgod;

import java.util.Calendar;

/** Wall-clock recurrence, also used after boot, clock and time-zone changes. */
public final class TrafficAlarmTime {
    public static long next(String time, int[] days, long now) {
        if (!time.matches("([01][0-9]|2[0-3]):[0-5][0-9]"))
            throw new IllegalArgumentException("Invalid alarm time");
        if (days != null) for (int day : days) if (day < 0 || day > 6)
            throw new IllegalArgumentException("Invalid weekday");
        String[] parts = time.split(":");
        Calendar next = Calendar.getInstance();
        next.setTimeInMillis(now);
        next.set(Calendar.HOUR_OF_DAY, Integer.parseInt(parts[0]));
        next.set(Calendar.MINUTE, Integer.parseInt(parts[1]));
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);
        for (int i = 0; i < 8; i++, next.add(Calendar.DATE, 1)) {
            boolean allowed = days == null || days.length == 0;
            if (days != null) for (int day : days)
                allowed |= day == next.get(Calendar.DAY_OF_WEEK) - 1;
            if (allowed && next.getTimeInMillis() > now) return next.getTimeInMillis();
        }
        throw new IllegalArgumentException("Invalid repeat days");
    }
}
