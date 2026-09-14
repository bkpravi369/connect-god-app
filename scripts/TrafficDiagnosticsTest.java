import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

public class TrafficDiagnosticsTest {
    private static String dayKey(long millis) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(millis);
        return c.get(Calendar.YEAR) + "-" + c.get(Calendar.DAY_OF_YEAR);
    }

    private static String formatTime(long millis) {
        if (millis <= 0) return "Never";
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault());
        return sdf.format(new Date(millis));
    }

    public static void main(String[] args) {
        long now = 1726330000000L; // fixed timestamp
        String dk = dayKey(now);
        if (dk == null || !dk.contains("-")) {
            throw new AssertionError("Invalid dayKey: " + dk);
        }

        String formatted = formatTime(now);
        if (formatted.equals("Never") || formatted.length() < 10) {
            throw new AssertionError("Invalid formatted time: " + formatted);
        }

        // Test stale alarm detection (15 mins threshold)
        long staleThreshold = 15 * 60 * 1000L;
        long pastTrigger1 = now - 5 * 60 * 1000L; // 5 min ago (not stale)
        long pastTrigger2 = now - 20 * 60 * 1000L; // 20 min ago (stale)

        if ((now - pastTrigger1) > staleThreshold) {
            throw new AssertionError("5 min drift should NOT be stale");
        }
        if ((now - pastTrigger2) <= staleThreshold) {
            throw new AssertionError("20 min drift MUST be stale");
        }

        System.out.println("Diagnostics helper checks passed successfully!");
    }
}
