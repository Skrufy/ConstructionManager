package com.constructionpro.app.data.local

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import android.util.Log

/**
 * Room Database Migrations
 *
 * IMPORTANT: Never use fallbackToDestructiveMigration() as it deletes all user data.
 * Always create proper migrations for schema changes.
 *
 * Current version: 9
 *
 * Version history:
 * 1 - Initial schema
 * 2 - Added documents table
 * 3 - Added drawings table
 * 4 - Added document_cache table
 * 5 - Added document_calibration table
 * 6 - Added pending_actions, download_entries tables
 * 7 - Added pending_photos, pending_files tables
 * 8 - Added annotations, drawing_scales tables
 * 9 - Added userId to annotations for per-user annotation storage
 */
object Migrations {
    private const val TAG = "RoomMigrations"

    /**
     * All migrations that should be applied to the database.
     * Room will automatically run the appropriate migrations based on
     * the current and target database versions.
     *
     * Note: Using `by lazy` since migrations are defined below this array.
     */
    val ALL_MIGRATIONS by lazy {
        arrayOf(
            MIGRATION_1_2,
            MIGRATION_2_3,
            MIGRATION_3_4,
            MIGRATION_4_5,
            MIGRATION_5_6,
            MIGRATION_6_7,
            MIGRATION_7_8,
            MIGRATION_8_9,
            MIGRATION_9_10
        )
    }

    /**
     * Migration from version 1 to 2: Added documents table
     * Also ensures base tables exist (projects, daily_logs, warnings, clients, labels)
     * for safety during upgrades from any state.
     */
    val MIGRATION_1_2 = object : Migration(1, 2) {
        override fun migrate(db: SupportSQLiteDatabase) {
            Log.d(TAG, "Migrating from version 1 to 2")

            // Ensure base tables exist (for safety during any upgrade path)
            db.execSQL("""
                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT NOT NULL PRIMARY KEY,
                    name TEXT NOT NULL,
                    status TEXT,
                    address TEXT,
                    clientName TEXT,
                    updatedAt INTEGER NOT NULL
                )
            """.trimIndent())

            db.execSQL("""
                CREATE TABLE IF NOT EXISTS daily_logs (
                    id TEXT NOT NULL PRIMARY KEY,
                    projectId TEXT NOT NULL,
                    projectName TEXT,
                    date TEXT NOT NULL,
                    status TEXT,
                    crewCount INTEGER,
                    totalHours REAL,
                    submitterName TEXT,
                    entriesCount INTEGER,
                    materialsCount INTEGER,
                    issuesCount INTEGER,
                    notes TEXT,
                    weatherDelay INTEGER,
                    weatherDelayNotes TEXT,
                    pendingSync INTEGER NOT NULL DEFAULT 0,
                    updatedAt INTEGER NOT NULL
                )
            """.trimIndent())

            db.execSQL("""
                CREATE TABLE IF NOT EXISTS warnings (
                    id TEXT NOT NULL PRIMARY KEY,
                    employeeId TEXT NOT NULL,
                    employeeName TEXT,
                    issuedById TEXT NOT NULL,
                    issuedByName TEXT,
                    projectId TEXT,
                    projectName TEXT,
                    warningType TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    description TEXT NOT NULL,
                    incidentDate TEXT NOT NULL,
                    witnessNames TEXT,
                    actionRequired TEXT,
                    acknowledged INTEGER NOT NULL DEFAULT 0,
                    acknowledgedAt TEXT,
                    status TEXT NOT NULL,
                    createdAt TEXT,
                    updatedAt INTEGER NOT NULL
                )
            """.trimIndent())

            db.execSQL("""
                CREATE TABLE IF NOT EXISTS clients (
                    id TEXT NOT NULL PRIMARY KEY,
                    companyName TEXT NOT NULL,
                    contactName TEXT,
                    email TEXT,
                    phone TEXT,
                    address TEXT,
                    city TEXT,
                    state TEXT,
                    zip TEXT,
                    status TEXT NOT NULL,
                    notes TEXT,
                    website TEXT,
                    industry TEXT,
                    projectCount INTEGER NOT NULL DEFAULT 0,
                    updatedAt INTEGER NOT NULL
                )
            """.trimIndent())

            db.execSQL("""
                CREATE TABLE IF NOT EXISTS labels (
                    id TEXT NOT NULL PRIMARY KEY,
                    category TEXT NOT NULL,
                    name TEXT NOT NULL,
                    projectId TEXT,
                    projectName TEXT,
                    isActive INTEGER NOT NULL DEFAULT 1,
                    sortOrder INTEGER NOT NULL DEFAULT 0,
                    updatedAt INTEGER NOT NULL
                )
            """.trimIndent())

            // Add documents table (the main change for this version)
            db.execSQL("""
                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT NOT NULL PRIMARY KEY,
                    projectId TEXT,
                    projectName TEXT,
                    name TEXT NOT NULL,
                    type TEXT,
                    category TEXT,
                    drawingNumber TEXT,
                    sheetTitle TEXT,
                    revisionCount INTEGER,
                    annotationCount INTEGER,
                    createdAt TEXT,
                    updatedAt INTEGER NOT NULL
                )
            """.trimIndent())
        }
    }

    /**
     * Migration from version 2 to 3: Added drawings table
     */
    val MIGRATION_2_3 = object : Migration(2, 3) {
        override fun migrate(db: SupportSQLiteDatabase) {
            Log.d(TAG, "Migrating from version 2 to 3")
            db.execSQL("""
                CREATE TABLE IF NOT EXISTS drawings (
                    id TEXT NOT NULL PRIMARY KEY,
                    projectId TEXT,
                    projectName TEXT,
                    title TEXT,
                    drawingNumber TEXT,
                    scale TEXT,
                    fileUrl TEXT,
                    annotationCount INTEGER,
                    createdAt TEXT,
                    updatedAt INTEGER NOT NULL
                )
            """.trimIndent())
        }
    }

    /**
     * Migration from version 3 to 4: Added document_cache table
     */
    val MIGRATION_3_4 = object : Migration(3, 4) {
        override fun migrate(db: SupportSQLiteDatabase) {
            Log.d(TAG, "Migrating from version 3 to 4")
            db.execSQL("""
                CREATE TABLE IF NOT EXISTS document_cache (
                    fileId TEXT NOT NULL PRIMARY KEY,
                    fileName TEXT NOT NULL,
                    localPath TEXT NOT NULL,
                    fileSizeBytes INTEGER NOT NULL,
                    downloadedAt INTEGER NOT NULL,
                    lastAccessedAt INTEGER NOT NULL,
                    pageCount INTEGER
                )
            """.trimIndent())
        }
    }

    /**
     * Migration from version 4 to 5: Added document_calibration table
     */
    val MIGRATION_4_5 = object : Migration(4, 5) {
        override fun migrate(db: SupportSQLiteDatabase) {
            Log.d(TAG, "Migrating from version 4 to 5")
            db.execSQL("""
                CREATE TABLE IF NOT EXISTS document_calibration (
                    fileId TEXT NOT NULL,
                    pageNumber INTEGER NOT NULL,
                    unitsPerPoint REAL NOT NULL,
                    unitLabel TEXT NOT NULL,
                    updatedAt INTEGER NOT NULL,
                    PRIMARY KEY(fileId, pageNumber)
                )
            """.trimIndent())
        }
    }

    /**
     * Migration from version 5 to 6: Added pending_actions and download_entries tables
     */
    val MIGRATION_5_6 = object : Migration(5, 6) {
        override fun migrate(db: SupportSQLiteDatabase) {
            Log.d(TAG, "Migrating from version 5 to 6")
            db.execSQL("""
                CREATE TABLE IF NOT EXISTS pending_actions (
                    id TEXT NOT NULL PRIMARY KEY,
                    type TEXT NOT NULL,
                    resourceId TEXT,
                    payloadJson TEXT NOT NULL,
                    status TEXT NOT NULL,
                    retryCount INTEGER NOT NULL,
                    lastAttemptAt INTEGER,
                    lastError TEXT,
                    createdAt INTEGER NOT NULL
                )
            """.trimIndent())
            db.execSQL("""
                CREATE TABLE IF NOT EXISTS download_entries (
                    fileId TEXT NOT NULL PRIMARY KEY,
                    fileName TEXT NOT NULL,
                    progress INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    updatedAt INTEGER NOT NULL
                )
            """.trimIndent())
        }
    }

    /**
     * Migration from version 6 to 7: Added pending_photos and pending_files tables
     */
    val MIGRATION_6_7 = object : Migration(6, 7) {
        override fun migrate(db: SupportSQLiteDatabase) {
            Log.d(TAG, "Migrating from version 6 to 7")
            db.execSQL("""
                CREATE TABLE IF NOT EXISTS pending_photos (
                    id TEXT NOT NULL PRIMARY KEY,
                    projectId TEXT NOT NULL,
                    dailyLogId TEXT NOT NULL,
                    localPath TEXT NOT NULL,
                    gpsLatitude REAL,
                    gpsLongitude REAL,
                    status TEXT NOT NULL,
                    retryCount INTEGER NOT NULL,
                    lastError TEXT,
                    createdAt INTEGER NOT NULL
                )
            """.trimIndent())
            db.execSQL("""
                CREATE TABLE IF NOT EXISTS pending_files (
                    id TEXT NOT NULL PRIMARY KEY,
                    projectId TEXT NOT NULL,
                    dailyLogId TEXT,
                    localPath TEXT NOT NULL,
                    fileName TEXT NOT NULL,
                    category TEXT NOT NULL,
                    status TEXT NOT NULL,
                    retryCount INTEGER NOT NULL,
                    lastError TEXT,
                    createdAt INTEGER NOT NULL
                )
            """.trimIndent())
        }
    }

    /**
     * Migration from version 7 to 8: Added annotations and drawing_scales tables
     */
    val MIGRATION_7_8 = object : Migration(7, 8) {
        override fun migrate(db: SupportSQLiteDatabase) {
            Log.d(TAG, "Migrating from version 7 to 8")
            db.execSQL("""
                CREATE TABLE IF NOT EXISTS annotations (
                    id TEXT NOT NULL PRIMARY KEY,
                    fileId TEXT NOT NULL,
                    pageNumber INTEGER NOT NULL,
                    annotationType TEXT NOT NULL,
                    contentJson TEXT NOT NULL,
                    color TEXT NOT NULL,
                    createdBy TEXT,
                    createdByName TEXT,
                    createdAt TEXT,
                    resolvedAt TEXT,
                    resolvedBy TEXT,
                    isPending INTEGER NOT NULL DEFAULT 0,
                    updatedAt INTEGER NOT NULL
                )
            """.trimIndent())
            db.execSQL("""
                CREATE TABLE IF NOT EXISTS drawing_scales (
                    drawingId TEXT NOT NULL PRIMARY KEY,
                    scale TEXT NOT NULL,
                    updatedAt INTEGER NOT NULL
                )
            """.trimIndent())
        }
    }

    /**
     * Migration from version 8 to 9: Added userId column to annotations for per-user annotation storage
     */
    val MIGRATION_8_9 = object : Migration(8, 9) {
        override fun migrate(db: SupportSQLiteDatabase) {
            Log.d(TAG, "Migrating from version 8 to 9")
            // SQLite doesn't support ALTER TABLE ADD COLUMN with NOT NULL without a default
            // So we need to recreate the table
            db.execSQL("""
                CREATE TABLE IF NOT EXISTS annotations_new (
                    id TEXT NOT NULL PRIMARY KEY,
                    fileId TEXT NOT NULL,
                    userId TEXT NOT NULL,
                    pageNumber INTEGER NOT NULL,
                    annotationType TEXT NOT NULL,
                    contentJson TEXT NOT NULL,
                    color TEXT NOT NULL,
                    createdBy TEXT,
                    createdByName TEXT,
                    createdAt TEXT,
                    resolvedAt TEXT,
                    resolvedBy TEXT,
                    isPending INTEGER NOT NULL DEFAULT 0,
                    updatedAt INTEGER NOT NULL
                )
            """.trimIndent())

            // Copy existing data, using createdBy as userId (or empty string if null)
            db.execSQL("""
                INSERT INTO annotations_new (id, fileId, userId, pageNumber, annotationType, contentJson, color, createdBy, createdByName, createdAt, resolvedAt, resolvedBy, isPending, updatedAt)
                SELECT id, fileId, COALESCE(createdBy, ''), pageNumber, annotationType, contentJson, color, createdBy, createdByName, createdAt, resolvedAt, resolvedBy, isPending, updatedAt
                FROM annotations
            """.trimIndent())

            // Drop old table and rename new one
            db.execSQL("DROP TABLE annotations")
            db.execSQL("ALTER TABLE annotations_new RENAME TO annotations")
        }
    }

    /**
     * Migration from version 9 to 10: Added sync enhancement fields to pending_actions
     * - priority: For ordering sync operations (0=HIGH, 1=NORMAL, 2=LOW)
     * - nextAttemptAt: For exponential backoff scheduling
     * - conflictDataJson: For storing conflict details when status=CONFLICT
     * - baseVersion: Version of entity when action was created for conflict detection
     */
    val MIGRATION_9_10 = object : Migration(9, 10) {
        override fun migrate(db: SupportSQLiteDatabase) {
            Log.d(TAG, "Migrating from version 9 to 10")

            // Add new columns to pending_actions table
            db.execSQL("ALTER TABLE pending_actions ADD COLUMN priority INTEGER NOT NULL DEFAULT 1")
            db.execSQL("ALTER TABLE pending_actions ADD COLUMN nextAttemptAt INTEGER")
            db.execSQL("ALTER TABLE pending_actions ADD COLUMN conflictDataJson TEXT")
            db.execSQL("ALTER TABLE pending_actions ADD COLUMN baseVersion INTEGER NOT NULL DEFAULT 0")
        }
    }
}
