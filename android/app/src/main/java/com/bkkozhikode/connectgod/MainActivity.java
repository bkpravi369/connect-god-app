package com.bkkozhikode.connectgod;

import android.content.Context;
import android.media.AudioManager;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    private static final String OFFLINE_URL = "file:///android_asset/offline.html";
    private static final String REMOTE_LIVE_URL = "https://app.bkkozhikode.com";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TrafficControlPlugin.class);
        super.onCreate(savedInstanceState);
        this.setVolumeControlStream(AudioManager.STREAM_MUSIC);

        if (bridge != null && bridge.getWebView() != null) {
            WebView webView = bridge.getWebView();
            WebSettings settings = webView.getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);

            // Add JavaScript interface so offline page Retry button or print actions can invoke native code directly
            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void reload() {
                    runOnUiThread(() -> {
                        Log.i(TAG, "Reload requested from offline page. Navigating to " + REMOTE_LIVE_URL);
                        webView.loadUrl(REMOTE_LIVE_URL);
                    });
                }

                @JavascriptInterface
                public void printHtml(String htmlContent) {
                    runOnUiThread(() -> {
                        try {
                            Log.i(TAG, "printHtml called from web layer");
                            WebView printWebView = new WebView(MainActivity.this);
                            printWebView.setWebViewClient(new WebViewClient() {
                                @Override
                                public void onPageFinished(WebView view, String url) {
                                    try {
                                        PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                                        if (printManager != null) {
                                            String jobName = "Connect_GOD_Monthly_Report";
                                            PrintDocumentAdapter printAdapter = printWebView.createPrintDocumentAdapter(jobName);
                                            printManager.print(jobName, printAdapter, new PrintAttributes.Builder().build());
                                        }
                                    } catch (Exception e) {
                                        Log.e(TAG, "Error invoking PrintManager: " + e.getMessage(), e);
                                    }
                                }
                            });
                            printWebView.loadDataWithBaseURL("https://app.bkkozhikode.com", htmlContent, "text/html", "UTF-8", null);
                        } catch (Exception e) {
                            Log.e(TAG, "Error in printHtml: " + e.getMessage(), e);
                        }
                    });
                }
            }, "AndroidHost");

            // Override WebViewClient to intercept network failures and load local offline fallback
            webView.setWebViewClient(new BridgeWebViewClient(bridge) {
                @Override
                public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                    if (request != null && request.isForMainFrame()) {
                        Log.w(TAG, "Main frame connection error (" + error.getErrorCode() + "): " + error.getDescription());
                        view.loadUrl(OFFLINE_URL);
                        return;
                    }
                    super.onReceivedError(view, request, error);
                }

                @SuppressWarnings("deprecation")
                @Override
                public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                    Log.w(TAG, "Legacy connection error (" + errorCode + "): " + description + " for " + failingUrl);
                    view.loadUrl(OFFLINE_URL);
                }
            });
        }
    }
}
