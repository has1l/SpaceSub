package dev.squad52.spacesub.models

data class User(
    val id: String,
    val email: String,
    val name: String? = null,
    val avatarUrl: String? = null
)

data class AuthResponse(
    val accessToken: String,
    val user: User
)
