import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../models/game.dart';
import '../utils/formatters.dart';

class GamePlayScreen extends StatefulWidget {
  final Game game;
  final double balance;
  final String playerId;

  const GamePlayScreen({
    Key? key,
    required this.game,
    required this.balance,
    required this.playerId,
  }) : super(key: key);

  @override
  _GamePlayScreenState createState() => _GamePlayScreenState();
}

class _GamePlayScreenState extends State<GamePlayScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();

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
        actions: [
          Center(
            child: Padding(
              padding: const EdgeInsets.only(left: 16.0),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [
                      Color(0xFFFF7A1F), // Bright orange
                      Color(0xFFD45A00), // Dark gold/orange
                    ],
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: const Color(0xFFFFB347).withOpacity(0.5),
                    width: 1.5,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFFF7A1F).withOpacity(0.3),
                      blurRadius: 10,
                      spreadRadius: 1,
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      '🪙',
                      style: TextStyle(fontSize: 14),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '${widget.balance.toLocaleString()} كوين',
                      style: GoogleFonts.cairo(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        shadows: [
                          const Shadow(
                            color: Colors.black45,
                            offset: Offset(0, 1),
                            blurRadius: 2,
                          ),
                        ],
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

