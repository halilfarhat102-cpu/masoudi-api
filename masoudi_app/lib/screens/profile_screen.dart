import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'dart:math';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'admin_panel_screen.dart';

class ProfileScreen extends StatefulWidget {
  final String playerName;
  final String playerEmail;
  final String playerId;
  final String? avatarUrl;
  final bool isLoggedIn;
  final bool isAgent;
  final double agentBalance;
  final bool isAdmin;
  final String serverUrl;
  final Function(double, String) onTransactionExecuted;
  final Future<void> Function() onGoogleLogin;
  final Function(String) onPhoneLoginSuccess;
  final VoidCallback onLogout;

  const ProfileScreen({
    Key? key,
    required this.playerName,
    required this.playerEmail,
    required this.playerId,
    this.avatarUrl,
    required this.isLoggedIn,
    required this.isAgent,
    required this.agentBalance,
    required this.isAdmin,
    required this.serverUrl,
    required this.onTransactionExecuted,
    required this.onGoogleLogin,
    required this.onPhoneLoginSuccess,
    required this.onLogout,
  }) : super(key: key);

  @override
  _ProfileScreenState createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _otpController = TextEditingController();
  final TextEditingController _playerIdController = TextEditingController();
  final TextEditingController _playerPasswordController = TextEditingController();
  
  bool _isOtpSent = false;
  bool _isLoading = false;
  String _verificationId = '';
  int _activeAuthTab = 0; // 0 for Google, 1 for Phone, 2 for Player ID
  bool _isRegisterMode = false; // Toggle between Login and Register for ID/Password Tab

  // Country Code Picker state
  String _selectedCountryCode = '+966';
  String _selectedFlag = '🇸🇦';

  final List<Map<String, String>> _countries = [
    { 'code': '+966', 'flag': '🇸🇦', 'name': 'المملكة العربية السعودية' },
    { 'code': '+971', 'flag': '🇦🇪', 'name': 'الإمارات العربية المتحدة' },
    { 'code': '+965', 'flag': '🇰🇼', 'name': 'الكويت' },
    { 'code': '+974', 'flag': '🇶🇦', 'name': 'قطر' },
    { 'code': '+973', 'flag': '🇧🇭', 'name': 'البحرين' },
    { 'code': '+968', 'flag': '🇴🇲', 'name': 'عمان' },
    { 'code': '+20', 'flag': '🇪🇬', 'name': 'مصر' },
  ];

  void _showCountryPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1E140F),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 15),
              Text(
                'اختر كود الدولة',
                style: GoogleFonts.cairo(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 15),
              Expanded(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: _countries.length,
                  itemBuilder: (context, index) {
                    final c = _countries[index];
                    final isSelected = c['code'] == _selectedCountryCode;
                    return ListTile(
                      onTap: () {
                        setState(() {
                          _selectedCountryCode = c['code']!;
                          _selectedFlag = c['flag']!;
                        });
                        Navigator.pop(context);
                      },
                      leading: Text(c['flag']!, style: const TextStyle(fontSize: 20)),
                      title: Text(
                        c['name']!,
                        style: GoogleFonts.cairo(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                      trailing: Text(
                        c['code']!,
                        style: GoogleFonts.cairo(
                          color: isSelected ? const Color(0xFFD45A00) : Colors.white54,
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // Firebase auth instance
  final FirebaseAuth _auth = FirebaseAuth.instance;

  Future<void> _sendOtp() async {
    var rawPhone = _phoneController.text.trim();
    if (rawPhone.isEmpty || rawPhone.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('الرجاء إدخال رقم هاتف صحيح (مثال: 5xxxxxxxx)', style: GoogleFonts.cairo(fontSize: 12)),
          backgroundColor: const Color(0xFFD32F2F),
        ),
      );
      return;
    }

    // Strip leading zero if exists
    if (rawPhone.startsWith('0')) {
      rawPhone = rawPhone.substring(1);
    }

    final phone = '$_selectedCountryCode$rawPhone';

    setState(() {
      _isLoading = true;
    });

    try {
      await _auth.verifyPhoneNumber(
        phoneNumber: phone,
        verificationCompleted: (PhoneAuthCredential credential) async {
          final UserCredential userCred = await _auth.signInWithCredential(credential);
          if (userCred.user != null) {
            widget.onPhoneLoginSuccess(userCred.user!.phoneNumber ?? phone);
          }
        },
        verificationFailed: (FirebaseAuthException e) {
          setState(() {
            _isLoading = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('فشل إرسال كود التحقق: ${e.message}', style: GoogleFonts.cairo(fontSize: 12)),
              backgroundColor: const Color(0xFFD32F2F),
            ),
          );
        },
        codeSent: (String verificationId, int? resendToken) {
          setState(() {
            _isLoading = false;
            _isOtpSent = true;
            _verificationId = verificationId;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('تم إرسال كود التحقق بنجاح رسالة نصية (SMS)', style: GoogleFonts.cairo(fontSize: 12)),
              backgroundColor: const Color(0xFF00E676),
            ),
          );
        },
        codeAutoRetrievalTimeout: (String verificationId) {
          _verificationId = verificationId;
        },
        timeout: const Duration(seconds: 60),
      );
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('حدث خطأ أثناء الاتصال: $e', style: GoogleFonts.cairo(fontSize: 12)),
          backgroundColor: const Color(0xFFD32F2F),
        ),
      );
    }
  }

  Future<void> _verifyOtp() async {
    final otp = _otpController.text.trim();
    if (otp.isEmpty || otp.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('الرجاء إدخال كود التحقق المكون من 6 أرقام', style: GoogleFonts.cairo(fontSize: 12)),
          backgroundColor: const Color(0xFFD32F2F),
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final credential = PhoneAuthProvider.credential(
        verificationId: _verificationId,
        smsCode: otp,
      );

      final UserCredential userCred = await _auth.signInWithCredential(credential);
      if (userCred.user != null) {
        widget.onPhoneLoginSuccess(userCred.user!.phoneNumber ?? '$_selectedCountryCode${_phoneController.text}');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('تم تسجيل الدخول وتوثيق الحساب برقم الهاتف بنجاح!', style: GoogleFonts.cairo(fontSize: 12)),
            backgroundColor: const Color(0xFF00E676),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('كود التحقق غير صحيح أو منتهي الصلاحية: ${e.toString().split(']').last.trim()}', style: GoogleFonts.cairo(fontSize: 12)),
          backgroundColor: const Color(0xFFD32F2F),
        ),
      );
    }
  }

  Future<void> _handleIdAuth() async {
    final id = _playerIdController.text.trim();
    final password = _playerPasswordController.text;

    if (id.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('يرجى إدخال معرّف اللاعب (ID)', style: GoogleFonts.cairo(fontSize: 12)),
          backgroundColor: const Color(0xFFD32F2F),
        ),
      );
      return;
    }

    if (password.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('يجب ألا تقل كلمة المرور عن 6 خانات', style: GoogleFonts.cairo(fontSize: 12)),
          backgroundColor: const Color(0xFFD32F2F),
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    final String email = '$id@masoudi.com';

    try {
      if (_isRegisterMode) {
        // Create account
        final UserCredential userCred = await FirebaseAuth.instance.createUserWithEmailAndPassword(
          email: email,
          password: password,
        );
        if (userCred.user != null) {
          await userCred.user!.updateDisplayName(id);
          setState(() {
            _isLoading = false;
          });
          widget.onPhoneLoginSuccess(id);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('تم إنشاء المعرّف وتسجيل الدخول بنجاح!', style: GoogleFonts.cairo(fontSize: 12)),
              backgroundColor: const Color(0xFF00E676),
            ),
          );
        }
      } else {
        // Sign In
        final UserCredential userCred = await FirebaseAuth.instance.signInWithEmailAndPassword(
          email: email,
          password: password,
        );
        if (userCred.user != null) {
          setState(() {
            _isLoading = false;
          });
          widget.onPhoneLoginSuccess(id);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('تم تسجيل الدخول بنجاح!', style: GoogleFonts.cairo(fontSize: 12)),
              backgroundColor: const Color(0xFF00E676),
            ),
          );
        }
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      String errStr = e.toString().split(']').last.trim();
      if (e.toString().contains('operation-not-allowed')) {
        errStr = 'موفر تسجيل الدخول (Email/Password) غير مفعّل في لوحة تحكم Firebase! يرجى الانتقال إلى Firebase Console > Build > Authentication > Sign-in method وتفعيل خيار Email/Password لتفعيل معرّف اللاعب.';
      } else if (errStr.contains('email-already-in-use')) {
        errStr = 'معرّف اللاعب هذا مستخدم بالفعل!';
      } else if (errStr.contains('invalid-credential') || errStr.contains('wrong-password') || errStr.contains('user-not-found') || errStr.contains('user-disabled')) {
        errStr = 'معرّف اللاعب أو كلمة المرور غير صحيحة!';
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('فشل المصادقة: $errStr', style: GoogleFonts.cairo(fontSize: 12)),
          backgroundColor: const Color(0xFFD32F2F),
        ),
      );
    }
  }

  void _showChangePasswordDialog() {
    final TextEditingController newPasswordController = TextEditingController();
    final TextEditingController confirmPasswordController = TextEditingController();
    bool isDialogLoading = false;

    showDialog(
      context: context,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (context, setStateDialog) {
            return AlertDialog(
              backgroundColor: const Color(0xFF1E140F),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: BorderSide(color: const Color(0xFFD45A00).withOpacity(0.3), width: 1.5),
              ),
              title: Text(
                'تغيير كلمة المرور',
                textAlign: TextAlign.center,
                style: GoogleFonts.cairo(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                ),
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'أدخل كلمة المرور الجديدة لحسابك. يجب ألا تقل عن 6 خانات.',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.cairo(
                      color: Colors.white54,
                      fontSize: 11,
                    ),
                  ),
                  const SizedBox(height: 20),
                  // New Password field
                  TextField(
                    controller: newPasswordController,
                    obscureText: true,
                    style: GoogleFonts.cairo(color: Colors.white, fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'كلمة المرور الجديدة...',
                      hintStyle: const TextStyle(color: Colors.white24),
                      filled: true,
                      fillColor: Colors.black.withOpacity(0.3),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: const Color(0xFFD45A00).withOpacity(0.3)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Color(0xFFD45A00)),
                      ),
                      prefixIcon: const Icon(Icons.lock_outline, color: Color(0xFFD45A00), size: 18),
                    ),
                  ),
                  const SizedBox(height: 12),
                  // Confirm Password field
                  TextField(
                    controller: confirmPasswordController,
                    obscureText: true,
                    style: GoogleFonts.cairo(color: Colors.white, fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'تأكيد كلمة المرور الجديدة...',
                      hintStyle: const TextStyle(color: Colors.white24),
                      filled: true,
                      fillColor: Colors.black.withOpacity(0.3),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: const Color(0xFFD45A00).withOpacity(0.3)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Color(0xFFD45A00)),
                      ),
                      prefixIcon: const Icon(Icons.lock_reset_rounded, color: Color(0xFFD45A00), size: 18),
                    ),
                  ),
                ],
              ),
              actionsPadding: const EdgeInsets.only(bottom: 20, left: 16, right: 16),
              actions: [
                Row(
                  children: [
                    Expanded(
                      child: TextButton(
                        onPressed: isDialogLoading ? null : () => Navigator.pop(context),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.white70,
                        ),
                        child: Text(
                          'إلغاء',
                          style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: isDialogLoading
                            ? null
                            : () async {
                                final pass = newPasswordController.text;
                                final confirm = confirmPasswordController.text;

                                if (pass.length < 6) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('يجب ألا تقل كلمة المرور عن 6 خانات', style: GoogleFonts.cairo(fontSize: 12)),
                                      backgroundColor: const Color(0xFFD32F2F),
                                    ),
                                  );
                                  return;
                                }

                                if (pass != confirm) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('كلمتا المرور غير متطابقتين', style: GoogleFonts.cairo(fontSize: 12)),
                                      backgroundColor: const Color(0xFFD32F2F),
                                    ),
                                  );
                                  return;
                                }
                                setStateDialog(() {
                                  isDialogLoading = true;
                                });

                                try {
                                  final User? user = FirebaseAuth.instance.currentUser;
                                  if (user != null) {
                                    bool hasPasswordProvider = false;
                                    for (final profile in user.providerData) {
                                      if (profile.providerId == 'password') {
                                        hasPasswordProvider = true;
                                        break;
                                      }
                                    }

                                    if (hasPasswordProvider) {
                                      await user.updatePassword(pass);
                                    } else {
                                      final String idEmail = '$_currentPlayerId@masoudi.com';
                                      final credential = EmailAuthProvider.credential(
                                        email: idEmail,
                                        password: pass,
                                      );
                                      await user.linkWithCredential(credential);
                                    }
                                  }
                                  
                                  Navigator.pop(context);
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('تم تحديث كلمة المرور بنجاح!', style: GoogleFonts.cairo(fontSize: 12)),
                                      backgroundColor: const Color(0xFF00E676),
                                    ),
                                  );
                                } catch (e) {
                                  setStateDialog(() {
                                    isDialogLoading = false;
                                  });
                                  
                                  String errMsg = 'فشل تحديث كلمة المرور: ${e.toString().split(']').last.trim()}';
                                  if (e.toString().contains('requires-recent-login')) {
                                    errMsg = 'عملية حساسة. يرجى تسجيل الخروج والولوج مجدداً لتغيير كلمة المرور.';
                                  }

                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(errMsg, style: GoogleFonts.cairo(fontSize: 12)),
                                      backgroundColor: const Color(0xFFD32F2F),
                                    ),
                                  );
                                }
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFD45A00),
                          foregroundColor: const Color(0xFF100906),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                          elevation: 0,
                        ),
                        child: isDialogLoading
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF100906)),
                              )
                            : Text(
                                'تحديث',
                                style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                      ),
                    ),
                  ],
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.isLoggedIn) {
      return Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
            decoration: BoxDecoration(
              color: const Color(0xFF291B15),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFF3D2A20), width: 1),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.4),
                  blurRadius: 25,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Fox mascot image
                Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFFF7A1F).withOpacity(0.30),
                        blurRadius: 30,
                        spreadRadius: 5,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Image.asset(
                    'assets/images/fox_login.png',
                    width: 120,
                    height: 120,
                    fit: BoxFit.contain,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'منصة مسعودي الفاخرة',
                  style: GoogleFonts.cairo(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 15),
                Text(
                  'سجل دخولك بنقرة واحدة باستخدام حساب جوجل الخاص بك للوصول إلى محفظتك وألعابك الفاخرة وحفظ رصيدك بأمان.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.cairo(
                    fontSize: 11,
                    color: const Color(0xFF8B909E),
                    height: 1.6,
                  ),
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: _isLoading ? null : () async {
                    setState(() {
                      _isLoading = true;
                    });
                    try {
                      await widget.onGoogleLogin();
                    } finally {
                      if (mounted) {
                        setState(() {
                          _isLoading = false;
                        });
                      }
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFD45A00),
                    foregroundColor: const Color(0xFF100906),
                    minimumSize: const Size(double.infinity, 46),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Color(0xFF100906),
                          ),
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            // Google icon circle
                            Container(
                              width: 28,
                              height: 28,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.15),
                                    blurRadius: 4,
                                    offset: const Offset(0, 1),
                                  ),
                                ],
                              ),
                              child: const Center(
                                child: FaIcon(
                                  FontAwesomeIcons.google,
                                  size: 15,
                                  color: Color(0xFF4285F4),
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              'تسجيل الدخول باستخدام Google',
                              style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          // Profile Hero Card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
            decoration: BoxDecoration(
              color: const Color(0xFF291B15),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFF3D2A20), width: 1),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.3),
                  blurRadius: 15,
                  offset: const Offset(0, 5),
                ),
              ],
            ),
            child: Column(
              children: [
                // Large Avatar
                Container(
                  padding: const EdgeInsets.all(3),
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [Color(0xFFFF8C00), Color(0xFFD45A00)],
                    ),
                  ),
                  child: CircleAvatar(
                    radius: 46,
                    backgroundColor: const Color(0xFF35241C),
                    backgroundImage: widget.avatarUrl != null ? NetworkImage(widget.avatarUrl!) : null,
                    child: widget.avatarUrl == null
                        ? const Icon(
                            Icons.person,
                            size: 50,
                            color: Color(0xFFFF7A1F),
                          )
                        : null,
                  ),
                ),
                const SizedBox(height: 14),
                // اسم اللاعب
                Text(
                  widget.isLoggedIn ? widget.playerName : 'زائر مسعودي',
                  style: GoogleFonts.cairo(
                    fontSize: 19,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Account Details settings-card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFF291B15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFF3D2A20), width: 1),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'تفاصيل الحساب الشخصي',
                  style: GoogleFonts.cairo(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 15),
                _buildCopyableDetailRow(Icons.badge_outlined, 'معرّف اللاعب (ID)', _currentPlayerId),
                Divider(color: const Color(0xFF3D2A20)),
                _buildDetailRow(Icons.email_outlined, 'البريد الإلكتروني', widget.playerEmail),
                Divider(color: const Color(0xFF3D2A20)),
                _buildDetailRow(Icons.calendar_month_outlined, 'تاريخ التسجيل', '12 مايو 2026'),
                Divider(color: const Color(0xFF3D2A20)),
                _buildDetailRow(
                  Icons.verified_user_outlined,
                  'توثيق الحساب',
                  'موثق عبر Google',
                  textColor: const Color(0xFF00E676),
                ),
              ],
            ),
          ),

          // Security & Support Options
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFF291B15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFF3D2A20), width: 1),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'خيارات الأمان والتحكم',
                  style: GoogleFonts.cairo(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 15),
                _buildSettingButton(Icons.account_balance_wallet_outlined, 'إدارة الحسابات البنكية'),
                Divider(color: const Color(0xFF3D2A20)),
                _buildSettingButton(Icons.support_agent, 'التواصل مع مدير الدعم المخصص'),
                Divider(color: const Color(0xFF3D2A20)),
                _buildSettingButton(
                  Icons.language_rounded,
                  'تغيير لغة التطبيق (Change Language)',
                  textColor: Colors.white,
                  onTap: () {
                    _showLanguageDialog();
                  },
                ),
                Divider(color: const Color(0xFF3D2A20)),
                if (widget.isAdmin) ...[
                  _buildSettingButton(
                    Icons.admin_panel_settings_rounded,
                    'لوحة التحكم الإدارية',
                    textColor: const Color(0xFFFF9800),
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => AdminPanelScreen(
                            serverUrl: widget.serverUrl,
                          ),
                        ),
                      );
                    },
                  ),
                  Divider(color: const Color(0xFF3D2A20)),
                ],
                _buildSettingButton(
                  Icons.logout_rounded,
                  'تسجيل الخروج',
                  textColor: const Color(0xFFD32F2F),
                  onTap: widget.onLogout,
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  String get _currentPlayerId {
    return widget.isLoggedIn ? widget.playerId : '879204';
  }

  Future<void> _generateUniqueIdForRegistration() async {
    setState(() {
      _isLoading = true;
    });
    try {
      String newId = '';
      bool available = false;
      while (!available) {
        newId = (100000 + Random().nextInt(900000)).toString();
        final list = await FirebaseAuth.instance.fetchSignInMethodsForEmail('$newId@masoudi.com');
        if (list.isEmpty) {
          available = true;
        }
      }
      setState(() {
        _playerIdController.text = newId;
        _isLoading = false;
      });
    } catch (_) {
      setState(() {
        _playerIdController.text = (100000 + Random().nextInt(900000)).toString();
        _isLoading = false;
      });
    }
  }

  Widget _buildPhoneDetailRow() {
    final user = FirebaseAuth.instance.currentUser;
    final phone = (user != null && user.phoneNumber != null && user.phoneNumber!.isNotEmpty)
        ? user.phoneNumber!
        : '';
    return _buildDetailRow(
      Icons.phone_android_rounded,
      'رقم الجوال',
      phone.isNotEmpty ? phone : 'غير مرتبط (اضغط للربط)',
      textColor: phone.isNotEmpty ? Colors.white70 : const Color(0xFFD45A00),
      onTap: phone.isNotEmpty ? null : _showLinkPhoneDialog,
    );
  }

  void _showLinkPhoneDialog() {
    final TextEditingController dialogPhoneController = TextEditingController();
    final TextEditingController dialogOtpController = TextEditingController();
    bool dialogIsLoading = false;
    bool dialogIsOtpSent = false;
    String dialogVerificationId = '';
    String dialogSelectedCountryCode = '+966';
    String dialogSelectedFlag = '🇸🇦';

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (context, setStateDialog) {
            void showDialogSnackBar(String msg, {bool isError = false}) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(msg, style: GoogleFonts.cairo(fontSize: 12)),
                  backgroundColor: isError ? const Color(0xFFD32F2F) : const Color(0xFF00E676),
                  duration: const Duration(seconds: 3),
                ),
              );
            }

            void showCountryPickerInDialog() {
              showModalBottomSheet(
                context: context,
                backgroundColor: const Color(0xFF1E140F),
                shape: const RoundedRectangleBorder(
                  borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                ),
                builder: (context) {
                  return Container(
                    padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 40,
                          height: 4,
                          decoration: BoxDecoration(
                            color: Colors.white24,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                        const SizedBox(height: 15),
                        Text(
                          'اختر كود الدولة',
                          style: GoogleFonts.cairo(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 15),
                        Expanded(
                          child: ListView.builder(
                            shrinkWrap: true,
                            itemCount: _countries.length,
                            itemBuilder: (context, index) {
                              final c = _countries[index];
                              return ListTile(
                                leading: Text(c['flag']!, style: const TextStyle(fontSize: 20)),
                                title: Text(
                                  c['name']!,
                                  style: GoogleFonts.cairo(color: Colors.white, fontSize: 13),
                                ),
                                trailing: Text(
                                  c['code']!,
                                  style: GoogleFonts.cairo(color: const Color(0xFFD45A00), fontSize: 13, fontWeight: FontWeight.bold),
                                ),
                                onTap: () {
                                  setStateDialog(() {
                                    dialogSelectedCountryCode = c['code']!;
                                    dialogSelectedFlag = c['flag']!;
                                  });
                                  Navigator.pop(context);
                                },
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                  );
                },
              );
            }

            Future<void> sendOtpInDialog() async {
              String phone = dialogPhoneController.text.trim();
              if (phone.isEmpty) {
                showDialogSnackBar('يرجى إدخال رقم الجوال', isError: true);
                return;
              }
              if (phone.startsWith('0')) {
                phone = phone.substring(1);
              }
              final fullPhone = '$dialogSelectedCountryCode$phone';

              setStateDialog(() {
                dialogIsLoading = true;
              });

              try {
                await FirebaseAuth.instance.verifyPhoneNumber(
                  phoneNumber: fullPhone,
                  verificationCompleted: (PhoneAuthCredential credential) async {
                    try {
                      final user = FirebaseAuth.instance.currentUser;
                      if (user != null) {
                        await user.linkWithCredential(credential);
                        Navigator.pop(context);
                        showDialogSnackBar('تم ربط رقم الجوال بنجاح!');
                        setState(() {});
                      }
                    } catch (e) {
                      Navigator.pop(context);
                      String errMsg = 'فشل ربط رقم الجوال: $e';
                      if (e.toString().contains('credential-already-in-use')) {
                        errMsg = 'هذا الرقم مرتبط بالفعل بحساب آخر. لا يمكن استخدامه مجدداً.';
                      }
                      showDialogSnackBar(errMsg, isError: true);
                    }
                  },
                  verificationFailed: (FirebaseAuthException e) {
                    setStateDialog(() {
                      dialogIsLoading = false;
                    });
                    String msg = 'فشل إرسال رمز التحقق: ${e.message}';
                    if (e.code == 'invalid-phone-number') {
                      msg = 'رقم الجوال المدخل غير صحيح.';
                    }
                    showDialogSnackBar(msg, isError: true);
                  },
                  codeSent: (String verificationId, int? resendToken) {
                    setStateDialog(() {
                      dialogIsLoading = false;
                      dialogIsOtpSent = true;
                      dialogVerificationId = verificationId;
                    });
                    showDialogSnackBar('تم إرسال كود التحقق بنجاح');
                  },
                  codeAutoRetrievalTimeout: (String verificationId) {
                    dialogVerificationId = verificationId;
                  },
                  timeout: const Duration(seconds: 60),
                );
              } catch (e) {
                setStateDialog(() {
                  dialogIsLoading = false;
                });
                showDialogSnackBar('حدث خطأ أثناء الاتصال: $e', isError: true);
              }
            }

            Future<void> verifyOtpInDialog() async {
              final otp = dialogOtpController.text.trim();
              if (otp.isEmpty || otp.length < 6) {
                showDialogSnackBar('الرجاء إدخال كود التحقق المكون من 6 أرقام', isError: true);
                return;
              }

              setStateDialog(() {
                dialogIsLoading = true;
              });

              try {
                final credential = PhoneAuthProvider.credential(
                  verificationId: dialogVerificationId,
                  smsCode: otp,
                );
                final user = FirebaseAuth.instance.currentUser;
                if (user != null) {
                  await user.linkWithCredential(credential);
                  Navigator.pop(context);
                  showDialogSnackBar('تم ربط رقم الجوال بنجاح!');
                  setState(() {});
                }
              } catch (e) {
                setStateDialog(() {
                  dialogIsLoading = false;
                });
                String errMsg = 'كود التحقق غير صحيح أو منتهي الصلاحية';
                if (e.toString().contains('credential-already-in-use') || e.toString().contains('email-already-in-use')) {
                  errMsg = 'هذا الرقم مرتبط بالفعل بحساب آخر. لا يمكن استخدامه مجدداً.';
                }
                showDialogSnackBar(errMsg, isError: true);
              }
            }

            return AlertDialog(
              backgroundColor: const Color(0xFF1E140F),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: BorderSide(color: const Color(0xFFD45A00).withOpacity(0.3), width: 1.5),
              ),
              title: Text(
                'ربط رقم الجوال بالحساب',
                textAlign: TextAlign.center,
                style: GoogleFonts.cairo(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                ),
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (!dialogIsOtpSent) ...[
                    Text(
                      'أدخل رقم الجوال لربطه بحسابك وتوثيقه لتتمكن من استخدامه لاحقاً.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.cairo(
                        color: Colors.white54,
                        fontSize: 11,
                      ),
                    ),
                    const SizedBox(height: 20),
                    TextField(
                      controller: dialogPhoneController,
                      keyboardType: TextInputType.phone,
                      style: GoogleFonts.cairo(color: Colors.white, fontSize: 13),
                      textAlign: TextAlign.left,
                      textDirection: TextDirection.ltr,
                      decoration: InputDecoration(
                        hintText: '5xxxxxxxx',
                        hintStyle: const TextStyle(color: Colors.white24),
                        filled: true,
                        fillColor: Colors.black.withOpacity(0.3),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: const Color(0xFFD45A00).withOpacity(0.3)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Color(0xFFD45A00)),
                        ),
                        prefixIcon: GestureDetector(
                          onTap: showCountryPickerInDialog,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            margin: const EdgeInsets.only(right: 8),
                            decoration: BoxDecoration(
                              border: Border(
                                left: BorderSide(color: const Color(0xFFD45A00).withOpacity(0.3), width: 1),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(dialogSelectedFlag, style: const TextStyle(fontSize: 14)),
                                const SizedBox(width: 2),
                                Text(
                                  dialogSelectedCountryCode,
                                  style: GoogleFonts.cairo(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const Icon(Icons.arrow_drop_down, color: Color(0xFFD45A00), size: 14),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ] else ...[
                    Text(
                      'أدخل كود التحقق (OTP) المكون من 6 أرقام المرسل إلى الرقم الخاص بك.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.cairo(
                        color: Colors.white54,
                        fontSize: 11,
                      ),
                    ),
                    const SizedBox(height: 20),
                    TextField(
                      controller: dialogOtpController,
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                      style: GoogleFonts.cairo(color: Colors.white, fontSize: 16, letterSpacing: 8, fontWeight: FontWeight.bold),
                      textAlign: TextAlign.center,
                      decoration: InputDecoration(
                        counterText: '',
                        hintText: '******',
                        hintStyle: const TextStyle(color: Colors.white24, letterSpacing: 8),
                        filled: true,
                        fillColor: Colors.black.withOpacity(0.3),
                        contentPadding: const EdgeInsets.symmetric(vertical: 12),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: const Color(0xFFD45A00).withOpacity(0.3)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Color(0xFFD45A00)),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              actionsPadding: const EdgeInsets.only(bottom: 20, left: 16, right: 16),
              actions: [
                Row(
                  children: [
                    Expanded(
                      child: TextButton(
                        onPressed: dialogIsLoading ? null : () => Navigator.pop(context),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.white70,
                        ),
                        child: Text(
                          'إلغاء',
                          style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: dialogIsLoading
                            ? null
                            : (!dialogIsOtpSent ? sendOtpInDialog : verifyOtpInDialog),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFD45A00),
                          foregroundColor: const Color(0xFF100906),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                          elevation: 0,
                        ),
                        child: dialogIsLoading
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF100906)),
                              )
                            : Text(
                                !dialogIsOtpSent ? 'إرسال الرمز' : 'تأكيد وربط',
                                style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                      ),
                    ),
                  ],
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showLanguageDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF1E140F),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: BorderSide(color: const Color(0xFFD45A00).withOpacity(0.3), width: 1.5),
          ),
          title: Text(
            'تغيير لغة التطبيق\nChange Language',
            textAlign: TextAlign.center,
            style: GoogleFonts.cairo(
              color: Colors.white,
              fontSize: 15,
              fontWeight: FontWeight.bold,
            ),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                onTap: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('اللغة الحالية هي العربية بالفعل', style: GoogleFonts.cairo(fontSize: 12)),
                      backgroundColor: const Color(0xFFD45A00),
                    ),
                  );
                },
                leading: const Text('🇸🇦', style: TextStyle(fontSize: 22)),
                title: Text(
                  'العربية (Arabic)',
                  style: GoogleFonts.cairo(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                ),
                trailing: const Icon(Icons.check_circle_rounded, color: Color(0xFFD45A00)),
              ),
              Divider(color: const Color(0xFF3D2A20)),
              ListTile(
                onTap: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('English language applied successfully!', style: GoogleFonts.cairo(fontSize: 12)),
                      backgroundColor: const Color(0xFF00E676),
                    ),
                  );
                },
                leading: const Text('🇺🇸', style: TextStyle(fontSize: 22)),
                title: Text(
                  'English (الإنجليزية)',
                  style: GoogleFonts.cairo(color: Colors.white, fontSize: 13),
                ),
                trailing: Icon(Icons.circle_outlined, color: Colors.white.withOpacity(0.3)),
              ),
            ],
          ),
          actionsPadding: const EdgeInsets.only(bottom: 16, left: 16, right: 16),
          actions: [
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF35241C),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                    side: BorderSide(color: const Color(0xFFD45A00).withOpacity(0.2)),
                  ),
                  elevation: 0,
                ),
                child: Text(
                  'إغلاق / Close',
                  style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildCopyableDetailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: const Color(0xFFFF7A1F)),
              const SizedBox(width: 8),
              Text(
                label,
                style: GoogleFonts.cairo(fontSize: 12, color: const Color(0xFF8B909E), fontWeight: FontWeight.bold),
              ),
            ],
          ),
          GestureDetector(
            onTap: () {
              Clipboard.setData(ClipboardData(text: value));
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('تم نسخ المعرّف: $value بنجاح!', style: GoogleFonts.cairo(fontSize: 11)),
                  backgroundColor: const Color(0xFF00E676),
                  duration: const Duration(seconds: 2),
                ),
              );
            },
            child: Row(
              children: [
                Text(
                  value,
                  style: GoogleFonts.cairo(
                    fontSize: 12,
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(width: 6),
                const Icon(Icons.copy_rounded, size: 12, color: Color(0xFFFF7A1F)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value, {Color textColor = Colors.white70, VoidCallback? onTap}) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8.0),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Icon(icon, size: 16, color: const Color(0xFFFF7A1F)),
                const SizedBox(width: 8),
                Text(
                  label,
                  style: GoogleFonts.cairo(fontSize: 12, color: const Color(0xFF8B909E), fontWeight: FontWeight.bold),
                ),
              ],
            ),
            Text(
              value,
              style: GoogleFonts.cairo(
                fontSize: 12,
                color: textColor == Colors.white70 ? const Color(0xFFB0B5C0) : textColor,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSettingButton(IconData icon, String label, {Color textColor = Colors.white, VoidCallback? onTap}) {
    return InkWell(
      onTap: onTap ?? () {},
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10.0),
        child: Row(
          children: [
            Icon(icon, size: 18, color: textColor == Colors.white ? const Color(0xFFFF7A1F) : textColor),
            const SizedBox(width: 12),
            Text(
              label,
              style: GoogleFonts.cairo(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: textColor,
              ),
            ),
            const Spacer(),
            Icon(Icons.arrow_forward_ios_rounded, size: 12, color: Colors.white.withOpacity(0.2)),
          ],
        ),
      ),
    );
  }
}

// Extension to format double currencies cleanly
extension ProfileCurrencyFormatting on double {
  String toProfileLocaleString() {
    final RegExp reg = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');
    final parts = toStringAsFixed(2).split('.');
    final formattedInt = parts[0].replaceAllMapped(reg, (Match match) => '${match[1]},');
    if (parts[1] == '00') {
      return formattedInt;
    }
    return '$formattedInt.${parts[1]}';
  }
}
