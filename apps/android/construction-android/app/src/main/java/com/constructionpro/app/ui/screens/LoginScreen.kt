package com.constructionpro.app.ui.screens

import android.content.res.Configuration
import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.constructionpro.app.BuildConfig
import com.constructionpro.app.R
import com.constructionpro.app.data.AuthRepository
import com.constructionpro.app.data.AuthTokenStore
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    authRepository: AuthRepository,
    tokenStore: AuthTokenStore,
    onLoggedIn: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var passwordVisible by remember { mutableStateOf(false) }

    val canSubmit = email.isNotBlank() && password.isNotBlank() && !isLoading

    fun handleLogin() {
        if (!canSubmit) return
        isLoading = true
        error = null
        scope.launch {
            val result = authRepository.signIn(email.trim(), password)
            result.onSuccess { session ->
                // Verify the user exists in our database BEFORE saving tokens.
                // This prevents a race condition where saving tokens triggers
                // navigation before profile verification completes.
                val profileVerified = withContext(Dispatchers.IO) {
                    try {
                        val client = OkHttpClient()
                        val request = Request.Builder()
                            .url("${BuildConfig.API_BASE_URL}users/me")
                            .addHeader("Authorization", "Bearer ${session.accessToken}")
                            .addHeader("Accept", "application/json")
                            .build()
                        val response = client.newCall(request).execute()
                        val responseBody = response.body?.string()
                        Log.d("LoginScreen", "Profile verification: ${response.code} - $responseBody")
                        response.isSuccessful
                    } catch (e: Exception) {
                        Log.e("LoginScreen", "Profile verification failed", e)
                        false
                    }
                }

                if (profileVerified) {
                    // User exists in our database, save session and navigate
                    authRepository.saveSession(session)
                    isLoading = false
                    onLoggedIn()
                } else {
                    // User authenticated with Supabase but doesn't exist or isn't activated
                    isLoading = false
                    error = "ACCOUNT_PENDING"
                }
            }.onFailure { failure ->
                isLoading = false
                error = failure.message ?: "LOGIN_FAILED"
            }
        }
    }

    // Use LocalConfiguration for reliable screen width detection
    val configuration = LocalConfiguration.current
    val screenWidthDp = configuration.screenWidthDp

    // Fold 7 cover screen at 1768px / ~3x density = ~589dp
    // Use 650dp threshold to catch foldable cover screens
    val isNarrow = screenWidthDp < 650

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Primary600, Primary800)
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .systemBarsPadding()
                .padding(horizontal = AppSpacing.md),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(AppSpacing.xl))

            // Logo/Brand Section
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(RoundedCornerShape(AppSpacing.sm))
                    .background(androidx.compose.ui.graphics.Color.White.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "CP",
                    style = AppTypography.heading2,
                    fontWeight = FontWeight.Bold,
                    color = androidx.compose.ui.graphics.Color.White
                )
            }

            Spacer(modifier = Modifier.height(AppSpacing.sm))

            Text(
                text = "ConstructionPro",
                style = AppTypography.heading3,
                fontWeight = FontWeight.Bold,
                color = androidx.compose.ui.graphics.Color.White,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(AppSpacing.lg))

            // Login Card - constrain max width for large screens
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 400.dp),
                shape = RoundedCornerShape(AppSpacing.md),
                color = AppColors.cardBackground,
                shadowElevation = 4.dp
            ) {
                Column(
                    modifier = Modifier.padding(AppSpacing.md),
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                ) {
                    Text(
                        text = stringResource(R.string.auth_sign_in),
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.Bold,
                        color = AppColors.textPrimary
                    )

                    // Email Field
                    CPTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = stringResource(R.string.auth_email),
                        placeholder = stringResource(R.string.auth_email),
                        leadingIcon = Icons.Default.Email,
                        keyboardType = KeyboardType.Email,
                        imeAction = ImeAction.Next
                    )

                    // Password Field
                    CPTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = stringResource(R.string.auth_password),
                        placeholder = stringResource(R.string.auth_password),
                        leadingIcon = Icons.Default.Lock,
                        isPassword = !passwordVisible,
                        imeAction = ImeAction.Done,
                        onImeAction = { handleLogin() },
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                    contentDescription = if (passwordVisible) stringResource(R.string.auth_hide_password) else stringResource(R.string.auth_show_password),
                                    tint = AppColors.textSecondary
                                )
                            }
                        }
                    )

                    // Error Message
                    if (error != null) {
                        val localizedError = when (error) {
                            "ACCOUNT_PENDING" -> stringResource(R.string.auth_account_pending)
                            "LOGIN_FAILED" -> stringResource(R.string.error_generic)
                            else -> error ?: ""
                        }
                        CPErrorBanner(
                            message = localizedError,
                            onDismiss = { error = null }
                        )
                    }

                    // Login Button
                    CPButton(
                        text = if (isLoading) stringResource(R.string.auth_signing_in) else stringResource(R.string.auth_sign_in),
                        onClick = { handleLogin() },
                        modifier = Modifier.fillMaxWidth(),
                        size = CPButtonSize.Medium,
                        enabled = canSubmit,
                        loading = isLoading
                    )
                }
            }

            Spacer(modifier = Modifier.height(AppSpacing.sm))

            Text(
                text = stringResource(R.string.auth_use_web_credentials),
                style = AppTypography.caption,
                color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.7f),
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(AppSpacing.md))
        }
    }
}
