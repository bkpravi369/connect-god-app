import com.bkkozhikode.connectgod.TrafficPlaybackCoordinator;
import com.bkkozhikode.connectgod.TrafficPlaybackSession;

public class TrafficCollisionAndToneTest {

    public static void main(String[] args) {
        System.out.println("Running regression tests exercising PRODUCTION TrafficPlaybackCoordinator & TrafficPlaybackSession...");

        TrafficPlaybackCoordinator coordinator = new TrafficPlaybackCoordinator();
        long t0 = 1726330000000L;

        // =========================================================================
        // Test 1: Duplicate guard across ALL active states
        // (PREPARING, PLAYING, PAUSED_FOR_FOCUS, RETRYING)
        // =========================================================================
        TrafficPlaybackSession.State[] activeStates = new TrafficPlaybackSession.State[] {
            TrafficPlaybackSession.State.PREPARING,
            TrafficPlaybackSession.State.PLAYING,
            TrafficPlaybackSession.State.PAUSED_FOR_FOCUS,
            TrafficPlaybackSession.State.RETRYING
        };

        for (TrafficPlaybackSession.State state : activeStates) {
            coordinator.clearSession(coordinator.getCurrentSession());
            TrafficPlaybackCoordinator.StartResult res1 = coordinator.evaluateStart(
                "preset:07:00", "morning", "Morning Study", "bundled", "", t0, t0 + 100
            );
            assert res1.decision == TrafficPlaybackCoordinator.StartDecision.PROCEED : "Failed to start in test for " + state;
            TrafficPlaybackSession session = res1.newSession;
            session.setState(state);

            // Now send duplicate occurrence intent for same occurrenceId (preset:07:00:t0)
            TrafficPlaybackCoordinator.StartResult dupRes = coordinator.evaluateStart(
                "preset:07:00", "morning", "Morning Study", "bundled", "", t0, t0 + 200
            );
            assert dupRes.decision == TrafficPlaybackCoordinator.StartDecision.IGNORED_DUPLICATE :
                "Duplicate guard failed for state: " + state + ", got: " + dupRes.decision;
            assert coordinator.getCurrentSession() == session : "Current session changed on duplicate for state: " + state;
            assert !session.isCancelled() : "Active session should not be cancelled on duplicate for state: " + state;
            System.out.println("  ✓ Duplicate guard passed for active state: " + state);
        }

        // =========================================================================
        // Test 2: Priority guard across ALL active states
        // An hourly chime (priority 1) must NOT replace an active preset/custom alarm (priority 2),
        // including when PREPARING, PLAYING, PAUSED_FOR_FOCUS, or RETRYING!
        // =========================================================================
        for (TrafficPlaybackSession.State state : activeStates) {
            coordinator.clearSession(coordinator.getCurrentSession());
            TrafficPlaybackCoordinator.StartResult resPreset = coordinator.evaluateStart(
                "preset:12:00", "noon", "Noon Remembrance", "bundled", "", t0, t0 + 100
            );
            assert resPreset.decision == TrafficPlaybackCoordinator.StartDecision.PROCEED;
            TrafficPlaybackSession presetSession = resPreset.newSession;
            presetSession.setState(state);

            // Hourly chime arrives with priority 1
            long chimeTrigger = t0 + 500;
            TrafficPlaybackCoordinator.StartResult chimeRes = coordinator.evaluateStart(
                "hourly:12:00", "hourly_chime", "Hourly Chime", "bundled", "", chimeTrigger, chimeTrigger + 10
            );

            assert chimeRes.decision == TrafficPlaybackCoordinator.StartDecision.DROPPED_LOWER_PRIORITY :
                "Hourly chime must be DROPPED when preset is in " + state + ", but got: " + chimeRes.decision;
            assert coordinator.getCurrentSession() == presetSession : "Preset session was incorrectly replaced during state: " + state;
            assert !presetSession.isCancelled() : "Preset session was cancelled by lower-priority chime in state: " + state;
            assert presetSession.getState() == state : "Preset session state changed in state: " + state;
            System.out.println("  ✓ Priority guard passed: Hourly chime dropped while preset is in " + state);
        }

        // =========================================================================
        // Test 3: Priority preemption: Preset alarm preempts active Hourly Chime
        // =========================================================================
        {
            coordinator.clearSession(coordinator.getCurrentSession());
            TrafficPlaybackCoordinator.StartResult chimeStart = coordinator.evaluateStart(
                "hourly:17:00", "hourly_chime", "Hourly Chime", "bundled", "", t0, t0 + 50
            );
            assert chimeStart.decision == TrafficPlaybackCoordinator.StartDecision.PROCEED;
            TrafficPlaybackSession chimeSession = chimeStart.newSession;
            chimeSession.setState(TrafficPlaybackSession.State.PLAYING);

            // Preset alarm arrives (priority 2 > priority 1)
            TrafficPlaybackCoordinator.StartResult presetStart = coordinator.evaluateStart(
                "preset:17:30", "evening", "Evening Sandhya", "bundled", "", t0 + 100, t0 + 100
            );
            assert presetStart.decision == TrafficPlaybackCoordinator.StartDecision.PROCEED : "Preset must proceed";
            assert presetStart.supersededSession == chimeSession : "Chime session must be identified as superseded";
            assert chimeSession.isCancelled() : "Superseded chime session must be marked cancelled";
            assert coordinator.getCurrentSession() == presetStart.newSession : "Current session must be the new preset session";
            System.out.println("  ✓ Preemption passed: Preset alarm preempted active hourly chime and cancelled it");
        }

        // =========================================================================
        // Test 4: Occurrence-bound audio focus callback validation
        // Obsolete callbacks from superseded or cancelled session must be rejected!
        // =========================================================================
        {
            coordinator.clearSession(coordinator.getCurrentSession());
            TrafficPlaybackCoordinator.StartResult s1Result = coordinator.evaluateStart(
                "custom:al_1", "custom_1", "My Meditation", "file", "/path/song.mp3", t0, t0 + 10
            );
            TrafficPlaybackSession s1 = s1Result.newSession;
            s1.setState(TrafficPlaybackSession.State.PLAYING);

            // Valid focus callback for s1
            assert coordinator.validateFocusCallback(s1) : "Focus callback for active s1 must be valid";

            // S2 arrives and preempts S1
            TrafficPlaybackCoordinator.StartResult s2Result = coordinator.evaluateStart(
                "preset:19:30", "dusk", "Dusk Traffic", "bundled", "", t0 + 200, t0 + 200
            );
            TrafficPlaybackSession s2 = s2Result.newSession;
            s2.setState(TrafficPlaybackSession.State.PLAYING);

            // Now an obsolete focus callback arrives for S1: MUST BE REJECTED!
            assert !coordinator.validateFocusCallback(s1) : "Obsolete focus callback for superseded S1 must be REJECTED";
            assert coordinator.validateFocusCallback(s2) : "Focus callback for active S2 must be VALID";

            // A callback for a cancelled session must be rejected
            s2.setCancelled(true);
            assert !coordinator.validateFocusCallback(s2) : "Focus callback for cancelled S2 must be REJECTED";

            System.out.println("  ✓ Occurrence-bound focus callback validation passed (obsolete callbacks safely ignored)");
        }

        // =========================================================================
        // Test 5: Occurrence-bound media callback validation
        // Mismatched or obsolete tokens must be rejected!
        // =========================================================================
        {
            coordinator.clearSession(coordinator.getCurrentSession());
            TrafficPlaybackCoordinator.StartResult res = coordinator.evaluateStart(
                "preset:21:30", "night", "Night Traffic", "bundled", "", t0, t0 + 10
            );
            TrafficPlaybackSession s = res.newSession;
            long token = s.sessionToken;

            assert coordinator.validateMediaCallback(s, token) : "Valid media callback must be accepted";
            assert !coordinator.validateMediaCallback(s, token - 1) : "Obsolete token must be rejected";
            assert !coordinator.validateMediaCallback(s, token + 99) : "Future token must be rejected";
            assert !coordinator.validateMediaCallback(null, token) : "Null session must be rejected";

            System.out.println("  ✓ Media callback token isolation passed");
        }

        // =========================================================================
        // Test 6: Stale alarm expiration (>15 mins late)
        // =========================================================================
        {
            coordinator.clearSession(coordinator.getCurrentSession());
            long staleTrigger = t0;
            long nowLate = t0 + 16 * 60 * 1000L; // 16 min drift
            TrafficPlaybackCoordinator.StartResult staleRes = coordinator.evaluateStart(
                "preset:03:30", "amritvela", "Amritvela", "bundled", "", staleTrigger, nowLate
            );
            assert staleRes.decision == TrafficPlaybackCoordinator.StartDecision.EXPIRED :
                "Stale alarm (>15 min) must be EXPIRED, got: " + staleRes.decision;
            System.out.println("  ✓ Stale alarm expiration check passed");
        }

        // =========================================================================
        // Test 7: Bundled tone resolution logic
        // =========================================================================
        {
            String tone1 = TrafficPlaybackCoordinator.resolveBundledToneKey("bundled", "amritvela", "custom_1");
            assert "amritvela".equals(tone1) : "Expected amritvela, got: " + tone1;

            String tone2 = TrafficPlaybackCoordinator.resolveBundledToneKey("bundled", "", "evening");
            assert "evening".equals(tone2) : "Expected evening, got: " + tone2;

            String tone3 = TrafficPlaybackCoordinator.resolveBundledToneKey("bundled", null, null);
            assert "hourly_chime".equals(tone3) : "Expected hourly_chime fallback, got: " + tone3;

            String tone4 = TrafficPlaybackCoordinator.resolveBundledToneKey("default", "", "");
            assert "hourly_chime".equals(tone4) : "Expected hourly_chime fallback, got: " + tone4;
            System.out.println("  ✓ Bundled tone resolution passed");
        }

        System.out.println("\nALL PRODUCTION REGRESSION TESTS EXECUTED AND PASSED SUCCESSFULLY!");
    }
}
