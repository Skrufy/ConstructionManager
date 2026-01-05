package com.constructionpro.app.ui.util

/**
 * Utility functions for time formatting across the app.
 * All time displays should use 12-hour format with AM/PM.
 */
object TimeUtils {

    /**
     * Convert 24-hour time string to 12-hour format.
     * Input: "21:53" or "09:30" or ISO string with time
     * Output: "9:53 PM" or "9:30 AM"
     */
    fun format12Hour(timeString: String?): String {
        if (timeString == null) return "?"
        return try {
            // Extract time portion - handle various formats
            val timePart = when {
                timeString.contains("T") -> {
                    // ISO format: "2024-01-15T21:53:00" or "2024-01-15T21:53:00.000Z"
                    timeString.substringAfter("T").take(5)
                }
                timeString.length >= 5 && timeString[2] == ':' -> {
                    // Already just time: "21:53"
                    timeString.take(5)
                }
                else -> return timeString
            }

            val parts = timePart.split(":")
            if (parts.size != 2) return timePart

            val hour24 = parts[0].toIntOrNull() ?: return timePart
            val minutes = parts[1]

            val hour12 = when {
                hour24 == 0 -> 12
                hour24 > 12 -> hour24 - 12
                else -> hour24
            }
            val amPm = if (hour24 < 12) "AM" else "PM"

            "$hour12:$minutes $amPm"
        } catch (_: Exception) {
            "?"
        }
    }

    /**
     * Format ISO timestamp to date and 12-hour time.
     * Input: "2024-01-15T21:53:00.000Z"
     * Output: "2024-01-15\n9:53 PM"
     */
    fun formatTimestamp(timestamp: String?): String {
        if (timestamp == null) return "?"
        return try {
            val datePart = timestamp.substringBefore("T")
            val time12 = format12Hour(timestamp)
            "$datePart\n$time12"
        } catch (_: Exception) {
            timestamp.substringBefore("T")
        }
    }

    /**
     * Format ISO timestamp to just the 12-hour time portion.
     * Input: "2024-01-15T21:53:00.000Z"
     * Output: "9:53 PM"
     */
    fun formatTimeOnly(timestamp: String?): String {
        return format12Hour(timestamp)
    }

    /**
     * Format ISO timestamp to readable date.
     * Input: "2024-01-15T21:53:00.000Z"
     * Output: "Jan 15, 2024"
     */
    fun formatDate(timestamp: String?): String {
        if (timestamp == null) return "?"
        return try {
            val datePart = timestamp.substringBefore("T")
            val parts = datePart.split("-")
            if (parts.size != 3) return datePart

            val year = parts[0]
            val month = parts[1].toIntOrNull() ?: return datePart
            val day = parts[2].toIntOrNull() ?: return datePart

            val monthName = when (month) {
                1 -> "Jan"
                2 -> "Feb"
                3 -> "Mar"
                4 -> "Apr"
                5 -> "May"
                6 -> "Jun"
                7 -> "Jul"
                8 -> "Aug"
                9 -> "Sep"
                10 -> "Oct"
                11 -> "Nov"
                12 -> "Dec"
                else -> return datePart
            }

            "$monthName $day, $year"
        } catch (_: Exception) {
            timestamp.substringBefore("T")
        }
    }

    /**
     * Format time range in 12-hour format.
     * Input: "2024-01-15T09:00:00", "2024-01-15T17:30:00"
     * Output: "9:00 AM - 5:30 PM"
     */
    fun formatTimeRange(startTime: String?, endTime: String?): String {
        val start = format12Hour(startTime)
        val end = format12Hour(endTime)
        return "$start - $end"
    }
}
