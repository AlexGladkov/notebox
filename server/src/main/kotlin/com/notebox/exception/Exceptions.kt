package com.notebox.exception

class ResourceNotFoundException(message: String) : RuntimeException(message)

class InvalidRequestException(message: String) : RuntimeException(message)

class CircularReferenceException(message: String) : RuntimeException(message)
