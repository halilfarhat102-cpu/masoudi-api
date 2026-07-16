import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({Key? key}) : super(key: key);

  @override
  _SplashScreenState createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  // Progress
  double _progress = 0.0;
  Timer? _progressTimer;

  // Fox bounce animation
  late AnimationController _bounceController;
  late Animation<double> _bounceAnimation;

  // Logo fade-scale in
  late AnimationController _logoController;
  late Animation<double> _logoScale;
  late Animation<double> _logoFade;

  // Shimmer on title
  late AnimationController _shimmerController;

  // Particles glow pulse
  late AnimationController _glowController;
  late Animation<double> _glowAnimation;

  // Final exit
  bool _navigating = false;

  @override
  void initState() {
    super.initState();

    // ── Logo entrance (fade + scale) ──────────────────
    _logoController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _logoScale = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(parent: _logoController, curve: Curves.elasticOut),
    );
    _logoFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _logoController, curve: const Interval(0.0, 0.5)),
    );
    _logoController.forward();

    // ── Fox bounce (idle loop) ─────────────────────────
    _bounceController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _bounceAnimation = Tween<double>(begin: 0.0, end: 14.0).animate(
      CurvedAnimation(parent: _bounceController, curve: Curves.easeInOut),
    );

    // ── Shimmer sweep on text ──────────────────────────
    _shimmerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat();

    // ── Glow pulse ─────────────────────────────────────
    _glowController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    _glowAnimation = Tween<double>(begin: 0.3, end: 0.8).animate(
      CurvedAnimation(parent: _glowController, curve: Curves.easeInOut),
    );

    // ── Progress bar → auto-navigate ──────────────────
    _progressTimer = Timer.periodic(const Duration(milliseconds: 28), (t) {
      if (!mounted) return;
      setState(() {
        if (_progress < 1.0) {
          // Ease-out feel: faster at start, slower at end
          double remaining = 1.0 - _progress;
          _progress += remaining * 0.025 + 0.003;
          if (_progress > 1.0) _progress = 1.0;
        } else if (!_navigating) {
          _navigating = true;
          t.cancel();
          // Navigate automatically after short pause
          Future.delayed(const Duration(milliseconds: 400), () {
            if (mounted) {
              Navigator.of(context).pushReplacementNamed('/main');
            }
          });
        }
      });
    });
  }

  @override
  void dispose() {
    _progressTimer?.cancel();
    _bounceController.dispose();
    _logoController.dispose();
    _shimmerController.dispose();
    _glowController.dispose();
    super.dispose();
  }

  // ── Shimmer gradient builder ─────────────────────────
  Widget _shimmerText(String text) {
    return AnimatedBuilder(
      animation: _shimmerController,
      builder: (context, child) {
        return ShaderMask(
          shaderCallback: (bounds) {
            final double shimmerPos = _shimmerController.value;
            return LinearGradient(
              begin: Alignment.centerRight,
              end: Alignment.centerLeft,
              stops: [
                (shimmerPos - 0.3).clamp(0.0, 1.0),
                shimmerPos.clamp(0.0, 1.0),
                (shimmerPos + 0.3).clamp(0.0, 1.0),
              ],
              colors: const [
                Color(0xFFFF7A1F),
                Color(0xFFFFFFCC),
                Color(0xFFFF7A1F),
              ],
            ).createShader(bounds);
          },
          child: child,
        );
      },
      child: Text(
        text,
        style: GoogleFonts.cairo(
          fontSize: 38,
          fontWeight: FontWeight.w900,
          color: Colors.white,
          letterSpacing: 2.5,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: const Color(0xFF1A110D),
      body: Stack(
        children: [
          // ── Background radial glow ───────────────────
          AnimatedBuilder(
            animation: _glowAnimation,
            builder: (context, _) {
              return Container(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: const Alignment(0, -0.2),
                    radius: 1.1,
                    colors: [
                      const Color(0xFF1A2A1A).withOpacity(_glowAnimation.value * 0.7),
                      const Color(0xFF1A110D),
                    ],
                  ),
                ),
              );
            },
          ),

          // ── Decorative top-right circle ──────────────
          Positioned(
            top: -60,
            right: -60,
            child: AnimatedBuilder(
              animation: _glowAnimation,
              builder: (context, _) => Container(
                width: 220,
                height: 220,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFFFF7A1F).withOpacity(_glowAnimation.value * 0.06),
                ),
              ),
            ),
          ),

          // ── Decorative bottom-left circle ────────────
          Positioned(
            bottom: -40,
            left: -40,
            child: Container(
              width: 160,
              height: 160,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFFF7A1F).withOpacity(0.04),
              ),
            ),
          ),

          // ── Main content ─────────────────────────────
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Spacer(flex: 2),

                // Fox mascot with bounce
                AnimatedBuilder(
                  animation: _bounceAnimation,
                  builder: (context, child) {
                    return Transform.translate(
                      offset: Offset(0, -_bounceAnimation.value),
                      child: child,
                    );
                  },
                  child: FadeTransition(
                    opacity: _logoFade,
                    child: ScaleTransition(
                      scale: _logoScale,
                      child: AnimatedBuilder(
                        animation: _glowAnimation,
                        builder: (context, child) {
                          return Container(
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFFFF6B00)
                                      .withOpacity(_glowAnimation.value * 0.5),
                                  blurRadius: 40,
                                  spreadRadius: 10,
                                ),
                              ],
                            ),
                            child: child,
                          );
                        },
                        child: Image.asset(
                              'assets/images/fox_mascot.png',
                              width: 180,
                              height: 180,
                              fit: BoxFit.contain,
                              errorBuilder: (context, error, stack) {
                                // Fallback if image fails
                                return Container(
                                  width: 180,
                                  height: 180,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: const Color(0xFF291B15),
                                    border: Border.all(
                                      color: const Color(0xFFFF7A1F),
                                      width: 3,
                                    ),
                                  ),
                                  child: const Icon(
                                    Icons.diamond_rounded,
                                    size: 60,
                                    color: Color(0xFFFF7A1F),
                                  ),
                                );
                              },
                            ),
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 28),

                // Shimmer Title
                FadeTransition(
                  opacity: _logoFade,
                  child: _shimmerText('مسعودي'),
                ),

                const SizedBox(height: 8),

                // Subtitle
                FadeTransition(
                  opacity: _logoFade,
                  child: Text(
                    'بوابة الألعاب الفاخرة',
                    style: GoogleFonts.cairo(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF6B7080),
                      letterSpacing: 0.5,
                    ),
                  ),
                ),

                const Spacer(flex: 2),

                // ── Loading bar area ─────────────────
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 40),
                  child: Column(
                    children: [
                      // Percentage text
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'جاري التحميل...',
                            style: GoogleFonts.cairo(
                              fontSize: 11,
                              color: const Color(0xFF6B7080),
                            ),
                          ),
                          Text(
                            '${(_progress * 100).toInt()}%',
                            style: GoogleFonts.cairo(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFFFF7A1F),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      // Progress bar track
                      Container(
                        width: double.infinity,
                        height: 5,
                        decoration: BoxDecoration(
                          color: const Color(0xFF35241C),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Stack(
                          children: [
                            // Filled bar with gradient + glow
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 28),
                              width: (size.width - 80) * _progress,
                              height: 5,
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [Color(0xFFFF7A1F), Color(0xFF00E676)],
                                ),
                                borderRadius: BorderRadius.circular(10),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFFFF7A1F).withOpacity(0.6),
                                    blurRadius: 8,
                                    spreadRadius: 1,
                                  ),
                                ],
                              ),
                            ),

                            // Shimmer sweep on bar
                            AnimatedBuilder(
                              animation: _shimmerController,
                              builder: (context, _) {
                                return Positioned(
                                  left: (size.width - 80) * _progress * _shimmerController.value - 30,
                                  child: Container(
                                    width: 30,
                                    height: 5,
                                    decoration: BoxDecoration(
                                      gradient: LinearGradient(
                                        colors: [
                                          Colors.white.withOpacity(0.0),
                                          Colors.white.withOpacity(0.4),
                                          Colors.white.withOpacity(0.0),
                                        ],
                                      ),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                  ),
                                );
                              },
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 12),

                      // Dot indicators
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(3, (i) {
                          double threshold = (i + 1) / 3;
                          bool active = _progress >= threshold;
                          return AnimatedContainer(
                            duration: const Duration(milliseconds: 300),
                            margin: const EdgeInsets.symmetric(horizontal: 3),
                            width: active ? 14 : 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: active
                                  ? const Color(0xFFFF7A1F)
                                  : const Color(0xFF3D2A20),
                              borderRadius: BorderRadius.circular(3),
                              boxShadow: active
                                  ? [
                                      BoxShadow(
                                        color: const Color(0xFFFF7A1F).withOpacity(0.5),
                                        blurRadius: 6,
                                      )
                                    ]
                                  : [],
                            ),
                          );
                        }),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 40),

                // Version text
                Text(
                  'الإصدار 1.0.0',
                  style: GoogleFonts.cairo(
                    fontSize: 10,
                    color: const Color(0xFF3A3F4D),
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
