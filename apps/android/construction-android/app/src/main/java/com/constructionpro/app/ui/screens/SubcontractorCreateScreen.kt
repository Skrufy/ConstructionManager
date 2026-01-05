package com.constructionpro.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.model.CreateSubcontractorRequest
import com.constructionpro.app.data.model.Subcontractor
import com.constructionpro.app.ui.components.CPButton
import com.constructionpro.app.ui.components.CPErrorBanner
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class SubcontractorCreateState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val errorResId: Int? = null,
    val successMessage: String? = null,

    // Form fields
    val companyName: String = "",
    val contactName: String = "",
    val email: String = "",
    val phone: String = "",
    val selectedTrade: String? = null,
    val licenseNumber: String = "",
    val notes: String = "",

    // Validation - use resource IDs for localization
    val companyNameErrorResId: Int? = null,
    val emailErrorResId: Int? = null
)

private val AVAILABLE_TRADES = listOf(
    "ELECTRICAL" to "Electrical",
    "PLUMBING" to "Plumbing",
    "HVAC" to "HVAC",
    "CONCRETE" to "Concrete",
    "FRAMING" to "Framing",
    "DRYWALL" to "Drywall",
    "ROOFING" to "Roofing",
    "PAINTING" to "Painting",
    "FLOORING" to "Flooring",
    "MASONRY" to "Masonry",
    "LANDSCAPING" to "Landscaping",
    "DEMOLITION" to "Demolition",
    "INSULATION" to "Insulation",
    "FIRE_PROTECTION" to "Fire Protection",
    "SECURITY" to "Security Systems"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubcontractorCreateScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onCreated: (String) -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(SubcontractorCreateState()) }

    // Form validation
    fun validateForm(): Boolean {
        var isValid = true
        var newState = state

        if (state.companyName.isBlank()) {
            newState = newState.copy(companyNameErrorResId = R.string.subcontractors_error_name_required)
            isValid = false
        } else {
            newState = newState.copy(companyNameErrorResId = null)
        }

        if (state.email.isNotBlank() && !android.util.Patterns.EMAIL_ADDRESS.matcher(state.email).matches()) {
            newState = newState.copy(emailErrorResId = R.string.subcontractors_error_invalid_email)
            isValid = false
        } else {
            newState = newState.copy(emailErrorResId = null)
        }

        state = newState
        return isValid
    }

    fun saveSubcontractor() {
        if (!validateForm()) return

        scope.launch {
            state = state.copy(isSaving = true, errorResId = null, successMessage = null)

            try {
                val request = CreateSubcontractorRequest(
                    companyName = state.companyName.trim(),
                    contactName = state.contactName.trim().ifBlank { null },
                    email = state.email.trim().ifBlank { null },
                    phone = state.phone.trim().ifBlank { null },
                    trade = state.selectedTrade,
                    licenseNumber = state.licenseNumber.trim().ifBlank { null },
                    notes = state.notes.trim().ifBlank { null }
                )

                val created = withContext(Dispatchers.IO) {
                    apiService.createSubcontractor(request)
                }

                onCreated(created.id)
            } catch (e: Exception) {
                state = state.copy(
                    isSaving = false,
                    errorResId = R.string.subcontractors_create_failed
                )
            }
        }
    }

    val snackbarHostState = remember { SnackbarHostState() }

    // Show success message via Snackbar
    LaunchedEffect(state.successMessage) {
        state.successMessage?.let { message ->
            snackbarHostState.showSnackbar(
                message = message,
                duration = SnackbarDuration.Short
            )
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.subcontractors_add)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.common_back))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = AppColors.cardBackground
                )
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item { Spacer(Modifier.height(8.dp)) }

            // Error banner
            state.errorResId?.let { errorResId ->
                item {
                    CPErrorBanner(
                        message = stringResource(errorResId),
                        onDismiss = { state = state.copy(errorResId = null) }
                    )
                }
            }

            // Company Name (Required)
            item {
                Column {
                    Text(
                        stringResource(R.string.subcontractors_name),
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            item {
                OutlinedTextField(
                    value = state.companyName,
                    onValueChange = {
                        state = state.copy(companyName = it, companyNameErrorResId = null)
                    },
                    placeholder = { Text(stringResource(R.string.subcontractors_enter_company_name)) },
                    leadingIcon = {
                        Icon(Icons.Default.Business, contentDescription = null)
                    },
                    isError = state.companyNameErrorResId != null,
                    supportingText = state.companyNameErrorResId?.let { resId -> { Text(stringResource(resId)) } },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }

            // Contact Name
            item {
                Text(
                    stringResource(R.string.subcontractors_contact),
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold
                )
            }

            item {
                OutlinedTextField(
                    value = state.contactName,
                    onValueChange = { state = state.copy(contactName = it) },
                    placeholder = { Text(stringResource(R.string.subcontractors_enter_contact_name)) },
                    leadingIcon = {
                        Icon(Icons.Default.Person, contentDescription = null)
                    },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }

            // Email
            item {
                Text(
                    stringResource(R.string.subcontractors_email),
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold
                )
            }

            item {
                OutlinedTextField(
                    value = state.email,
                    onValueChange = {
                        state = state.copy(email = it, emailErrorResId = null)
                    },
                    placeholder = { Text(stringResource(R.string.subcontractors_enter_email)) },
                    leadingIcon = {
                        Icon(Icons.Default.Email, contentDescription = null)
                    },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    isError = state.emailErrorResId != null,
                    supportingText = state.emailErrorResId?.let { resId -> { Text(stringResource(resId)) } },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }

            // Phone
            item {
                Text(
                    stringResource(R.string.subcontractors_phone),
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold
                )
            }

            item {
                OutlinedTextField(
                    value = state.phone,
                    onValueChange = { state = state.copy(phone = it) },
                    placeholder = { Text(stringResource(R.string.subcontractors_enter_phone)) },
                    leadingIcon = {
                        Icon(Icons.Default.Phone, contentDescription = null)
                    },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }

            // Trade/Specialty
            item {
                Text(
                    stringResource(R.string.subcontractors_specialty),
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold
                )
            }

            item {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(AVAILABLE_TRADES) { (value, label) ->
                        FilterChip(
                            selected = state.selectedTrade == value,
                            onClick = {
                                state = state.copy(
                                    selectedTrade = if (state.selectedTrade == value) null else value
                                )
                            },
                            label = { Text(label) },
                            leadingIcon = if (state.selectedTrade == value) {
                                {
                                    Icon(
                                        imageVector = Icons.Default.Check,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            } else null,
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Primary600,
                                selectedLabelColor = Color.White,
                                selectedLeadingIconColor = Color.White
                            )
                        )
                    }
                }
            }

            // License Number
            item {
                Text(
                    stringResource(R.string.subcontractors_license),
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold
                )
            }

            item {
                OutlinedTextField(
                    value = state.licenseNumber,
                    onValueChange = { state = state.copy(licenseNumber = it) },
                    placeholder = { Text(stringResource(R.string.subcontractors_enter_license)) },
                    leadingIcon = {
                        Icon(Icons.Default.Badge, contentDescription = null)
                    },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }

            // Notes
            item {
                Text(
                    stringResource(R.string.subcontractors_notes),
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold
                )
            }

            item {
                OutlinedTextField(
                    value = state.notes,
                    onValueChange = { state = state.copy(notes = it) },
                    placeholder = { Text(stringResource(R.string.subcontractors_notes_placeholder)) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(120.dp),
                    maxLines = 5
                )
            }

            // Submit Button
            item {
                CPButton(
                    text = stringResource(R.string.subcontractors_save),
                    onClick = { saveSubcontractor() },
                    enabled = state.companyName.isNotBlank() && !state.isSaving,
                    loading = state.isSaving,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            item { Spacer(Modifier.height(32.dp)) }
        }
    }
}
