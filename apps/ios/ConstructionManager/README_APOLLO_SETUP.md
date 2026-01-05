# Apollo iOS Setup Guide

## Adding Apollo iOS to the Project

### Step 1: Add Swift Package Manager Dependencies

1. Open `ConstructionManager.xcodeproj` in Xcode
2. Go to **File → Add Package Dependencies...**
3. Enter the Apollo iOS repository URL:
   ```
   https://github.com/apollographql/apollo-ios.git
   ```
4. Select version **1.12.0** or later
5. Add the following products to your target:
   - `Apollo`
   - `ApolloAPI`
   - `ApolloSQLite` (for persistent caching)

### Step 2: Install Apollo CLI

The Apollo CLI is required to generate Swift code from GraphQL operations.

```bash
# Install via npm (recommended)
npm install -g apollo

# Or install the Apollo iOS CLI
brew install apollo-cli
```

### Step 3: Generate GraphQL Types

Run code generation from the project root:

```bash
cd /Users/skrufy/Desktop/ConstructionPro/apps/ios/ConstructionManager

# Using Apollo CLI
./apollo-ios-cli generate

# Or using the configuration file
apollo-ios-cli generate --config apollo-codegen-config.json
```

### Step 4: Add Build Phase (Optional)

To automatically regenerate types on build:

1. In Xcode, select your target
2. Go to **Build Phases**
3. Click **+** → **New Run Script Phase**
4. Add the following script:

```bash
"${PODS_ROOT}/Apollo/scripts/run-bundled-codegen.sh" generate
```

## Project Structure

```
ConstructionManager/
├── GraphQL/
│   ├── schema.graphqls              # GraphQL schema
│   ├── ApolloClient.swift           # Apollo client configuration
│   ├── Operations/
│   │   ├── Projects/
│   │   │   └── ProjectQueries.graphql
│   │   ├── DailyLogs/
│   │   │   ├── DailyLogQueries.graphql
│   │   │   └── DailyLogMutations.graphql
│   │   └── TimeTracking/
│   │       ├── TimeTrackingQueries.graphql
│   │       └── TimeTrackingMutations.graphql
│   └── Generated/                   # Auto-generated Swift types
│       └── (generated files)
```

## Usage Example

```swift
import Apollo

// Fetch projects
let apollo = GraphQLClient.shared.apollo

apollo.fetch(query: GetProjectsQuery(
    status: .graphQLNullable(.some(.active)),
    page: 1,
    pageSize: 20
)) { result in
    switch result {
    case .success(let graphQLResult):
        if let projects = graphQLResult.data?.projects.edges {
            for edge in projects {
                print("Project: \(edge.node.name)")
            }
        }
    case .failure(let error):
        print("Error: \(error)")
    }
}
```

## Offline Support

The `ApolloClient.swift` includes:
- In-memory normalized cache
- Auth token interceptor using Keychain
- Configurable endpoint URL

For persistent offline caching, the `ApolloSQLite` package is included which stores cached data in SQLite.

## Troubleshooting

### "Cannot find 'GetProjectsQuery' in scope"
Run code generation to create Swift types from GraphQL operations.

### "Invalid token" errors
Ensure the auth token is stored in Keychain before making requests.

### Schema out of date
Update `schema.graphqls` from the web project:
```bash
cp ../web/src/graphql/schema.graphql ./ConstructionManager/GraphQL/schema.graphqls
```
