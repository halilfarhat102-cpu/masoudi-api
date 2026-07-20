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

class _HomeScreenState extends State<HomeScreen> {
  List<Game> _games = [];
  bool _isLoading = true;
  String _searchQuery = '';
  String _selectedCategory = 'all';

  late final PageController _pageController = PageController();
  late final PageController _bannerController = PageController();
  Timer? _marqueeTimer;
  Timer? _bannerTimer;
  int _currentPage = 0;
  int _currentBanner = 0;

  List<Map<String, dynamic>> _banners = [
    {
      'title': 'مكافأة الترحيب 150%',
      'subtitle': 'أودع الآن واحصل على ضعف رصيدك فوراً',
      'badge': 'حصري',
      'icon': '🎁',
      'accentR': 0,
      'accentG': 230,
      'accentB': 118,
      'gradStartR': 13,
      'gradStartG': 43,
      'gradStartB': 26,
      'gradEndR': 10,
      'gradEndG': 61,
      'gradEndB': 32,
    },
    {
      'title': 'جاكبوت روليت البرق',
      'subtitle': 'الجائزة الكبرى تصل إلى 500,000 ر.س 🪙',
      'badge': 'مباشر',
      'icon': '🎰',
      'accentR': 124,
      'accentG': 77,
      'accentB': 255,
      'gradStartR': 21,
      'gradStartG': 13,
      'gradStartB': 46,
      'gradEndR': 27,
      'gradEndG': 16,
      'gradEndB': 64,
    },
    {
      'title': 'بطولة الأسبوع VIP',
      'subtitle': 'المركز الأول يربح 25,000 ر.س 🪙',
      'badge': 'جديد',
      'icon': '🏆',
      'accentR': 245,
      'accentG': 194,
      'accentB': 49,
      'gradStartR': 42,
      'gradStartG': 28,
      'gradStartB': 0,
      'gradEndR': 61,
      'gradEndG': 40,
      'gradEndB': 0,
    },
  ];

  final List<Map<String, String>> _winners = [
    {"name": "خالد المري", "prize": "15,000 ر.س 🪙", "game": "روليت البرق"},
    {"name": "أبو فهد", "prize": "8,500 ر.س 🪙", "game": "فتحات أوليمبوس"},
    {"name": "سارة الدوسري", "prize": "32,000 ر.س 🪙", "game": "بلاك جاك مسعودي"},
    {"name": "سلطان العتيبي", "prize": "6,200 ر.س 🪙", "game": "سلوتس كليوباترا"}
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
    // 1. Try to load from cache first for instant display
    if (ApiCache.data != null) {
      final decoded = ApiCache.data!;
      final List<dynamic> gamesList = decoded['games'] ?? [];
      final List<dynamic> bannersList = decoded['banners'] ?? [];
      _games = gamesList.map((g) => Game.fromJson(g)).toList();
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
        ApiCache.data = decoded; // Update Cache
        final List<dynamic> gamesList = decoded['games'] ?? [];
        final List<dynamic> bannersList = decoded['banners'] ?? [];
        setState(() {
          _games = gamesList.map((g) => Game.fromJson(g)).toList();
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
      setState(() {
        _games = [
          Game(
            id: "game-1",
            title: "روليت البرق (Lightning Roulette)",
            category: "live",
            provider: "Evolution Gaming",
            launchUrl: "https://v1.evolution.com/lightning-roulette-demo",
            image: "images/roulette.png"
          ),
          Game(
            id: "game-2",
            title: "فتحات بوابات أوليمبوس (Gates of Olympus)",
            category: "slots",
            provider: "Pragmatic Play",
            launchUrl: "https://demoplay.pragmaticplay.com/play/vs20olympgate",
            image: "images/slots.png"
          )
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
          {
            'title': 'جاكبوت روليت البرق',
            'subtitle': 'الجائزة الكبرى تصل إلى 500,000 \$',
            'badge': 'مباشر',
            'icon': '🎰',
            'accentR': 124, 'accentG': 77, 'accentB': 255,
            'gradStartR': 21, 'gradStartG': 13, 'gradStartB': 46,
            'gradEndR': 27, 'gradEndG': 16, 'gradEndB': 64,
          },
          {
            'title': 'بطولة الأسبوع VIP',
            'subtitle': 'المركز الأول يربح 25,000 \$ نقداً',
            'badge': 'جديد',
            'icon': '🏆',
            'accentR': 245, 'accentG': 194, 'accentB': 49,
            'gradStartR': 42, 'gradStartG': 28, 'gradStartB': 0,
            'gradEndR': 61, 'gradEndG': 40, 'gradEndB': 0,
          }
        ];
        _isLoading = false;
      });
    }
  }

  List<Game> _getFilteredGames() {
    return _games.where((game) {
      final matchesSearch = game.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          game.provider.toLowerCase().contains(_searchQuery.toLowerCase());
      final tagLower = game.tag.toLowerCase().trim();
      final matchesCategory = _selectedCategory == 'all' ||
          game.category == _selectedCategory ||
          (_selectedCategory == 'hot' && (tagLower == 'hot' || tagLower == 'popular' || game.tag == 'شائع' || game.category == 'hot'));
      return matchesSearch && matchesCategory;
    }).toList();
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

    return RefreshIndicator(
      onRefresh: _fetchGames,
      color: const Color(0xFFFF7A1F),
      backgroundColor: const Color(0xFF291B15),
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          // ─── Animated Promo Banner ───────────────────────────────────
          SliverToBoxAdapter(
            child: Column(
              children: [
                const SizedBox(height: 12),
                SizedBox(
                  height: 138,
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
                            borderRadius: BorderRadius.circular(22),
                            border: Border.all(
                              color: accent.withOpacity(0.35),
                              width: 1.2,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: accent.withOpacity(0.18),
                                blurRadius: 22,
                                offset: const Offset(0, 8),
                              ),
                            ],
                          ),
                          child: Stack(
                            children: [
                              // Decorative circle top-right (only if no image background)
                              if (b['image'] == null || (b['image'] as String).isEmpty)
                                Positioned(
                                  right: -18,
                                  top: -22,
                                  child: Container(
                                    width: 110,
                                    height: 110,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: accent.withOpacity(0.07),
                                    ),
                                  ),
                                ),
                              // Decorative circle bottom-right (only if no image background)
                              if (b['image'] == null || (b['image'] as String).isEmpty)
                                Positioned(
                                  right: 20,
                                  bottom: -28,
                                  child: Container(
                                    width: 70,
                                    height: 70,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: accent.withOpacity(0.05),
                                    ),
                                  ),
                                ),
                              // Content (only if no image background)
                              if (b['image'] == null || (b['image'] as String).isEmpty)
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                                  child: Row(
                                    children: [
                                      // Text column
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            // Badge
                                            if (b['badge'] != null && (b['badge'] as String).trim().isNotEmpty) ...[
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                                                decoration: BoxDecoration(
                                                  color: accent.withOpacity(0.18),
                                                  borderRadius: BorderRadius.circular(6),
                                                  border: Border.all(color: accent.withOpacity(0.45), width: 0.8),
                                                ),
                                                child: Text(
                                                  b['badge'] as String,
                                                  style: GoogleFonts.cairo(
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.w800,
                                                    color: accent,
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(height: 8),
                                            ],
                                            // Title
                                            if (b['title'] != null && (b['title'] as String).trim().isNotEmpty) ...[
                                              Text(
                                                b['title'] as String,
                                                style: GoogleFonts.cairo(
                                                  fontSize: 16,
                                                  fontWeight: FontWeight.w900,
                                                  color: Colors.white,
                                                  height: 1.2,
                                                ),
                                              ),
                                              const SizedBox(height: 5),
                                            ],
                                            // Subtitle
                                            if (b['subtitle'] != null && (b['subtitle'] as String).trim().isNotEmpty)
                                              Text(
                                                b['subtitle'] as String,
                                                maxLines: 2,
                                                style: GoogleFonts.cairo(
                                                  fontSize: 10.5,
                                                  color: const Color(0xFF8B909E),
                                                  height: 1.4,
                                                ),
                                              ),
                                          ],
                                        ),
                                      ),

                                    ],
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),

                // Dot indicators
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(_banners.length, (i) {
                    final isActive = i == _currentBanner;
                    final dotColor = isActive ? _bannerAccent(_currentBanner) : const Color(0xFF3D2A20);
                    return AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeInOut,
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      width: isActive ? 22 : 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: dotColor,
                        borderRadius: BorderRadius.circular(3),
                        boxShadow: isActive
                            ? [BoxShadow(color: dotColor.withOpacity(0.5), blurRadius: 6)]
                            : [],
                      ),
                    );
                  }),
                ),
                const SizedBox(height: 10),
              ],
            ),
          ),

          // ─── Search + Winners + Categories ──────────────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Search Bar
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFF291B15),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFF3D2A20), width: 1),
                    ),
                    child: TextField(
                      style: GoogleFonts.cairo(color: Colors.white, fontSize: 13),
                      onChanged: (val) {
                        setState(() {
                          _searchQuery = val;
                        });
                      },
                      decoration: InputDecoration(
                        hintText: 'ابحث عن لعبتك المفضلة...',
                        hintStyle: GoogleFonts.cairo(color: const Color(0xFF6B7080), fontSize: 13),
                        prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF6B7080)),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  // Winners ticker
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF291B15),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF00E676).withOpacity(0.2), width: 1),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.campaign, color: Color(0xFF00E676), size: 20),
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
                                    style: GoogleFonts.cairo(fontSize: 12, color: const Color(0xFFB0B5C0)),
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
                  const SizedBox(height: 16),
                  // Categories filter
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildCategoryChip('الكل', 'all'),
                        const SizedBox(width: 8),
                        _buildCategoryChip('🔥 الشائع', 'hot'),
                        const SizedBox(width: 8),
                        _buildCategoryChip('سلوتس', 'slots'),
                        const SizedBox(width: 8),
                        _buildCategoryChip('كازينو مباشر', 'live'),
                        const SizedBox(width: 8),
                        _buildCategoryChip('ألعاب الطاولة', 'table'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 15),
                ],
              ),
            ),
          ),

          // ─── Games Grid ──────────────────────────────────────────────
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
                            Text(
                              'اسحب للأسفل لتحديث الصفحة أو أضفها من لوحة التحكم.',
                              style: GoogleFonts.cairo(fontSize: 12, color: Colors.white30),
                            ),
                          ],
                        ),
                      ),
                    )
                  : SliverPadding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0),
                      sliver: SliverGrid(
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          childAspectRatio: 0.82,
                          crossAxisSpacing: 16,
                          mainAxisSpacing: 16,
                        ),
                        delegate: SliverChildBuilderDelegate(
                          (context, idx) {
                            final game = filteredGames[idx];
                            return _buildGameCard(game);
                          },
                          childCount: filteredGames.length,
                        ),
                      ),
                    ),
          const SliverToBoxAdapter(
            child: SizedBox(height: 30),
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
          color: isSelected ? const Color(0xFFFF7A1F) : const Color(0xFF291B15),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? const Color(0xFFFF7A1F) : const Color(0xFF3D2A20),
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.cairo(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
            color: isSelected ? const Color(0xFF1A110D) : const Color(0xFF8B909E),
          ),
        ),
      ),
    );
  }

  Widget _buildGameCard(Game game) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF291B15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF3D2A20), width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.4),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Cover Image
          Expanded(
            child: ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Container(
                    color: const Color(0xFF221711),
                    child: Center(
                      child: Icon(
                        game.category == 'slots' ? Icons.casino_outlined : Icons.live_tv_rounded,
                        size: 40,
                        color: const Color(0xFFFF7A1F).withOpacity(0.25),
                      ),
                    ),
                  ),
                  CachedNetworkImage(
                    imageUrl: game.image.startsWith('http') ? game.image : '${widget.serverUrl}/${game.image}',
                    fit: BoxFit.cover,
                    placeholder: (context, url) => Container(
                      color: const Color(0xFF221711),
                      child: const Center(
                        child: SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFFF7A1F)),
                          ),
                        ),
                      ),
                    ),
                    errorWidget: (context, url, error) => Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [Color(0xFF302018), Color(0xFF1F1510)],
                        ),
                      ),
                      child: Center(
                        child: Text(
                          game.title.isNotEmpty ? game.title.substring(0, 1) : '?',
                          style: GoogleFonts.cairo(fontSize: 28, fontWeight: FontWeight.bold, color: const Color(0xFFFF7A1F)),
                        ),
                      ),
                    ),
                  ),
                  // Provider tag
                  Positioned(
                    top: 10,
                    right: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.7),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        game.provider,
                        style: GoogleFonts.cairo(fontSize: 9, color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  // Game Tag badge overlay (🔥 شائع / ✨ جديد / 👑 VIP)
                  if (game.tag.isNotEmpty)
                    Positioned(
                      top: 10,
                      left: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: (game.tag.toLowerCase() == 'hot' || game.tag.toLowerCase() == 'popular' || game.tag == 'شائع')
                              ? const Color(0xFFFF3D00).withOpacity(0.95)
                              : ((game.tag.toLowerCase() == 'new' || game.tag == 'جديد')
                                  ? const Color(0xFF00E676).withOpacity(0.95)
                                  : const Color(0xFFFFD700).withOpacity(0.95)),
                          borderRadius: BorderRadius.circular(6),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.3),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Text(
                          (game.tag.toLowerCase() == 'hot' || game.tag.toLowerCase() == 'popular' || game.tag == 'شائع')
                              ? '🔥 شائع'
                              : ((game.tag.toLowerCase() == 'new' || game.tag == 'جديد') ? '✨ جديد' : '👑 ${game.tag}'),
                          style: GoogleFonts.cairo(
                            fontSize: 9,
                            color: (game.tag.toLowerCase() == 'hot' || game.tag.toLowerCase() == 'popular' || game.tag == 'شائع') ? Colors.white : Colors.black,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),

          // Details & Play Button
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  game.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.cairo(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  game.category,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.cairo(
                    color: const Color(0xFF8B909E),
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  height: 34,
                  child: ElevatedButton(
                    onPressed: () => widget.onPlayGame(game),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFFF7A1F),
                      foregroundColor: const Color(0xFF1A110D),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: EdgeInsets.zero,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'العب الآن',
                          style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(width: 6),
                        const Icon(Icons.play_arrow_rounded, size: 14),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
