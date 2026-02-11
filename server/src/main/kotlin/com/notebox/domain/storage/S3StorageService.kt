package com.notebox.domain.storage

import com.notebox.config.S3Config
import org.springframework.stereotype.Service
import org.springframework.web.multipart.MultipartFile
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.*
import software.amazon.awssdk.services.s3.presigner.S3Presigner
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest
import java.net.URI
import java.time.Duration

@Service
class S3StorageService(
    private val s3Config: S3Config
) : FileStorageService {

    private val s3Client: S3Client
    private val s3Presigner: S3Presigner

    init {
        val credentials = AwsBasicCredentials.create(s3Config.accessKey, s3Config.secretKey)
        val credentialsProvider = StaticCredentialsProvider.create(credentials)

        s3Client = S3Client.builder()
            .region(Region.of(s3Config.region))
            .credentialsProvider(credentialsProvider)
            .endpointOverride(URI.create(s3Config.endpoint))
            .forcePathStyle(true)
            .build()

        s3Presigner = S3Presigner.builder()
            .region(Region.of(s3Config.region))
            .credentialsProvider(credentialsProvider)
            .endpointOverride(URI.create(s3Config.endpoint))
            .build()

        ensureBucketExists()
    }

    private fun ensureBucketExists() {
        try {
            s3Client.headBucket { it.bucket(s3Config.bucket) }
        } catch (e: Exception) {
            s3Client.createBucket { it.bucket(s3Config.bucket) }
        }
    }

    override fun uploadFile(file: MultipartFile, key: String): String {
        val putObjectRequest = PutObjectRequest.builder()
            .bucket(s3Config.bucket)
            .key(key)
            .contentType(file.contentType)
            .build()

        s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(file.inputStream, file.size))
        return key
    }

    override fun getFileUrl(key: String): String {
        val getObjectRequest = GetObjectRequest.builder()
            .bucket(s3Config.bucket)
            .key(key)
            .build()

        val presignRequest = GetObjectPresignRequest.builder()
            .signatureDuration(Duration.ofHours(1))
            .getObjectRequest(getObjectRequest)
            .build()

        return s3Presigner.presignGetObject(presignRequest).url().toString()
    }

    override fun deleteFile(key: String): Boolean {
        return try {
            val deleteObjectRequest = DeleteObjectRequest.builder()
                .bucket(s3Config.bucket)
                .key(key)
                .build()

            s3Client.deleteObject(deleteObjectRequest)
            true
        } catch (e: Exception) {
            false
        }
    }
}
