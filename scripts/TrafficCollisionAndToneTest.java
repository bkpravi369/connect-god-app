import java.util.Objects;

public class TrafficCollisionAndToneTest {

    static class PlaybackSession {
        final String occurrenceId;
        final String slotId;
        final String slotKey;
        final String title;
        final String toneType;
        final String toneUri;
        final long triggerTime;
        final int priority;
        final long sessionToken;
        volatile boolean isCancelled = false;

        PlaybackSession(
            String occurrenceId,
            String slotId,
            String slotKey,
            String title,
            String toneType,
            String toneUri,
            long triggerTime,
            int priority,
            long sessionToken
        ) {
            this.occurrenceId = occurrenceId;
            this.slotId = slotId;
            this.slotKey = slotKey;
            this.title = title;
            this.toneType = toneType;
            this.toneUri = toneUri;
            this.triggerTime = triggerTime;
            this.priority = priority;
            this.sessionToken = sessionToken;
        }
    }

    static class MockAudioService {
        private static final long STALE_PLAYBACK_THRESHOLD_MS = 15 * 60 * 1000L;
        private PlaybackSession currentSession = null;
        private long nextSessionToken = 0;
        private String lastAction = "";

        int resolvePriority(String slotId, String slotKey) {
            if ("hourly_chime".equals(slotKey) || (slotId != null && slotId.startsWith("hourly:"))) {
                return 1;
            }
            return 2;
        }

        String resolveBundledToneResource(String toneType, String toneUri, String slotKey) {
            if ("bundled".equalsIgnoreCase(toneType) && toneUri != null && !toneUri.isEmpty()) {
                return "tc_" + toneUri;
            }
            if (slotKey != null && !slotKey.isEmpty()) {
                return "tc_" + slotKey;
            }
            return "tc_hourly_chime";
        }

        boolean handleAlarmIntent(String slotId, String slotKey, String title, String toneType, String toneUri, long triggerTime, long now) {
            String occurrenceId = slotId + ":" + triggerTime;
            int priority = resolvePriority(slotId, slotKey);

            // 1. Check duplicate of current session
            if (currentSession != null && occurrenceId.equals(currentSession.occurrenceId)) {
                lastAction = "DUPLICATE_IGNORED";
                return false;
            }

            // 2. Collision policy with another active session
            if (currentSession != null && !currentSession.isCancelled) {
                if (currentSession.priority > priority) {
                    lastAction = "DROPPED_LOWER_PRIORITY";
                    return false;
                } else {
                    lastAction = "PREEMPTED_PREVIOUS";
                    currentSession.isCancelled = true;
                }
            }

            // 3. Expiration check
            if (now - triggerTime > STALE_PLAYBACK_THRESHOLD_MS) {
                lastAction = "EXPIRED_BEFORE_PLAYBACK";
                return false;
            }

            // 4. Start new session
            long token = ++nextSessionToken;
            currentSession = new PlaybackSession(occurrenceId, slotId, slotKey, title, toneType, toneUri, triggerTime, priority, token);
            lastAction = "STARTED_SESSION_" + token;
            return true;
        }

        boolean handleCompletionCallback(long callbackSessionToken) {
            if (currentSession != null && currentSession.sessionToken == callbackSessionToken && !currentSession.isCancelled) {
                lastAction = "COMPLETED_SESSION_" + callbackSessionToken;
                currentSession = null;
                return true;
            }
            lastAction = "IGNORED_OBSOLETE_CALLBACK";
            return false;
        }
    }

    public static void main(String[] args) {
        MockAudioService service = new MockAudioService();
        long t0 = 1726330000000L;

        // Test 1: Hourly chime fires and starts session 1
        boolean started1 = service.handleAlarmIntent("hourly:14:00", "hourly_chime", "Hourly Chime", "bundled", "", t0, t0 + 100);
        assert started1 : "Session 1 should have started";
        assert "STARTED_SESSION_1".equals(service.lastAction) : "Action should be STARTED_SESSION_1";
        assert service.currentSession.sessionToken == 1 : "Session token should be 1";

        // Test 2: Duplicate broadcast of same hourly chime occurrence
        boolean startedDup = service.handleAlarmIntent("hourly:14:00", "hourly_chime", "Hourly Chime", "bundled", "", t0, t0 + 200);
        assert !startedDup : "Duplicate should not start new session";
        assert "DUPLICATE_IGNORED".equals(service.lastAction) : "Action should be DUPLICATE_IGNORED";
        assert service.currentSession.sessionToken == 1 : "Active session should still be 1";

        // Test 3: Preset alarm arrives while hourly chime is active -> Preset preempts chime
        boolean startedPreset = service.handleAlarmIntent("preset:14:00", "noon", "12:00 PM Noon", "bundled", "", t0, t0 + 300);
        assert startedPreset : "Preset should preempt hourly chime";
        assert "STARTED_SESSION_2".equals(service.lastAction) : "Action should be STARTED_SESSION_2";
        assert service.currentSession.sessionToken == 2 : "Active session should be 2";
        assert service.currentSession.priority == 2 : "Active session priority should be 2";

        // Test 4: Obsolete completion callback from session 1 arrives late -> MUST be ignored!
        boolean handledLateCallback = service.handleCompletionCallback(1);
        assert !handledLateCallback : "Late callback from preempted session 1 must be ignored";
        assert "IGNORED_OBSOLETE_CALLBACK".equals(service.lastAction) : "Obsolete callback must be ignored";
        assert service.currentSession != null && service.currentSession.sessionToken == 2 : "Session 2 must remain active";

        // Test 5: Lower-priority hourly chime arrives while Preset alarm is active -> MUST be dropped!
        boolean startedLower = service.handleAlarmIntent("hourly:14:00", "hourly_chime", "Hourly Chime", "bundled", "", t0 + 400, t0 + 400);
        assert !startedLower : "Lower priority hourly chime must be dropped";
        assert "DROPPED_LOWER_PRIORITY".equals(service.lastAction) : "Action should be DROPPED_LOWER_PRIORITY";
        assert service.currentSession.sessionToken == 2 : "Session 2 must still remain active";

        // Test 6: Valid completion callback from session 2 -> Completed normally
        boolean handledValidCallback = service.handleCompletionCallback(2);
        assert handledValidCallback : "Valid session 2 completion must be accepted";
        assert "COMPLETED_SESSION_2".equals(service.lastAction) : "Action should be COMPLETED_SESSION_2";
        assert service.currentSession == null : "Session should be finished";

        // Test 7: Stale alarm (more than 15 min late) -> Aborted
        long staleTrigger = t0;
        long nowLate = t0 + 16 * 60 * 1000L; // 16 minutes late
        boolean startedStale = service.handleAlarmIntent("preset:07:00", "morning", "Morning", "bundled", "", staleTrigger, nowLate);
        assert !startedStale : "Stale alarm must be aborted";
        assert "EXPIRED_BEFORE_PLAYBACK".equals(service.lastAction) : "Action should be EXPIRED_BEFORE_PLAYBACK";

        // Test 8: Bundled tone resolution
        String resChime = service.resolveBundledToneResource("bundled", "hourly_chime", "custom_1");
        assert "tc_hourly_chime".equals(resChime) : "Bundled chime must resolve to tc_hourly_chime, got: " + resChime;

        String resAmritvela = service.resolveBundledToneResource("bundled", "amritvela", "custom_1");
        assert "tc_amritvela".equals(resAmritvela) : "Bundled amritvela must resolve to tc_amritvela, got: " + resAmritvela;

        String resSlotKey = service.resolveBundledToneResource("bundled", "", "evening");
        assert "tc_evening".equals(resSlotKey) : "SlotKey fallback must resolve to tc_evening, got: " + resSlotKey;

        System.out.println("ALL CONCURRENCY, COLLISION, AND TONE RESOLUTION TESTS PASSED!");
    }
}
