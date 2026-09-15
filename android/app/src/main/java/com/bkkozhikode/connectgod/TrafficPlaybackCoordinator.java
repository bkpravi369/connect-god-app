package com.bkkozhikode.connectgod;

/**
 * Coordinates playback sessions, collision policy, duplicate suppression across all active states
 * (PREPARING, PLAYING, PAUSED_FOR_FOCUS, RETRYING), and callback validation.
 */
public class TrafficPlaybackCoordinator {
    public static final long STALE_PLAYBACK_THRESHOLD_MS = 15 * 60 * 1000L; // 15 minutes

    public enum StartDecision {
        PROCEED,
        IGNORED_DUPLICATE,
        DROPPED_LOWER_PRIORITY,
        EXPIRED
    }

    public static class StartResult {
        public final StartDecision decision;
        public final TrafficPlaybackSession newSession;
        public final TrafficPlaybackSession supersededSession;
        public final String reason;

        public StartResult(StartDecision decision, TrafficPlaybackSession newSession, TrafficPlaybackSession supersededSession, String reason) {
            this.decision = decision;
            this.newSession = newSession;
            this.supersededSession = supersededSession;
            this.reason = reason;
        }
    }

    private TrafficPlaybackSession currentSession = null;
    private long nextSessionToken = 0;

    public synchronized TrafficPlaybackSession getCurrentSession() {
        return currentSession;
    }

    public static int resolvePriority(String slotId, String slotKey) {
        if ("hourly_chime".equals(slotKey) || (slotId != null && slotId.startsWith("hourly:"))) {
            return 1;
        }
        return 2;
    }

    public static String resolveBundledToneKey(String toneType, String toneUri, String slotKey) {
        if ("bundled".equalsIgnoreCase(toneType) && toneUri != null && !toneUri.trim().isEmpty()) {
            return toneUri.trim();
        }
        if (slotKey != null && !slotKey.trim().isEmpty()) {
            return slotKey.trim();
        }
        return "hourly_chime";
    }

    /**
     * Evaluates incoming alarm occurrence against any active, non-cancelled session across ALL states:
     * PREPARING, PLAYING, PAUSED_FOR_FOCUS, and RETRYING.
     */
    public synchronized StartResult evaluateStart(
        String slotId,
        String slotKey,
        String title,
        String toneType,
        String toneUri,
        long triggerTime,
        long now
    ) {
        if (slotId == null || slotId.isEmpty()) slotId = "slot_unknown";
        if (slotKey == null || slotKey.isEmpty()) slotKey = "hourly_chime";
        if (title == null || title.isEmpty()) title = "Traffic Control";

        String occurrenceId = slotId + ":" + triggerTime;
        int priority = resolvePriority(slotId, slotKey);

        // 1. Check against any active, non-cancelled occurrence (including PREPARING, RETRYING, PAUSED_FOR_FOCUS)
        if (currentSession != null && currentSession.isActive()) {
            // A. Duplicate guard: exact same occurrence must be ignored
            if (currentSession.occurrenceId.equals(occurrenceId)) {
                return new StartResult(
                    StartDecision.IGNORED_DUPLICATE,
                    null,
                    null,
                    "Duplicate occurrence intent received for " + occurrenceId + " in state " + currentSession.getState()
                );
            }

            // B. Priority guard: lower-priority alarm cannot interrupt an active higher-priority alarm
            if (priority < currentSession.priority) {
                return new StartResult(
                    StartDecision.DROPPED_LOWER_PRIORITY,
                    null,
                    null,
                    "Alarm " + slotId + " (priority " + priority + ") dropped because active session "
                        + currentSession.slotId + " has higher priority (" + currentSession.priority + ", state " + currentSession.getState() + ")"
                );
            }
        }

        // 2. Service-side trigger expiration check
        if (now - triggerTime > STALE_PLAYBACK_THRESHOLD_MS) {
            return new StartResult(
                StartDecision.EXPIRED,
                null,
                null,
                "Alarm " + occurrenceId + " is stale by " + ((now - triggerTime) / 1000) + "s. Playback aborted."
            );
        }

        // 3. Preemption: if an active session exists with lower or equal priority, it is superseded
        TrafficPlaybackSession superseded = null;
        if (currentSession != null && currentSession.isActive()) {
            superseded = currentSession;
            superseded.setCancelled(true);
        }

        long token = ++nextSessionToken;
        TrafficPlaybackSession newSession = new TrafficPlaybackSession(
            occurrenceId,
            slotId,
            slotKey,
            title,
            toneType,
            toneUri,
            triggerTime,
            priority,
            token
        );
        newSession.setState(TrafficPlaybackSession.State.PREPARING);
        currentSession = newSession;

        return new StartResult(
            StartDecision.PROCEED,
            newSession,
            superseded,
            superseded != null
                ? "Preempted active session " + superseded.slotId + " (priority " + superseded.priority + ", state " + superseded.getState() + ")"
                : "Started new session"
        );
    }

    /**
     * Occurrence-bound validation for audio focus callbacks.
     * Rejects callbacks from superseded, cancelled, or mismatched sessions.
     */
    public synchronized boolean validateFocusCallback(TrafficPlaybackSession session) {
        if (session == null) return false;
        if (session.isCancelled()) return false;
        if (currentSession != session) return false;
        return session.sessionToken == currentSession.sessionToken;
    }

    /**
     * Occurrence-bound validation for MediaPlayer callbacks.
     */
    public synchronized boolean validateMediaCallback(TrafficPlaybackSession session, long sessionToken) {
        if (session == null) return false;
        if (session.isCancelled()) return false;
        if (currentSession != session) return false;
        return currentSession.sessionToken == sessionToken;
    }

    /**
     * Occurrence-bound validation for retry attempts.
     */
    public synchronized boolean validateRetry(TrafficPlaybackSession session) {
        if (session == null) return false;
        if (session.isCancelled()) return false;
        if (currentSession != session) return false;
        return currentSession.getState() == TrafficPlaybackSession.State.RETRYING;
    }

    public synchronized void clearSession(TrafficPlaybackSession session) {
        if (currentSession == session) {
            if (session != null) {
                session.setCancelled(true);
            }
            currentSession = null;
        }
    }
}
