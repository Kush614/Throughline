package com.neverzero.cloud.util;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/**
 * Static lookup for the per-agent identity colors used across the UI.
 * Values mirror the CSS tokens from the web design — see app/globals.css in the
 * Next.js workspace (--a-iris, --a-forge, etc.). Returned as integer ARGB so they
 * drop straight into Compose's Color(0xFF...) constructor or Java's Color int.
 */
public final class AgentColors {

    public static final int IRIS_ARGB  = 0xFF6F5CA7;
    public static final int FORGE_ARGB = 0xFFA86A4F;
    public static final int ATLAS_ARGB = 0xFF4E7E8A;
    public static final int LOOP_ARGB  = 0xFF7A7B47;
    public static final int BEAM_ARGB  = 0xFFA45A82;

    private static final Map<String, Integer> BY_ID;
    static {
        Map<String, Integer> m = new HashMap<>();
        m.put("iris",  IRIS_ARGB);
        m.put("forge", FORGE_ARGB);
        m.put("atlas", ATLAS_ARGB);
        m.put("loop",  LOOP_ARGB);
        m.put("beam",  BEAM_ARGB);
        BY_ID = Collections.unmodifiableMap(m);
    }

    private AgentColors() { /* no instances */ }

    /** Returns the agent's color as ARGB, or the muted fallback if the id is unknown. */
    public static int forId(@Nullable String id) {
        if (id == null) return 0xFF7A7975;
        Integer c = BY_ID.get(id);
        return c != null ? c : 0xFF7A7975;
    }

    @NonNull
    public static Map<String, Integer> all() {
        return BY_ID;
    }
}
