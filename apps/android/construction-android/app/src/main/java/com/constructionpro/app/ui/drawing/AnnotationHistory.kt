package com.constructionpro.app.ui.drawing

import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.constructionpro.app.data.model.AnnotationDraft

/**
 * Action types for undo/redo history
 */
sealed class HistoryAction {
    data class Create(val annotation: AnnotationDraft) : HistoryAction()
    data class Update(val oldAnnotation: AnnotationDraft, val newAnnotation: AnnotationDraft) : HistoryAction()
    data class Delete(val annotation: AnnotationDraft) : HistoryAction()
    data class BatchCreate(val annotations: List<AnnotationDraft>) : HistoryAction()
    data class BatchDelete(val annotations: List<AnnotationDraft>) : HistoryAction()
}

/**
 * Manages undo/redo history for annotation operations.
 * Maintains a stack of actions that can be undone/redone.
 */
@Stable
class AnnotationHistoryManager(
    private val maxHistorySize: Int = 50
) {
    // Undo stack - most recent action at the end
    private val undoStack = mutableStateListOf<HistoryAction>()

    // Redo stack - most recent undone action at the end
    private val redoStack = mutableStateListOf<HistoryAction>()

    // Current annotations state
    private val _annotations = mutableStateListOf<AnnotationDraft>()
    val annotations: List<AnnotationDraft> get() = _annotations.toList()

    // Observable state for UI
    var canUndo by mutableStateOf(false)
        private set
    var canRedo by mutableStateOf(false)
        private set

    /**
     * Initialize with existing annotations (e.g., from server)
     */
    fun initialize(annotations: List<AnnotationDraft>) {
        _annotations.clear()
        _annotations.addAll(annotations)
        undoStack.clear()
        redoStack.clear()
        updateState()
    }

    /**
     * Add a new annotation and record the action
     */
    fun addAnnotation(annotation: AnnotationDraft) {
        _annotations.add(annotation)
        pushAction(HistoryAction.Create(annotation))
    }

    /**
     * Update an existing annotation and record the action
     */
    fun updateAnnotation(oldAnnotation: AnnotationDraft, newAnnotation: AnnotationDraft) {
        val index = _annotations.indexOfFirst { it.id == oldAnnotation.id }
        if (index >= 0) {
            _annotations[index] = newAnnotation
            pushAction(HistoryAction.Update(oldAnnotation, newAnnotation))
        }
    }

    /**
     * Delete an annotation and record the action
     */
    fun deleteAnnotation(annotation: AnnotationDraft) {
        val removed = _annotations.removeAll { it.id == annotation.id }
        if (removed) {
            pushAction(HistoryAction.Delete(annotation))
        }
    }

    /**
     * Add multiple annotations at once (batch operation)
     */
    fun addAnnotations(annotations: List<AnnotationDraft>) {
        if (annotations.isEmpty()) return
        _annotations.addAll(annotations)
        pushAction(HistoryAction.BatchCreate(annotations))
    }

    /**
     * Delete multiple annotations at once (batch operation)
     */
    fun deleteAnnotations(annotations: List<AnnotationDraft>) {
        if (annotations.isEmpty()) return
        val ids = annotations.map { it.id }.toSet()
        _annotations.removeAll { it.id in ids }
        pushAction(HistoryAction.BatchDelete(annotations))
    }

    /**
     * Undo the last action
     */
    fun undo(): HistoryAction? {
        if (undoStack.isEmpty()) return null

        val action = undoStack.removeLast()
        redoStack.add(action)

        when (action) {
            is HistoryAction.Create -> {
                _annotations.removeAll { it.id == action.annotation.id }
            }
            is HistoryAction.Update -> {
                val index = _annotations.indexOfFirst { it.id == action.newAnnotation.id }
                if (index >= 0) {
                    _annotations[index] = action.oldAnnotation
                }
            }
            is HistoryAction.Delete -> {
                _annotations.add(action.annotation)
            }
            is HistoryAction.BatchCreate -> {
                val ids = action.annotations.map { it.id }.toSet()
                _annotations.removeAll { it.id in ids }
            }
            is HistoryAction.BatchDelete -> {
                _annotations.addAll(action.annotations)
            }
        }

        updateState()
        return action
    }

    /**
     * Redo the last undone action
     */
    fun redo(): HistoryAction? {
        if (redoStack.isEmpty()) return null

        val action = redoStack.removeLast()
        undoStack.add(action)

        when (action) {
            is HistoryAction.Create -> {
                _annotations.add(action.annotation)
            }
            is HistoryAction.Update -> {
                val index = _annotations.indexOfFirst { it.id == action.oldAnnotation.id }
                if (index >= 0) {
                    _annotations[index] = action.newAnnotation
                }
            }
            is HistoryAction.Delete -> {
                _annotations.removeAll { it.id == action.annotation.id }
            }
            is HistoryAction.BatchCreate -> {
                _annotations.addAll(action.annotations)
            }
            is HistoryAction.BatchDelete -> {
                val ids = action.annotations.map { it.id }.toSet()
                _annotations.removeAll { it.id in ids }
            }
        }

        updateState()
        return action
    }

    /**
     * Clear all history (but keep current annotations)
     */
    fun clearHistory() {
        undoStack.clear()
        redoStack.clear()
        updateState()
    }

    /**
     * Get pending (unsaved) annotations
     */
    fun getPendingAnnotations(): List<AnnotationDraft> {
        return _annotations.filter { it.isPending }
    }

    /**
     * Mark an annotation as synced (no longer pending)
     */
    fun markSynced(oldId: String, newId: String) {
        val index = _annotations.indexOfFirst { it.id == oldId }
        if (index >= 0) {
            val annotation = _annotations[index]
            _annotations[index] = annotation.copy(id = newId, isPending = false)
        }
    }

    /**
     * Get annotation by ID
     */
    fun getAnnotation(id: String): AnnotationDraft? {
        return _annotations.find { it.id == id }
    }

    private fun pushAction(action: HistoryAction) {
        // Clear redo stack when new action is performed
        redoStack.clear()

        // Add to undo stack
        undoStack.add(action)

        // Trim if over max size
        while (undoStack.size > maxHistorySize) {
            undoStack.removeFirst()
        }

        updateState()
    }

    private fun updateState() {
        canUndo = undoStack.isNotEmpty()
        canRedo = redoStack.isNotEmpty()
    }
}

/**
 * Remember an annotation history manager
 */
@Composable
fun rememberAnnotationHistoryManager(
    maxHistorySize: Int = 50
): AnnotationHistoryManager {
    return remember {
        AnnotationHistoryManager(maxHistorySize)
    }
}

/**
 * Extension to get a description of an action for UI display
 */
fun HistoryAction.getDescription(): String {
    return when (this) {
        is HistoryAction.Create -> "Add ${annotation.type.displayName}"
        is HistoryAction.Update -> "Update ${oldAnnotation.type.displayName}"
        is HistoryAction.Delete -> "Delete ${annotation.type.displayName}"
        is HistoryAction.BatchCreate -> "Add ${annotations.size} annotations"
        is HistoryAction.BatchDelete -> "Delete ${annotations.size} annotations"
    }
}

/**
 * Extension to check if action affects a specific annotation
 */
fun HistoryAction.affectsAnnotation(annotationId: String): Boolean {
    return when (this) {
        is HistoryAction.Create -> annotation.id == annotationId
        is HistoryAction.Update -> oldAnnotation.id == annotationId || newAnnotation.id == annotationId
        is HistoryAction.Delete -> annotation.id == annotationId
        is HistoryAction.BatchCreate -> annotations.any { it.id == annotationId }
        is HistoryAction.BatchDelete -> annotations.any { it.id == annotationId }
    }
}
