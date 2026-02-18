package com.notebox.config

import com.notebox.dto.ApiResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/config")
class ConfigController(
    @Value("\${demo.mode.enabled}") private val demoModeEnabled: Boolean
) {

    @GetMapping
    fun getConfig(): ResponseEntity<ApiResponse<Map<String, Any>>> {
        val config = mapOf(
            "demoModeEnabled" to demoModeEnabled
        )
        return ResponseEntity.ok(ApiResponse.success(config))
    }
}
