import 'dart:math';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/services.dart';
import 'screens/splash_screen.dart';
import 'screens/home_screen.dart';
import 'screens/wallet_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/game_play_screen.dart';
import 'screens/game_preview_screen.dart';
import 'models/game.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'utils/formatters.dart';


void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await Firebase.initializeApp();
  } catch (e) {
    debugPrint("Firebase initialization failed: $e");
  }
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
        scaffoldBackgroundColor: const Color(0xFF1A110D),
        primaryColor: const Color(0xFFFF7A1F),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFFF7A1F),
          secondary: Color(0xFFD45A00),
          background: Color(0xFF1A110D),
          surface: Color(0xFF291B15),
        ),
        cardColor: const Color(0xFF291B15),
        dividerColor: const Color(0xFF3D2A20),
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
  final String _serverUrl = 'https://masoudi-api.onrender.com';
  String get _playerId {
    if (!_isLoggedIn) return '879204';
    if (RegExp(r'^\d{6}$').hasMatch(_playerName)) {
      return _playerName;
    }
    final key = (_playerEmail.contains('@')) ? _playerEmail : _playerName;
    int hash = 0;
    for (int i = 0; i < key.length; i++) {
      hash = key.codeUnitAt(i) + ((hash << 5) - hash);
    }
    final int finalId = 100000 + (hash.abs() % 900000);
    return finalId.toString();
  }

  // Google Sign-In state
  bool _isLoggedIn = false;
  String _playerName = 'زائر مسعودي';   // رقم المعرّف الفريد (6 أرقام)
  String _playerRealName = 'زائر مسعودي'; // الاسم الحقيقي للاعب
  String? _pendingRealName; // مؤقت: يحفظ الاسم قبل _ensureUserHasNumericId
  String _playerEmail = 'لا يوجد بريد مرتبط';
  String? _googleAvatarUrl;
  bool _isAgent = false;
  bool _isAdmin = false;

  // UI Preview Settings
  bool _enablePreview = true;
  String _playButtonText = 'العب الآن';
  bool _showBalance = true;
  bool _showLiveBadge = true;

  final GoogleSignIn _googleSignIn = GoogleSignIn(scopes: ['email']);

  Timer? _syncTimer;

  void _startSyncTimer() {
    _syncTimer?.cancel();
    _syncTimer = Timer.periodic(const Duration(seconds: 15), (timer) {
      if (_isLoggedIn) {
        _syncPlayerWithServer();
      }
    });
  }

  void _stopSyncTimer() {
    _syncTimer?.cancel();
    _syncTimer = null;
  }

  @override
  void initState() {
    super.initState();
    _loadSettingsFromServer();
    FirebaseAuth.instance.authStateChanges().listen((User? user) async {
      if (user != null) {
        // ─── الاسم الحقيقي من مزود الهوية (Google) ───
        // user.displayName قد يُستبدل برقم المعرّف، لذا نقرأ أولاً من displayName الأصلي أو من providerData
        String realName = 'لاعب مسعودي';
        if (user.displayName != null && user.displayName!.isNotEmpty && !RegExp(r'^\d+$').hasMatch(user.displayName!)) {
          realName = user.displayName!;
        }
        for (final info in user.providerData) {
          final n = info.displayName;
          // نأخذ الاسم إذا لم يكن أرقاماً فقط (أي ليس رقم المعرّف)
          if (n != null && n.isNotEmpty && !RegExp(r'^\d+$').hasMatch(n)) {
            realName = n;
            break;
          }
        }
        // إذا لم نجد اسماً حقيقياً في providerData، نستخدم رقم الجوال
        if (realName == 'لاعب مسعودي' && user.phoneNumber != null && user.phoneNumber!.isNotEmpty) {
          realName = user.phoneNumber!;
        }

        setState(() {
          _isLoggedIn = true;
          _playerEmail = user.email ?? 'لا يوجد بريد مرتبط';
          _googleAvatarUrl = user.photoURL;
        });
        // ✔ حفظ الاسم الحقيقي في db.json دون انتظار _ensureUserHasNumericId
        if (realName != 'لاعب مسعودي') {
          _pendingRealName = realName; // نحتفظ به لإرساله في sync بعد تعيين ID
        }
        await _ensureUserHasNumericId();
        // ✔ استعادة _playerRealName بعد _ensureUserHasNumericId لأنها قد تصفّره بالخطأ
        if (_pendingRealName != null) {
          setState(() { _playerRealName = _pendingRealName!; });
          _pendingRealName = null;
        }
        await _syncPlayerWithServer();
        _startSyncTimer();
      } else {
        _stopSyncTimer();
        setState(() {
          _isLoggedIn = false;
          _playerName = 'زائر مسعودي';
          _playerRealName = 'زائر مسعودي';
          _playerEmail = 'لا يوجد بريد مرتبط';
          _googleAvatarUrl = null;
          _playerBalance = 0.0;
          _primaryBalance = 0.0;
          _bonusBalance = 0.0;
          _isAgent = false;
          _agentBalance = 0.0;
          _transactions.clear();
        });
      }
    });
  }

  Future<void> _ensureUserHasNumericId() async {
    try {
      final User? user = FirebaseAuth.instance.currentUser;
      if (user != null) {
        final isNumeric = RegExp(r'^\d{6}$').hasMatch(user.displayName ?? '');
        if (user.displayName == null || user.displayName!.isEmpty || !isNumeric) {
          // حساب رقم المعرّف الفريد من البريد أو رقم الهاتف
          final String key = (user.email != null && user.email!.isNotEmpty)
              ? user.email!
              : (user.phoneNumber ?? user.uid);
          int hash = 0;
          for (int i = 0; i < key.length; i++) {
            hash = key.codeUnitAt(i) + ((hash << 5) - hash);
          }
          final String newId = (100000 + (hash.abs() % 900000)).toString();
          await user.updateDisplayName(newId);
          await user.reload();
          setState(() {
            _playerName = newId; // رقم المعرّف فقط
            // _playerRealName لا يتغيّر — يحتفظ بالاسم الحقيقي
          });
        } else {
          setState(() {
            _playerName = user.displayName!; // رقم المعرّف المحفوظ مسبقاً
          });
        }
      }
    } catch (e) {
      debugPrint("Error ensuring numeric ID: $e");
    }
  }

  Future<void> _syncPlayerWithServer() async {
    final User? user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    final id = _playerId;
    final name = _playerRealName; // الاسم الحقيقي للمزامنة مع السيرفر
    final email = _playerEmail;

    try {
      final response = await http.post(
        Uri.parse('$_serverUrl/api/sync-player'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'id': id,
          'name': name,
          'email': email,
          'photoUrl': _googleAvatarUrl,
        }),
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);

        final double newBalance = (data['balance'] ?? 0.0).toDouble();
        final double newPrimaryBalance = (data['balance'] ?? 0.0).toDouble();
        final double newBonusBalance = (data['bonus'] ?? 0.0).toDouble();
        final bool newIsAgent = data['isAgent'] ?? false;
        final double newAgentBalance = (data['agentBalance'] ?? 0.0).toDouble();
        final bool newIsAdmin = data['isAdmin'] ?? false;

        // 1. Check if balance, agency info, or admin privilege changed
        bool hasMainChanges = _playerBalance != newBalance ||
            _primaryBalance != newPrimaryBalance ||
            _bonusBalance != newBonusBalance ||
            _isAgent != newIsAgent ||
            _agentBalance != newAgentBalance ||
            _isAdmin != newIsAdmin;

        // 2. Format transactions using stable IDs (derived from type, amount, date)
        final List<Map<String, String>> newTxList = [];
        if (data['transactions'] != null) {
          for (var tx in data['transactions']) {
            final double amount = (tx['amount'] ?? 0.0).toDouble();
            final String type = tx['type'] ?? 'عملية';
            final String date = tx['date'] ?? 'الآن';
            final String amountText = '${amount >= 0 ? '+' : ''}${amount.toLocaleString()} ر.س';
            // Stable ID hash so it doesn't change randomly and cause Flutter list items to rebuild completely
            final String stableId = 'TX-${(type + amountText + date).hashCode.abs() % 100000}';

            newTxList.add({
              'id': stableId,
              'type': type,
              'amount': amountText,
              'date': date,
              'status': 'ناجحة',
            });
          }
        }

        // 3. Check if transaction list changed
        bool txChanged = false;
        if (_transactions.length != newTxList.length) {
          txChanged = true;
        } else {
          for (int i = 0; i < _transactions.length; i++) {
            if (_transactions[i]['id'] != newTxList[i]['id'] ||
                _transactions[i]['type'] != newTxList[i]['type'] ||
                _transactions[i]['amount'] != newTxList[i]['amount'] ||
                _transactions[i]['date'] != newTxList[i]['date']) {
              txChanged = true;
              break;
            }
          }
        }

        // 4. Trigger setState ONLY if something actually changed!
        if (hasMainChanges || txChanged) {
          setState(() {
            _playerBalance = newBalance;
            _primaryBalance = newPrimaryBalance;
            _bonusBalance = newBonusBalance;
            _isAgent = newIsAgent;
            _agentBalance = newAgentBalance;
            _isAdmin = newIsAdmin;

            if (txChanged) {
              _transactions.clear();
              _transactions.addAll(newTxList);
            }
          });
        }
      }
    } catch (e) {
      debugPrint("Error syncing player with server: $e");
    }
  }

  Future<void> _loadSettingsFromServer() async {
    try {
      final response = await http.get(Uri.parse('$_serverUrl/api/data')).timeout(const Duration(seconds: 15));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['settings'] != null) {
          final s = decoded['settings'];
          setState(() {
            _enablePreview = s['enablePreview'] ?? true;
            _playButtonText = s['playButtonText'] ?? 'العب الآن';
            _showBalance = s['showBalance'] ?? true;
            _showLiveBadge = s['showLiveBadge'] ?? true;
          });
        }
      }
    } catch (e) {
      debugPrint("Error fetching settings from server: $e");
    }
  }

  Future<void> _handleGoogleSignIn() async {
    try {
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser != null) {
        final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
        final AuthCredential credential = GoogleAuthProvider.credential(
          accessToken: googleAuth.accessToken,
          idToken: googleAuth.idToken,
        );
        final UserCredential userCred = await FirebaseAuth.instance.signInWithCredential(credential);
        if (userCred.user != null) {
          // ✔ نقرأ الاسم الحقيقي من googleUser مباشرة (وليس من Firebase displayName الذي قد يكون رقماً)
          final String realName = googleUser.displayName?.isNotEmpty == true
              ? googleUser.displayName!
              : (userCred.user!.providerData
                  .where((p) => p.displayName != null && p.displayName!.isNotEmpty && !RegExp(r'^\d+$').hasMatch(p.displayName!))
                  .firstOrNull?.displayName ?? 'لاعب مسعودي');
          setState(() {
            _isLoggedIn = true;
            _playerRealName = realName; // ✔ الاسم الحقيقي محفوظ قبل _ensureUserHasNumericId
            _playerEmail = userCred.user!.email ?? 'لا يوجد بريد مرتبط';
            _googleAvatarUrl = userCred.user!.photoURL;
          });
          await _ensureUserHasNumericId(); // ✔ يغيّر _playerName (ID) وليس _playerRealName
          await _syncPlayerWithServer();
        }
      }
    } catch (error) {
      debugPrint("Google Sign-In Error: $error");
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'فشل تسجيل الدخول الحقيقي. تأكد من إعداد ملف google-services.json وبصمة SHA-1 في Firebase. الخطأ: $error',
            textDirection: TextDirection.rtl,
            style: GoogleFonts.cairo(fontSize: 12, color: Colors.white),
          ),
          backgroundColor: const Color(0xFFD32F2F),
        ),
      );
    }
  }

  Future<void> _handleSignOut() async {
    try {
      await _googleSignIn.disconnect();
    } catch (_) {}
    try {
      await FirebaseAuth.instance.signOut();
    } catch (_) {}
    setState(() {
      _isLoggedIn = false;
      _playerName = 'زائر مسعودي';
      _playerEmail = 'لا يوجد بريد مرتبط';
      _googleAvatarUrl = null;
      _isAdmin = false;
    });
  }

  void _handlePhoneLoginSuccess(String phoneNumber) async {
    setState(() {
      _isLoggedIn = true;
      _playerName = phoneNumber;
      _playerEmail = 'مسجل برقم الجوال';
      _googleAvatarUrl = null;
    });
    await _ensureUserHasNumericId();
  }

  // Shared State
  double _playerBalance = 0.00;
  double _primaryBalance = 0.00;
  double _bonusBalance = 0.00;
  double _agentBalance = 0.00;

  final List<Map<String, dynamic>> _transactions = [
    { 'id': "TX-99837", 'type': "شحن رصيد", 'amount': "+5,000 ر.س", 'date': "اليوم، 12:45 ص", 'status': "ناجحة" },
    { 'id': "TX-99712", 'type': "لعب (سلوتس API)", 'amount': "-1,200 ر.س", 'date': "أمس، 08:30 م", 'status': "ناجحة" },
    { 'id': "TX-99645", 'type': "سحب أرباح", 'amount': "-10,000 ر.س", 'date': "أمس، 02:15 م", 'status': "ناجحة" },
    { 'id': "TX-99501", 'type': "شحن رصيد", 'amount': "+25,000 ر.س", 'date': "02 يوليو 2026", 'status': "ناجحة" }
  ];

  Future<void> _executeTransaction(double amount, String type) async {
    // For sell, the amount is already negative (-amountVal)
    final double netAmount = type == 'deposit' ? amount : (type == 'sell' ? amount : -amount);
    final String txType = type == 'deposit' ? 'إيداع سريع' : (type == 'sell' ? 'سحب رصيد للوكيل' : 'سحب سريع');

    // Optimistically update local state first
    setState(() {
      final txId = "TX-${10000 + (amount.abs().toInt() % 90000) + (DateTime.now().millisecond % 99)}";
      if (type == 'deposit') {
        _playerBalance += amount;
        _primaryBalance += amount;
        _transactions.insert(0, {
          'id': txId,
          'type': 'شحن رصيد',
          'amount': '+${amount.toLocaleString()} ر.س',
          'date': 'الآن',
          'status': 'ناجحة'
        });
      } else if (type == 'withdraw') {
        _playerBalance -= amount;
        _primaryBalance -= amount;
        _transactions.insert(0, {
          'id': txId,
          'type': 'سحب أرباح',
          'amount': '-${amount.toLocaleString()} ر.س',
          'date': 'الآن',
          'status': 'ناجحة'
        });
      } else if (type == 'transfer') {
        _agentBalance -= amount;
        _transactions.insert(0, {
          'id': txId,
          'type': 'تحويل رصيد للاعب',
          'amount': '-${amount.toLocaleString()} ر.س',
          'date': 'الآن',
          'status': 'ناجحة'
        });
      } else if (type == 'sell') {
        // amount is already negative (-amountVal) from wallet_screen.dart
        _playerBalance += amount; // e.g. 5000 + (-1000) = 4000
        _primaryBalance += amount;
        _transactions.insert(0, {
          'id': txId,
          'type': 'سحب رصيد للوكيل',
          'amount': '${amount.toLocaleString()} ر.س',
          'date': 'الآن',
          'status': 'ناجحة'
        });
      }
    });

    // Sync transaction to API Server ONLY if it hasn't been synced yet
    // 'sell' and 'transfer' already called their specific API endpoints, so we skip!
    if (_isLoggedIn && type != 'sell' && type != 'transfer') {
      try {
        await http.post(
          Uri.parse('$_serverUrl/api/update-player-balance'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'id': _playerId,
            'amount': netAmount,
            'type': txType,
          }),
        ).timeout(const Duration(seconds: 15));
      } catch (e) {
        debugPrint("Error sending transaction to server: $e");
      }
    }
  }


  void _playGame(Game game) {
    // Block guests from playing - must be logged in
    if (!_isLoggedIn) {
      showDialog(
        context: context,
        barrierDismissible: true,
        builder: (context) => Dialog(
          backgroundColor: Colors.transparent,
          child: Container(
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF1A1D2E), Color(0xFF12151F)],
              ),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: const Color(0xFFFF7A1F).withOpacity(0.4),
                width: 1.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFFF7A1F).withOpacity(0.15),
                  blurRadius: 30,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Lock icon
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFFF7A1F), Color(0xFFFFB347)],
                    ),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFFF7A1F).withOpacity(0.4),
                        blurRadius: 20,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.lock_rounded,
                    color: Colors.white,
                    size: 36,
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  'يجب تسجيل الدخول للعب',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.cairo(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'سجّل دخولك أو أنشئ حساباً جديداً\nللاستمتاع بجميع الألعاب وجمع العملات المعدنية',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.cairo(
                    fontSize: 14,
                    color: Colors.white60,
                    height: 1.6,
                  ),
                ),
                const SizedBox(height: 28),
                // Login Now button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.of(context).pop();
                      setState(() {
                        _currentIndex = 2; // Navigate to Profile tab
                      });
                    },
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ).copyWith(
                      backgroundColor: WidgetStateProperty.all(Colors.transparent),
                    ),
                    child: Ink(
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFFFF7A1F), Color(0xFFFFB347)],
                        ),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Container(
                        alignment: Alignment.center,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        child: Text(
                          'تسجيل الدخول الآن',
                          style: GoogleFonts.cairo(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                // Cancel button
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text(
                    'إلغاء',
                    style: GoogleFonts.cairo(
                      fontSize: 14,
                      color: Colors.white38,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
      return;
    }

    if (!_enablePreview) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => GamePlayScreen(
            game: game,
            balance: _playerBalance,
            playerId: _playerId,
          ),
        ),
      );
      return;
    }

    Navigator.of(context).push(
      PageRouteBuilder(
        opaque: false, // شفاف — يُظهر الخلفية خلف المعاينة
        barrierDismissible: true,
        pageBuilder: (context, _, __) => GamePreviewScreen(
          game: game,
          balance: _playerBalance,
          playerId: _playerId,
          playerName: _playerRealName.isNotEmpty ? _playerRealName : 'لاعب مسعودي',
          showBalance: _showBalance,
          showLiveBadge: _showLiveBadge,
          playButtonText: _playButtonText,
        ),
        transitionsBuilder: (context, animation, _, child) {
          return FadeTransition(
            opacity: CurvedAnimation(parent: animation, curve: Curves.easeOut),
            child: child,
          );
        },
        transitionDuration: const Duration(milliseconds: 300),
      ),
    );
  }

  void _showLoginRequiredDialog(String message) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          backgroundColor: const Color(0xFF291B15),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: const BorderSide(color: Color(0xFF3D2A20), width: 1.5),
          ),
          title: Row(
            children: [
              const Icon(Icons.info_outline_rounded, color: Color(0xFFFF7A1F), size: 24),
              const SizedBox(width: 8),
              Text(
                'تنبيه',
                style: GoogleFonts.cairo(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ],
          ),
          content: Text(
            message,
            style: GoogleFonts.cairo(
              fontSize: 13,
              color: Colors.white70,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(dialogContext);
                setState(() {
                  _currentIndex = 2; // Switch to Profile Screen
                });
              },
              child: Text(
                'تسجيل الدخول',
                style: GoogleFonts.cairo(
                  color: const Color(0xFFFF7A1F),
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ),
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: Text(
                'إلغاء',
                style: GoogleFonts.cairo(
                  color: Colors.white54,
                  fontSize: 13,
                ),
              ),
            ),
          ],
        );
      },
    );
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
        serverUrl: _serverUrl,
        playerId: _playerId,
        balance: _playerBalance,
        primaryBalance: _primaryBalance,
        bonusBalance: _bonusBalance,
        agentBalance: _agentBalance,
        isAgent: _isAgent,
        transactions: _transactions,
        onTransactionExecuted: _executeTransaction,
      ),
      ProfileScreen(
        playerName: _playerRealName,   // الاسم الحقيقي (Google / جوال)
        playerEmail: _playerEmail,
        playerId: _playerId,
        avatarUrl: _googleAvatarUrl,
        isLoggedIn: _isLoggedIn,
        isAgent: _isAgent,
        agentBalance: _agentBalance,
        isAdmin: _isAdmin,
        serverUrl: _serverUrl,
        onTransactionExecuted: _executeTransaction,
        onGoogleLogin: _handleGoogleSignIn,
        onPhoneLoginSuccess: _handlePhoneLoginSuccess,
        onLogout: _handleSignOut,
      ),
    ];

    return Scaffold(
      // Top profile header simulating the HTML layout
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(70),
        child: Container(
          padding: const EdgeInsets.only(top: 32, left: 20, right: 20, bottom: 10),
          decoration: BoxDecoration(
            color: const Color(0xFF1A110D),
            border: Border(
              bottom: BorderSide(color: const Color(0xFF3D2A20), width: 1),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // App Mascot Logo (Animated)
              const AnimatedTopMascot(),

              // Balance & Avatar
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                    decoration: BoxDecoration(
                      color: const Color(0xFF35241C),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: const Color(0xFF3D2A20), width: 1),
                    ),
                    child: Row(
                      children: [
                        const Text('🪙', style: TextStyle(fontSize: 14)),
                        const SizedBox(width: 5),
                        Text(
                          _playerBalance.toLocaleString(),
                          style: GoogleFonts.cairo(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFFFF7A1F),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  Container(
                    padding: const EdgeInsets.all(2),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFFFF7A1F), width: 2),
                    ),
                    child: CircleAvatar(
                      radius: 15,
                      backgroundColor: const Color(0xFF291B15),
                      backgroundImage: _googleAvatarUrl != null ? NetworkImage(_googleAvatarUrl!) : null,
                      child: _googleAvatarUrl == null
                          ? const Icon(Icons.person_rounded, size: 17, color: Color(0xFFFF7A1F))
                          : null,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Color(0xFF1A110D),
              Color(0xFF201510),
              Color(0xFF2A1C15),
            ],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: screens[_currentIndex],
      ),
      floatingActionButton: AnimatedWalletFab(
        isSelected: _currentIndex == 0,
        onTap: () {
          setState(() {
            _currentIndex = 0;
          });
          if (_isLoggedIn) {
            _syncPlayerWithServer();
          }
        },
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: BottomAppBar(
        shape: const CircularNotchedRectangle(),
        notchMargin: 10.0,
        color: const Color(0xFF1A110D),
        clipBehavior: Clip.antiAlias,
        child: Container(
          height: 62,
          decoration: const BoxDecoration(
            border: Border(
              top: BorderSide(color: Color(0xFF3D2A20), width: 1),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              // Wallet Tab
              Expanded(
                child: InkWell(
                  onTap: () {
                    if (!_isLoggedIn) {
                      _showLoginRequiredDialog('يرجى تسجيل الدخول أولاً للوصول إلى المحفظة والتواصل مع وكلاء الشحن.');
                      return;
                    }
                    setState(() {
                      _currentIndex = 1;
                    });
                    _syncPlayerWithServer();
                  },
                  splashColor: Colors.transparent,
                  highlightColor: Colors.transparent,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: _currentIndex == 1
                              ? const Color(0xFFFF7A1F).withOpacity(0.15)
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          Icons.account_balance_wallet_rounded,
                          color: _currentIndex == 1
                              ? const Color(0xFFFF7A1F)
                              : const Color(0xFF6B7080),
                          size: 22,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'المحفظة',
                        style: GoogleFonts.cairo(
                          fontSize: 9,
                          fontWeight: _currentIndex == 1 ? FontWeight.bold : FontWeight.normal,
                          color: _currentIndex == 1
                              ? const Color(0xFFFF7A1F)
                              : const Color(0xFF6B7080),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              // Empty space for the docked FAB
              const SizedBox(width: 64),
              // Profile Tab
              Expanded(
                child: InkWell(
                  onTap: () {
                    setState(() {
                      _currentIndex = 2;
                    });
                    if (_isLoggedIn) {
                      _syncPlayerWithServer();
                    }
                  },
                  splashColor: Colors.transparent,
                  highlightColor: Colors.transparent,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: _currentIndex == 2
                              ? const Color(0xFFFF7A1F).withOpacity(0.15)
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          Icons.person_rounded,
                          color: _currentIndex == 2 ? const Color(0xFFFF7A1F) : const Color(0xFF6B7080),
                          size: 22,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'حسابي',
                        style: GoogleFonts.cairo(
                          fontSize: 9,
                          fontWeight: _currentIndex == 2 ? FontWeight.bold : FontWeight.normal,
                          color: _currentIndex == 2 ? const Color(0xFFFF7A1F) : const Color(0xFF6B7080),
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
    );
  }

  @override
  void dispose() {
    _stopSyncTimer();
    super.dispose();
  }
}

class AnimatedWalletFab extends StatefulWidget {
  final bool isSelected;
  final VoidCallback onTap;

  const AnimatedWalletFab({
    Key? key,
    required this.isSelected,
    required this.onTap,
  }) : super(key: key);

  @override
  _AnimatedWalletFabState createState() => _AnimatedWalletFabState();
}

class _AnimatedWalletFabState extends State<AnimatedWalletFab> with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _wobbleController;
  late AnimationController _pressController;
  late Animation<double> _pulseAnimation;
  late Animation<double> _wobbleAnimation;
  late Animation<double> _continuousRotation;
  late Animation<double> _pressScale;
  late Animation<double> _pressGlow;

  @override
  void initState() {
    super.initState();

    // Idle float pulse
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.09).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    // Continuous gentle wobble/tilt
    _continuousRotation = Tween<double>(begin: -0.03, end: 0.03).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    // Wobble on select
    _wobbleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _wobbleAnimation = TweenSequence<double>([
      TweenSequenceItem(tween: Tween<double>(begin: 0.0, end: 0.06), weight: 25),
      TweenSequenceItem(tween: Tween<double>(begin: 0.06, end: -0.06), weight: 25),
      TweenSequenceItem(tween: Tween<double>(begin: -0.06, end: 0.02), weight: 25),
      TweenSequenceItem(tween: Tween<double>(begin: 0.02, end: 0.0), weight: 25),
    ]).animate(CurvedAnimation(parent: _wobbleController, curve: Curves.easeInOut));

    // Press shrink + glow flash
    _pressController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 120),
    );
    _pressScale = Tween<double>(begin: 1.0, end: 0.82).animate(
      CurvedAnimation(parent: _pressController, curve: Curves.easeIn),
    );
    _pressGlow = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _pressController, curve: Curves.easeIn),
    );

    if (widget.isSelected) {
      _wobbleController.forward(from: 0.0);
    }
  }


  @override
  void didUpdateWidget(covariant AnimatedWalletFab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isSelected && !oldWidget.isSelected) {
      _wobbleController.forward(from: 0.0);
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _wobbleController.dispose();
    _pressController.dispose();
    super.dispose();
  }

  void _onTapDown(TapDownDetails _) {
    _pressController.forward();
  }

  void _onTapUp(TapUpDetails _) {
    _pressController.reverse().then((_) {
      _wobbleController.forward(from: 0.0);
      widget.onTap();
    });
  }

  void _onTapCancel() {
    _pressController.reverse();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: _onTapDown,
      onTapUp: _onTapUp,
      onTapCancel: _onTapCancel,
      child: ScaleTransition(
        scale: _pulseAnimation,
        child: RotationTransition(
          turns: _continuousRotation,
          child: RotationTransition(
            turns: _wobbleAnimation,
            child: AnimatedBuilder(
            animation: Listenable.merge([_pressController, _pulseController]),
            builder: (context, child) {
              return Transform.scale(
                scale: _pressScale.value,
                child: Container(
                  height: 72,
                  width: 72,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    boxShadow: [
                      // Base glow
                      BoxShadow(
                        color: const Color(0xFFFF6B00).withOpacity(
                          widget.isSelected ? 0.5 : 0.2,
                        ),
                        blurRadius: widget.isSelected ? 24 : 12,
                        spreadRadius: widget.isSelected ? 4 : 1,
                        offset: const Offset(0, 2),
                      ),
                      // Press flash glow
                      BoxShadow(
                        color: const Color(0xFFFFAA55).withOpacity(
                          _pressGlow.value * 0.8,
                        ),
                        blurRadius: 30,
                        spreadRadius: 8,
                      ),
                    ],
                  ),
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      // Fox image — fully transparent background
                      Image.asset(
                        'assets/images/fox_fab.png',
                        width: 72,
                        height: 72,
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stack) => const Icon(
                          Icons.account_balance_wallet_rounded,
                          size: 32,
                          color: Color(0xFFFF7A1F),
                        ),
                      ),
                      // Press ripple overlay
                      if (_pressGlow.value > 0)
                        Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.white.withOpacity(_pressGlow.value * 0.18),
                          ),
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
    ),
  );

  }
}

class AnimNavButton extends StatelessWidget {
  final String assetPath;
  final IconData fallbackIcon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const AnimNavButton({
    Key? key,
    required this.assetPath,
    required this.fallbackIcon,
    required this.label,
    required this.isSelected,
    required this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: isSelected
              ? const LinearGradient(
                  colors: [Color(0xFFFF8C00), Color(0xFFD45A00)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                )
              : null,
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFFD45A00).withOpacity(0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  )
                ]
              : [],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedScale(
              scale: isSelected ? 1.05 : 0.95,
              duration: const Duration(milliseconds: 250),
              child: Opacity(
                opacity: isSelected ? 1.0 : 0.45,
                child: Image.asset(
                  assetPath,
                  width: 20,
                  height: 20,
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) {
                    return Icon(
                      fallbackIcon,
                      size: 20,
                      color: isSelected ? const Color(0xFF100906) : Colors.white,
                    );
                  },
                ),
              ),
            ),
            AnimatedSize(
              duration: const Duration(milliseconds: 250),
              curve: Curves.easeInOut,
              child: isSelected
                  ? Row(
                      children: [
                        const SizedBox(width: 8),
                        Text(
                          label,
                          style: GoogleFonts.cairo(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF100906),
                          ),
                        ),
                      ],
                    )
                  : const SizedBox.shrink(),
            ),
          ],
        ),
      ),
    );
  }
}

class AnimatedTopMascot extends StatefulWidget {
  const AnimatedTopMascot({Key? key}) : super(key: key);

  @override
  _AnimatedTopMascotState createState() => _AnimatedTopMascotState();
}

class _AnimatedTopMascotState extends State<AnimatedTopMascot> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _rotateAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat(reverse: true);

    _scaleAnimation = Tween<double>(begin: 0.94, end: 1.06).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );

    _rotateAnimation = Tween<double>(begin: -0.03, end: 0.03).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: _scaleAnimation,
      child: RotationTransition(
        turns: _rotateAnimation,
        child: Image.asset(
          'assets/images/fox_fab.png',
          height: 44,
          width: 44,
          fit: BoxFit.contain,
          errorBuilder: (context, error, stackTrace) => Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: const BoxDecoration(
                  color: Color(0xFFFF7A1F),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.diamond_rounded, color: Colors.white, size: 16),
              ),
              const SizedBox(width: 8),
              Text(
                'مـسـعـودي',
                style: GoogleFonts.cairo(
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

