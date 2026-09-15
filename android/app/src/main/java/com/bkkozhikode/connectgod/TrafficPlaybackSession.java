package com.bkkozhikode.connectgod;

/**
 * Immutable identity and occurrence-bound state for an alarm playback execution.
 */
public class TrafficPlaybackSession {
    public enum State {
        IDLE,
        PREPARING,
        PLAYING,
        PAUSED_FOR_FOCUS,
        RETRYING,
        COMPLETED,
        FAILED,
        CANCELLED
    }

    public final String occurrenceId;
    public final String slotId;
    public final String slotKey;
    public final String title;
    public final String toneType;
    public final String toneUri;
    public final long triggerTime;
    public final int priority;
    public final long sessionToken;

    private volatile State state = State.PREPARING;
    private volatile boolean isCancelled = false;

    // Occurrence-bound audio focus & timeout references
    public Object audioFocusRequest;
    public Object audioFocusListener;
    public Runnable focusTimeoutRunnable;

    public TrafficPlaybackSession(
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
        this.toneType = toneType != null ? toneType : "default";
        this.toneUri = toneUri;
        this.triggerTime = triggerTime;
        this.priority = priority;
        this.sessionToken = sessionToken;
    }

    public State getState() {
        return state;
    }

    public synchronized void setState(State newState) {
        this.state = newState;
    }

    public boolean isCancelled() {
        return isCancelled;
    }

    public synchronized void setCancelled(boolean cancelled) {
        this.isCancelled = cancelled;
        if (cancelled && state != State.COMPLETED && state != State.FAILED) {
            this.state = State.CANCELLED;
        }
    }

    public boolean isActive() {
        return !isCancelled && (
            state == State.PREPARING ||
            state == State.PLAYING ||
            state == State.PAUSED_FOR_FOCUS ||
            state == State.RETRYING
        );
    }
}
