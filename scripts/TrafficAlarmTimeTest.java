import com.bkkozhikode.connectgod.TrafficAlarmTime;
import java.time.ZonedDateTime;
import java.util.TimeZone;

public class TrafficAlarmTimeTest {
    private static void check(String now, String time, int[] days, String expected) {
        long actual = TrafficAlarmTime.next(time, days, ZonedDateTime.parse(now).toInstant().toEpochMilli());
        if (actual != ZonedDateTime.parse(expected).toInstant().toEpochMilli())
            throw new AssertionError(now + " -> " + actual + " expected " + expected);
    }
    public static void main(String[] args) {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Kolkata"));
        check("2026-09-08T03:00:00+05:30", "03:30", null, "2026-09-08T03:30:00+05:30");
        check("2026-09-08T03:30:00+05:30", "03:30", null, "2026-09-09T03:30:00+05:30");
        check("2026-12-31T23:59:00+05:30", "03:30", null, "2027-01-01T03:30:00+05:30");
        check("2026-09-08T12:00:00+05:30", "07:00", new int[]{1}, "2026-09-14T07:00:00+05:30");
        check("2026-09-08T12:00:00+05:30", "17:30", new int[]{}, "2026-09-08T17:30:00+05:30");
        TimeZone.setDefault(TimeZone.getTimeZone("America/New_York"));
        check("2026-03-07T07:00:00-05:00", "07:00", null, "2026-03-08T07:00:00-04:00");
        check("2026-10-31T07:00:00-04:00", "07:00", null, "2026-11-01T07:00:00-05:00");
        try { TrafficAlarmTime.next("25:00", null, 0); throw new AssertionError("Invalid time accepted"); }
        catch (IllegalArgumentException expected) { }
        System.out.println("8 alarm recurrence checks passed");
    }
}
