package com.abhilien.tickbook;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

/** Hosts the planner UI from bundled assets. Data is a JSON file in private app storage. */
public class MainActivity extends Activity {
    private WebView web;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#FBF6E8"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setBlockNetworkLoads(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setTextZoom(100);
        web.addJavascriptInterface(new Bridge(), "Android");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                return true; // never navigate anywhere
            }
        });
        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.appBack ? appBack() : false", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String v) {
                if (!"true".equals(v)) finish();
            }
        });
    }

    private File dataFile() {
        return new File(getFilesDir(), "tickbook.json");
    }

    class Bridge {
        @JavascriptInterface
        public String load() {
            File f = dataFile();
            if (!f.exists()) return "";
            try (FileInputStream in = new FileInputStream(f)) {
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buf = new byte[8192];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                return out.toString("UTF-8");
            } catch (Exception e) {
                return "";
            }
        }

        @JavascriptInterface
        public synchronized void save(String json) {
            File tmp = new File(getFilesDir(), "tickbook.json.tmp");
            try (FileOutputStream out = new FileOutputStream(tmp)) {
                out.write(json.getBytes(StandardCharsets.UTF_8));
                out.getFD().sync();
            } catch (Exception e) {
                return;
            }
            tmp.renameTo(dataFile()); // atomic swap so a crash never leaves half a file
        }

        @JavascriptInterface
        public void copy(final String text) {
            runOnUiThread(new Runnable() { public void run() {
                ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                cm.setPrimaryClip(ClipData.newPlainText("Tickbook backup", text));
            }});
        }

        @JavascriptInterface
        public void share(final String text) {
            runOnUiThread(new Runnable() { public void run() {
                Intent i = new Intent(Intent.ACTION_SEND);
                i.setType("text/plain");
                i.putExtra(Intent.EXTRA_SUBJECT, "Tickbook backup");
                i.putExtra(Intent.EXTRA_TEXT, text);
                startActivity(Intent.createChooser(i, "Save Tickbook backup"));
            }});
        }

        @JavascriptInterface
        public void setBarColor(final String hex, final boolean dark) {
            runOnUiThread(new Runnable() { public void run() {
                int c = Color.parseColor(hex);
                getWindow().setStatusBarColor(c);
                getWindow().setNavigationBarColor(c);
                web.setBackgroundColor(c);
                if (Build.VERSION.SDK_INT >= 26) {
                    int flags = dark ? 0 : (View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
                    getWindow().getDecorView().setSystemUiVisibility(flags);
                }
            }});
        }
    }
}
