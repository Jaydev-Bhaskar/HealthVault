import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/constants.dart';

class ApiService {
  static Future<Map<String, String>> _headers() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<dynamic> get(String path) async {
    final headers = await _headers();
    final res = await http.get(Uri.parse('$baseUrl$path'), headers: headers)
        .timeout(const Duration(seconds: 30));
    return _handleResponse(res);
  }

  static Future<dynamic> post(String path, Map<String, dynamic> body) async {
    final headers = await _headers();
    final res = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: headers,
      body: json.encode(body),
    ).timeout(const Duration(seconds: 30));
    return _handleResponse(res);
  }

  static Future<dynamic> put(String path, Map<String, dynamic> body) async {
    final headers = await _headers();
    final res = await http.put(
      Uri.parse('$baseUrl$path'),
      headers: headers,
      body: json.encode(body),
    ).timeout(const Duration(seconds: 30));
    return _handleResponse(res);
  }

  static Future<dynamic> delete(String path) async {
    final headers = await _headers();
    final res = await http.delete(Uri.parse('$baseUrl$path'), headers: headers)
        .timeout(const Duration(seconds: 30));
    return _handleResponse(res);
  }

  static Future<dynamic> patch(String path, [Map<String, dynamic>? body]) async {
    final headers = await _headers();
    final res = await http.patch(
      Uri.parse('$baseUrl$path'),
      headers: headers,
      body: body != null ? json.encode(body) : null,
    ).timeout(const Duration(seconds: 30));
    return _handleResponse(res);
  }

  static dynamic _handleResponse(http.Response res) {
    final body = json.decode(res.body);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return body;
    } else {
      throw Exception(body['message'] ?? 'Request failed (${res.statusCode})');
    }
  }
}
