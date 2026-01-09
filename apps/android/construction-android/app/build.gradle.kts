plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
  id("org.jetbrains.kotlin.plugin.serialization")
  id("org.jetbrains.kotlin.kapt")
  id("com.google.dagger.hilt.android")
  id("com.apollographql.apollo3")
}

val supabaseUrl: String = (project.findProperty("SUPABASE_URL") as String?)
  ?: "https://YOUR_PROJECT.supabase.co"
val supabaseAnonKey: String = (project.findProperty("SUPABASE_ANON_KEY") as String?)
  ?: "YOUR_SUPABASE_ANON_KEY"
val supabaseUrlWithSlash = if (supabaseUrl.endsWith("/")) supabaseUrl else "$supabaseUrl/"

// Debug uses local dev server
// 10.0.2.2 = Android emulator's alias for host localhost
// For physical device testing, use your computer's IP address
// Make sure to run: cd construction-platform && npm run dev
val apiBaseDebug = "http://192.168.117.177:3000/api/"  // Use computer's IP for real device (port 3000)
val apiBaseRelease = "https://constructionpro.vercel.app/api/"

android {
  namespace = "com.constructionpro.app"
  compileSdk = 34

  defaultConfig {
    applicationId = "com.constructionpro.app"
    minSdk = 26
    targetSdk = 34
    versionCode = 1
    versionName = "0.1.0"

    testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    vectorDrawables {
      useSupportLibrary = true
    }

    buildConfigField("String", "API_BASE_URL", "\"$apiBaseDebug\"")
    buildConfigField("String", "SUPABASE_URL", "\"$supabaseUrlWithSlash\"")
    buildConfigField("String", "SUPABASE_ANON_KEY", "\"$supabaseAnonKey\"")
  }

  buildTypes {
    release {
      isMinifyEnabled = false
      proguardFiles(
        getDefaultProguardFile("proguard-android-optimize.txt"),
        "proguard-rules.pro"
      )
      buildConfigField("String", "API_BASE_URL", "\"$apiBaseRelease\"")
    }
    debug {
      buildConfigField("String", "API_BASE_URL", "\"$apiBaseDebug\"")
    }
  }

  buildFeatures {
    compose = true
    buildConfig = true
  }

  composeOptions {
    kotlinCompilerExtensionVersion = "1.5.8"
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }

  kotlinOptions {
    jvmTarget = "17"
  }

  packaging {
    resources {
      excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
  }
}

dependencies {
  implementation(platform("androidx.compose:compose-bom:2024.02.01"))
  implementation("androidx.core:core-ktx:1.12.0")
  implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
  implementation("androidx.activity:activity-compose:1.8.2")
  implementation("androidx.compose.ui:ui")
  implementation("androidx.compose.ui:ui-graphics")
  implementation("androidx.compose.ui:ui-tooling-preview")
  implementation("androidx.compose.material3:material3")
  implementation("androidx.compose.material3:material3-window-size-class")
  implementation("androidx.compose.material3:material3-adaptive-navigation-suite:1.3.0")
  implementation("androidx.compose.material:material-icons-extended")
  implementation("androidx.window:window:1.2.0")
  implementation("com.google.android.material:material:1.11.0")
  debugImplementation("androidx.compose.ui:ui-tooling")

  // Retrofit (keep for REST endpoints during migration)
  implementation("com.squareup.retrofit2:retrofit:2.11.0")
  implementation("com.squareup.retrofit2:converter-kotlinx-serialization:2.11.0")
  implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")
  implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

  // Apollo GraphQL
  implementation("com.apollographql.apollo3:apollo-runtime:3.8.2")
  implementation("com.apollographql.apollo3:apollo-normalized-cache:3.8.2")
  implementation("com.apollographql.apollo3:apollo-normalized-cache-sqlite:3.8.2")

  // Hilt Dependency Injection
  implementation("com.google.dagger:hilt-android:2.50")
  kapt("com.google.dagger:hilt-compiler:2.50")
  implementation("androidx.hilt:hilt-navigation-compose:1.1.0")
  implementation("androidx.hilt:hilt-work:1.1.0")
  kapt("androidx.hilt:hilt-compiler:1.1.0")

  implementation("androidx.datastore:datastore-preferences:1.1.0")
  implementation("androidx.security:security-crypto:1.1.0-alpha06")
  implementation("androidx.navigation:navigation-compose:2.7.7")
  implementation("androidx.room:room-runtime:2.6.1")
  implementation("androidx.room:room-ktx:2.6.1")
  kapt("androidx.room:room-compiler:2.6.1")
  implementation("androidx.work:work-runtime-ktx:2.9.0")

  // Coil for image loading
  implementation("io.coil-kt:coil-compose:2.5.0")
}

// Apollo GraphQL Configuration
apollo {
  service("constructionpro") {
    packageName.set("com.constructionpro.app.graphql")
    schemaFile.set(file("src/main/graphql/schema.graphqls"))
    generateKotlinModels.set(true)
  }
}

// Allow references to generated code (Hilt)
kapt {
  correctErrorTypes = true
}
