import 'package:flutter/material';
import 'package:google_fonts/google_fonts.dart';
import 'screens/splash_screen.dart';
import 'screens/home_screen.dart';
import 'screens/wallet_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/game_play_screen.dart';
import 'models/game.dart';

void main() {
  runApp(const MasoudiApp());
}

class MasoudiApp extends StatelessWidget {
  const MasoudiApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'منصة مسعودي للألعاب',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF030508),
        primaryColor: const Color(0xFFD4AF37),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFD4AF37),
          secondary: Color(0xFFFFDF00),
          background: Color(0xFF030508),
        ),
      ),
      initialRoute: '/',
      routes: {
        '/': (context) => const SplashScreen(),
        '/main': (context) => const MainTabControllerScreen(),
      },
    );
  }
}

class MainTabControllerScreen extends StatefulWidget {
  const MainTabControllerScreen({Key? key}) : super(key: key);

  @override
  _MainTabControllerScreenState createState() => _MainTabControllerScreenState();
}

class _MainTabControllerScreenState extends State<MainTabControllerScreen> {
  int _currentIndex = 0;
  
  // App Config - Connects to the computer's Vite API server
  final String _serverUrl = 'http://10.138.174.195:5173';
  final String _playerId = '879204';

  // Shared State
  double _playerBalance = 250500.00;
  double _primaryBalance = 240000.00;
  double _bonusBalance = 10500.00;

  final List<Map<String, dynamic>> _transactions = [
    { 'id': "TX-99837", 'type': "إيداع", 'amount': "+5,000 ر.س", 'date': "اليوم، 12:45 ص", 'status': "ناجحة" },
    { 'id': "TX-99712", 'type': "لعب (سلوتس API)", 'amount': "-1,200 ر.س", 'date': "أمس، 08:30 م", 'status': "ناجحة" },
    { 'id': "TX-99645", 'type': "سحب", 'amount': "-10,000 ر.س", 'date': "أمس، 02:15 م", 'status': "ناجحة" },
    { 'id': "TX-99501", 'type': "إيداع", 'amount': "+25,000 ر.س", 'date': "02 يوليو 2026", 'status': "ناجحة" }
  ];

  void _executeTransaction(double amount, String type) {
    setState(() {
      final txId = "TX-${10000 + (amount.toInt() % 90000) + (DateTime.now().millisecond % 99)}";
      if (type == 'deposit') {
        _playerBalance += amount;
        _primaryBalance += amount;
        _transactions.insert(0, {
          'id': txId,
          'type': 'إيداع سريع',
          'amount': '+${amount.toLocaleString()} ر.س',
          'date': 'الآن',
          'status': 'ناجحة'
        });
      } else if (type == 'withdraw') {
        _playerBalance -= amount;
        _primaryBalance -= amount;
        _transactions.insert(0, {
          'id': txId,
          'type': 'سحب سريع',
          'amount': '-${amount.toLocaleString()} ر.س',
          'date': 'الآن',
          'status': 'ناجحة'
        });
      }
    });
  }

  void _playGame(Game game) async {
    final result = await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => GamePlayScreen(
          game: game,
          balance: _playerBalance,
          playerId: _playerId,
          serverUrl: _serverUrl,
        ),
      ),
    );

    if (result != null && result is double) {
      setState(() {
        _playerBalance = result;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> screens = [
      HomeScreen(
        serverUrl: _serverUrl,
        balance: _playerBalance,
        onPlayGame: _playGame,
      ),
      WalletScreen(
        balance: _playerBalance,
        primaryBalance: _primaryBalance,
        bonusBalance: _bonusBalance,
        transactions: _transactions,
        onTransactionExecuted: _executeTransaction,
      ),
      ProfileScreen(
        onLogout: () {
          Navigator.of(context).pushReplacementNamed('/');
        },
      ),
    ];

    return Scaffold(
      // Top profile header simulating the HTML layout
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(80),
        child: Container(
          padding: const EdgeInsets.only(top: 35, left: 16, right: 16, bottom: 8),
          decoration: BoxDecoration(
            color: const Color(0xFF0C121E).withOpacity(0.9),
            border: const Border(
              bottom: BorderSide(color: Color(0xFFD4AF37), width: 1),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.between,
            children: [
              // Profile Section
              Row(
                children: [
                  Stack(
                    alignment: Alignment.bottomRight,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(1.5),
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: Color(0xFFD4AF37),
                        ),
                        child: const CircleAvatar(
                          radius: 20,
                          backgroundColor: Color(0xFF131A26),
                          child: Icon(Icons.person, size: 22, color: Color(0xFFD4AF37)),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.all(2),
                        decoration: const BoxDecoration(
                          color: Color(0xFFD4AF37),
                          shape: BoxShape.circle,
                        ),
                        child: const Text(
                          '1',
                          style: TextStyle(fontSize: 7, fontWeight: FontWeight.bold, color: Colors.black),
                        ),
                      )
                    ],
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Row(
                        children: [
                          Text(
                            'أحمد الحربي',
                            style: GoogleFonts.cairo(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFD4AF37).withOpacity(0.12),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFFD4AF37).withOpacity(0.4), width: 0.5),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.diamond_rounded, size: 8, color: Color(0xFFD4AF37)),
                                const SizedBox(width: 3),
                                Text(
                                  'رتبة 1',
                                  style: GoogleFonts.cairo(fontSize: 8, color: const Color(0xFFD4AF37), fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          )
                        ],
                      ),
                      Text(
                        'رقم اللاعب: #$_playerId',
                        style: GoogleFonts.cairo(
                          fontSize: 9,
                          color: Colors.white38,
                        ),
                      )
                    ],
                  )
                ],
              ),

              // Balance Display
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'الرصيد الحالي',
                    style: GoogleFonts.cairo(fontSize: 9, color: Colors.white38),
                  ),
                  Text(
                    '${_playerBalance.toLocaleString()} ر.س',
                    style: GoogleFonts.cairo(
                      fontSize: 15,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFFD4AF37),
                    ),
                  )
                ],
              )
            ],
          ),
        ),
      ),
      body: screens[_currentIndex],

      // Navigation Bar
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(
            top: BorderSide(color: Color(0xFFD4AF37), width: 0.5),
          ),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          backgroundColor: const Color(0xFF0C121E).withOpacity(0.95),
          selectedItemColor: const Color(0xFFD4AF37),
          unselectedItemColor: Colors.white24,
          selectedLabelStyle: GoogleFonts.cairo(fontSize: 10, fontWeight: FontWeight.bold),
          unselectedLabelStyle: GoogleFonts.cairo(fontSize: 10, fontWeight: FontWeight.normal),
          onTap: (index) {
            setState(() {
              _currentIndex = index;
            });
          },
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined),
              activeIcon: Icon(Icons.home_filled),
              label: 'الرئيسية',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.account_balance_wallet_outlined),
              activeIcon: Icon(Icons.account_balance_wallet_rounded),
              label: 'المحفظة',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_outline),
              activeIcon: Icon(Icons.person),
              label: 'حسابي',
            ),
          ],
        ),
      ),
    );
  }
}
