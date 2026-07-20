import 'dart:convert';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:cached_network_image/cached_network_image.dart';
import '../models/game.dart';
import '../services/api_cache.dart';

class HomeScreen extends StatefulWidget {
  final String serverUrl;
  final double balance;
  final Function(Game) onPlayGame;

  const HomeScreen({
    Key? key,
    required this.serverUrl,
    required this.balance,
    required this.onPlayGame,
  }) : super(key: key);

  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  List<Game> _games = [];
  bool _isLoading = true;
  String _searchQuery = '';
  String _selectedCategory = 'all';
  bool _acceptedCookies = false;

  late final PageController _pageController = PageController();
  late final PageController _bannerController = PageController();
  Timer? _marqueeTimer;
  Timer? _bannerTimer;
  int _currentPage = 0;
  int _currentBanner = 0;

  List<Map<String, dynamic>> _banners = [];

  final List<Map<String, String>> _winners = [
    {"name": "خالد المري", "prize": "15,000 كوين 🪙", "game": "روليت البرق"},
    {"name": "أبو فهد", "prize": "8,500 كوين 🪙", "game": "فتحات أوليمبوس"},
    {"name": "سارة الدوسري", "prize": "32,000 كوين 🪙", "game": "بلاك جاك مسعودي"},
    {"name": "سلطان العتيبي", "prize": "6,200 كوين 🪙", "game": "سلوتس كليوباترا"}
  ];

  @override
  void initState() {
    super.initState();
    _fetchGames();

    _marqueeTimer = Timer.periodic(const Duration(seconds: 4), (timer) {
      if (_pageController.hasClients) {
        _currentPage = (_currentPage + 1) % _winners.length;
        _pageController.animateToPage(
          _currentPage,
          duration: const Duration(milliseconds: 600),
          curve: Curves.easeInOut,
        );
      }
    });

    _bannerTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      if (_bannerController.hasClients && _banners.isNotEmpty) {
        _currentBanner = (_currentBanner + 1) % _banners.length;
        _bannerController.animateToPage(
          _currentBanner,
          duration: const Duration(milliseconds: 700),
          curve: Curves.easeInOutCubic,
        );
      }
    });
  }

  @override
  void dispose() {
    _marqueeTimer?.cancel();
    _bannerTimer?.cancel();
    _pageController.dispose();
    _bannerController.dispose();
    super.dispose();
  }

  Map<String, dynamic> _mapBanner(Map<String, dynamic> json) {
    final String theme = json['theme'] ?? 'orange';
    int accentR = 255, accentG = 122, accentB = 31;
    int gradStartR = 44, gradStartG = 22, gradStartB = 11;
    int gradEndR = 56, gradEndG = 28, gradEndB = 14;

    switch (theme) {
      case 'emerald':
        accentR = 0; accentG = 230; accentB = 118;
        gradStartR = 13; gradStartG = 43; gradStartB = 26;
        gradEndR = 10; gradEndG = 61; gradEndB = 32;
        break;
      case 'purple':
        accentR = 124; accentG = 77; accentB = 255;
        gradStartR = 21; gradStartG = 13; gradStartB = 46;
        gradEndR = 27; gradEndG = 16; gradEndB = 64;
        break;
      case 'gold':
        accentR = 245; accentG = 194; accentB = 49;
        gradStartR = 42; gradStartG = 28; gradStartB = 0;
        gradEndR = 61; gradEndG = 40; gradEndB = 0;
        break;
      case 'crimson':
        accentR = 255; accentG = 23; accentB = 68;
        gradStartR = 46; gradStartG = 9; gradStartB = 17;
        gradEndR = 64; gradEndG = 12; gradEndB = 23;
        break;
      case 'orange':
      default:
        accentR = 255; accentG = 122; accentB = 31;
        gradStartR = 44; gradStartG = 22; gradStartB = 11;
        gradEndR = 56; gradEndG = 28; gradEndB = 14;
        break;
    }

    return {
      'title': json['title'] ?? '',
      'subtitle': json['subtitle'] ?? '',
      'badge': json['badge'] ?? '',
      'icon': json['icon'] ?? '🎁',
      'image': json['image'] ?? '',
      'accentR': accentR,
      'accentG': accentG,
      'accentB': accentB,
      'gradStartR': gradStartR,
      'gradStartG': gradStartG,
      'gradStartB': gradStartB,
      'gradEndR': gradEndR,
      'gradEndG': gradEndG,
      'gradEndB': gradEndB,
    };
  }

  Future<void> _fetchGames() async {
    if (ApiCache.data != null) {
      final decoded = ApiCache.data!;
      final List<dynamic> gamesList = decoded['games'] ?? [];
      final List<dynamic> bannersList = decoded['banners'] ?? [];
      _games = gamesList.map((g) => Game.fromJson(Map<String, dynamic>.from(g))).toList();
      if (bannersList.isNotEmpty) {
        _banners = bannersList.map((b) => _mapBanner(Map<String, dynamic>.from(b))).toList();
      }
      _isLoading = false;
    } else {
      setState(() {
        _isLoading = true;
      });
    }

    try {
      final response = await http.get(Uri.parse('${widget.serverUrl}/api/data')).timeout(
        const Duration(seconds: 15),
      );

      if (response.statusCode == 200) {
        final decoded = json.decode(response.body);
        ApiCache.data = decoded;
        final List<dynamic> gamesList = decoded['games'] ?? [];
        final List<dynamic> bannersList = decoded['banners'] ?? [];
        if (!mounted) return;
        setState(() {
          _games = gamesList.map((g) => Game.fromJson(Map<String, dynamic>.from(g))).toList();
          if (bannersList.isNotEmpty) {
            _banners = bannersList.map((b) => _mapBanner(Map<String, dynamic>.from(b))).toList();
          }
          _isLoading = false;
        });
      } else {
        throw Exception("Server returned ${response.statusCode}");
      }
    } catch (e) {
      print("Error fetching games from API: $e. Falling back to defaults.");
      if (!mounted) return;
      setState(() {
        _games = [
          Game(
            id: "game-1",
            title: "SWEET BONANZA 1000",
            category: "slots",
            provider: "PRAGMATIC PLAY",
            tag: "hot",
            launchUrl: "https://demoplay.pragmaticplay.com/play/vs20olympgate",
            image: "images/slots.png"
          ),
          Game(
            id: "game-2",
            title: "GATES OF OLYMPUS SUPER SCATTER",
            category: "slots",
            provider: "PRAGMATIC PLAY",
            tag: "hot",
            launchUrl: "https://demoplay.pragmaticplay.com/play/vs20olympgate",
            image: "images/slots.png"
          ),
          Game(
            id: "game-3",
            title: "OUT OF THE WOODS",
            category: "slots",
            provider: "PRAGMATIC PLAY",
            tag: "new",
            launchUrl: "https://demoplay.pragmaticplay.com/play/vs20olympgate",
            image: "images/slots.png"
          ),
          Game(
            id: "game-4",
            title: "MONKEYS WILD PARTY",
            category: "slots",
            provider: "PG SOFT",
            tag: "new",
            launchUrl: "https://demoplay.pragmaticplay.com/play/vs20olympgate",
            image: "images/slots.png"
          ),
        ];
        _banners = [
          {
            'title': 'مكافأة الترحيب 150%',
            'subtitle': 'أودع الآن واحصل على ضعف رصيدك فوراً',
            'badge': 'حصري',
            'icon': '🎁',
            'accentR': 0, 'accentG': 230, 'accentB': 118,
            'gradStartR': 13, 'gradStartG': 43, 'gradStartB': 26,
            'gradEndR': 10, 'gradEndG': 61, 'gradEndB': 32,
          },
        ];
        _isLoading = false;
      });
    }
  }

  List<Game> _getFilteredGames() {
    final seenIds = <String>{};
    final uniqueGames = <Game>[];
    for (final game in _games) {
      final key = (game.id.isNotEmpty ? game.id : game.title).trim().toLowerCase();
      if (seenIds.contains(key)) continue;
      seenIds.add(key);
      final matchesSearch = game.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          game.provider.toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesCategory = _selectedCategory == 'all' || game.category == _selectedCategory;
      if (matchesSearch && matchesCategory) {
        uniqueGames.add(game);
      }
    }
    return uniqueGames;
  }

  Color _bannerAccent(int index) {
    final b = _banners[index];
    return Color.fromARGB(255, b['accentR'] as int, b['accentG'] as int, b['accentB'] as int);
  }

  Color _bannerGradStart(int index) {
    final b = _banners[index];
    return Color.fromARGB(255, b['gradStartR'] as int, b['gradStartG'] as int, b['gradStartB'] as int);
  }

  Color _bannerGradEnd(int index) {
    final b = _banners[index];
    return Color.fromARGB(255, b['gradEndR'] as int, b['gradEndG'] as int, b['gradEndB'] as int);
  }

  @override
  Widget build(BuildContext context) {
    final filteredGames = _getFilteredGames();

    return Scaffold(
      backgroundColor: const Color(0xFF10121B),
      body: Stack(
        children: [
          RefreshIndicator(
            onRefresh: _fetchGames,
            color: const Color(0xFFFF7A1F),
            backgroundColor: const Color(0xFF1A1D2E),
            child: TweenAnimationBuilder<double>(
              tween: Tween<double>(begin: 0.0, end: 1.0),
              duration: const Duration(milliseconds: 700),
              curve: Curves.easeOutCubic,
              builder: (context, value, child) {
                return Transform.translate(
                  offset: Offset(0, 30 * (1 - value)),
                  child: Opacity(
                    opacity: value,
                    child: child,
                  ),
                );
              },
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  // ─── Top Category Feature Cards (الكازينو & الرياضة) ───
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.only(left: 16, right: 16, top: 12, bottom: 8),
                      child: Row(
                        children: [
                          // Sports Card (Left)
                          Expanded(
                            child: _buildHeroCategoryCard(
                              title: 'الرياضة',
                              icon: Icons.sports_esports_rounded,
                              gradientColors: [const Color(0xFF1D2235), const Color(0xFF141826)],
                              accentColor: const Color(0xFF3897F0),
                              badgeIcon: '🎮',
                            ),
                          ),
                          const SizedBox(width: 12),
                          // Casino Card (Right)
                          Expanded(
                            child: _buildHeroCategoryCard(
                              title: 'الكازينو',
                              icon: Icons.casino_rounded,
                              gradientColors: [const Color(0xFF2E2218), const Color(0xFF1F1610)],
                              accentColor: const Color(0xFFFF7A1F),
                              badgeIcon: '🎰',
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // ─── Search Bar (ابحث عن الألعاب) ───
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFF1A1D2E),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFF282D45), width: 1.2),
                        ),
                        child: TextField(
                          style: GoogleFonts.cairo(color: Colors.white, fontSize: 13),
                          onChanged: (val) {
                            setState(() {
                              _searchQuery = val;
                            });
                          },
                          decoration: InputDecoration(
                            hintText: 'ابحث عن الألعاب...',
                            hintStyle: GoogleFonts.cairo(color: const Color(0xFF6B7280), fontSize: 13),
                            suffixIcon: const Icon(Icons.search_rounded, color: Color(0xFF6B7280), size: 20),
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                          ),
                        ),
                      ),
                    ),
                  ),

                  // ─── Animated Banner Carousel ───
                  if (_banners.isNotEmpty)
                    SliverToBoxAdapter(
                      child: Column(
                        children: [
                          const SizedBox(height: 8),
                          SizedBox(
                            height: 135,
                            child: PageView.builder(
                              controller: _bannerController,
                              onPageChanged: (i) => setState(() => _currentBanner = i),
                              itemCount: _banners.length,
                              itemBuilder: (context, index) {
                                final accent = _bannerAccent(index);
                                final gradStart = _bannerGradStart(index);
                                final gradEnd = _bannerGradEnd(index);
                                final b = _banners[index];

                                return AnimatedBuilder(
                                  animation: _bannerController,
                                  builder: (context, child) {
                                    double scale = 1.0;
                                    if (_bannerController.hasClients && _bannerController.page != null) {
                                      double delta = (_bannerController.page! - index).abs();
                                      scale = (1 - delta * 0.05).clamp(0.93, 1.0);
                                    }
                                    return Transform.scale(scale: scale, child: child);
                                  },
                                  child: Container(
                                    margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                                    decoration: BoxDecoration(
                                      gradient: LinearGradient(
                                        colors: [gradStart, gradEnd],
                                        begin: Alignment.topLeft,
                                        end: Alignment.bottomRight,
                                      ),
                                      image: (b['image'] != null && (b['image'] as String).isNotEmpty)
                                          ? DecorationImage(
                                              image: CachedNetworkImageProvider(
                                                (b['image'] as String).startsWith('http')
                                                    ? b['image'] as String
                                                    : '${widget.serverUrl}/${b['image']}',
                                              ),
                                              fit: BoxFit.cover,
                                            )
                                          : null,
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(color: accent.withOpacity(0.35), width: 1.2),
                                    ),
                                    child: Padding(
                                      padding: const EdgeInsets.all(16.0),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          if (b['title'] != null && (b['title'] as String).isNotEmpty)
                                            Text(
                                              b['title'] as String,
                                              style: GoogleFonts.cairo(
                                                fontSize: 16,
                                                fontWeight: FontWeight.w900,
                                                color: Colors.white,
                                              ),
                                            ),
                                          if (b['subtitle'] != null && (b['subtitle'] as String).isNotEmpty)
                                            Text(
                                              b['subtitle'] as String,
                                              style: GoogleFonts.cairo(
                                                fontSize: 11,
                                                color: Colors.white70,
                                              ),
                                            ),
                                        ],
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
                          const SizedBox(height: 6),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: List.generate(_banners.length, (i) {
                              final isActive = i == _currentBanner;
                              final dotColor = isActive ? _bannerAccent(_currentBanner) : const Color(0xFF282D45);
                              return AnimatedContainer(
                                duration: const Duration(milliseconds: 300),
                                margin: const EdgeInsets.symmetric(horizontal: 3),
                                width: isActive ? 20 : 6,
                                height: 6,
                                decoration: BoxDecoration(
                                  color: dotColor,
                                  borderRadius: BorderRadius.circular(3),
                                ),
                              );
                            }),
                          ),
                        ],
                      ),
                    ),

                  // ─── Winners Ticker Bar ───
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1A1D2E),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF00E676).withOpacity(0.2), width: 1),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.campaign_rounded, color: Color(0xFF00E676), size: 18),
                            const SizedBox(width: 8),
                            Expanded(
                              child: SizedBox(
                                height: 20,
                                child: PageView.builder(
                                  controller: _pageController,
                                  scrollDirection: Axis.vertical,
                                  itemCount: _winners.length,
                                  itemBuilder: (context, idx) {
                                    final w = _winners[idx];
                                    return RichText(
                                      overflow: TextOverflow.ellipsis,
                                      text: TextSpan(
                                        style: GoogleFonts.cairo(fontSize: 11, color: const Color(0xFFB0B5C0)),
                                        children: [
                                          TextSpan(text: '${w["name"]} ', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                                          const TextSpan(text: 'فاز بـ '),
                                          TextSpan(text: '${w["prize"]} ', style: const TextStyle(color: Color(0xFFFF7A1F), fontWeight: FontWeight.bold)),
                                          TextSpan(text: 'في ${w["game"]}'),
                                        ],
                                      ),
                                    );
                                  },
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // ─── Category Filter Chips ───
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            _buildCategoryChip('الكل', 'all'),
                            const SizedBox(width: 8),
                            _buildCategoryChip('سلوتس', 'slots'),
                            const SizedBox(width: 8),
                            _buildCategoryChip('كازينو مباشر', 'live'),
                            const SizedBox(width: 8),
                            _buildCategoryChip('ألعاب الطاولة', 'table'),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // ─── Section 1: شائع 🔥 (Popular Carousel) ───
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.only(top: 14, left: 16, right: 16),
                      child: _buildHorizontalGameSection(
                        title: 'شائع',
                        emoji: '🔥',
                        games: _games.where((g) {
                          final t = g.tag.toLowerCase().trim();
                          return t == 'hot' || t == 'popular' || t == 'شائع' || g.category.toLowerCase().trim() == 'hot';
                        }).isNotEmpty
                            ? _games.where((g) {
                                final t = g.tag.toLowerCase().trim();
                                return t == 'hot' || t == 'popular' || t == 'شائع' || g.category.toLowerCase().trim() == 'hot';
                              }).toList()
                            : _games.take(6).toList(),
                        badgeText: 'DROPS & WINS',
                        badgeColor: const Color(0xFF141824),
                        hasCrownBadge: true,
                      ),
                    ),
                  ),

                  // ─── Section 2: ألعاب جديدة ⭐ (New Games Carousel) ───
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.only(top: 10, left: 16, right: 16),
                      child: _buildHorizontalGameSection(
                        title: 'ألعاب جديدة',
                        emoji: '⭐',
                        games: _games.where((g) {
                          final t = g.tag.toLowerCase().trim();
                          return t == 'new' || t == 'جديد' || g.category.toLowerCase().trim() == 'new';
                        }).isNotEmpty
                            ? _games.where((g) {
                                final t = g.tag.toLowerCase().trim();
                                return t == 'new' || t == 'جديد' || g.category.toLowerCase().trim() == 'new';
                              }).toList()
                            : _games.skip(2).take(6).toList(),
                        badgeText: 'NEW',
                        badgeColor: const Color(0xFFE53935),
                        hasCrownBadge: false,
                      ),
                    ),
                  ),

                  // ─── Main Games Grid ───
                  _isLoading
                      ? const SliverFillRemaining(
                          child: Center(
                            child: CircularProgressIndicator(
                              valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFFF7A1F)),
                            ),
                          ),
                        )
                      : filteredGames.isEmpty
                          ? SliverFillRemaining(
                              child: Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.sports_esports_outlined, size: 60, color: const Color(0xFFFF7A1F).withOpacity(0.5)),
                                    const SizedBox(height: 10),
                                    Text(
                                      'لا توجد ألعاب مضافة حالياً!',
                                      style: GoogleFonts.cairo(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
                                    ),
                                  ],
                                ),
                              ),
                            )
                          : SliverPadding(
                              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12),
                              sliver: SliverGrid(
                                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: 2,
                                  childAspectRatio: 0.80,
                                  crossAxisSpacing: 14,
                                  mainAxisSpacing: 14,
                                ),
                                delegate: SliverChildBuilderDelegate(
                                  (context, idx) {
                                    final game = filteredGames[idx];
                                    return _buildGameCard(game, idx);
                                  },
                                  childCount: filteredGames.length,
                                ),
                              ),
                            ),
                  const SliverToBoxAdapter(
                    child: SizedBox(height: 80),
                  ),
                ],
              ),
            ),
          ),

          // ─── Floating Cookie / Promo Banner (Matching Screenshot Bottom) ───
          if (!_acceptedCookies)
            Positioned(
              bottom: 12,
              left: 16,
              right: 16,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 400),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF1A1D2E).withOpacity(0.96),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF282D45), width: 1.2),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.5),
                      blurRadius: 20,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    ElevatedButton(
                      onPressed: () {
                        setState(() {
                          _acceptedCookies = true;
                        });
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFFFC107),
                        foregroundColor: const Color(0xFF10121B),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                        elevation: 0,
                      ),
                      child: Text(
                        'قبول',
                        style: GoogleFonts.cairo(
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'نستخدم ملفات تعريف الارتباط لأغراض الوظائف والتطبيقات.',
                        style: GoogleFonts.cairo(
                          fontSize: 10.5,
                          color: Colors.white70,
                          height: 1.3,
                        ),
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

  Widget _buildHeroCategoryCard({
    required String title,
    required IconData icon,
    required List<Color> gradientColors,
    required Color accentColor,
    required String badgeIcon,
  }) {
    return Container(
      height: 75,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: gradientColors,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: accentColor.withOpacity(0.3), width: 1),
        boxShadow: [
          BoxShadow(
            color: accentColor.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            badgeIcon,
            style: const TextStyle(fontSize: 28),
          ),
          Text(
            title,
            style: GoogleFonts.cairo(
              fontSize: 15,
              fontWeight: FontWeight.w900,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryChip(String label, String value) {
    final isSelected = _selectedCategory == value;
    return InkWell(
      onTap: () {
        setState(() {
          _selectedCategory = value;
        });
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFFF7A1F) : const Color(0xFF1A1D2E),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? const Color(0xFFFF7A1F) : const Color(0xFF282D45),
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.cairo(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
            color: isSelected ? const Color(0xFF10121B) : const Color(0xFF8B909E),
          ),
        ),
      ),
    );
  }

  Widget _buildHorizontalGameSection({
    required String title,
    required String emoji,
    required List<Game> games,
    required String badgeText,
    required Color badgeColor,
    required bool hasCrownBadge,
  }) {
    if (games.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header Row: Title on right, controls on left
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Text(
                  title,
                  style: GoogleFonts.cairo(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(width: 6),
                Text(emoji, style: const TextStyle(fontSize: 16)),
              ],
            ),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1A1D2E),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFF282D45)),
                  ),
                  child: const Icon(Icons.chevron_left_rounded, size: 16, color: Colors.white70),
                ),
                const SizedBox(width: 6),
                GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedCategory = title.contains('شائع') ? 'hot' : 'all';
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1A1D2E),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFF282D45)),
                    ),
                    child: Text(
                      'الكل',
                      style: GoogleFonts.cairo(fontSize: 11, color: Colors.white70, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1A1D2E),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFF282D45)),
                  ),
                  child: const Icon(Icons.chevron_right_rounded, size: 16, color: Colors.white70),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 12),
        // Horizontal Scroll Cards
        SizedBox(
          height: 185,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: games.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final game = games[index];
              return TweenAnimationBuilder<double>(
                tween: Tween<double>(begin: 0.0, end: 1.0),
                duration: Duration(milliseconds: 400 + (index * 100)),
                curve: Curves.easeOutCubic,
                builder: (context, val, child) {
                  return Transform.scale(
                    scale: 0.85 + (0.15 * val),
                    child: Opacity(opacity: val, child: child),
                  );
                },
                child: GestureDetector(
                  onTap: () => widget.onPlayGame(game),
                  child: Container(
                    width: 125,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFFF7A1F).withOpacity(0.3), width: 1.2),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.4),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Stack(
                        children: [
                          Positioned.fill(
                            child: CachedNetworkImage(
                              imageUrl: game.image.startsWith('http') ? game.image : '${widget.serverUrl}/${game.image}',
                              fit: BoxFit.cover,
                              errorWidget: (_, __, ___) => Container(color: const Color(0xFF1A1D2E)),
                            ),
                          ),
                          // Badge top right (DROPS & WINS / HOT / NEW)
                          Positioned(
                            top: 8,
                            right: 8,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                              decoration: BoxDecoration(
                                color: badgeColor.withOpacity(0.9),
                                borderRadius: BorderRadius.circular(hasCrownBadge ? 20 : 6),
                                border: Border.all(color: Colors.white.withOpacity(0.2), width: 0.8),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (hasCrownBadge) const Text('👑 ', style: TextStyle(fontSize: 8)),
                                  Text(
                                    badgeText,
                                    style: GoogleFonts.cairo(
                                      fontSize: 8.5,
                                      fontWeight: FontWeight.w900,
                                      color: Colors.white,
                                      height: 1.1,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          // Bottom Title & Provider Overlay
                          Positioned(
                            bottom: 0,
                            left: 0,
                            right: 0,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.bottomCenter,
                                  end: Alignment.topCenter,
                                  colors: [
                                    Colors.black.withOpacity(0.95),
                                    Colors.transparent,
                                  ],
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.center,
                                children: [
                                  Text(
                                    game.title,
                                    maxLines: 2,
                                    textAlign: TextAlign.center,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.cairo(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w900,
                                      color: Colors.white,
                                      height: 1.1,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    game.provider.isNotEmpty ? game.provider : 'PG SOFT',
                                    style: GoogleFonts.cairo(
                                      fontSize: 8.5,
                                      fontWeight: FontWeight.w800,
                                      color: const Color(0xFFFF7A1F),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildGameCard(Game game, int index) {
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0.0, end: 1.0),
      duration: Duration(milliseconds: 350 + (index % 6 * 80)),
      curve: Curves.easeOutCubic,
      builder: (context, val, child) {
        return Transform.translate(
          offset: Offset(0, 20 * (1 - val)),
          child: Opacity(opacity: val, child: child),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF1A1D2E),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFF282D45), width: 1),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.4),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    CachedNetworkImage(
                      imageUrl: game.image.startsWith('http') ? game.image : '${widget.serverUrl}/${game.image}',
                      fit: BoxFit.cover,
                      errorWidget: (_, __, ___) => Container(
                        color: const Color(0xFF141826),
                        child: Center(
                          child: Text(
                            game.title.isNotEmpty ? game.title.substring(0, 1) : '?',
                            style: GoogleFonts.cairo(fontSize: 24, color: const Color(0xFFFF7A1F)),
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.75),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          game.provider,
                          style: GoogleFonts.cairo(fontSize: 9, color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    game.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.cairo(
                      color: Colors.white,
                      fontSize: 11.5,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    height: 32,
                    child: ElevatedButton(
                      onPressed: () => widget.onPlayGame(game),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFFF7A1F),
                        foregroundColor: const Color(0xFF10121B),
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        padding: EdgeInsets.zero,
                      ),
                      child: Text(
                        'العب الآن',
                        style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.w900),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
