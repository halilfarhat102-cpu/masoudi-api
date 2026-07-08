import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:http/http.dart' as http;
import '../models/game.dart';

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

    final isLocal = widget.game.launchUrl.startsWith('assets/');

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF030508))
      ..addJavaScriptChannel(
        'MasoudiChannel',
        onMessageReceived: (JavaScriptMessage message) {
          try {
            final data = json.decode(message.message);
            if (data['action'] == 'updateBalance') {
              final newBal = double.tryParse(data['balance'].toString());
              if (newBal != null) {
                _onBalanceUpdated(newBal);
              }
            }
          } catch (e) {
            print("Error decoding web message: $e");
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
            if (isLocal) {
              // Inject initial balance into the local game
              _controller.runJavaScript('if (window.setMasoudiBalance) { window.setMasoudiBalance($_currentBalance); }');
            }
          },
          onWebResourceError: (WebResourceError error) {
            print("WebView error: ${error.description}");
          },
        ),
      );

    if (isLocal) {
      _controller.loadFlutterAsset(widget.game.launchUrl);
    } else {
      final String separator = widget.game.launchUrl.contains('?') ? '&' : '?';
      final String secureUrl =
          '${widget.game.launchUrl}${separator}player_id=${widget.playerId}&balance=${widget.balance}&token=secure_session_masoudi&provider=${Uri.encodeComponent(widget.game.provider)}';
      _controller.loadRequest(Uri.parse(secureUrl));
    }
  }

  void _onBalanceUpdated(double newBalance) async {
    final diff = newBalance - _currentBalance;
    if (diff == 0) return;

    if (mounted) {
      setState(() {
        _currentBalance = newBalance;
      });
    }

    // Update balance on the server database
    try {
      await http.post(
        Uri.parse('${widget.serverUrl}/api/update-player-balance'),
        body: json.encode({
          'id': widget.playerId,
          'amount': diff,
          'type': diff < 0 ? 'لعب (مزرعة الحظ)' : 'فوز (مزرعة الحظ)',
        }),
      );
    } catch (e) {
      print("Failed to sync balance with server: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        Navigator.of(context).pop(_currentBalance);
        return false;
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF030508),
        appBar: AppBar(
          backgroundColor: const Color(0xFF0C121E),
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.white),
            onPressed: () {
              Navigator.of(context).pop(_currentBalance);
            },
          ),
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
      ),
    );
  }
}

