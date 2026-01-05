//
//  ApolloClient.swift
//  ConstructionManager
//
//  Apollo GraphQL client configuration with offline support
//

import Foundation
import Apollo
import ApolloAPI

/// GraphQL API client with caching and offline support
class GraphQLClient {
    static let shared = GraphQLClient()

    let apollo: ApolloClient

    private init() {
        // Set up the cache
        let cache = InMemoryNormalizedCache()
        let store = ApolloStore(cache: cache)

        // Get API URL from environment or use default
        let apiURL: URL
        if let urlString = ProcessInfo.processInfo.environment["GRAPHQL_URL"],
           let url = URL(string: urlString) {
            apiURL = url
        } else {
            // Default to localhost for development
            apiURL = URL(string: "http://192.168.1.37:3000/api/graphql")!
        }

        // Create network transport with auth headers
        let networkTransport = RequestChainNetworkTransport(
            interceptorProvider: NetworkInterceptorProvider(store: store),
            endpointURL: apiURL,
            additionalHeaders: GraphQLClient.authHeaders()
        )

        apollo = ApolloClient(networkTransport: networkTransport, store: store)
    }

    /// Get current auth headers
    static func authHeaders() -> [String: String] {
        if let token = KeychainHelper.shared.get(key: .accessToken) {
            return ["Authorization": "Bearer \(token)"]
        }
        return [:]
    }

    /// Clear the Apollo cache
    func clearCache() {
        apollo.clearCache()
    }
}

// MARK: - Network Interceptor Provider

/// Simple interceptor provider without subclassing
struct NetworkInterceptorProvider: InterceptorProvider {
    private let store: ApolloStore

    init(store: ApolloStore) {
        self.store = store
    }

    func interceptors<Operation: GraphQLOperation>(for operation: Operation) -> [ApolloInterceptor] {
        return [
            MaxRetryInterceptor(),
            CacheReadInterceptor(store: store),
            TokenInterceptor(),
            NetworkFetchInterceptor(client: URLSessionClient()),
            ResponseCodeInterceptor(),
            JSONResponseParsingInterceptor(),
            AutomaticPersistedQueryInterceptor(),
            CacheWriteInterceptor(store: store)
        ]
    }
}

// MARK: - Token Interceptor

/// Adds Bearer token to GraphQL requests
class TokenInterceptor: ApolloInterceptor {
    var id: String = "TokenInterceptor"

    func interceptAsync<Operation: GraphQLOperation>(
        chain: RequestChain,
        request: HTTPRequest<Operation>,
        response: HTTPResponse<Operation>?,
        completion: @escaping (Result<GraphQLResult<Operation.Data>, Error>) -> Void
    ) {
        // Add auth token if available
        if let token = KeychainHelper.shared.get(key: .accessToken) {
            request.addHeader(name: "Authorization", value: "Bearer \(token)")
        }

        chain.proceedAsync(
            request: request,
            response: response,
            interceptor: self,
            completion: completion
        )
    }
}
