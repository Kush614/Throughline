# NeverZero Mobile (Android)

Native Android port of the NeverZero Mobile design from the web prototype.
Kotlin + Jetpack Compose with a small Java sidecar (`NeverZeroApp`, `AgentColors`,
`TimeFormatter`) demonstrating Kotlin/Java interop.

## Open in Android Studio
1. Open Android Studio → **File → Open → `mobile/android`**.
2. On first sync, Android Studio will:
   - Download Gradle 8.10.2 (declared in `gradle/wrapper/gradle-wrapper.properties`)
   - Generate `gradlew.bat`, `gradlew`, and `gradle/wrapper/gradle-wrapper.jar`
   - Fetch the Compose + AGP dependencies pinned in `gradle/libs.versions.toml`
3. Run on an Android 8.0+ device or emulator (minSdk 26, target/compile 35).

## CLI build (if you have the Android SDK locally)
```bash
cd mobile/android
gradle wrapper           # generate the wrapper jar once
./gradlew assembleDebug  # build a debug APK at app/build/outputs/apk/debug/
```

## Layout
```
app/src/main/
├── AndroidManifest.xml
├── java/com/neverzero/cloud/
│   ├── NeverZeroApp.java          # Application subclass
│   ├── MainActivity.kt            # Compose host
│   ├── util/
│   │   ├── AgentColors.java       # ARGB lookup per agent id
│   │   └── TimeFormatter.java     # "14s ago" style relative timestamps
│   ├── data/{Models.kt, SampleData.kt}
│   └── ui/
│       ├── theme/{Color.kt, Type.kt, Theme.kt}
│       ├── components/{AgentAvatar, TodoRow, ActivityRow, BottomNav}.kt
│       └── screens/
│           ├── RootScreen.kt
│           ├── TodayScreen.kt
│           ├── DocScreen.kt
│           ├── AgentsScreen.kt
│           ├── ActivityScreen.kt
│           ├── ComposeSheet.kt
│           └── AgentDetailSheet.kt
└── res/
    ├── values/{colors, strings, themes}.xml
    ├── drawable/{ic_launcher_background, ic_launcher_foreground}.xml
    └── mipmap-anydpi-v26/{ic_launcher, ic_launcher_round}.xml
```
