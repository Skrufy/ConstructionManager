package com.constructionpro.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.model.*
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class ClientFormState(
    val companyName: String = "",
    val contactName: String = "",
    val email: String = "",
    val phone: String = "",
    val address: String = "",
    val city: String = "",
    val state: String = "",
    val zip: String = "",
    val website: String = "",
    val industry: String? = null,
    val notes: String = "",
    val status: String = ClientStatus.ACTIVE,
    val saving: Boolean = false,
    val error: String? = null,
    val errorResId: Int? = null,
    val showIndustryPicker: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientCreateScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onCreated: (String) -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(ClientFormState()) }
    val configuration = LocalConfiguration.current
    val isNarrow = configuration.screenWidthDp < 360

    fun createClient() {
        if (state.companyName.isBlank()) {
            state = state.copy(error = null, errorResId = R.string.clients_error_name_required)
            return
        }

        scope.launch {
            state = state.copy(saving = true, error = null)
            try {
                val request = ClientCreateRequest(
                    companyName = state.companyName,
                    contactName = state.contactName.ifBlank { null },
                    email = state.email.ifBlank { null },
                    phone = state.phone.ifBlank { null },
                    address = state.address.ifBlank { null },
                    city = state.city.ifBlank { null },
                    state = state.state.ifBlank { null },
                    zip = state.zip.ifBlank { null },
                    website = state.website.ifBlank { null },
                    industry = state.industry,
                    notes = state.notes.ifBlank { null },
                    status = state.status
                )
                val response = withContext(Dispatchers.IO) {
                    apiService.createClient(request)
                }
                onCreated(response.id)
            } catch (e: Exception) {
                state = state.copy(
                    saving = false,
                    error = e.message ?: "Failed to create client"
                )
            }
        }
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.clients_add),
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.common_back)
                        )
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(AppSpacing.md),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
        ) {
            // Error Banner
            val errorMessage = state.error ?: state.errorResId?.let { stringResource(it) }
            errorMessage?.let { error ->
                CPErrorBanner(
                    message = error,
                    onDismiss = { state = state.copy(error = null, errorResId = null) }
                )
            }

            // Company Information
            CPCard {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.md)) {
                    Text(
                        text = stringResource(R.string.clients_company_information),
                        style = AppTypography.heading3
                    )

                    OutlinedTextField(
                        value = state.companyName,
                        onValueChange = { state = state.copy(companyName = it) },
                        label = { Text(stringResource(R.string.clients_company) + " *") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        leadingIcon = {
                            Icon(Icons.Default.Business, contentDescription = null)
                        }
                    )

                    // Industry Picker
                    OutlinedButton(
                        onClick = { state = state.copy(showIndustryPicker = true) },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Category, contentDescription = null)
                        Spacer(modifier = Modifier.width(AppSpacing.xs))
                        Text(
                            state.industry?.let { IndustryTypes.displayName(it) }
                                ?: stringResource(R.string.clients_select_industry_optional)
                        )
                    }

                    OutlinedTextField(
                        value = state.website,
                        onValueChange = { state = state.copy(website = it) },
                        label = { Text(stringResource(R.string.clients_website)) },
                        placeholder = { Text(stringResource(R.string.clients_website_placeholder)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        leadingIcon = {
                            Icon(Icons.Default.Language, contentDescription = null)
                        }
                    )
                }
            }

            // Status
            CPCard {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                    Text(
                        text = stringResource(R.string.clients_status),
                        style = AppTypography.heading3
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                    ) {
                        FilterChip(
                            selected = state.status == ClientStatus.ACTIVE,
                            onClick = { state = state.copy(status = ClientStatus.ACTIVE) },
                            label = { Text(stringResource(R.string.clients_status_active)) },
                            modifier = Modifier.weight(1f)
                        )
                        FilterChip(
                            selected = state.status == ClientStatus.INACTIVE,
                            onClick = { state = state.copy(status = ClientStatus.INACTIVE) },
                            label = { Text(stringResource(R.string.clients_status_inactive)) },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }

            // Contact Information
            CPCard {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.md)) {
                    Text(
                        text = stringResource(R.string.clients_contact_information),
                        style = AppTypography.heading3
                    )

                    OutlinedTextField(
                        value = state.contactName,
                        onValueChange = { state = state.copy(contactName = it) },
                        label = { Text(stringResource(R.string.clients_name)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        leadingIcon = {
                            Icon(Icons.Default.Person, contentDescription = null)
                        }
                    )

                    OutlinedTextField(
                        value = state.email,
                        onValueChange = { state = state.copy(email = it) },
                        label = { Text(stringResource(R.string.clients_email)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        leadingIcon = {
                            Icon(Icons.Default.Email, contentDescription = null)
                        }
                    )

                    OutlinedTextField(
                        value = state.phone,
                        onValueChange = { state = state.copy(phone = it) },
                        label = { Text(stringResource(R.string.clients_phone)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        leadingIcon = {
                            Icon(Icons.Default.Phone, contentDescription = null)
                        }
                    )
                }
            }

            // Address
            CPCard {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.md)) {
                    Text(
                        text = stringResource(R.string.clients_address_section),
                        style = AppTypography.heading3
                    )

                    OutlinedTextField(
                        value = state.address,
                        onValueChange = { state = state.copy(address = it) },
                        label = { Text(stringResource(R.string.clients_address)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        leadingIcon = {
                            Icon(Icons.Default.LocationOn, contentDescription = null)
                        }
                    )

                    OutlinedTextField(
                        value = state.city,
                        onValueChange = { state = state.copy(city = it) },
                        label = { Text(stringResource(R.string.clients_city)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )

                    if (isNarrow) {
                        OutlinedTextField(
                            value = state.state,
                            onValueChange = { state = state.copy(state = it) },
                            label = { Text(stringResource(R.string.clients_state)) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = state.zip,
                            onValueChange = { state = state.copy(zip = it) },
                            label = { Text(stringResource(R.string.clients_zip_code)) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    } else {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                        ) {
                            OutlinedTextField(
                                value = state.state,
                                onValueChange = { state = state.copy(state = it) },
                                label = { Text(stringResource(R.string.clients_state)) },
                                modifier = Modifier.weight(1f),
                                singleLine = true
                            )
                            OutlinedTextField(
                                value = state.zip,
                                onValueChange = { state = state.copy(zip = it) },
                                label = { Text(stringResource(R.string.clients_zip_code)) },
                                modifier = Modifier.weight(1f),
                                singleLine = true
                            )
                        }
                    }
                }
            }

            // Notes
            CPCard {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                    Text(
                        text = stringResource(R.string.clients_notes_section),
                        style = AppTypography.heading3
                    )

                    OutlinedTextField(
                        value = state.notes,
                        onValueChange = { state = state.copy(notes = it) },
                        label = { Text(stringResource(R.string.clients_notes)) },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 3,
                        maxLines = 6
                    )
                }
            }

            // Submit Button
            Button(
                onClick = { createClient() },
                enabled = !state.saving && state.companyName.isNotBlank(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(AppSpacing.buttonHeightLarge),
                colors = ButtonDefaults.buttonColors(
                    containerColor = AppColors.primary600
                )
            ) {
                if (state.saving) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(AppSpacing.iconLarge),
                        color = androidx.compose.ui.graphics.Color.White,
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.xs))
                    Text(stringResource(R.string.clients_save))
                } else {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(AppSpacing.xs))
                    Text(stringResource(R.string.clients_save))
                }
            }

            // Bottom spacing
            Spacer(modifier = Modifier.height(AppSpacing.xxl))
        }
    }

    // Industry Picker Dialog
    if (state.showIndustryPicker) {
        AlertDialog(
            onDismissRequest = { state = state.copy(showIndustryPicker = false) },
            title = { Text(stringResource(R.string.clients_select_industry)) },
            text = {
                val industries = IndustryTypes.all()
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.xxs)
                ) {
                    for (industry in industries) {
                        TextButton(
                            onClick = {
                                state = state.copy(
                                    industry = industry,
                                    showIndustryPicker = false
                                )
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = IndustryTypes.displayName(industry),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        state = state.copy(industry = null, showIndustryPicker = false)
                    }
                ) {
                    Text(stringResource(R.string.clients_clear_selection))
                }
            },
            dismissButton = {
                TextButton(onClick = { state = state.copy(showIndustryPicker = false) }) {
                    Text(stringResource(R.string.common_cancel))
                }
            }
        )
    }
}
