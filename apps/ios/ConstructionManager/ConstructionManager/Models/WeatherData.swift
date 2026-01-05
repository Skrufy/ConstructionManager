//
//  WeatherData.swift
//  ConstructionManager
//
//  Weather data model
//

import Foundation

struct WeatherData: Codable {
    let temperature: Double
    let condition: String
    let humidity: Int
    let windSpeed: Double
    let icon: String?

    var temperatureFormatted: String {
        return "\(Int(temperature))°F"
    }

    var conditionIcon: String {
        let conditionLower = condition.lowercased()
        if conditionLower.contains("clear") || conditionLower.contains("sunny") {
            return "sun.max.fill"
        } else if conditionLower.contains("cloud") {
            return "cloud.fill"
        } else if conditionLower.contains("rain") || conditionLower.contains("drizzle") {
            return "cloud.rain.fill"
        } else if conditionLower.contains("snow") {
            return "cloud.snow.fill"
        } else if conditionLower.contains("thunder") || conditionLower.contains("storm") {
            return "cloud.bolt.rain.fill"
        } else if conditionLower.contains("fog") || conditionLower.contains("mist") {
            return "cloud.fog.fill"
        } else {
            return "cloud.fill"
        }
    }
}

// MARK: - OpenWeatherMap Response
struct OpenWeatherResponse: Codable {
    let main: MainWeather
    let weather: [WeatherCondition]
    let wind: Wind

    struct MainWeather: Codable {
        let temp: Double
        let humidity: Int
    }

    struct WeatherCondition: Codable {
        let main: String
        let description: String
        let icon: String
    }

    struct Wind: Codable {
        let speed: Double
    }

    func toWeatherData() -> WeatherData {
        return WeatherData(
            temperature: main.temp,
            condition: weather.first?.main ?? "Unknown",
            humidity: main.humidity,
            windSpeed: wind.speed,
            icon: weather.first?.icon
        )
    }
}

// MARK: - Mock Data
extension WeatherData {
    static let mock = WeatherData(
        temperature: 72,
        condition: "Partly Cloudy",
        humidity: 45,
        windSpeed: 8.5,
        icon: "02d"
    )
}
