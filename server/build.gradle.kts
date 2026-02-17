import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    id("org.springframework.boot") version "3.2.2"
    id("io.spring.dependency-management") version "1.1.4"
    kotlin("jvm") version "1.9.22"
    kotlin("plugin.spring") version "1.9.22"
}

group = "com.notebox"
version = "0.0.1-SNAPSHOT"

java {
    sourceCompatibility = JavaVersion.VERSION_17
}

repositories {
    mavenCentral()
}

dependencies {
    // Spring Boot
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")

    // Spring Security & OAuth2
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-client")
    implementation("org.springframework.session:spring-session-jdbc")

    // Kotlin
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8")

    // Exposed ORM
    implementation("org.jetbrains.exposed:exposed-core:0.47.0")
    implementation("org.jetbrains.exposed:exposed-dao:0.47.0")
    implementation("org.jetbrains.exposed:exposed-jdbc:0.47.0")
    implementation("org.jetbrains.exposed:exposed-java-time:0.47.0")
    implementation("org.jetbrains.exposed:exposed-spring-boot-starter:0.47.0")

    // Database
    implementation("org.postgresql:postgresql")

    // AWS S3
    implementation("software.amazon.awssdk:s3:2.23.9")

    // HTTP Client for OAuth
    implementation("com.squareup.okhttp3:okhttp:4.12.0")

    // Development
    developmentOnly("org.springframework.boot:spring-boot-devtools")

    // Testing
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
}

tasks.withType<KotlinCompile> {
    kotlinOptions {
        freeCompilerArgs += "-Xjsr305=strict"
        jvmTarget = "17"
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
}
