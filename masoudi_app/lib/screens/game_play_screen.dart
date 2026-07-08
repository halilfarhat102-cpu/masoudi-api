import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../models/game.dart';

class GamePlayScreen extends StatefulWidget {
  final Game game;
  final double balance;
  final String playerId;
  final ValueChanged<double>? onBalanceChanged;

  const GamePlayScreen({
    Key? key,
    required this.game,
    required this.balance,
    required this.playerId,
    this.onBalanceChanged,
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

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF030508))
      ..addJavaScriptChannel(
        'FlutterChannel',
        onMessageReceived: (JavaScriptMessage message) {
          try {
            final data = jsonDecode(message.message);
            if (data['action'] == 'updateBalance') {
              final newBalance = (data['balance'] as num).toDouble();
              setState(() {
                _currentBalance = newBalance;
              });
              if (widget.onBalanceChanged != null) {
                widget.onBalanceChanged!(newBalance);
              }
            }
          } catch (e) {
            print("Error parsing JavaScript message: $e");
          }
        },
      )
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
            }

            // If local game, inject the balance
            if (widget.game.launchUrl.startsWith('assets/')) {
              _controller.runJavaScript('''
                localStorage.setItem('masoudi_wallet_balance', '${_currentBalance.toInt()}');
                balance = ${_currentBalance.toInt()};
                if (typeof updateUI === 'function') {
                  updateUI();
                }
              ''');
            }
          },
          onWebResourceError: (WebResourceError error) {
            print("WebView error: ${error.description}");
          },
        ),
      );

    if (widget.game.launchUrl.startsWith('assets/')) {
      _controller.loadFlutterAsset(widget.game.launchUrl);
    } else {
      final String separator = widget.game.launchUrl.contains('?') ? '&' : '?';
      final String secureUrl =
          '${widget.game.launchUrl}${separator}player_id=${widget.playerId}&balance=${_currentBalance}&token=secure_session_masoudi&provider=${Uri.encodeComponent(widget.game.provider)}';
      _controller.loadRequest(Uri.parse(secureUrl));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF030508),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0C121E),
        elevation: 0,
        title: Text(
          widget.game.title,
          style: GoogleFonts.cairo(
            color: Colors.white,
            fontSize: 14,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          Center(
            child: Padding(
              padding: const EdgeInsets.only(left: 16.0),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFD4AF37).withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFD4AF37).withOpacity(0.2)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.wallet, color: Color(0xFFD4AF37), size: 14),
                    const SizedBox(width: 6),
                    Text(
                      '${_currentBalance.toStringAsFixed(2)} ر.س',
                      style: GoogleFonts.cairo(
                        color: const Color(0xFFD4AF37),
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          )
        ],
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Stack(
        children: [
          // WebView
          WebViewWidget(controller: _controller),

          // Loader Overlay
          if (_isLoading)
            Container(
              color: const Color(0xFF030508),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(
                      width: 40,
                      height: 40,
                      child: CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFD4AF37)),
                        strokeWidth: 3,
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'جاري الاتصال بـ API ومصادقة بيانات اللاعب...',
                      style: GoogleFonts.cairo(
                        color: const Color(0xFFD4AF37),
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
