# Traffic Control Android alarm repair

This change needs a new Android binary AND the web changes. Publishing only Vercel cannot register Android receivers or services. Keep the change unmerged until an Android build and device tests pass. GitHub rejected branch creation with integration error 403, so this delivery is a local patch; no remote branch or PR exists. Other screens and content services are not modified.

## Root causes

- The native receiver, boot receiver and foreground service were absent from AndroidManifest.xml, along with foreground-service permissions.
- The web notification service never called the existing native scheduler. Notification delivery and taps could also start a second JavaScript audio player.
- Native audio ignored the slot key and always played traffic_chime.
- Preset switches were not persisted; custom repeat days were ignored and custom cancellation was incomplete.

## New behavior

- Native AlarmManager.setAlarmClock schedules individual occurrences using the phone's local time, including idle/locked operation. A foreground media service plays the matching bundled MP3 once using alarm volume, then stops. Notification has an independent Stop action and no second sound.
- The current schedule and per-slot last-played day are saved in device-protected preferences. Duplicate broadcasts do not replay the same slot that day. Next occurrence is armed before playback. Null/empty custom repeat days mean daily; selected weekdays are honored.
- Boot (including before first unlock), app replacement, clock/time-zone changes and exact-alarm permission grant re-arm saved schedules. Boot never directly starts a media service.
- Preset enable switches persist; deleted/disabled custom schedules are canceled. Legacy Traffic Control notifications are canceled during migration, not unrelated notifications.
- Alarms & reminders permission is user-granted. The Traffic Control screen shows permission/update status and opens the system setting. A compatible Android app must be opened once to initialize the schedule.
- Existing preview playback remains separate and user-triggered. Existing custom snooze controls are not implemented by this repair; alarm audio never loops or auto-snoozes. Custom alarms use the existing time-to-track mapping, or the hourly track for non-preset times. Remote/custom track replacement is not downloaded by the native engine.

## Build and rollout

1. Apply the accompanying patch on a new local branch in Antigravity, following README.txt in the package (save/commit unrelated local work first).
2. With Node dependencies installed: `npm ci`, `npm run typecheck`, `npm run build`, then `npx cap sync android`.
3. Use the JDK required by Capacitor 8 (JDK 21) and Android SDK 36. Build in Android Studio, or `cd android && ./gradlew assembleDebug`.
4. Because the Android wrapper loads the live domain, test this branch's web export with a debug build pointed at its Vercel preview URL (local test configuration only). Do not commit a preview URL to the production Capacitor config. Alternatively test a locally bundled export with `server.url` omitted in a local debug configuration.
5. Open Traffic Control once, grant notification permission and Alarms & reminders, then verify the tests below. Use a physical Android device, including the model affected by the original issue.
6. After review, merge the web change. The new web UI tells older Android builds to update; existing legacy alarms remain until the compatible build migrates them. Release the Android update promptly to minimize this transition.
7. Increment Android versionCode above the latest Play Console release, sign with the existing upload key, build `bundleRelease`, and release through Play internal testing before production. Declare the mediaPlayback foreground service in Play Console as required. No signing keys or versionCode were changed in this PR.
8. Pull merged main into Antigravity before continuing work. No merge, production deployment or Play upload was performed in this task.

## Device acceptance tests (required before production)

- Verify all nine preset time-to-MP3 mappings using a debug-only schedule with slots a few minutes ahead. Revert temporary times before release. Each track finishes once; notification stops it; tapping the notification does not replay it.
- Test foreground, screen locked, task swiped away, airplane mode and forced Doze (`adb shell dumpsys deviceidle force-idle`; restore with `adb shell dumpsys deviceidle unforce`). Audio must start with the app closed and no network.
- Reboot before the next alarm and leave the phone locked without reopening the app. Check the next scheduled time and its matching song, then verify tomorrow's alarm remains armed.
- Re-send the same debug alarm occurrence twice; only the first should play. Test two custom IDs at different times, editing selected weekdays, deleting/disabling alarms, and rapid switch changes followed by app restart.
- Deny exact-alarm permission: show setup-needed status, never report scheduling success. Grant permission and verify recovery without reinstall. Verify alarms at alarm volume even when media volume is zero. Alarm volume zero/DND restrictions should remain under the user's control.
- Change phone time/time zone, including day rollover and a daylight-saving boundary. Check the next occurrence uses the new local wall clock without replaying an already played slot that day.
- Smoke-test login, Murli, other audio, settings and offline fallback. Simultaneous manual audio and alarm/audio-focus interaction needs device testing.
- Force-stop in Android Settings is different from swiping away: Android blocks alarms until the user opens the app again. A powered-off phone cannot play. Manufacturer-specific autostart/battery restrictions can require device settings.

## Verification in this workspace

- `npm run typecheck`: passed.
- `npm run build`: passed (web export).
- `git diff --check`: passed.
- Java recurrence test: all 8 checks passed using Eclipse ECJ 3.37.0 with Java 17. Test is included at `scripts/TrafficAlarmTimeTest.java` (same-day, next-day, year rollover, weekdays, empty weekdays, DST, invalid input). Run with:
  `javac -d /tmp/traffic-tests android/app/src/main/java/com/bkkozhikode/connectgod/TrafficAlarmTime.java scripts/TrafficAlarmTimeTest.java`
  then `java -cp /tmp/traffic-tests TrafficAlarmTimeTest`.
- Full Android compilation and physical-device playback have NOT been verified here; Android SDK and the required Android build JDK were unavailable.

## Android references

- https://developer.android.com/develop/background-work/services/alarms
- https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start
- https://developer.android.com/about/versions/14/changes/fgs-types-required
- https://developer.android.com/about/versions/15/changes/foreground-service-types
