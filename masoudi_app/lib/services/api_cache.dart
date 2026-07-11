class ApiCache {
  static Map<String, dynamic>? _data;
  
  static Map<String, dynamic>? get data => _data;
  
  static set data(Map<String, dynamic>? val) {
    _data = val;
  }
}
