import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:http/http.dart' as http;
import '../models/game.dart';
import '../utils/formatters.dart';

class GamePlayScreen extends StatefulWidget {
  final Game game;
  final double balance;
  final String playerId;
  final String serverUrl;

  const GamePlayScreen({
    Key? key,
    required this.game,
    required this.balance,
    required this.playerId,
    required this.serverUrl,
  }) : super(key: key);

  @override
  _GamePlayScreenState createState() => _GamePlayScreenState();
}

class _GamePlayScreenState extends State<GamePlayScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;
  late double _currentBalance;

  @override
  void initState() {
    super.initState();
    _currentBalance = widget.balance;

    final bool isLocal = !widget.game.launchUrl.startsWith('http');
    final String separator = widget.game.launchUrl.contains('?') ? '&' : '?';
    final String secureUrl = isLocal
        ? ''
        : '${widget.game.launchUrl}${separator}player_id=${widget.playerId}&balance=${widget.balance}&token=secure_session_masoudi&provider=${Uri.encodeComponent(widget.game.provider)}';

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF100906))
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (String url) {
            if (mounted) {
              setState(() {
                _isLoading = true;
              });
            }
          },
          onPageFinished: (String url) {
            if (mounted) {
              setState(() {
                _isLoading = false;
              });
              if (isLocal) {
                _controller.runJavaScript('''
                  localStorage.setItem('masoudi_wallet_balance', '${widget.balance}');
                  localStorage.setItem('masoudi_player_id', '${widget.playerId}');
                  if (window.setMasoudiBalance) {
                    window.setMasoudiBalance('${widget.balance}');
                  }
                ''');
              }
            }
          },
          onWebResourceError: (WebResourceError error) {
            print("WebView error: ${error.description}");
          },
        ),
      )
      ..addJavaScriptChannel(
        'MasoudiChannel',
        onMessageReceived: (JavaScriptMessage message) {
          try {
            final Map<String, dynamic> data = jsonDecode(message.message);
            if (data['action'] == 'updateBalance') {
              final double newBalance = (data['balance'] as num).toDouble();
              final double diff = newBalance - _currentBalance;
              if (diff != 0) {
                setState(() {
                  _currentBalance = newBalance;
                });
                _syncBalanceWithServer(diff);
              }
            }
          } catch (e) {
            print("Error parsing MasoudiChannel message: $e");
          }
        },
      );

    if (isLocal) {
      _controller.loadFlutterAsset(widget.game.launchUrl);
    } else {
      _controller.loadRequest(Uri.parse(secureUrl));
    }

    // Failsafe: force hide the loading overlay after 1.5 seconds if it gets stuck
    Future.delayed(const Duration(milliseconds: 1500), () {
      if (mounted && _isLoading) {
        setState(() {
          _isLoading = false;
        });
      }
    });
  }

  Future<void> _syncBalanceWithServer(double diff) async {
    try {
      final response = await http.post(
        Uri.parse('${widget.serverUrl}/api/update-player-balance'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'id': widget.playerId,
          'amount': diff,
          'type': 'لعب لعبة ${widget.game.title}'
        }),
      );
      if (response.statusCode == 200) {
        print("Successfully synced balance change with server: $diff");
      } else {
        print("Failed to sync balance with server. Status: ${response.statusCode}");
      }
    } catch (e) {
      print("Error syncing balance with server: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF100906),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E140F),
        elevation: 0,
        title: Text(
          widget.game.title,
          style: GoogleFonts.cairo(
            color: Colors.white,
            fontSize: 14,
            fontWeight: FontWeight.bold,
          ),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Stack(
        children: [
          // WebView
          WebViewWidget(controller: _controller),

          // Loader Overlay
          if (_isLoading)
            Container(
              color: const Color(0xFF100906),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(
                      width: 40,
                      height: 40,
                      child: CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFD45A00)),
                        strokeWidth: 3,
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'جاري الاتصال بـ API ومصادقة بيانات اللاعب...',
                      style: GoogleFonts.cairo(
                        color: const Color(0xFFD45A00),
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

