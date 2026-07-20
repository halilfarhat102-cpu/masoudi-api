import 'package:flutter/material.dart';

// Global Language Notifier: 'ar' (Arabic) or 'en' (English)
final ValueNotifier<String> appLanguage = ValueNotifier('ar');

// Translation Helper Function
String tr(String arText, String enText) {
  return appLanguage.value == 'ar' ? arText : enText;
}
