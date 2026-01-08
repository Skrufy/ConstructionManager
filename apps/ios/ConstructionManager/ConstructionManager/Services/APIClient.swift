//
//  APIClient.swift
//  ConstructionManager
//
//  Core networking client for API communication
//

import Foundation
import Combine

// MARK: - Auth State Change Notification
extension Notification.Name {
    /// Posted when the API client detects an unauthorized (401) response
    /// Observers should sign out the user and redirect to login
    static let authSessionExpired = Notification.Name("authSessionExpired")
}

// MARK: - API Configuration
struct APIConfig {
    // Change this to your production URL when deploying
    #if DEBUG
    // TEMPORARY: Using Vercel production URL for testing
    // To use localhost: run `npm run dev` in apps/web and change to "http://localhost:3000/api"
    static let baseURL = "https://construction-manager-6msf.vercel.app/api"
    #else
    static let baseURL = "https://construction-manager-6msf.vercel.app/api"
    #endif

    // Shorter timeout for local dev (slow WiFi), longer for production
    #if DEBUG
    static let timeoutInterval: TimeInterval = 15  // 15 seconds for local dev
    #else
    static let timeoutInterval: TimeInterval = 30
    #endif

    // Maximum concurrent API requests to prevent overwhelming the network
    static let maxConcurrentRequests = 4
}

// MARK: - API Error
enum APIError: LocalizedError {
    case invalidURL
    case noData
    case decodingError(Error)
    case serverError(Int, String?)
    case unauthorized
    case forbidden(String?)
    case notFound
    case networkError(Error)
    case rateLimited(retryAfter: Int?)
    case unknown

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "error.invalidURL".localized
        case .noData:
            return "error.noData".localized
        case .decodingError(let error):
            return String(format: "error.decodingFailed".localized, error.localizedDescription)
        case .serverError(let code, let message):
            return message ?? String(format: "error.serverError".localized, code)
        case .unauthorized:
            return "error.pleaseLogInAgain".localized
        case .forbidden(let message):
            return message ?? "error.accessDenied".localized
        case .notFound:
            return "error.resourceNotFound".localized
        case .networkError(let error):
            return String(format: "error.networkError".localized, error.localizedDescription)
        case .rateLimited(let retryAfter):
            if let seconds = retryAfter {
                return String(format: "error.tooManyRequestsRetry".localized, seconds)
            }
            return "error.tooManyRequests".localized
        case .unknown:
            return "error.unknown".localized
        }
    }
}

// MARK: - HTTP Method
enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case patch = "PATCH"
    case delete = "DELETE"
}

// MARK: - API Client
@MainActor
class APIClient: ObservableObject {
    static let shared = APIClient()

    @Published var isLoading = false
    @Published var activeRequestCount = 0

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    // Token storage - uses secure Keychain storage
    private var _accessToken: String? {
        get { KeychainHelper.shared.get(key: .accessToken) }
        set {
            if let token = newValue {
                KeychainHelper.shared.save(token: token, forKey: .accessToken)
            } else {
                KeychainHelper.shared.delete(key: .accessToken)
            }
        }
    }

    // Public read-only access for token (needed for PDF loading, etc.)
    var accessToken: String? {
        return _accessToken
    }

    // Public access to base URL
    var baseURL: String {
        return APIConfig.baseURL
    }

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = APIConfig.timeoutInterval
        config.timeoutIntervalForResource = APIConfig.timeoutInterval * 2
        // Limit connections per host to prevent overwhelming local server
        // URLSession handles connection pooling internally
        config.httpMaximumConnectionsPerHost = APIConfig.maxConcurrentRequests
        // Disable waiting for connectivity - fail fast if network is unavailable
        config.waitsForConnectivity = false
        self.session = URLSession(configuration: config)

        self.decoder = JSONDecoder()
        // Convert snake_case API responses to camelCase Swift properties
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase
        self.decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let dateString = try container.decode(String.self)

            // Try ISO8601 with fractional seconds first
            let iso8601Formatter = ISO8601DateFormatter()
            iso8601Formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = iso8601Formatter.date(from: dateString) {
                return date
            }

            // Try without fractional seconds
            iso8601Formatter.formatOptions = [.withInternetDateTime]
            if let date = iso8601Formatter.date(from: dateString) {
                return date
            }

            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Cannot decode date: \(dateString)"
            )
        }

        self.encoder = JSONEncoder()
        // Keep camelCase for API requests - API accepts camelCase and returns snake_case
        self.encoder.dateEncodingStrategy = .iso8601
    }

    // MARK: - Server Connectivity Check

    /// Check if the API server is reachable
    /// Returns nil if successful, or an error description if not
    func checkServerConnectivity() async -> String? {
        guard let url = URL(string: "\(APIConfig.baseURL)/health") else {
            return "error.invalidAPIURL".localized
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.timeoutInterval = 5 // Quick timeout for connectivity check

        do {
            let (_, response) = try await session.data(for: request)
            if let httpResponse = response as? HTTPURLResponse {
                if httpResponse.statusCode == 200 {
                    return nil // Success
                } else if httpResponse.statusCode == 404 {
                    // Health endpoint doesn't exist but server is reachable
                    return nil
                } else {
                    return String(format: "error.serverStatus".localized, httpResponse.statusCode)
                }
            }
            return nil
        } catch let error as NSError {
            switch error.code {
            case NSURLErrorTimedOut:
                return "error.connectionTimedOut".localized
            case NSURLErrorCannotFindHost:
                return "error.cannotFindHost".localized
            case NSURLErrorCannotConnectToHost:
                return "error.cannotConnectToHost".localized
            case NSURLErrorNetworkConnectionLost:
                return "error.networkConnectionLost".localized
            case NSURLErrorNotConnectedToInternet:
                return "error.noInternet".localized
            default:
                return String(format: "error.networkError".localized, error.localizedDescription)
            }
        }
    }

    /// Log current API configuration for debugging
    func logConfiguration() {
        print("=== API Client Configuration ===")
        print("Base URL: \(APIConfig.baseURL)")
        print("Timeout: \(APIConfig.timeoutInterval)s")
        print("Max Concurrent Requests: \(APIConfig.maxConcurrentRequests)")
        print("Has Token: \(hasValidToken())")
        #if targetEnvironment(simulator)
        print("Running on: Simulator")
        #else
        print("Running on: Real Device")
        #endif
        print("================================")
    }

    // MARK: - Token Management

    func setAccessToken(_ token: String?) {
        self._accessToken = token
    }

    func clearAccessToken() {
        self._accessToken = nil
    }

    /// Check if we have a valid, non-expired token
    func hasValidToken() -> Bool {
        guard let token = _accessToken, !token.isEmpty else {
            return false
        }

        // Check if token is expired by decoding JWT payload
        return !isTokenExpired(token)
    }

    /// Check if a JWT token is expired
    /// Returns true if expired or unable to decode, false if still valid
    private func isTokenExpired(_ token: String) -> Bool {
        // JWT format: header.payload.signature
        let parts = token.split(separator: ".")
        guard parts.count == 3 else {
            print("[APIClient] Invalid JWT format")
            return true
        }

        // Decode the payload (second part)
        var payload = String(parts[1])

        // Add padding if needed for base64 decoding
        let remainder = payload.count % 4
        if remainder > 0 {
            payload += String(repeating: "=", count: 4 - remainder)
        }

        // Base64 URL to standard base64
        payload = payload
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")

        guard let payloadData = Data(base64Encoded: payload),
              let json = try? JSONSerialization.jsonObject(with: payloadData) as? [String: Any],
              let exp = json["exp"] as? TimeInterval else {
            print("[APIClient] Could not decode JWT payload")
            return true
        }

        let expirationDate = Date(timeIntervalSince1970: exp)
        let isExpired = expirationDate <= Date()

        if isExpired {
            print("[APIClient] Token expired at \(expirationDate)")
        }

        return isExpired
    }

    /// Get the expiration date of the current token, if any
    func getTokenExpirationDate() -> Date? {
        guard let token = _accessToken, !token.isEmpty else {
            return nil
        }

        let parts = token.split(separator: ".")
        guard parts.count == 3 else { return nil }

        var payload = String(parts[1])
        let remainder = payload.count % 4
        if remainder > 0 {
            payload += String(repeating: "=", count: 4 - remainder)
        }

        payload = payload
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")

        guard let payloadData = Data(base64Encoded: payload),
              let json = try? JSONSerialization.jsonObject(with: payloadData) as? [String: Any],
              let exp = json["exp"] as? TimeInterval else {
            return nil
        }

        return Date(timeIntervalSince1970: exp)
    }

    // MARK: - Request Building

    private func buildRequest(
        endpoint: String,
        method: HTTPMethod,
        body: Encodable? = nil,
        queryItems: [URLQueryItem]? = nil
    ) throws -> URLRequest {
        var urlString = "\(APIConfig.baseURL)\(endpoint)"

        // Add query parameters for GET requests
        if let queryItems = queryItems, !queryItems.isEmpty {
            var components = URLComponents(string: urlString)
            components?.queryItems = queryItems
            urlString = components?.url?.absoluteString ?? urlString
        }

        guard let url = URL(string: urlString) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Add auth token if available
        if let token = accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        // Add body for POST/PUT/PATCH
        if let body = body {
            request.httpBody = try encoder.encode(body)
        }

        return request
    }

    // MARK: - Response Handling

    private func handleResponse(_ response: URLResponse, data: Data) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.unknown
        }

        switch httpResponse.statusCode {
        case 200...299:
            return // Success
        case 401:
            // Clear token on unauthorized
            clearAccessToken()
            // Notify observers that session has expired
            // This allows AppState to redirect to login
            DispatchQueue.main.async {
                NotificationCenter.default.post(name: .authSessionExpired, object: nil)
            }
            throw APIError.unauthorized
        case 403:
            let errorMessage = try? decoder.decode(ErrorResponse.self, from: data)
            throw APIError.forbidden(errorMessage?.error)
        case 404:
            throw APIError.notFound
        case 429:
            let retryAfter = httpResponse.value(forHTTPHeaderField: "Retry-After")
            throw APIError.rateLimited(retryAfter: retryAfter.flatMap { Int($0) })
        default:
            let errorMessage = try? decoder.decode(ErrorResponse.self, from: data)
            throw APIError.serverError(httpResponse.statusCode, errorMessage?.error)
        }
    }

    // MARK: - Generic Request Methods

    /// Perform a GET request
    func get<T: Decodable>(
        _ endpoint: String,
        queryItems: [URLQueryItem]? = nil
    ) async throws -> T {
        let request = try buildRequest(endpoint: endpoint, method: .get, queryItems: queryItems)
        return try await performRequest(request)
    }

    /// Perform a POST request
    func post<T: Decodable, B: Encodable>(
        _ endpoint: String,
        body: B
    ) async throws -> T {
        let request = try buildRequest(endpoint: endpoint, method: .post, body: body)
        return try await performRequest(request)
    }

    /// Perform a POST request with no response body
    func post<B: Encodable>(
        _ endpoint: String,
        body: B
    ) async throws {
        let request = try buildRequest(endpoint: endpoint, method: .post, body: body)
        try await performRequestNoResponse(request)
    }

    /// Perform a PUT request
    func put<T: Decodable, B: Encodable>(
        _ endpoint: String,
        body: B
    ) async throws -> T {
        let request = try buildRequest(endpoint: endpoint, method: .put, body: body)
        return try await performRequest(request)
    }

    /// Perform a PATCH request
    func patch<T: Decodable, B: Encodable>(
        _ endpoint: String,
        body: B
    ) async throws -> T {
        let request = try buildRequest(endpoint: endpoint, method: .patch, body: body)
        return try await performRequest(request)
    }

    /// Perform a DELETE request
    func delete(_ endpoint: String) async throws {
        let request = try buildRequest(endpoint: endpoint, method: .delete)
        try await performRequestNoResponse(request)
    }

    // MARK: - Request Execution

    private func performRequest<T: Decodable>(_ request: URLRequest) async throws -> T {
        activeRequestCount += 1
        isLoading = activeRequestCount > 0
        defer {
            activeRequestCount -= 1
            isLoading = activeRequestCount > 0
        }

        do {
            let (data, response) = try await session.data(for: request)
            try handleResponse(response, data: data)

            #if DEBUG
            if let jsonString = String(data: data, encoding: .utf8) {
                print("API Response: \(jsonString.prefix(500))")
            }
            #endif

            return try decoder.decode(T.self, from: data)
        } catch let error as APIError {
            throw error
        } catch let error as DecodingError {
            throw APIError.decodingError(error)
        } catch {
            throw APIError.networkError(error)
        }
    }

    private func performRequestNoResponse(_ request: URLRequest) async throws {
        activeRequestCount += 1
        isLoading = activeRequestCount > 0
        defer {
            activeRequestCount -= 1
            isLoading = activeRequestCount > 0
        }

        do {
            let (data, response) = try await session.data(for: request)
            try handleResponse(response, data: data)
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }
}

// MARK: - Error Response Model
private struct ErrorResponse: Decodable {
    let error: String?
    let message: String?
    let details: [String: [String]]?
}
