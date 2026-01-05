package com.constructionpro.app.core.di

import android.content.Context
import androidx.room.Room
import com.constructionpro.app.data.local.AppDatabase
import com.constructionpro.app.data.local.DailyLogDao
import com.constructionpro.app.data.local.ProjectDao
import com.constructionpro.app.data.local.PendingActionDao
import com.constructionpro.app.data.local.DocumentCacheDao
import com.constructionpro.app.data.local.DocumentDao
import com.constructionpro.app.data.local.DrawingDao
import com.constructionpro.app.data.local.AnnotationDao
import com.constructionpro.app.data.local.ClientDao
import com.constructionpro.app.data.local.LabelDao
import com.constructionpro.app.data.local.WarningDao
import com.constructionpro.app.data.local.Migrations
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "constructionpro.db"
        )
            .addMigrations(*Migrations.ALL_MIGRATIONS)
            .build()
    }

    @Provides
    fun provideProjectDao(database: AppDatabase): ProjectDao {
        return database.projectDao()
    }

    @Provides
    fun provideDailyLogDao(database: AppDatabase): DailyLogDao {
        return database.dailyLogDao()
    }

    @Provides
    fun provideDocumentDao(database: AppDatabase): DocumentDao {
        return database.documentDao()
    }

    @Provides
    fun provideDrawingDao(database: AppDatabase): DrawingDao {
        return database.drawingDao()
    }

    @Provides
    fun providePendingActionDao(database: AppDatabase): PendingActionDao {
        return database.pendingActionDao()
    }

    @Provides
    fun provideDocumentCacheDao(database: AppDatabase): DocumentCacheDao {
        return database.documentCacheDao()
    }

    @Provides
    fun provideAnnotationDao(database: AppDatabase): AnnotationDao {
        return database.annotationDao()
    }

    @Provides
    fun provideClientDao(database: AppDatabase): ClientDao {
        return database.clientDao()
    }

    @Provides
    fun provideLabelDao(database: AppDatabase): LabelDao {
        return database.labelDao()
    }

    @Provides
    fun provideWarningDao(database: AppDatabase): WarningDao {
        return database.warningDao()
    }
}
