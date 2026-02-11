package com.notebox.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.context.annotation.Configuration

@Configuration
@ConfigurationProperties(prefix = "s3")
data class S3Config(
    var endpoint: String = "",
    var accessKey: String = "",
    var secretKey: String = "",
    var bucket: String = "",
    var region: String = ""
)
