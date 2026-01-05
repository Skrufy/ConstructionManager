//
//  CommentsView.swift
//  ConstructionManager
//
//  Reusable comments component for any resource
//

import SwiftUI

struct CommentsView: View {
    let resourceType: CommentableResource
    let resourceId: String
    @StateObject private var commentService = CommentService.shared
    @State private var newCommentText = ""
    @State private var isSubmitting = false
    @State private var replyingTo: Comment?

    private var comments: [Comment] {
        commentService.comments[resourceId] ?? []
    }

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            // Header
            HStack {
                Text("Comments")
                    .font(AppTypography.heading3)
                    .foregroundColor(AppColors.textPrimary)

                Text("(\(comments.count))")
                    .font(AppTypography.secondary)
                    .foregroundColor(AppColors.textSecondary)

                Spacer()
            }

            // Comment input
            commentInputField

            // Comments list
            if commentService.isLoading && comments.isEmpty {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
                .padding(.vertical, AppSpacing.md)
            } else if comments.isEmpty {
                emptyState
            } else {
                LazyVStack(spacing: AppSpacing.sm) {
                    ForEach(comments) { comment in
                        CommentCard(
                            comment: comment,
                            onReply: { replyingTo = comment },
                            onDelete: { await deleteComment(comment) }
                        )
                    }
                }
            }
        }
        .task {
            _ = await commentService.fetchComments(resourceType: resourceType, resourceId: resourceId)
        }
    }

    private var commentInputField: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            if let replyTo = replyingTo {
                HStack {
                    Text("Replying to \(replyTo.userName ?? "comment")")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.primary600)
                    Spacer()
                    Button(action: { replyingTo = nil }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(AppColors.gray400)
                    }
                }
                .padding(.horizontal, AppSpacing.sm)
            }

            HStack(spacing: AppSpacing.xs) {
                TextField("Add a comment...", text: $newCommentText, axis: .vertical)
                    .font(AppTypography.body)
                    .lineLimit(1...4)
                    .padding(AppSpacing.sm)
                    .background(AppColors.gray100)
                    .cornerRadius(AppSpacing.radiusMedium)

                Button(action: { Task { await submitComment() } }) {
                    if isSubmitting {
                        ProgressView()
                            .frame(width: 40, height: 40)
                    } else {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.system(size: 32))
                            .foregroundColor(newCommentText.isEmpty ? AppColors.gray300 : AppColors.primary600)
                    }
                }
                .disabled(newCommentText.isEmpty || isSubmitting)
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: AppSpacing.sm) {
            Image(systemName: "bubble.left.and.bubble.right")
                .font(.system(size: 32))
                .foregroundColor(AppColors.gray300)
            Text("No comments yet")
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
            Text("Be the first to comment")
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textTertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, AppSpacing.lg)
    }

    private func submitComment() async {
        guard !newCommentText.isEmpty else { return }

        isSubmitting = true
        defer { isSubmitting = false }

        let result = await commentService.createComment(
            resourceType: resourceType,
            resourceId: resourceId,
            content: newCommentText,
            parentId: replyingTo?.id
        )

        if result != nil {
            newCommentText = ""
            replyingTo = nil
        } else if let error = commentService.error {
            print("Failed to submit comment: \(error)")
        }
    }

    private func deleteComment(_ comment: Comment) async {
        let success = await commentService.deleteComment(id: comment.id, resourceId: resourceId)
        if !success, let error = commentService.error {
            print("Failed to delete comment: \(error)")
        }
    }
}

// MARK: - Comment Card
struct CommentCard: View {
    let comment: Comment
    let onReply: () -> Void
    let onDelete: () async -> Void

    @State private var showingDeleteConfirmation = false

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            // Header
            HStack(alignment: .top) {
                // Avatar
                ZStack {
                    Circle()
                        .fill(AppColors.primary100)
                        .frame(width: 32, height: 32)
                    Text(String((comment.userName ?? "?").prefix(1)))
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(AppColors.primary600)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(comment.userName ?? "Unknown")
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                    Text(comment.formattedDate)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textTertiary)
                }

                Spacer()

                Menu {
                    Button(action: onReply) {
                        Label("Reply", systemImage: "arrowshape.turn.up.left")
                    }
                    Button(role: .destructive, action: { showingDeleteConfirmation = true }) {
                        Label("Delete", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis")
                        .foregroundColor(AppColors.gray400)
                        .frame(width: 24, height: 24)
                }
            }

            // Content
            Text(comment.content)
                .font(AppTypography.body)
                .foregroundColor(AppColors.textPrimary)

            // Attachments
            if let attachments = comment.attachments, !attachments.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: AppSpacing.xs) {
                        ForEach(attachments) { attachment in
                            AttachmentThumbnail(attachment: attachment)
                        }
                    }
                }
            }

            // Actions
            HStack(spacing: AppSpacing.md) {
                Button(action: onReply) {
                    HStack(spacing: AppSpacing.xxs) {
                        Image(systemName: "arrowshape.turn.up.left")
                            .font(.system(size: 12))
                        Text("Reply")
                            .font(AppTypography.caption)
                    }
                    .foregroundColor(AppColors.textSecondary)
                }

                if comment.isEdited {
                    Text("(edited)")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textTertiary)
                }
            }

            // Replies
            if let replies = comment.replies, !replies.isEmpty {
                VStack(alignment: .leading, spacing: AppSpacing.sm) {
                    ForEach(replies) { reply in
                        HStack(alignment: .top, spacing: AppSpacing.sm) {
                            Rectangle()
                                .fill(AppColors.gray200)
                                .frame(width: 2)

                            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                                HStack {
                                    Text(reply.userName ?? "Unknown")
                                        .font(AppTypography.secondaryMedium)
                                        .foregroundColor(AppColors.textPrimary)
                                    Text(reply.formattedDate)
                                        .font(AppTypography.caption)
                                        .foregroundColor(AppColors.textTertiary)
                                }
                                Text(reply.content)
                                    .font(AppTypography.secondary)
                                    .foregroundColor(AppColors.textSecondary)
                            }
                        }
                        .padding(.leading, AppSpacing.lg)
                    }
                }
            }
        }
        .padding(AppSpacing.sm)
        .background(AppColors.cardBackground)
        .cornerRadius(AppSpacing.radiusMedium)
        .confirmationDialog("Delete Comment", isPresented: $showingDeleteConfirmation) {
            Button("Delete", role: .destructive) {
                Task { await onDelete() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Are you sure you want to delete this comment?")
        }
    }
}

// MARK: - Attachment Thumbnail
struct AttachmentThumbnail: View {
    let attachment: CommentAttachment

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                .fill(AppColors.gray100)
                .frame(width: 60, height: 60)

            Image(systemName: iconForFileType(attachment.fileType))
                .font(.system(size: 24))
                .foregroundColor(AppColors.gray400)
        }
    }

    private func iconForFileType(_ fileType: String?) -> String {
        guard let type = fileType?.lowercased() else { return "doc" }
        if type.contains("image") || type.contains("png") || type.contains("jpg") || type.contains("jpeg") {
            return "photo"
        } else if type.contains("pdf") {
            return "doc.richtext"
        } else if type.contains("link") || type.contains("url") {
            return "link"
        }
        return "doc"
    }
}

// MARK: - Compact Comments Section
struct CompactCommentsSection: View {
    let resourceType: CommentableResource
    let resourceId: String
    @State private var showingFullComments = false
    @StateObject private var commentService = CommentService.shared

    private var comments: [Comment] {
        commentService.comments[resourceId] ?? []
    }

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Button(action: { showingFullComments = true }) {
                HStack {
                    Image(systemName: "bubble.left.and.bubble.right")
                        .foregroundColor(AppColors.textSecondary)
                    Text("\(comments.count) Comments")
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .foregroundColor(AppColors.gray400)
                }
                .padding(AppSpacing.md)
                .background(AppColors.cardBackground)
                .cornerRadius(AppSpacing.radiusMedium)
            }
        }
        .sheet(isPresented: $showingFullComments) {
            NavigationStack {
                ScrollView {
                    CommentsView(resourceType: resourceType, resourceId: resourceId)
                        .padding(AppSpacing.md)
                }
                .background(AppColors.background)
                .navigationTitle("Comments")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("Done") { showingFullComments = false }
                    }
                }
            }
        }
        .task {
            _ = await commentService.fetchComments(resourceType: resourceType, resourceId: resourceId)
        }
    }
}

#Preview {
    ScrollView {
        CommentsView(resourceType: .project, resourceId: "proj-1")
            .padding()
    }
    .background(AppColors.background)
}
