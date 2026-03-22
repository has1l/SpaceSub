package dev.squad52.spacesub

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import dev.squad52.spacesub.ui.navigation.MainNavigation
import dev.squad52.spacesub.ui.screens.LoginScreen
import dev.squad52.spacesub.ui.theme.SpaceSubTheme
import dev.squad52.spacesub.viewmodels.AuthViewModel

class MainActivity : ComponentActivity() {

    private val authViewModel: AuthViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        handleIntent(intent)

        setContent {
            SpaceSubTheme {
                val isLoggedIn by authViewModel.isLoggedIn.collectAsState()

                if (isLoggedIn) {
                    MainNavigation(onLogout = { authViewModel.logout() })
                } else {
                    LoginScreen(onLogin = { authViewModel.startLogin(this@MainActivity) })
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        val uri = intent?.data ?: return
        if (uri.scheme == "spacesub" && uri.host == "auth") {
            authViewModel.handleAuthCallback(uri)
        }
    }
}
