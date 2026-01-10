package com.constructionpro.app.ui.document

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.constructionpro.app.ui.theme.*
import com.constructionpro.app.util.FileTypeDetector
import java.text.DecimalFormat

/**
 * View for unsupported file types
 * Shows file info and provides option to open in external app
 */
@Composable
fun UnsupportedFileView(
    fileName: String,
    fileSize: Long?,
    fileUrl: String?,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(AppColors.gray50)
            .padding(AppSpacing.xl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // File Icon
        Surface(
            modifier = Modifier.size(120.dp),
            shape = RoundedCornerShape(AppSpacing.lg),
            color = Primary100
        ) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = getFileIcon(fileName),
                    contentDescription = null,
                    modifier = Modifier.size(64.dp),
                    tint = Primary600.copy(alpha = 0.7f)
                )
            }
        }

        Spacer(modifier = Modifier.height(AppSpacing.xl))

        // File Name
        Text(
            text = fileName,
            style = AppTypography.heading2,
            color = AppColors.textPrimary,
            textAlign = TextAlign.Center,
            maxLines = 3
        )

        Spacer(modifier = Modifier.height(AppSpacing.md))

        // File Info
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)
        ) {
            Text(
                text = FileTypeDetector.getFileTypeLabel(fileName),
                style = AppTypography.secondary,
                color = AppColors.textSecondary
            )

            fileSize?.let { size ->
                if (size > 0) {
                    Text(
                        text = formatFileSize(size),
                        style = AppTypography.caption,
                        color = AppColors.textMuted
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(AppSpacing.xl))

        // Message
        Text(
            text = "This file type cannot be previewed in the app.",
            style = AppTypography.secondary,
            color = AppColors.textSecondary,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(AppSpacing.xxl))

        // Open in External App Button
        fileUrl?.let { url ->
            Button(
                onClick = {
                    val mimeType = FileTypeDetector.getMimeType(fileName)
                    val intent = Intent(Intent.ACTION_VIEW).apply {
                        setDataAndType(Uri.parse(url), mimeType)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    val chooser = Intent.createChooser(intent, "Open with")
                    context.startActivity(chooser)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Primary600),
                shape = RoundedCornerShape(AppSpacing.md)
            ) {
                Icon(
                    imageVector = Icons.Default.OpenInNew,
                    contentDescription = null,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(AppSpacing.sm))
                Text(
                    text = "Open in Another App",
                    style = AppTypography.buttonLarge
                )
            }
        }
    }
}

/**
 * Get appropriate icon for file type
 */
private fun getFileIcon(fileName: String): ImageVector {
    val extension = FileTypeDetector.getExtension(fileName).lowercase()
    return when (extension) {
        "doc", "docx" -> Icons.Default.Description
        "xls", "xlsx" -> Icons.Default.TableChart
        "ppt", "pptx" -> Icons.Default.Slideshow
        "txt" -> Icons.Default.Article
        "zip", "rar", "7z" -> Icons.Default.FolderZip
        "dwg", "dxf" -> Icons.Default.Architecture
        else -> Icons.Default.InsertDriveFile
    }
}

/**
 * Format file size to human-readable string
 */
private fun formatFileSize(bytes: Long): String {
    if (bytes <= 0) return "0 B"
    val units = arrayOf("B", "KB", "MB", "GB", "TB")
    val digitGroups = (Math.log10(bytes.toDouble()) / Math.log10(1024.0)).toInt()
    val formatter = DecimalFormat("#,##0.#")
    return "${formatter.format(bytes / Math.pow(1024.0, digitGroups.toDouble()))} ${units[digitGroups]}"
}
