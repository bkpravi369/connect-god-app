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

    static class TestClock implements TrafficControlScheduler.Clock {
        long time;

        TestClock(long initialTime) {
            this.time = initialTime;
        }

        @Override
        public long currentTimeMillis() {
            return time;
        }

        public void advance(long millis) {
            time += millis;
        }

        public void set(long time) {
            this.time = time;
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
     * Test 1: Bounded recovery with backoff [1m, 2m, 5m, 15m, 30m] using an injected clock.
     * Persist nextRetryAt per pending slot.
     * Every recovery entry point must respect it; status queries and service destruction must not consume retries early.
     * Schedule the shared recovery alarm for the earliest pending deadline.
     * Define initial failure separately from retry count (retryCount = 0 on initial failure).
     */
    static void testNextOccurrenceFailureAndBoundedRecovery() throws Exception {
        System.out.println("\n--- Test 1: Next occurrence failure & bounded recovery (injected clock & deadlines) ---");
        TestStorageAdapter storage = new TestStorageAdapter();
        TestAlarmAdapter alarm = new TestAlarmAdapter();
        long baseTime = 1_700_000_000_000L;
        TestClock clock = new TestClock(baseTime);

        TrafficControlScheduler.setStorageAdapter(storage);
        TrafficControlScheduler.setAlarmAdapter(alarm);
        TrafficControlScheduler.setClock(clock);

        try {
            String slotId = "slot_0700";
            String slotsJson = "[{\"id\":\"" + slotId + "\",\"time\":\"07:00\",\"slotKey\":\"preset\",\"title\":\"Morning\"}]";
            storage.putString(TrafficControlScheduler.KEY_SLOTS, slotsJson);

            // Rescheduling next occurrence fails in AlarmManager
            alarm.failAllAlarms = true;

            // 1. Initial failure in claim()
            JSONObject claimed = TrafficControlScheduler.claim(null, slotId, clock.currentTimeMillis());
            assert claimed != null : "Today's alarm must be claimed even if next occurrence rescheduling fails";
            assert claimed.getString("id").equals(slotId);
            System.out.println("  ✓ Today's alarm claimed successfully despite reschedule failure");

            // Verify played key is set
            String playedDay = storage.getString("played:" + slotId, "");
            assert !playedDay.isEmpty() : "played:id must be persisted";

            // Verify duplicate claim on same day is rejected
            JSONObject dupClaim = TrafficControlScheduler.claim(null, slotId, clock.currentTimeMillis());
            assert dupClaim == null : "Duplicate alarm on same day must be rejected";
            System.out.println("  ✓ Duplicate claim on same day rejected (no replay)");

            // Verify initial failure is defined separately from retry count (retryCount == 0, attempts == 0)
            String rawPending = storage.getString(TrafficControlScheduler.KEY_PENDING_RESCHEDULES, "{}");
            JSONObject pendingMap = new JSONObject(rawPending);
            assert pendingMap.has(slotId) : "Pending reschedule should be recorded in storage";
            JSONObject rec = pendingMap.getJSONObject(slotId);
            int initialRetries = rec.optInt("retryCount", rec.optInt("attempts", -1));
            assert initialRetries == 0 : "Initial failure must have retryCount = 0 (defined separately from retries), got: " + initialRetries;
            assert rec.has("initialFailed") || rec.has("firstFailed") : "Initial failure timestamp must be recorded";
            System.out.println("  ✓ Initial failure defined separately from retry count (retryCount = 0)");

            // Verify nextRetryAt is persisted for slot (baseTime + 1m)
            long expectedRetry1At = baseTime + 60 * 1000L;
            assert rec.has("nextRetryAt") : "nextRetryAt must be persisted per pending slot";
            assert rec.getLong("nextRetryAt") == expectedRetry1At : "nextRetryAt must be now + 1m (60s), got: " + rec.getLong("nextRetryAt");
            System.out.println("  ✓ nextRetryAt persisted: " + expectedRetry1At + " (baseTime + 1m)");

            // Verify shared recovery alarm was scheduled for the earliest pending deadline
            assert alarm.recoveryAlarms.size() == 1 : "Recovery alarm should be scheduled";
            long scheduledRecovery = alarm.recoveryAlarms.get(alarm.recoveryAlarms.size() - 1);
            assert scheduledRecovery == expectedRetry1At : "Recovery alarm must be scheduled for earliest deadline (1m)";
            System.out.println("  ✓ Shared recovery alarm scheduled for earliest pending deadline (" + expectedRetry1At + ")");

            // Status queries and service destruction before deadline must NOT consume retries early
            clock.advance(10 * 1000L); // t = 10s
            TrafficControlScheduler.recoverPendingReschedules(null); // e.g. service destruction
            clock.advance(20 * 1000L); // t = 30s
            TrafficControlScheduler.recoverPendingReschedules(null); // e.g. getAlarmStatus query
            clock.advance(29 * 1000L); // t = 59s
            TrafficControlScheduler.recoverPendingReschedules(null);

            rec = new JSONObject(storage.getString(TrafficControlScheduler.KEY_PENDING_RESCHEDULES, "{}")).getJSONObject(slotId);
            assert rec.optInt("retryCount", 0) == 0 : "Recovery entry points prior to deadline must NOT consume retries early!";
            System.out.println("  ✓ Recovery entry points (status queries, service destruction) respected nextRetryAt (0 retries consumed before 1m)");

            // Intended retry sequence: 1m, 2m, 5m, 15m, 30m
            long[] backoffs = TrafficControlScheduler.RETRY_BACKOFF_MS; // [60s, 120s, 300s, 900s, 1800s]
            long expectedDeadline = expectedRetry1At;

            for (int r = 1; r <= TrafficControlScheduler.MAX_RESCHEDULE_ATTEMPTS; r++) {
                // Advance clock to exact deadline
                clock.set(expectedDeadline);

                // Run recovery entry point
                TrafficControlScheduler.recoverPendingReschedules(null);

                String currentPending = storage.getString(TrafficControlScheduler.KEY_PENDING_RESCHEDULES, "{}");
                JSONObject currentMap = new JSONObject(currentPending);

                if (r < TrafficControlScheduler.MAX_RESCHEDULE_ATTEMPTS) {
                    assert currentMap.has(slotId) : "Slot must remain pending after retry " + r;
                    JSONObject currentRec = currentMap.getJSONObject(slotId);
                    int currentRetries = currentRec.optInt("retryCount", currentRec.optInt("attempts", 0));
                    assert currentRetries == r : "Retry count must be " + r + ", got: " + currentRetries;

                    long nextBackoff = backoffs[r]; // retry 1 -> 2m, retry 2 -> 5m, retry 3 -> 15m, retry 4 -> 30m
                    expectedDeadline = clock.currentTimeMillis() + nextBackoff;
                    assert currentRec.getLong("nextRetryAt") == expectedDeadline :
                        "Retry " + r + " nextRetryAt mismatch: expected " + expectedDeadline + ", got: " + currentRec.getLong("nextRetryAt");

                    long latestRecoveryAlarm = alarm.recoveryAlarms.get(alarm.recoveryAlarms.size() - 1);
                    assert latestRecoveryAlarm == expectedDeadline : "Recovery alarm must be scheduled for next deadline";

                    // Verify interim status query does NOT consume next retry
                    clock.advance(nextBackoff / 2);
                    TrafficControlScheduler.recoverPendingReschedules(null);
                    currentRec = new JSONObject(storage.getString(TrafficControlScheduler.KEY_PENDING_RESCHEDULES, "{}")).getJSONObject(slotId);
                    assert currentRec.optInt("retryCount", 0) == r : "Interim status query must not consume retry " + (r + 1);

                    System.out.println("  ✓ Retry " + r + " executed; next retry scheduled with " + (nextBackoff / 60000) + "m backoff at " + expectedDeadline);
                } else {
                    // Retry 5 failed -> exhaustion!
                    assert !currentMap.has(slotId) : "Exhausted slot must be removed from pending reschedules";
                    String visibleError = TrafficControlDiagnostics.getLastScheduleError(null);
                    assert visibleError != null && visibleError.contains("Recovery exhausted for slot " + slotId) :
                        "Visible error must be retained in diagnostics on exhaustion, got: " + visibleError;
                    assert alarm.recoveryAlarmCancelled : "Recovery alarm should be cancelled when all pending retries complete/exhaust";
                    System.out.println("  ✓ Retry 5 exhaustion verified: visible failure status retained in diagnostics");
                }
            }

            // Test shared recovery alarm for earliest pending deadline with multiple pending slots:
            // Slot A: deadline at t + 5m
            // Slot B: deadline at t + 1m
            long tNow = clock.currentTimeMillis();
            JSONObject multiMap = new JSONObject();
            JSONObject recA = new JSONObject().put("retryCount", 2).put("nextRetryAt", tNow + 5 * 60_000L);
            JSONObject recB = new JSONObject().put("retryCount", 0).put("nextRetryAt", tNow + 1 * 60_000L);
            multiMap.put("slot_A", recA);
            multiMap.put("slot_B", recB);
            storage.putString(TrafficControlScheduler.KEY_PENDING_RESCHEDULES, multiMap.toString());
            storage.putString(TrafficControlScheduler.KEY_SLOTS, "[{\"id\":\"slot_A\",\"time\":\"08:00\"},{\"id\":\"slot_B\",\"time\":\"09:00\"}]");

            alarm.recoveryAlarms.clear();
            TrafficControlScheduler.recoverPendingReschedules(null);
            assert alarm.recoveryAlarms.size() > 0 : "Recovery alarm should be scheduled for multi-slot pending";
            long earliestScheduled = alarm.recoveryAlarms.get(alarm.recoveryAlarms.size() - 1);
            assert earliestScheduled == tNow + 1 * 60_000L : "Shared recovery alarm must be scheduled for earliest deadline (slot_B at +1m), got: " + earliestScheduled;

            // Advance clock to +1m (slot_B due, slot_A not due)
            clock.set(tNow + 1 * 60_000L);
            alarm.failAllAlarms = false; // allow recovery
            TrafficControlScheduler.recoverPendingReschedules(null);

            JSONObject afterRetryMap = new JSONObject(storage.getString(TrafficControlScheduler.KEY_PENDING_RESCHEDULES, "{}"));
            assert !afterRetryMap.has("slot_B") : "Slot B should have succeeded and been cleared";
            assert afterRetryMap.has("slot_A") : "Slot A must remain pending as its deadline is still in future";
            assert alarm.armedAlarms.containsKey("slot_B") : "Slot B must be armed in AlarmManager";
            long nextEarliest = alarm.recoveryAlarms.get(alarm.recoveryAlarms.size() - 1);
            assert nextEarliest == tNow + 5 * 60_000L : "Recovery alarm should now be scheduled for slot_A (+5m)";
            System.out.println("  ✓ Shared recovery alarm schedules for earliest pending deadline across multiple slots");

        } finally {
            TrafficControlScheduler.resetAdapters();
        }
    }

    /**
     * Test 2: Transaction reconciliation, preserving KEY_TX_UPDATING in claim(), and recovering failed, modified, and removed slots.
     * In claim(), do not clear KEY_TX_UPDATING merely because one incoming slot exists in the pending transaction.
     * Preserve outstanding reconciliation until all required registrations/removals succeed.
     * Test two new slots where one registers and fires while the other repeatedly fails;
     * the failed slot must remain recoverable without reopening the app.
     * Also test modified and removed slots.
     */
    static void testInterruptedScheduleTransactionsAndReceiverLookup() throws Exception {
        System.out.println("\n--- Test 2: Transaction reconciliation, claim() preservation, failed/modified/removed slots ---");
        TestStorageAdapter storage = new TestStorageAdapter();
        TestAlarmAdapter alarm = new TestAlarmAdapter();
        TestClock clock = new TestClock(1_700_000_000_000L);

        TrafficControlScheduler.setStorageAdapter(storage);
        TrafficControlScheduler.setAlarmAdapter(alarm);
        TrafficControlScheduler.setClock(clock);

        try {
            // Part A: Two new slots where one registers and fires while the other repeatedly fails.
            storage.putString(TrafficControlScheduler.KEY_SLOTS, "[]");
            String slot1 = "{\"id\":\"slot_1\",\"time\":\"07:00\",\"title\":\"Slot 1\"}";
            String slot2 = "{\"id\":\"slot_2\",\"time\":\"08:00\",\"title\":\"Slot 2\"}";
            String newSlotsJson = "[" + slot1 + "," + slot2 + "]";

            // Inject failure for slot_2: registration fails in AlarmManager
            alarm.failSlots.add("slot_2");

            boolean scheduleFailed = false;
            try {
                TrafficControlScheduler.scheduleAll(null, newSlotsJson);
            } catch (Exception e) {
                scheduleFailed = true;
            }
            assert scheduleFailed : "scheduleAll() must fail when slot_2 fails registration";
            assert alarm.armedAlarms.containsKey("slot_1") : "slot_1 must be registered and armed in AlarmManager";
            assert !alarm.armedAlarms.containsKey("slot_2") : "slot_2 must not be armed due to failure";
            assert storage.getString(TrafficControlScheduler.KEY_TX_UPDATING, null) != null : "KEY_TX_UPDATING must be set";
            assert storage.getString(TrafficControlScheduler.KEY_SLOTS, "[]").equals("[]") : "KEY_SLOTS must not be finalized";
            System.out.println("  ✓ scheduleAll() armed slot_1, failed on slot_2, and preserved transaction state in KEY_TX_UPDATING");

            // Hardware alarm fires for slot_1
            long triggerTime = clock.currentTimeMillis();
            JSONObject claimed = TrafficControlScheduler.claim(null, "slot_1", triggerTime);

            assert claimed != null : "slot_1 must be claimed and returned for playback";
            assert claimed.getString("id").equals("slot_1");

            // CRITICAL CHECK: In claim(), do not clear KEY_TX_UPDATING merely because one incoming slot exists in pending tx!
            assert storage.getString(TrafficControlScheduler.KEY_TX_UPDATING, null) != null :
                "KEY_TX_UPDATING must NOT be cleared merely because slot_1 was claimed!";
            assert !storage.getString(TrafficControlScheduler.KEY_SLOTS, "[]").contains("slot_2") :
                "KEY_SLOTS must NOT prematurely commit unfinished transaction!";
            assert storage.getString("played:slot_1", "").equals(TrafficControlScheduler.dayKey(triggerTime)) :
                "slot_1 must be marked played for today";
            System.out.println("  ✓ In claim(): KEY_TX_UPDATING preserved; slot_1 claimed without clearing in-flight transaction");

            // Simulate multiple recovery attempts while slot_2 repeatedly fails (without reopening app)
            for (int i = 0; i < 3; i++) {
                TrafficControlScheduler.recoverInterruptedSchedule(null);
                assert storage.getString(TrafficControlScheduler.KEY_TX_UPDATING, null) != null :
                    "KEY_TX_UPDATING must be preserved while slot_2 continues to fail";
            }
            System.out.println("  ✓ Outstanding reconciliation preserved while slot_2 repeatedly fails");

            // Now slot_2 unblocks (e.g. AlarmManager condition clears) without reopening the app
            alarm.failSlots.remove("slot_2");

            // Background recovery runs (e.g. via recovery alarm or receiver entry point)
            TrafficControlScheduler.recoverInterruptedSchedule(null);

            assert alarm.armedAlarms.containsKey("slot_2") : "slot_2 must now be armed in AlarmManager";
            assert storage.getString(TrafficControlScheduler.KEY_SLOTS, "[]").contains("slot_2") :
                "KEY_SLOTS must now contain slot_2 after reconciliation succeeds";
            assert storage.getString(TrafficControlScheduler.KEY_TX_UPDATING, null) == null :
                "KEY_TX_UPDATING must be cleared only after all required registrations succeed";
            System.out.println("  ✓ Failed slot remained recoverable without reopening app and successfully recovered once unblocked");

            // Part B: Test modified and removed slots during transaction reconciliation
            // Current active schedule: slot_1 and slot_2
            // User updates:
            // - slot_1 modified (time changed to 07:30, title "Slot 1 Modified")
            // - slot_2 removed (omitted)
            // - slot_3 added (time 09:00, title "Slot 3")
            String slot1Mod = "{\"id\":\"slot_1\",\"time\":\"07:30\",\"title\":\"Slot 1 Modified\"}";
            String slot3 = "{\"id\":\"slot_3\",\"time\":\"09:00\",\"title\":\"Slot 3\"}";
            String updateTxJson = "[" + slot1Mod + "," + slot3 + "]";

            // Inject failure on slot_3 during update
            alarm.failSlots.add("slot_3");
            boolean updateFailed = false;
            try {
                TrafficControlScheduler.scheduleAll(null, updateTxJson);
            } catch (Exception e) {
                updateFailed = true;
            }
            assert updateFailed : "Update must fail when slot_3 registration fails";
            assert storage.getString(TrafficControlScheduler.KEY_TX_UPDATING, null) != null :
                "KEY_TX_UPDATING must be preserved for interrupted update";

            // While update is interrupted:
            // 1. Advance clock to next occurrence (next day) and verify modified slot_1 fires
            // and claim() returns modified configuration from KEY_TX_UPDATING
            clock.advance(24 * 60 * 60_000L);
            long nextDayTrigger = clock.currentTimeMillis();
            JSONObject claimedMod = TrafficControlScheduler.claim(null, "slot_1", nextDayTrigger);
            assert claimedMod != null && claimedMod.getString("title").equals("Slot 1 Modified") :
                "claim() must use modified slot definition from KEY_TX_UPDATING";
            assert storage.getString(TrafficControlScheduler.KEY_TX_UPDATING, null) != null :
                "claim() must not clear KEY_TX_UPDATING when claiming modified slot";

            // 2. If removed slot_2 fires, claim() must recognize it was removed from KEY_TX_UPDATING, cancel it, and return null
            JSONObject claimedRemoved = TrafficControlScheduler.claim(null, "slot_2", nextDayTrigger);
            assert claimedRemoved == null : "claim() must return null for slot removed in pending transaction";
            assert alarm.cancelledAlarms.contains("slot_2") : "Removed slot_2 must be cancelled in AlarmManager";

            // Now slot_3 unblocks; run reconciliation
            alarm.failSlots.remove("slot_3");
            TrafficControlScheduler.recoverInterruptedSchedule(null);

            // Verify final state:
            // slot_1 armed with modified time (07:30)
            // slot_3 armed (09:00)
            // slot_2 cancelled and absent from KEY_SLOTS
            // KEY_TX_UPDATING cleared
            assert alarm.armedAlarms.containsKey("slot_1") : "slot_1 must be armed";
            assert alarm.armedAlarms.containsKey("slot_3") : "slot_3 must be armed";
            assert !alarm.armedAlarms.containsKey("slot_2") : "slot_2 must not be armed";
            assert alarm.cancelledAlarms.contains("slot_2") : "slot_2 must be cancelled";

            String finalSlots = storage.getString(TrafficControlScheduler.KEY_SLOTS, "[]");
            assert finalSlots.contains("slot_1") && finalSlots.contains("slot_3") && !finalSlots.contains("slot_2") :
                "Final KEY_SLOTS must contain modified slot_1 and new slot_3, but not removed slot_2: " + finalSlots;
            assert storage.getString(TrafficControlScheduler.KEY_TX_UPDATING, null) == null :
                "KEY_TX_UPDATING must be cleared after complete reconciliation";
            System.out.println("  ✓ Modified and removed slots reconciled correctly upon successful completion");

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
