package com.constructionpro.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
  entities = [
    ProjectEntity::class,
    DailyLogEntity::class,
    DocumentEntity::class,
    DrawingEntity::class,
    DocumentCacheEntity::class,
    DocumentCalibrationEntity::class,
    PendingActionEntity::class,
    DownloadEntryEntity::class,
    PendingPhotoEntity::class,
    PendingFileEntity::class,
    AnnotationEntity::class,
    DrawingScaleEntity::class,
    WarningEntity::class,
    ClientEntity::class,
    LabelEntity::class
  ],
  version = 10  // Added priority, nextAttemptAt, conflictDataJson, baseVersion to PendingActionEntity
)
abstract class AppDatabase : RoomDatabase() {
  abstract fun projectDao(): ProjectDao
  abstract fun dailyLogDao(): DailyLogDao
  abstract fun documentDao(): DocumentDao
  abstract fun drawingDao(): DrawingDao
  abstract fun documentCacheDao(): DocumentCacheDao
  abstract fun documentCalibrationDao(): DocumentCalibrationDao
  abstract fun pendingActionDao(): PendingActionDao
  abstract fun downloadEntryDao(): DownloadEntryDao
  abstract fun pendingPhotoDao(): PendingPhotoDao
  abstract fun pendingFileDao(): PendingFileDao
  abstract fun annotationDao(): AnnotationDao
  abstract fun drawingScaleDao(): DrawingScaleDao
  abstract fun warningDao(): WarningDao
  abstract fun clientDao(): ClientDao
  abstract fun labelDao(): LabelDao

  companion object {
    @Volatile private var INSTANCE: AppDatabase? = null

    fun getInstance(context: Context): AppDatabase {
      return INSTANCE ?: synchronized(this) {
        INSTANCE ?: Room.databaseBuilder(
          context.applicationContext,
          AppDatabase::class.java,
          "constructionpro.db"
        )
          .addMigrations(*Migrations.ALL_MIGRATIONS)
          .build()
          .also { INSTANCE = it }
      }
    }
  }
}
