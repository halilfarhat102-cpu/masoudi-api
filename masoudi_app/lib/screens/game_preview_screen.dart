import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/game.dart';
import 'game_play_screen.dart';
import '../utils/formatters.dart';

class GamePreviewScreen extends StatefulWidget {
  final Game game;
  final double balance;
  final String playerId;
  final String playerName;
  final bool showBalance;
  final bool showLiveBadge;
  final String playButtonText;
  final String serverUrl;

  const GamePreviewScreen({
    Key? key,
    required this.game,
    required this.balance,
    required this.playerId,
    required this.playerName,
    required this.serverUrl,
    this.showBalance = true,
    this.showLiveBadge = true,
    this.playButtonText = 'العب الآن',
  }) : super(key: key);

  @override
  State<GamePreviewScreen> createState() => _GamePreviewScreenState();
}

class _GamePreviewScreenState extends State<GamePreviewScreen>
    with TickerProviderStateMixin {
  late AnimationController _fadeCtrl;
  late AnimationController _slideCtrl;
  late AnimationController _pulseCtrl;
  late AnimationController _shimmerCtrl;

  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;
  late Animation<double> _pulseAnim;
  late Animation<double> _shimmerAnim;

  bool _launching = false;

  // Category info
  Map<String, dynamic> get _categoryInfo {
    switch (widget.game.category.toLowerCase()) {
      case 'live':
        return {'label': 'مباشر', 'icon': '📡', 'color': const Color(0xFF00E676)};
      case 'slots':
        return {'label': 'فتحات', 'icon': '🎰', 'color': const Color(0xFFFF9800)};
      case 'table':
        return {'label': 'طاولة', 'icon': '🃏', 'color': const Color(0xFF7C4DFF)};
      case 'jackpot':
        return {'label': 'جاكبوت', 'icon': '💎', 'color': const Color(0xFFFFD700)};
      default:
        return {'label': 'لعبة', 'icon': '🎮', 'color': const Color(0xFFFF7A1F)};
    }
  }

  // Emoji image fallback
  String get _gameEmoji {
    switch (widget.game.category.toLowerCase()) {
      case 'live':   return '🎰';
      case 'slots':  return '🍒';
      case 'table':  return '🃏';
      case 'jackpot':return '💎';
      default:       return '🎮';
    }
  }

  @override
  void initState() {
    super.initState();

    _fadeCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 600));
    _slideCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 700));
    _pulseCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1500))..repeat(reverse: true);
    _shimmerCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 2000))..repeat();

    _fadeAnim   = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);
    _slideAnim  = Tween<Offset>(begin: const Offset(0, 0.15), end: Offset.zero)
        .animate(CurvedAnimation(parent: _slideCtrl, curve: Curves.easeOutCubic));
    _pulseAnim  = Tween<double>(begin: 1.0, end: 1.05)
        .animate(CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut));
    _shimmerAnim = Tween<double>(begin: -2, end: 2)
        .animate(CurvedAnimation(parent: _shimmerCtrl, curve: Curves.linear));

    _fadeCtrl.forward();
    Future.delayed(const Duration(milliseconds: 100), () => _slideCtrl.forward());
  }

  @override
  void dispose() {
    _fadeCtrl.dispose();
    _slideCtrl.dispose();
    _pulseCtrl.dispose();
    _shimmerCtrl.dispose();
    super.dispose();
  }

  void _launchGame() async {
    if (_launching) return;
    HapticFeedback.mediumImpact();
    setState(() => _launching = true);

    await Future.delayed(const Duration(milliseconds: 600));

    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      PageRouteBuilder(
        pageBuilder: (_, __, ___) => GamePlayScreen(
          game: widget.game,
          balance: widget.balance,
          playerId: widget.playerId,
          serverUrl: widget.serverUrl,
        ),
        transitionsBuilder: (_, anim, __, child) {
          return FadeTransition(
            opacity: anim,
            child: ScaleTransition(
              scale: Tween<double>(begin: 1.05, end: 1.0).animate(
                CurvedAnimation(parent: anim, curve: Curves.easeOutCubic),
              ),
              child: child,
            ),
          );
        },
        transitionDuration: const Duration(milliseconds: 500),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cat = _categoryInfo;
    final catColor = cat['color'] as Color;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: GestureDetector(
        onTap: () => Navigator.pop(context),
        child: Container(
          color: Colors.black.withOpacity(0.82),
          child: FadeTransition(
            opacity: _fadeAnim,
            child: Center(
              child: GestureDetector(
                onTap: () {}, // Prevent close when tapping card
                child: SlideTransition(
                  position: _slideAnim,
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 20),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1A110D),
                      borderRadius: BorderRadius.circular(28),
                      border: Border.all(
                        color: catColor.withOpacity(0.35),
                        width: 1.5,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: catColor.withOpacity(0.2),
                          blurRadius: 40,
                          spreadRadius: 5,
                        ),
                        BoxShadow(
                          color: Colors.black.withOpacity(0.6),
                          blurRadius: 30,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // ─── Game Cover ───────────────────────────────
                        _buildGameCover(catColor),

                        // ─── Game Info ────────────────────────────────
                        Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Category Badge + Provider
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: catColor.withOpacity(0.12),
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(color: catColor.withOpacity(0.4)),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(cat['icon'], style: const TextStyle(fontSize: 12)),
                                        const SizedBox(width: 5),
                                        Text(
                                          cat['label'],
                                          style: GoogleFonts.cairo(
                                            fontSize: 11, fontWeight: FontWeight.bold,
                                            color: catColor,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const Spacer(),
                                  Text(
                                    widget.game.provider,
                                    style: GoogleFonts.cairo(
                                      fontSize: 11, color: Colors.grey[600],
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),

                              // Game Title
                              Text(
                                widget.game.title,
                                style: GoogleFonts.cairo(
                                  fontSize: 17,
                                  fontWeight: FontWeight.w900,
                                  color: Colors.white,
                                  height: 1.3,
                                ),
                              ),
                              const SizedBox(height: 16),

                              // ─── Stats Row ────────────────────────
                              Row(
                                children: [
                                  if (widget.showBalance) ...[
                                    _statChip(
                                      icon: Icons.account_balance_wallet_rounded,
                                      label: 'رصيدك',
                                      value: '${widget.balance.toLocaleString()} كوين',
                                      color: const Color(0xFFFF7A1F),
                                    ),
                                    const SizedBox(width: 10),
                                  ],
                                  _statChip(
                                    icon: Icons.person_rounded,
                                    label: 'اللاعب',
                                    value: widget.playerName.length > 12
                                        ? '${widget.playerName.substring(0, 12)}...'
                                        : widget.playerName,
                                    color: catColor,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 20),

                              // ─── Play Button ──────────────────────
                              _launching
                                  ? _buildLaunchingButton(catColor)
                                  : _buildPlayButton(catColor),

                              const SizedBox(height: 12),

                              // Cancel
                              GestureDetector(
                                onTap: () => Navigator.pop(context),
                                child: Center(
                                  child: Text(
                                    'إلغاء',
                                    style: GoogleFonts.cairo(
                                      fontSize: 13,
                                      color: Colors.grey[600],
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildGameCover(Color catColor) {
    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      child: Stack(
        children: [
          // Background gradient
          Container(
            height: 180,
            width: double.infinity,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  catColor.withOpacity(0.15),
                  const Color(0xFF0E0906),
                ],
              ),
            ),
          ),

          Positioned.fill(
            child: widget.game.image.isNotEmpty
                ? Image.network(
                    widget.game.image.startsWith('http')
                        ? widget.game.image
                        : '${widget.serverUrl}/${widget.game.image}',
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => _emojiCover(_gameEmoji, catColor),
                  )
                : _emojiCover(_gameEmoji, catColor),
          ),

          // Gradient overlay at bottom
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    const Color(0xFF1A110D).withOpacity(0.85),
                  ],
                  stops: const [0.4, 1.0],
                ),
              ),
            ),
          ),

          // Shimmer effect
          Positioned.fill(
            child: AnimatedBuilder(
              animation: _shimmerAnim,
              builder: (_, __) => Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment(_shimmerAnim.value - 0.5, 0),
                    end: Alignment(_shimmerAnim.value + 0.5, 0),
                    colors: [
                      Colors.white.withOpacity(0),
                      Colors.white.withOpacity(0.04),
                      Colors.white.withOpacity(0),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // Live badge
          if (widget.game.category.toLowerCase() == 'live' && widget.showLiveBadge)
            Positioned(
              top: 12,
              right: 12,
              child: _liveBadge(),
            ),

          // Close button
          Positioned(
            top: 12,
            left: 12,
            child: GestureDetector(
              onTap: () => Navigator.pop(context),
              child: Container(
                width: 32, height: 32,
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.5),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white.withOpacity(0.1)),
                ),
                child: const Icon(Icons.close_rounded, color: Colors.white70, size: 16),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _emojiCover(String emoji, Color color) {
    return Container(
      height: 180,
      decoration: BoxDecoration(
        gradient: RadialGradient(
          colors: [color.withOpacity(0.2), const Color(0xFF0E0906)],
          radius: 0.8,
        ),
      ),
      child: Center(
        child: ScaleTransition(
          scale: _pulseAnim,
          child: Text(emoji, style: const TextStyle(fontSize: 72)),
        ),
      ),
    );
  }

  Widget _liveBadge() {
    return AnimatedBuilder(
      animation: _pulseCtrl,
      builder: (_, __) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: const Color(0xFFFF1744).withOpacity(0.9 + 0.1 * _pulseCtrl.value),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [BoxShadow(color: const Color(0xFFFF1744).withOpacity(0.4), blurRadius: 8)],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 6, height: 6,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.8 + 0.2 * _pulseCtrl.value),
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 5),
            Text('LIVE', style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.white)),
          ],
        ),
      ),
    );
  }

  Widget _statChip({required IconData icon, required String label, required String value, required Color color}) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: color.withOpacity(0.07),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 16),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: GoogleFonts.cairo(fontSize: 9, color: Colors.grey[600], fontWeight: FontWeight.w600)),
                  Text(value, style: GoogleFonts.cairo(fontSize: 12, color: Colors.white, fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlayButton(Color catColor) {
    return ScaleTransition(
      scale: _pulseAnim,
      child: GestureDetector(
        onTap: _launchGame,
        child: Container(
          width: double.infinity,
          height: 52,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [catColor, catColor.withOpacity(0.7)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(color: catColor.withOpacity(0.35), blurRadius: 16, offset: const Offset(0, 6)),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.play_circle_fill_rounded, color: Colors.white, size: 22),
              const SizedBox(width: 10),
              Text(
                widget.playButtonText,
                style: GoogleFonts.cairo(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLaunchingButton(Color catColor) {
    return Container(
      width: double.infinity,
      height: 52,
      decoration: BoxDecoration(
        color: catColor.withOpacity(0.15),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: catColor.withOpacity(0.4)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 18, height: 18,
            child: CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(catColor),
              strokeWidth: 2.5,
            ),
          ),
          const SizedBox(width: 12),
          Text(
            'جاري تحميل اللعبة...',
            style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.bold, color: catColor),
          ),
        ],
      ),
    );
  }
}


