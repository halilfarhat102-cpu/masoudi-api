import 'dart:convert';
import 'package:flutter/material';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import '../models/game.dart';

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

  final List<Map<String, String>> _winners = [
    { "name": "خالد المري", "prize": "15,000 ر.س", "game": "روليت البرق" },
    { "name": "أبو فهد", "prize": "8,500 ر.س", "game": "فتحات أوليمبوس" },
    { "name": "سارة الدوسري", "prize": "32,000 ر.س", "game": "بلاك جاك مسعودي" },
    { "name": "سلطان العتيبي", "prize": "6,200 ر.س", "game": "سلوتس كليوباترا" }
  ];

  @override
  void initState() {
    super.initState();
    _fetchGames();
  }

  Future<void> _fetchGames() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
    });

    try {
      final response = await http.get(Uri.parse('${widget.serverUrl}/api/data')).timeout(
        const Duration(seconds: 4),
      );

      if (response.statusCode == 200) {
        final decoded = json.decode(response.body);
        final List<dynamic> gamesList = decoded['games'] ?? [];
        setState(() {
          _games = gamesList.map((g) => Game.fromJson(g)).toList();
          _isLoading = false;
        });
      } else {
        throw Exception("Server returned ${response.statusCode}");
      }
    } catch (e) {
      print("Error fetching games from API: $e. Falling back to default static games.");
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
          ),
          Game(
            id: "game-3",
            title: "مزرعة الحيوانات الكبيرة (Big Farm)",
            category: "slots",
            provider: "مسعودي Games",
            launchUrl: "assets/game/game.html",
            image: "assets/game/big_farm_icon.png"
          )
        ];
        _isLoading = false;
      });
    }
  }

  List<Game> _getFilteredGames() {
    return _games.where((game) {
      final matchesSearch = game.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          game.provider.toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesCategory = _selectedCategory == 'all' || game.category == _selectedCategory;
      return matchesSearch && matchesCategory;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final filteredGames = _getFilteredGames();

    return RefreshIndicator(
      onRefresh: _fetchGames,
      color: const Color(0xFFD4AF37),
      backgroundColor: const Color(0xFF0C121E),
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          // Header Bar
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Search Bar
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFF0C121E).withOpacity(0.6),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFD4AF37).withOpacity(0.2)),
                    ),
                    child: TextField(
                      style: GoogleFonts.cairo(color: Colors.white, fontSize: 13),
                      onChanged: (val) {
                        setState(() {
                          _searchQuery = val;
                        });
                      },
                      decoration: InputDecoration(
                        hintText: 'ابحث عن لعبتك المفضلة أو الموفر...',
                        hintStyle: GoogleFonts.cairo(color: Colors.white38, fontSize: 13),
                        prefixIcon: const Icon(Icons.search, color: Color(0xFFD4AF37)),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  // Winners ticker marquee simulator
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0C121E).withOpacity(0.4),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.emerald.withOpacity(0.15)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.campaign, color: Colors.emerald, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: SizedBox(
                            height: 20,
                            child: PageView.builder(
                              scrollDirection: Axis.vertical,
                              autoplay: true,
                              itemCount: _winners.length,
                              itemBuilder: (context, idx) {
                                final w = _winners[idx];
                                return RichText(
                                  overflow: TextOverflow.ellipsis,
                                  text: TextSpan(
                                    style: GoogleFonts.cairo(fontSize: 12, color: Colors.white70),
                                    children: [
                                      TextSpan(text: '${w["name"]} ', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                                      const TextSpan(text: 'فاز بـ '),
                                      TextSpan(text: '${w["prize"]} ', style: const TextStyle(color: Color(0xFFD4AF37), fontWeight: FontWeight.bold)),
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
                  const SizedBox(height: 20),
                  // Categories filter
                  SingleChildScrollView(
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
                  const SizedBox(height: 15),
                ],
              ),
            ),
          ),

          // Games Grid
          _isLoading
              ? const SliverFillRemaining(
                  child: Center(
                    child: CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFD4AF37)),
                    ),
                  ),
                )
              : filteredGames.isEmpty
                  ? SliverFillRemaining(
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.sports_esports_outlined, size: 60, color: const Color(0xFFD4AF37).withOpacity(0.5)),
                            const SizedBox(height: 10),
                            Text(
                              'لا توجد ألعاب مضافة حالياً!',
                              style: GoogleFonts.cairo(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
                            ),
                            Text(
                              'اسحب للأسفل لتحديث الصفحة أو أضفها من لوحة التحكم.',
                              style: GoogleFonts.cairo(fontSize: 12, color: Colors.white38),
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
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFD4AF37) : const Color(0xFF0C121E).withOpacity(0.6),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? const Color(0xFFFFDF00) : const Color(0xFFD4AF37).withOpacity(0.15),
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.cairo(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
            color: isSelected ? const Color(0xFF030508) : Colors.white,
          ),
        ),
      ),
    );
  }

  Widget _buildGameCard(Game game) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0C121E).withOpacity(0.6),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFD4AF37).withOpacity(0.15)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 5),
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
                  // Placeholder for dynamic image since local files are served on Vite
                  Container(
                    color: const Color(0xFF131A26),
                    child: Center(
                      child: Icon(
                        game.category == 'slots' ? Icons.casino_outlined : Icons.live_tv_rounded,
                        size: 40,
                        color: const Color(0xFFD4AF37).withOpacity(0.3),
                      ),
                    ),
                  ),
                  // Cover Image overlay
                  game.image.startsWith('assets/')
                      ? Image.asset(
                          game.image,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return Container(
                              color: const Color(0xFF131A26),
                              child: const Center(
                                child: Icon(Icons.broken_image, color: Colors.white24, size: 40),
                              ),
                            );
                          },
                        )
                      : Image.network(
                          game.image.startsWith('http')
                              ? game.image
                              : '${widget.serverUrl}/${game.image}',
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            // fallback to a nice color block
                            return Container(
                              decoration: const BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                  colors: [
                                    Color(0xFF16222F),
                                    Color(0xFF0F1722),
                                  ],
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  game.title.isNotEmpty ? game.title.substring(0, 1) : 'G',
                                  style: GoogleFonts.cairo(fontSize: 28, fontWeight: FontWeight.bold, color: const Color(0xFFD4AF37)),
                                ),
                              ),
                            );
                          },
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
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  height: 34,
                  child: ElevatedButton(
                    onPressed: () => widget.onPlayGame(game),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFD4AF37).withOpacity(0.12),
                      foregroundColor: const Color(0xFFD4AF37),
                      side: const BorderSide(color: Color(0xFFD4AF37), width: 1),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      elevation: 0,
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

// Simulated PageView autoplay extension
extension PageViewAutoplay on PageView {
  // simple helper to avoid external controller dependencies
}
