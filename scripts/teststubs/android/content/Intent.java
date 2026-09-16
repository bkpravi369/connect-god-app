package android.content;

import java.util.HashMap;
import java.util.Map;

public class Intent {
    public static final String ACTION_OPEN_DOCUMENT = "android.intent.action.OPEN_DOCUMENT";
    public static final String ACTION_GET_CONTENT = "android.intent.action.GET_CONTENT";
    public static final String CATEGORY_OPENABLE = "android.intent.category.OPENABLE";
    public static final String EXTRA_MIME_TYPES = "android.intent.extra.MIME_TYPES";
    public static final int FLAG_GRANT_READ_URI_PERMISSION = 1;
    public static final int FLAG_GRANT_PERSISTABLE_URI_PERMISSION = 64;

    private String action;
    private Map<String, Object> extras = new HashMap<>();

    public Intent() {}
    public Intent(String action) { this.action = action; }
    public Intent(Object context, Class<?> cls) {}

    public String getAction() { return action; }
    public Intent setAction(String action) { this.action = action; return this; }
    public Intent addCategory(String category) { return this; }
    public Intent setType(String type) { return this; }
    public Intent addFlags(int flags) { return this; }
    public Intent putExtra(String name, String value) { extras.put(name, value); return this; }
    public Intent putExtra(String name, long value) { extras.put(name, value); return this; }
    public Intent putExtra(String name, String[] value) { extras.put(name, value); return this; }
    public String getStringExtra(String name) { Object v = extras.get(name); return v instanceof String ? (String) v : null; }
    public long getLongExtra(String name, long defaultValue) { Object v = extras.get(name); return v instanceof Long ? (Long) v : defaultValue; }
    public Intent setData(Object uri) { return this; }

    public static Intent createChooser(Intent target, CharSequence title) {
        Intent chooser = new Intent();
        chooser.action = target.action;
        chooser.extras.putAll(target.extras);
        return chooser;
    }
}
