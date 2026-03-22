package dev.squad52.spacesub.ui.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import dev.squad52.spacesub.ui.screens.*
import dev.squad52.spacesub.ui.theme.*
import dev.squad52.spacesub.viewmodels.*

sealed class Screen(val route: String, val label: String, val icon: String) {
    data object Dashboard : Screen("dashboard", "Панель", "🏠")
    data object Subscriptions : Screen("subscriptions", "Подписки", "📡")
    data object Analytics : Screen("analytics", "Аналитика", "📊")
    data object Forecast : Screen("forecast", "Прогноз", "📈")
    data object Connect : Screen("connect", "Банк", "🔗")
    data object Notifications : Screen("notifications", "Уведомления", "🔔")
}

private val bottomTabs = listOf(
    Screen.Dashboard,
    Screen.Subscriptions,
    Screen.Analytics,
    Screen.Forecast,
    Screen.Connect
)

@Composable
fun MainNavigation(onLogout: () -> Unit) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val showBottomBar = currentRoute in bottomTabs.map { it.route }

    Scaffold(
        containerColor = SpaceBlack,
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(
                    containerColor = SpaceBlack.copy(alpha = 0.95f),
                    tonalElevation = 0.dp
                ) {
                    bottomTabs.forEach { screen ->
                        val selected = navBackStackEntry?.destination?.hierarchy?.any {
                            it.route == screen.route
                        } == true

                        NavigationBarItem(
                            icon = {
                                Text(
                                    text = screen.icon,
                                    fontSize = 18.sp
                                )
                            },
                            label = {
                                Text(
                                    text = screen.label,
                                    fontSize = 10.sp,
                                    fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium
                                )
                            },
                            selected = selected,
                            onClick = {
                                navController.navigate(screen.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = SignalPrimary,
                                selectedTextColor = SignalPrimary,
                                unselectedIconColor = TextMuted,
                                unselectedTextColor = TextMuted,
                                indicatorColor = SignalPrimary.copy(alpha = 0.08f)
                            )
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(SpaceBlack)
                .padding(innerPadding)
        ) {
            NavHost(
                navController = navController,
                startDestination = Screen.Dashboard.route
            ) {
                composable(Screen.Dashboard.route) {
                    val vm: DashboardViewModel = viewModel()
                    DashboardScreen(
                        viewModel = vm,
                        onLogout = onLogout,
                        onConnect = {
                            navController.navigate(Screen.Connect.route) {
                                launchSingleTop = true
                            }
                        },
                        onNotifications = {
                            navController.navigate(Screen.Notifications.route)
                        }
                    )
                }

                composable(Screen.Subscriptions.route) {
                    val vm: SubscriptionsViewModel = viewModel()
                    SubscriptionsScreen(viewModel = vm)
                }

                composable(Screen.Analytics.route) {
                    val vm: AnalyticsViewModel = viewModel()
                    AnalyticsScreen(viewModel = vm)
                }

                composable(Screen.Forecast.route) {
                    val vm: ForecastViewModel = viewModel()
                    ForecastScreen(viewModel = vm)
                }

                composable(Screen.Connect.route) {
                    val vm: ConnectFlexViewModel = viewModel()
                    ConnectFlexScreen(
                        viewModel = vm,
                        onNavigateToDashboard = {
                            navController.navigate(Screen.Dashboard.route) {
                                popUpTo(Screen.Dashboard.route) { inclusive = true }
                            }
                        }
                    )
                }

                composable(Screen.Notifications.route) {
                    val vm: NotificationsViewModel = viewModel()
                    NotificationsScreen(
                        viewModel = vm,
                        onBack = { navController.popBackStack() }
                    )
                }
            }
        }
    }
}
