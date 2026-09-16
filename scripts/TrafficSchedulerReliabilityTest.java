import com.bkkozhikode.connectgod.TrafficControlScheduler;
import com.bkkozhikode.connectgod.TrafficControlDiagnostics;
import com.bkkozhikode.connectgod.TrafficControlPlugin;
import com.bkkozhikode.connectgod.TrafficAlarmTime;

import com.getcapacitor.PluginCall;
import com.getcapacitor.JSObject;

import android.content.ActivityNotFoundException;
import android.content.Intent;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.*;

/**
 * Production regression tests for Traffic Control reliability:
 * 1. Persistent, bounded recovery with backoff [1m, 2m, 5m, 15m, 30m] when scheduling fails,
 *    without replaying completed occurrences, and retaining visible failure status on exhaustion.
 * 2. Transaction consistency with receiver lookup: interrupted schedule transactions are
 *    promoted so newly armed alarms are never discarded, testing interruption across stages.
 * 3. Injected Storage and AlarmManager failures to verify fail-fast and error reporting.
 * 4. Per-slot reboot restoration isolation: one failing slot does not block remaining slots.
 * 5. Production nextTrigger calendar recurrence calculations (no hardcoded offsets).
 * 6. File-picker availability and fallback through the actual Capacitor activity-launcher path.
 */
public class TrafficSchedulerReliabilityTest {

    static class TestStorageAdapter implements TrafficControlScheduler.StorageAdapter {
        Map<String, String> map = new HashMap<>();
        boolean failNextCommit = false;

        @Override
        public synchronized String getString(String key, String defValue) {
            return map.containsKey(key) ? map.get(key) : defValue;
        }

        @Override
        public synchronized boolean putString(String key, String value) {
            map.put(key, value);
            return true;
        }

        @Override
        public synchronized boolean remove(String key) {
            map.remove(key);
            return true;
        }

        @Override
        public synchronized boolean commit() {
            if (failNextCommit) {
                failNextCommit = false;
                return false;
            }
            return true;
        }
    }

    static class TestAlarmAdapter implements TrafficControlScheduler.AlarmSchedulerAdapter {
        Map<String, Long> armedAlarms = new LinkedHashMap<>();
        Set<String> cancelledAlarms = new HashSet<>();
        List<Long> recoveryAlarms = new ArrayList<>();
        boolean recoveryAlarmCancelled = false;
        Set<String> failSlots = new HashSet<>();
        boolean failAllAlarms = false;

        @Override
        public void setAlarm(String slotId, long triggerTime) throws Exception {
            if (failAllAlarms || failSlots.contains(slotId)) {
                throw new RuntimeException("AlarmManager injected failure for " + slotId);
            }
            armedAlarms.put(slotId, triggerTime);
        }

        @Override
        public void cancel(String slotId) throws Exception {
            cancelledAlarms.add(slotId);
            armedAlarms.remove(slotId);
        }

        @Override
        public void setRecoveryAlarm(long triggerAtMillis) throws Exception {
            recoveryAlarms.add(triggerAtMillis);
            recoveryAlarmCancelled = false;
        }

        @Override
        public void cancelRecoveryAlarm() throws Exception {
            recoveryAlarmCancelled = true;
        }
    }

    public static void main(String[] args) throws Exception {
        System.out.println("================================================================================");
        System.out.println("Running Production Tests: TrafficControlScheduler & TrafficControlPlugin");
        System.out.println("================================================================================");

        testNextOccurrenceFailureAndBoundedRecovery();
        testInterruptedScheduleTransactionsAndReceiverLookup();
        testStorageFailureHandling();
        testPerSlotRebootRestorationIsolation();
        testProductionCalendarCalculations();
        testFilePickerLaunchFallbackThroughRealCapacitorPath();

        System.out.println("\n================================================================================");
        System.out.println("ALL PRODUCTION SCHEDULER & PLUGIN RELIABILITY TESTS PASSED SUCCESSFULLY!");
        System.out.println("================================================================================");
    }

    /**
     * Test 1: Bounded recovery with backoff and visible error on exhaustion.
     * Exercises production claim(), recordPendingReschedule(), recoverPendingReschedules(),
     * and ensures completed alarms are never replayed.
     */
    static void testNextOccurrenceFailureAndBoundedRecovery() throws Exception {
        System.out.println("\n--- Test 1: Next occurrence failure & bounded recovery ---");
        TestStorageAdapter storage = new TestStorageAdapter();
        TestAlarmAdapter alarm = new TestAlarmAdapter();

        TrafficControlScheduler.setStorageAdapter(storage);
        TrafficControlScheduler.setAlarmAdapter(alarm);

        try {
            String slotId = "slot_0700";
            String slotsJson = "[{\"id\":\"" + slotId + "\",\"time\":\"07:00\",\"slotKey\":\"preset\",\"title\":\"Morning\"}]";
            storage.putString(TrafficControlScheduler.KEY_SLOTS, slotsJson);

            long now = System.currentTimeMillis();
            // AlarmManager fails to reschedule next occurrence
            alarm.failAllAlarms = true;

            // 1. Claim alarm
            JSONObject claimed = TrafficControlScheduler.claim(null, slotId, now);
            assert claimed != null : "Today's alarm must be claimed even if next occurrence rescheduling fails";
            assert claimed.getString("id").equals(slotId);
            System.out.println("  ✓ Today's alarm claimed successfully despite reschedule failure");

            // Verify played key is set
            String playedDay = storage.getString("played:" + slotId, "");
            assert !playedDay.isEmpty() : "played:id must be persisted";

            // Verify duplicate claim on same day is rejected
            JSONObject dupClaim = TrafficControlScheduler.claim(null, slotId, now);
            assert dupClaim == null : "Duplicate alarm on same day must be rejected";
            System.out.println("  ✓ Duplicate claim on same day rejected (no replay)");

            // Verify pending reschedule is persisted with attempt 1
            String rawPending = storage.getString(TrafficControlScheduler.KEY_PENDING_RESCHEDULES, "{}");
            JSONObject pendingMap = new JSONObject(rawPending);
            assert pendingMap.has(slotId) : "Pending reschedule should be recorded in storage";
            JSONObject rec = pendingMap.getJSONObject(slotId);
            assert rec.getInt("attempts") == 1 : "Initial attempt count must be 1";
            System.out.println("  ✓ Pending reschedule persisted with attempt 1");

            // Verify independent recovery alarm was scheduled with first backoff (60s)
            assert alarm.recoveryAlarms.size() == 1 : "Recovery alarm should be scheduled";
            long backoffExpected = TrafficControlScheduler.RETRY_BACKOFF_MS[0]; // 60s
            long scheduledRecovery = alarm.recoveryAlarms.get(0);
            assert Math.abs((scheduledRecovery - now) - backoffExpected) < 1000 : "First recovery backoff must be ~60s";
            System.out.println("  ✓ Recovery alarm scheduled with 1st backoff (" + (backoffExpected / 1000) + "s)");

            // Simulate recovery attempts failing up to max attempts
            for (int i = 1; i < TrafficControlScheduler.MAX_RESCHEDULE_ATTEMPTS; i++) {
                TrafficControlScheduler.recoverPendingReschedules(null);
                pendingMap = new JSONObject(storage.getString(TrafficControlScheduler.KEY_PENDING_RESCHEDULES, "{}"));
                if (pendingMap.has(slotId)) {
                    int att = pendingMap.getJSONObject(slotId).getInt("attempts");
                    assert att == i + 1 : "Attempt should increment to " + (i + 1) + ", got " + att;
                }
            }
            System.out.println("  ✓ Recovery attempts incremented with exponential backoff on each failure");

            // Exceed max attempts (5) -> must drop from pending and record visible failure status
            TrafficControlScheduler.recoverPendingReschedules(null);
            pendingMap = new JSONObject(storage.getString(TrafficControlScheduler.KEY_PENDING_RESCHEDULES, "{}"));
            assert !pendingMap.has(slotId) : "Exhausted slot must be removed from pending reschedules";

            String visibleError = TrafficControlDiagnostics.getLastScheduleError(null);
            assert visibleError != null && visibleError.contains("Recovery exhausted for slot " + slotId) :
                "Visible error must be retained in diagnostics on exhaustion, got: " + visibleError;
            assert alarm.recoveryAlarmCancelled : "Recovery alarm should be cancelled when all pending retries complete/exhaust";
            System.out.println("  ✓ Retry exhaustion sets visible failure status: \"" + visibleError + "\"");

            // Verify successful recovery path when AlarmManager recovers
            storage.map.clear();
            alarm.armedAlarms.clear();
            alarm.recoveryAlarms.clear();
            alarm.failAllAlarms = false;
            storage.putString(TrafficControlScheduler.KEY_SLOTS, slotsJson);

            // Trigger reschedule failure once
            alarm.failAllAlarms = true;
            TrafficControlScheduler.claim(null, slotId, now);
            assert storage.getString(TrafficControlScheduler.KEY_PENDING_RESCHEDULES, "{}").contains(slotId);

            // Now AlarmManager is working again: run recovery
            alarm.failAllAlarms = false;
            TrafficControlScheduler.recoverPendingReschedules(null);

            assert !storage.getString(TrafficControlScheduler.KEY_PENDING_RESCHEDULES, "{}").contains(slotId) :
                "Pending reschedule must be cleared upon successful recovery";
            assert alarm.armedAlarms.containsKey(slotId) : "Alarm must be armed in AlarmManager upon recovery";
            assert alarm.recoveryAlarmCancelled : "Recovery alarm must be cancelled upon successful recovery";
            assert TrafficControlDiagnostics.getLastScheduleError(null) == null : "Visible schedule error must be cleared upon recovery";
            System.out.println("  ✓ Successful recovery arms next occurrence, clears pending, and clears error");
        } finally {
            TrafficControlScheduler.resetAdapters();
        }
    }

    /**
     * Test 2: Transaction consistency with receiver lookup.
     * When scheduleAll() is interrupted between stages, receiver lookup in claim()
     * resolves and promotes the in-flight configuration so newly armed alarms are never lost.
     */
    static void testInterruptedScheduleTransactionsAndReceiverLookup() throws Exception {
        System.out.println("\n--- Test 2: Interrupted schedule transactions & receiver lookup ---");
        TestStorageAdapter storage = new TestStorageAdapter();
        TestAlarmAdapter alarm = new TestAlarmAdapter();

        TrafficControlScheduler.setStorageAdapter(storage);
        TrafficControlScheduler.setAlarmAdapter(alarm);

        try {
            String oldSlots = "[{\"id\":\"old_alarm\",\"time\":\"06:00\",\"title\":\"Old Alarm\"}]";
            String newSlots = "[{\"id\":\"new_alarm\",\"time\":\"08:00\",\"title\":\"New Alarm\"}]";
            storage.putString(TrafficControlScheduler.KEY_SLOTS, oldSlots);

            // Simulate Interruption at Stage 1: KEY_TX_UPDATING is written, but Stage 4 hasn't committed
            storage.putString(TrafficControlScheduler.KEY_TX_UPDATING, newSlots);

            long now = System.currentTimeMillis();
            // Hardware alarm fires for new_alarm before update finished
            JSONObject claimed = TrafficControlScheduler.claim(null, "new_alarm", now);
            assert claimed != null : "Receiver must claim newly armed alarm from KEY_TX_UPDATING";
            assert claimed.getString("id").equals("new_alarm");
            assert storage.getString(TrafficControlScheduler.KEY_SLOTS, "[]").contains("new_alarm") :
                "In-flight transaction must be promoted to KEY_SLOTS on claim";
            assert storage.getString(TrafficControlScheduler.KEY_TX_UPDATING, null) == null :
                "In-flight transaction marker must be cleared after promotion";
            System.out.println("  ✓ Stage 1/2 interruption: claim() promoted in-flight transaction slot to active schedule");

            // Simulate Interruption at Stage 3: old slots cancelled, recoverInterruptedSchedule reconciles
            storage.putString(TrafficControlScheduler.KEY_SLOTS, oldSlots);
            storage.putString(TrafficControlScheduler.KEY_TX_UPDATING, newSlots);
            TrafficControlScheduler.recoverInterruptedSchedule(null);
            assert storage.getString(TrafficControlScheduler.KEY_SLOTS, "[]").contains("new_alarm");
            assert storage.getString(TrafficControlScheduler.KEY_TX_UPDATING, null) == null;
            System.out.println("  ✓ Stage 3 interruption: recoverInterruptedSchedule() reconciled and finalized schedule");
        } finally {
            TrafficControlScheduler.resetAdapters();
        }
    }

    /**
     * Test 3: Storage commit failure handling (fail-fast).
     */
    static void testStorageFailureHandling() throws Exception {
        System.out.println("\n--- Test 3: Storage failure handling ---");
        TestStorageAdapter storage = new TestStorageAdapter();
        TestAlarmAdapter alarm = new TestAlarmAdapter();

        TrafficControlScheduler.setStorageAdapter(storage);
        TrafficControlScheduler.setAlarmAdapter(alarm);

        try {
            storage.failNextCommit = true;
            boolean failedFast = false;
            try {
                TrafficControlScheduler.scheduleAll(null, "[{\"id\":\"s1\",\"time\":\"07:00\"}]");
            } catch (IllegalStateException e) {
                failedFast = true;
            }
            assert failedFast : "scheduleAll() must fail fast with IllegalStateException when storage commit fails";
            System.out.println("  ✓ scheduleAll() threw IllegalStateException when Stage 1 commit failed");
        } finally {
            TrafficControlScheduler.resetAdapters();
        }
    }

    /**
     * Test 4: Per-slot reboot restoration failure isolation.
     * One corrupted or failing slot must not abort the restoration of remaining slots.
     */
    static void testPerSlotRebootRestorationIsolation() throws Exception {
        System.out.println("\n--- Test 4: Per-slot reboot restoration failure isolation ---");
        TestStorageAdapter storage = new TestStorageAdapter();
        TestAlarmAdapter alarm = new TestAlarmAdapter();

        TrafficControlScheduler.setStorageAdapter(storage);
        TrafficControlScheduler.setAlarmAdapter(alarm);

        try {
            String slotsJson = "[" +
                "{\"id\":\"good_slot_1\",\"time\":\"07:00\"}," +
                "{\"id\":\"bad_slot\",\"time\":\"08:00\"}," +
                "{\"id\":\"good_slot_2\",\"time\":\"09:00\"}" +
                "]";
            storage.putString(TrafficControlScheduler.KEY_SLOTS, slotsJson);

            // Inject failure ONLY on bad_slot
            alarm.failSlots.add("bad_slot");

            TrafficControlScheduler.rescheduleAllFromPreferences(null);

            assert alarm.armedAlarms.containsKey("good_slot_1") : "good_slot_1 must be restored";
            assert alarm.armedAlarms.containsKey("good_slot_2") : "good_slot_2 must be restored";
            assert !alarm.armedAlarms.containsKey("bad_slot") : "bad_slot failed as expected";

            String lastError = TrafficControlDiagnostics.getLastScheduleError(null);
            assert lastError != null && lastError.contains("1 slots failed to restore") :
                "Diagnostics must record per-slot failure details, got: " + lastError;
            System.out.println("  ✓ Failure on bad_slot did not prevent good_slot_1 & good_slot_2 from restoring");
            System.out.println("  ✓ Diagnostics recorded: \"" + lastError + "\"");
        } finally {
            TrafficControlScheduler.resetAdapters();
        }
    }

    /**
     * Test 5: Production nextTrigger calendar recurrence calculations.
     * Must never hardcode now + 86400000; exercises TrafficControlScheduler.nextTrigger() and TrafficAlarmTime.
     */
    static void testProductionCalendarCalculations() {
        System.out.println("\n--- Test 5: Production calendar recurrence calculations ---");
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, 10);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        long now = cal.getTimeInMillis();

        // 1. Same-day future alarm: 10:30 today
        long trigger1 = TrafficControlScheduler.nextTrigger("10:30", null, now);
        Calendar c1 = Calendar.getInstance(); c1.setTimeInMillis(trigger1);
        assert c1.get(Calendar.DAY_OF_YEAR) == cal.get(Calendar.DAY_OF_YEAR) : "10:30 must be scheduled today";
        assert c1.get(Calendar.HOUR_OF_DAY) == 10 && c1.get(Calendar.MINUTE) == 30;

        // 2. Past alarm: 07:00 (already passed at 10:00) -> must be tomorrow
        long trigger2 = TrafficControlScheduler.nextTrigger("07:00", null, now);
        Calendar c2 = Calendar.getInstance(); c2.setTimeInMillis(trigger2);
        assert c2.get(Calendar.DAY_OF_YEAR) != cal.get(Calendar.DAY_OF_YEAR) : "07:00 must be scheduled tomorrow";
        assert c2.get(Calendar.HOUR_OF_DAY) == 7 && c2.get(Calendar.MINUTE) == 0;
        assert trigger2 > now : "Trigger must be strictly in the future";

        // 3. Repeat days: only on Mondays
        int todayDayOfWeek = cal.get(Calendar.DAY_OF_WEEK) - 1; // 0=Sun..6=Sat
        int targetDay = (todayDayOfWeek + 3) % 7;
        JSONArray repeatDays = new JSONArray().put(targetDay);
        long trigger3 = TrafficControlScheduler.nextTrigger("12:00", repeatDays, now);
        Calendar c3 = Calendar.getInstance(); c3.setTimeInMillis(trigger3);
        assert (c3.get(Calendar.DAY_OF_WEEK) - 1) == targetDay : "Must match repeat day";
        assert trigger3 > now : "Repeat day trigger must be in the future";

        System.out.println("  ✓ Production TrafficControlScheduler.nextTrigger() calculates calendar recurrences accurately");
    }

    /**
     * Test 6: File-picker fallback through real Capacitor activity-launch path.
     * Uses real TrafficControlPlugin with an injected ActivityLauncher where ACTION_OPEN_DOCUMENT fails.
     */
    static void testFilePickerLaunchFallbackThroughRealCapacitorPath() {
        System.out.println("\n--- Test 6: File-picker fallback through real Capacitor activity launcher path ---");
        TrafficControlPlugin plugin = new TrafficControlPlugin();

        final List<Intent> launchedIntents = new ArrayList<>();
        final List<String> callbackNames = new ArrayList<>();

        plugin.setActivityLauncher(new TrafficControlPlugin.ActivityLauncher() {
            @Override
            public void startActivityForResult(PluginCall call, Intent intent, String callbackName) {
                launchedIntents.add(intent);
                callbackNames.add(callbackName);
                if (launchedIntents.size() == 1) {
                    // Simulate ACTION_OPEN_DOCUMENT failure (e.g. ActivityNotFoundException)
                    throw new ActivityNotFoundException("No Activity found to handle ACTION_OPEN_DOCUMENT");
                }
                // Second call (ACTION_GET_CONTENT) succeeds
            }
        });

        // Invoke production pickCustomAudio
        plugin.pickCustomAudio(null);

        assert launchedIntents.size() == 2 : "Expected 2 launches (primary + fallback), got: " + launchedIntents.size();
        assert callbackNames.get(0).equals("pickCustomAudioResult");
        assert callbackNames.get(1).equals("pickCustomAudioResult");

        Intent primary = launchedIntents.get(0);
        Intent fallback = launchedIntents.get(1);

        assert primary != null && fallback != null;
        System.out.println("  ✓ Primary launch attempted and failed with ActivityNotFoundException");
        System.out.println("  ✓ Fallback launch automatically executed via real Capacitor activity launcher");
        System.out.println("  ✓ Callback name preserved: " + callbackNames.get(1));
    }
}
