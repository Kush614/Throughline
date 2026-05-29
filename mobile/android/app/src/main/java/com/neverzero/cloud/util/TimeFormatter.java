package com.neverzero.cloud.util;

import androidx.annotation.NonNull;

import java.util.Locale;
import java.util.concurrent.TimeUnit;

/**
 * Small formatter for the "14s ago" / "4m ago" style timestamps that show up in
 * activity feeds and live cards. Kept in Java to give the codebase a touch of
 * non-Kotlin code without dragging in a date library.
 */
public final class TimeFormatter {

    private TimeFormatter() { /* no instances */ }

    /** Convert a millisecond delta into a short relative-time string. */
    @NonNull
    public static String relative(long millisAgo) {
        if (millisAgo < 0) return "just now";

        long seconds = TimeUnit.MILLISECONDS.toSeconds(millisAgo);
        if (seconds < 60) {
            return seconds + "s ago";
        }
        long minutes = TimeUnit.MILLISECONDS.toMinutes(millisAgo);
        if (minutes < 60) {
            return minutes + "m ago";
        }
        long hours = TimeUnit.MILLISECONDS.toHours(millisAgo);
        if (hours < 24) {
            return hours + "h ago";
        }
        long days = TimeUnit.MILLISECONDS.toDays(millisAgo);
        if (days < 7) {
            return days + "d ago";
        }
        long weeks = days / 7;
        return String.format(Locale.US, "%dw ago", weeks);
    }
}
