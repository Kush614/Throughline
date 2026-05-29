package com.neverzero.cloud;

import android.app.Application;

/**
 * Application entry point. Wired in AndroidManifest as android:name=".NeverZeroApp".
 * Kept in Java to demonstrate Kotlin/Java interop — Kotlin code references this
 * class transparently.
 */
public final class NeverZeroApp extends Application {

    @Override
    public void onCreate() {
        super.onCreate();
    }
}
