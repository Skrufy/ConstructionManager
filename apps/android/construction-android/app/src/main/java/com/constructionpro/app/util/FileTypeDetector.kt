package com.constructionpro.app.util

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import com.constructionpro.app.ui.theme.Primary600
import com.constructionpro.app.ui.theme.ConstructionOrange
import com.constructionpro.app.ui.theme.ConstructionRed

/**
 * File type categories for document viewing
 */
enum class ViewableFileType(
    val label: String,
    val icon: ImageVector,
    val iconColor: Color
) {
    PDF("PDF Document", Icons.Default.PictureAsPdf, ConstructionRed),
    IMAGE("Image", Icons.Default.Image, Primary600),
    VIDEO("Video", Icons.Default.VideoFile, ConstructionOrange),
    UNSUPPORTED("Document", Icons.Default.InsertDriveFile, Color.Gray)
}

/**
 * Utility for detecting file types from file names
 */
object FileTypeDetector {

    private val pdfExtensions = setOf("pdf")

    private val imageExtensions = setOf(
        "jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "tif", "svg", "heic", "heif"
    )

    private val videoExtensions = setOf(
        "mp4", "mov", "avi", "mkv", "m4v", "webm", "3gp"
    )

    /**
     * Detect the viewable file type from a filename
     */
    fun detect(fileName: String): ViewableFileType {
        val extension = getExtension(fileName).lowercase()
        return when {
            pdfExtensions.contains(extension) -> ViewableFileType.PDF
            imageExtensions.contains(extension) -> ViewableFileType.IMAGE
            videoExtensions.contains(extension) -> ViewableFileType.VIDEO
            else -> ViewableFileType.UNSUPPORTED
        }
    }

    /**
     * Extract the file extension from a filename
     */
    fun getExtension(fileName: String): String {
        val lastDot = fileName.lastIndexOf('.')
        return if (lastDot >= 0 && lastDot < fileName.length - 1) {
            fileName.substring(lastDot + 1)
        } else {
            ""
        }
    }

    /**
     * Get MIME type for a filename
     */
    fun getMimeType(fileName: String): String {
        val extension = getExtension(fileName).lowercase()
        return when (extension) {
            // PDFs
            "pdf" -> "application/pdf"
            // Images
            "jpg", "jpeg" -> "image/jpeg"
            "png" -> "image/png"
            "gif" -> "image/gif"
            "webp" -> "image/webp"
            "bmp" -> "image/bmp"
            "tiff", "tif" -> "image/tiff"
            "svg" -> "image/svg+xml"
            "heic", "heif" -> "image/heic"
            // Videos
            "mp4" -> "video/mp4"
            "mov" -> "video/quicktime"
            "avi" -> "video/x-msvideo"
            "mkv" -> "video/x-matroska"
            "m4v" -> "video/x-m4v"
            "webm" -> "video/webm"
            "3gp" -> "video/3gpp"
            // Documents
            "doc" -> "application/msword"
            "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            "xls" -> "application/vnd.ms-excel"
            "xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            "ppt" -> "application/vnd.ms-powerpoint"
            "pptx" -> "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            "txt" -> "text/plain"
            "zip" -> "application/zip"
            "rar" -> "application/x-rar-compressed"
            "dwg" -> "application/acad"
            "dxf" -> "application/dxf"
            else -> "application/octet-stream"
        }
    }

    /**
     * Get a human-readable label for the file type
     */
    fun getFileTypeLabel(fileName: String): String {
        val extension = getExtension(fileName).lowercase()
        return when (extension) {
            "pdf" -> "PDF Document"
            "jpg", "jpeg" -> "JPEG Image"
            "png" -> "PNG Image"
            "gif" -> "GIF Image"
            "webp" -> "WebP Image"
            "bmp" -> "Bitmap Image"
            "tiff", "tif" -> "TIFF Image"
            "svg" -> "SVG Image"
            "heic", "heif" -> "HEIC Image"
            "mp4" -> "MP4 Video"
            "mov" -> "QuickTime Video"
            "avi" -> "AVI Video"
            "mkv" -> "MKV Video"
            "m4v" -> "M4V Video"
            "doc", "docx" -> "Microsoft Word Document"
            "xls", "xlsx" -> "Microsoft Excel Spreadsheet"
            "ppt", "pptx" -> "Microsoft PowerPoint"
            "txt" -> "Text File"
            "zip" -> "ZIP Archive"
            "rar" -> "RAR Archive"
            "7z" -> "7-Zip Archive"
            "dwg" -> "AutoCAD Drawing"
            "dxf" -> "DXF Drawing"
            else -> "${extension.uppercase()} File"
        }
    }
}
