//
//  WeatherService.swift
//  ConstructionManager
//
//  Service for fetching weather data
//

import Foundation
import CoreLocation
import Combine

class WeatherService: ObservableObject {
    static let shared = WeatherService()

    // Replace with your OpenWeatherMap API key
    private let apiKey = "YOUR_OPENWEATHER_API_KEY"
    private let baseURL = "https://api.openweathermap.org/data/2.5/weather"

    @Published var isLoading = false
    @Published var error: String?

    private var cancellables = Set<AnyCancellable>()

    private init() {}

    /// Fetch weather data for given coordinates
    func fetchWeather(latitude: Double, longitude: Double) async -> WeatherData? {
        // For development, return mock data if no API key is set
        if apiKey == "YOUR_OPENWEATHER_API_KEY" {
            return generateMockWeather()
        }

        let urlString = "\(baseURL)?lat=\(latitude)&lon=\(longitude)&appid=\(apiKey)&units=imperial"

        guard let url = URL(string: urlString) else {
            return generateMockWeather()
        }

        do {
            let (data, response) = try await URLSession.shared.data(from: url)

            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                return generateMockWeather()
            }

            let decoder = JSONDecoder()
            let weatherResponse = try decoder.decode(OpenWeatherResponse.self, from: data)
            return weatherResponse.toWeatherData()
        } catch {
            print("Weather fetch error: \(error)")
            return generateMockWeather()
        }
    }

    /// Generate mock weather data for development
    private func generateMockWeather() -> WeatherData {
        let conditions = ["Clear", "Partly Cloudy", "Cloudy", "Light Rain", "Sunny"]
        let randomCondition = conditions.randomElement() ?? "Clear"
        let randomTemp = Double.random(in: 55...85)
        let randomHumidity = Int.random(in: 30...70)
        let randomWind = Double.random(in: 2...15)

        return WeatherData(
            temperature: randomTemp,
            condition: randomCondition,
            humidity: randomHumidity,
            windSpeed: randomWind,
            icon: nil
        )
    }
}

// MARK: - Location-based Weather
extension WeatherService {
    /// Fetch weather for a project's GPS coordinates
    func fetchWeatherForProject(_ project: Project) async -> WeatherData? {
        guard let lat = project.gpsLatitude,
              let lon = project.gpsLongitude else {
            // Use default location (Los Angeles) if project has no coordinates
            return await fetchWeather(latitude: 34.0522, longitude: -118.2437)
        }
        return await fetchWeather(latitude: lat, longitude: lon)
    }
}
