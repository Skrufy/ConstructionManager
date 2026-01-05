package com.constructionpro.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.constructionpro.app.ui.theme.*
import com.constructionpro.app.ui.util.ScreenSize
import com.constructionpro.app.ui.util.responsiveValue

/**
 * Navigation item for adaptive scaffold
 */
data class NavItem(
    val route: String,
    val label: String,
    val icon: ImageVector,
    val selectedIcon: ImageVector = icon,
    val badge: String? = null
)

/**
 * Adaptive scaffold that shows:
 * - Bottom navigation on phones (compact)
 * - Navigation rail on foldables/tablets (medium/expanded)
 */
@Composable
fun AdaptiveScaffold(
    navItems: List<NavItem>,
    currentRoute: String,
    onNavigate: (String) -> Unit,
    screenSize: ScreenSize = ScreenSize.COMPACT,
    topBar: @Composable () -> Unit = {},
    floatingActionButton: @Composable () -> Unit = {},
    content: @Composable (PaddingValues) -> Unit
) {
    val useNavigationRail = screenSize != ScreenSize.COMPACT

    if (useNavigationRail) {
        // Tablet/Foldable layout with navigation rail
        Row(modifier = Modifier.fillMaxSize()) {
            NavigationRail(
                containerColor = MaterialTheme.colorScheme.surface,
                contentColor = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.width(80.dp)
            ) {
                Spacer(modifier = Modifier.height(12.dp))
                navItems.forEach { item ->
                    val selected = currentRoute == item.route ||
                        currentRoute.startsWith(item.route + "/")

                    NavigationRailItem(
                        selected = selected,
                        onClick = { onNavigate(item.route) },
                        icon = {
                            if (item.badge != null) {
                                BadgedBox(
                                    badge = {
                                        Badge(
                                            containerColor = Primary600,
                                            contentColor = androidx.compose.ui.graphics.Color.White
                                        ) {
                                            Text(item.badge)
                                        }
                                    }
                                ) {
                                    Icon(
                                        imageVector = if (selected) item.selectedIcon else item.icon,
                                        contentDescription = item.label
                                    )
                                }
                            } else {
                                Icon(
                                    imageVector = if (selected) item.selectedIcon else item.icon,
                                    contentDescription = item.label
                                )
                            }
                        },
                        label = { Text(item.label) },
                        colors = NavigationRailItemDefaults.colors(
                            selectedIconColor = Primary600,
                            selectedTextColor = Primary600,
                            indicatorColor = Primary100,
                            unselectedIconColor = Gray500,
                            unselectedTextColor = Gray500
                        )
                    )
                }
                Spacer(modifier = Modifier.weight(1f))
            }

            // Divider between rail and content
            HorizontalDivider(
                modifier = Modifier
                    .fillMaxHeight()
                    .width(1.dp),
                color = Gray200
            )

            // Main content
            Scaffold(
                topBar = topBar,
                floatingActionButton = floatingActionButton,
                containerColor = BackgroundLight,
                modifier = Modifier.weight(1f)
            ) { padding ->
                content(padding)
            }
        }
    } else {
        // Phone layout with bottom navigation
        Scaffold(
            topBar = topBar,
            floatingActionButton = floatingActionButton,
            containerColor = BackgroundLight,
            bottomBar = {
                NavigationBar(
                    containerColor = MaterialTheme.colorScheme.surface,
                    contentColor = MaterialTheme.colorScheme.onSurface,
                    tonalElevation = 8.dp
                ) {
                    navItems.forEach { item ->
                        val selected = currentRoute == item.route ||
                            currentRoute.startsWith(item.route + "/")

                        NavigationBarItem(
                            selected = selected,
                            onClick = { onNavigate(item.route) },
                            icon = {
                                if (item.badge != null) {
                                    BadgedBox(
                                        badge = {
                                            Badge(
                                                containerColor = Primary600,
                                                contentColor = androidx.compose.ui.graphics.Color.White
                                            ) {
                                                Text(item.badge)
                                            }
                                        }
                                    ) {
                                        Icon(
                                            imageVector = if (selected) item.selectedIcon else item.icon,
                                            contentDescription = item.label
                                        )
                                    }
                                } else {
                                    Icon(
                                        imageVector = if (selected) item.selectedIcon else item.icon,
                                        contentDescription = item.label
                                    )
                                }
                            },
                            label = { Text(item.label) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = Primary600,
                                selectedTextColor = Primary600,
                                indicatorColor = Primary100,
                                unselectedIconColor = Gray500,
                                unselectedTextColor = Gray500
                            )
                        )
                    }
                }
            }
        ) { padding ->
            content(padding)
        }
    }
}

/**
 * Responsive grid that adapts columns based on screen size
 */
@Composable
fun ResponsiveGrid(
    modifier: Modifier = Modifier,
    columns: Int = responsiveValue(1, 2, 3),
    horizontalSpacing: Dp = 12.dp,
    verticalSpacing: Dp = 12.dp,
    content: @Composable () -> Unit
) {
    // Use FlowRow for responsive grid layout
    // For now, use Column with conditional Row grouping
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(verticalSpacing)
    ) {
        content()
    }
}

/**
 * Adaptive content container that centers content on large screens
 */
@Composable
fun AdaptiveContentContainer(
    modifier: Modifier = Modifier,
    maxWidth: Dp = responsiveValue(
        compact = Dp.Unspecified,
        medium = 840.dp,
        expanded = 1200.dp
    ),
    horizontalPadding: Dp = responsiveValue(16.dp, 24.dp, 32.dp),
    content: @Composable () -> Unit
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .then(
                if (maxWidth != Dp.Unspecified) {
                    Modifier.widthIn(max = maxWidth)
                } else {
                    Modifier
                }
            )
            .padding(horizontal = horizontalPadding)
    ) {
        content()
    }
}

/**
 * Two-pane layout for list-detail patterns on larger screens
 */
@Composable
fun ListDetailLayout(
    screenSize: ScreenSize,
    listPane: @Composable () -> Unit,
    detailPane: @Composable (() -> Unit)? = null,
    showDetail: Boolean = false
) {
    if (screenSize == ScreenSize.EXPANDED && detailPane != null) {
        // Side-by-side on large screens
        Row(modifier = Modifier.fillMaxSize()) {
            Box(
                modifier = Modifier
                    .weight(0.4f)
                    .fillMaxHeight()
            ) {
                listPane()
            }
            VerticalDivider(color = Gray200)
            Box(
                modifier = Modifier
                    .weight(0.6f)
                    .fillMaxHeight()
            ) {
                if (showDetail) {
                    detailPane()
                } else {
                    // Empty state placeholder
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = androidx.compose.ui.Alignment.Center
                    ) {
                        Text(
                            text = "Select an item to view details",
                            style = MaterialTheme.typography.bodyLarge,
                            color = Gray400
                        )
                    }
                }
            }
        }
    } else {
        // Stacked on smaller screens
        if (showDetail && detailPane != null) {
            detailPane()
        } else {
            listPane()
        }
    }
}
