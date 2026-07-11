import 'package:flutter/material.dart';

extension CurrencyFormatting on double {
  String toLocaleString() {
    final RegExp reg = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');
    final parts = toStringAsFixed(2).split('.');
    final formattedInt = parts[0].replaceAllMapped(reg, (Match match) => '${match[1]},');
    if (parts[1] == '00') {
      return formattedInt;
    }
    return '$formattedInt.${parts[1]}';
  }
}
