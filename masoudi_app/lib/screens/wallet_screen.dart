import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:url_launcher/url_launcher.dart';
import '../utils/formatters.dart';
import '../services/api_cache.dart';

class WalletScreen extends StatefulWidget {
  final String serverUrl;
  final String playerId;
  final double balance;
  final double primaryBalance;
  final double bonusBalance;
  final double agentBalance;
  final bool isAgent;
  final List<Map<String, dynamic>> transactions;
  final Function(double, String) onTransactionExecuted; // amount, type ('deposit' or 'withdraw')

  const WalletScreen({
    Key? key,
    required this.serverUrl,
    required this.playerId,
    required this.balance,
    required this.primaryBalance,
    required this.bonusBalance,
    required this.agentBalance,
    required this.isAgent,
    required this.transactions,
    required this.onTransactionExecuted,
  }) : super(key: key);

  @override
  _WalletScreenState createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  Future<void> _showAgentTransferDialog() async {
    final TextEditingController recipientController = TextEditingController();
    final TextEditingController amountController = TextEditingController();
    bool isTransferring = false;

    await showDialog(
      context: context,
      barrierDismissible: true,
      builder: (BuildContext dialogContext) {
        return StatefulBuilder(
          builder: (context, setStateDialog) {
            final double currentBalance = widget.agentBalance;
            return AlertDialog(
              backgroundColor: const Color(0xFF291B15),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: const BorderSide(color: Color(0xFF3D2A20), width: 1.5),
              ),
              title: Row(
                children: [
                  const Icon(Icons.swap_horizontal_circle_rounded, color: Color(0xFFFF7A1F), size: 24),
                  const SizedBox(width: 8),
                  Text(
                    'تحويل كوينز إلى لاعب',
                    style: GoogleFonts.cairo(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'رصيدك المتاح للتوزيع: ${currentBalance.toLocaleString()} كوين',
                    style: GoogleFonts.cairo(fontSize: 11, color: const Color(0xFF8B909E)),
                  ),
                  const SizedBox(height: 16),
                  
                  // Recipient ID Field
                  Text(
                    'معرّف اللاعب المستلم (ID)',
                    style: GoogleFonts.cairo(fontSize: 11, color: Colors.white70, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: const Color(0xFF35241C),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF3D2A20)),
                    ),
                    child: TextField(
                      controller: recipientController,
                      keyboardType: TextInputType.number,
                      enabled: !isTransferring,
                      style: GoogleFonts.cairo(color: Colors.white, fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'أدخل معرّف اللاعب المستلم...',
                        hintStyle: GoogleFonts.cairo(color: const Color(0xFF6B7080), fontSize: 12),
                        border: InputBorder.none,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Amount Field
                  Text(
                    'كمية الكوينز',
                    style: GoogleFonts.cairo(fontSize: 11, color: Colors.white70, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: const Color(0xFF35241C),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF3D2A20)),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: amountController,
                            keyboardType: TextInputType.number,
                            enabled: !isTransferring,
                            style: GoogleFonts.cairo(color: Colors.white, fontSize: 13),
                            decoration: InputDecoration(
                              hintText: 'أدخل عدد الكوينز...',
                              hintStyle: GoogleFonts.cairo(color: const Color(0xFF6B7080), fontSize: 12),
                              border: InputBorder.none,
                            ),
                          ),
                        ),
                        Text(
                          '🪙 كوين',
                          style: GoogleFonts.cairo(color: const Color(0xFFFF7A1F), fontWeight: FontWeight.bold, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: isTransferring ? null : () => Navigator.of(dialogContext).pop(),
                  child: Text(
                    'إلغاء',
                    style: GoogleFonts.cairo(color: const Color(0xFF8B909E), fontSize: 13),
                  ),
                ),
                ElevatedButton(
                  onPressed: isTransferring
                      ? null
                      : () async {
                          final recipientId = recipientController.text.trim();
                          final amountVal = double.tryParse(amountController.text.trim());

                          if (recipientId.isEmpty || amountVal == null || amountVal <= 0) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  'يرجى ملء جميع الحقول بشكل صحيح',
                                  textAlign: TextAlign.right,
                                  style: GoogleFonts.cairo(fontWeight: FontWeight.bold),
                                ),
                                backgroundColor: const Color(0xFFD32F2F),
                              ),
                            );
                            return;
                          }

                          if (amountVal > currentBalance) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  'رصيدك الحالي غير كافٍ لإجراء هذه المعاملة',
                                  textAlign: TextAlign.right,
                                  style: GoogleFonts.cairo(fontWeight: FontWeight.bold),
                                ),
                                backgroundColor: const Color(0xFFD32F2F),
                              ),
                            );
                            return;
                          }

                          setStateDialog(() {
                            isTransferring = true;
                          });

                          try {
                            final res = await http.post(
                              Uri.parse('${widget.serverUrl}/api/agent-transfer'),
                              headers: {'Content-Type': 'application/json'},
                              body: jsonEncode({
                                'agentId': widget.playerId,
                                'recipientId': recipientId,
                                'amount': amountVal,
                              }),
                            ).timeout(const Duration(seconds: 15));

                            if (res.statusCode == 200) {
                              final bodyDecoded = jsonDecode(res.body);
                              if (bodyDecoded['success'] == true) {
                                Navigator.of(dialogContext).pop();
                                widget.onTransactionExecuted(amountVal, 'transfer');
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      'تم تحويل ${amountVal.toLocaleString()} كوين بنجاح للاعب $recipientId 🚀',
                                      textAlign: TextAlign.right,
                                      style: GoogleFonts.cairo(fontWeight: FontWeight.bold),
                                    ),
                                    backgroundColor: const Color(0xFF388E3C),
                                  ),
                                );
                              }
                            } else {
                              final errorMsg = jsonDecode(res.body)['error'] ?? 'فشلت عملية التحويل';
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                    errorMsg,
                                    textAlign: TextAlign.right,
                                    style: GoogleFonts.cairo(fontWeight: FontWeight.bold),
                                  ),
                                  backgroundColor: const Color(0xFFD32F2F),
                                ),
                              );
                              setStateDialog(() {
                                isTransferring = false;
                              });
                            }
                          } catch (e) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  'حدث خطأ في الاتصال بالخادم: $e',
                                  textAlign: TextAlign.right,
                                  style: GoogleFonts.cairo(fontWeight: FontWeight.bold),
                                ),
                                backgroundColor: const Color(0xFFD32F2F),
                              ),
                            );
                            setStateDialog(() {
                              isTransferring = false;
                            });
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFF7A1F),
                    foregroundColor: const Color(0xFF100906),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: isTransferring
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(color: Color(0xFF100906), strokeWidth: 2),
                        )
                      : Text(
                          'تحويل الآن',
                          style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.bold),
                        ),
                ),
              ],
            );
          },
        );
      },
    );
  }
  List<dynamic> _agents = [];
  List<dynamic> _p2pAgents = []; // اللاعبون المفعلون كوكلاء P2P (لعملية البيع)
  Map<String, dynamic> _settings = {};
  Map<String, Map<String, dynamic>> _playersMap = {}; // playerId -> player data
  bool _isLoadingAgents = true;
  String _selectedCountry = "";
  List<String> _countries = [];

  @override
  void initState() {
    super.initState();
    _fetchAgents();
  }

  Future<void> _fetchAgents() async {
    // 1. Try to load from cache first for instant display
    if (ApiCache.data != null) {
      final decoded = ApiCache.data!;
      final agentsList = decoded['agents'] as List<dynamic>? ?? [];
      final Set<String> uniqueCountries = {};
      for (var agent in agentsList) {
        final countriesField = agent['countries'];
        if (countriesField is List && countriesField.isNotEmpty) {
          for (var c in countriesField) {
            final cs = c?.toString().trim() ?? '';
            if (cs.isNotEmpty) uniqueCountries.add(cs);
          }
        } else if (agent['country'] != null && agent['country'].toString().isNotEmpty) {
          uniqueCountries.add(agent['country'].toString().trim());
        }
      }
      final playersList = decoded['players'] as List<dynamic>? ?? [];
      final p2pList = playersList.where((p) => p['isAgent'] == true && p['id'] != widget.playerId).toList();

      _settings = Map<String, dynamic>.from(decoded['settings'] ?? {});
      _agents = agentsList;
      _p2pAgents = p2pList;
      _countries = uniqueCountries.toList();
      _playersMap = {};
      for (var p in playersList) {
        final pid = p['id']?.toString();
        if (pid != null) _playersMap[pid] = Map<String, dynamic>.from(p);
      }
      if (_countries.isNotEmpty && _selectedCountry.isEmpty) {
        _selectedCountry = _countries.first;
      }
      _isLoadingAgents = false;
    } else {
      _isLoadingAgents = true;
    }

    try {
      final response = await http.get(Uri.parse('${widget.serverUrl}/api/data')).timeout(const Duration(seconds: 15));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        ApiCache.data = decoded; // Update Cache
        final agentsList = decoded['agents'] as List<dynamic>? ?? [];
        
        // Extract unique countries
        final Set<String> uniqueCountries = {};
        for (var agent in agentsList) {
          final countriesField = agent['countries'];
          if (countriesField is List && countriesField.isNotEmpty) {
            for (var c in countriesField) {
              final cs = c?.toString().trim() ?? '';
              if (cs.isNotEmpty) uniqueCountries.add(cs);
            }
          } else if (agent['country'] != null && agent['country'].toString().isNotEmpty) {
            uniqueCountries.add(agent['country'].toString().trim());
          }
        }

        final playersList = decoded['players'] as List<dynamic>? ?? [];
        final p2pList = playersList.where((p) => p['isAgent'] == true && p['id'] != widget.playerId).toList();

        if (!mounted) return;
        setState(() {
          _settings = Map<String, dynamic>.from(decoded['settings'] ?? {});
          _agents = agentsList;
          _p2pAgents = p2pList;
          _countries = uniqueCountries.toList();
          _playersMap = {};
          for (var p in playersList) {
            final pid = p['id']?.toString();
            if (pid != null) _playersMap[pid] = Map<String, dynamic>.from(p);
          }
          if (_countries.isNotEmpty && !_countries.contains(_selectedCountry)) {
            _selectedCountry = _countries.first;
          }
          _isLoadingAgents = false;
        });
      } else {
        if (!mounted) return;
        setState(() {
          _isLoadingAgents = false;
        });
      }
    } catch (e) {
      debugPrint("Error fetching agents: $e");
      if (!mounted) return;
      setState(() {
        _isLoadingAgents = false;
      });
    }
  }

  Future<void> _contactAgent(Map<String, dynamic> agent) async {
    final phone = agent['phone'] ?? "";
    if (phone.isEmpty) return;

    // Clean phone number: remove non-digits
    var cleanedPhone = phone.replaceAll(RegExp(r'[^\d]'), '');
    // If it starts with 00, remove the 00
    if (cleanedPhone.startsWith('00')) {
      cleanedPhone = cleanedPhone.substring(2);
    }

    final message = "مرحباً وكيل شحن مسعودي، أريد شراء كوينز للعب. معرف حسابي في اللعبة هو: ${widget.playerId}";
    final encodedMsg = Uri.encodeComponent(message);

    // List of URIs to try in order
    final List<Uri> uris = [
      // 1. Direct app link (works instantly if WhatsApp is installed)
      Uri.parse("whatsapp://send?phone=$cleanedPhone&text=$encodedMsg"),
      // 2. Short link
      Uri.parse("https://wa.me/$cleanedPhone?text=$encodedMsg"),
      // 3. Web API link
      Uri.parse("https://api.whatsapp.com/send?phone=$cleanedPhone&text=$encodedMsg"),
    ];

    bool success = false;
    for (var uri in uris) {
      try {
        debugPrint("Trying to launch WhatsApp URI: $uri");
        success = await launchUrl(
          uri,
          mode: LaunchMode.externalApplication,
        );
        if (success) {
          debugPrint("Successfully launched WhatsApp: $uri");
          break;
        }
      } catch (e) {
        debugPrint("Failed to launch $uri: $e");
      }
    }

    if (!success) {
      // Last resort fallback
      try {
        success = await launchUrl(
          Uri.parse("https://api.whatsapp.com/send?phone=$cleanedPhone&text=$encodedMsg"),
          mode: LaunchMode.platformDefault,
        );
      } catch (e) {
        debugPrint("Last resort failed: $e");
      }
    }

    if (!success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'تعذر فتح الواتساب. تأكد من تثبيت التطبيق أو كتابة رقم الوكيل بالصيغة الدولية: $phone',
            textAlign: TextAlign.right,
            style: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 13),
          ),
          backgroundColor: const Color(0xFFD32F2F),
          duration: const Duration(seconds: 5),
        ),
      );
    }
  }

  Future<void> _showSellCoinsToAgentDialog(Map<String, dynamic> agent) async {
    final TextEditingController amountController = TextEditingController();
    bool isSelling = false;
    bool _confirmed = false; // tracks if confirmation step passed

    // Detect if this is a charging-agent (has 'id' starting with 'agent-') or a P2P player
    final bool isChargingAgent = (agent['id'] ?? '').toString().startsWith('agent-');
    final String? agentPlayerId = agent['playerId']?.toString();

    // Resolve real agent details
    final Map<String, dynamic>? playerData = (agentPlayerId != null && agentPlayerId.isNotEmpty)
        ? _playersMap[agentPlayerId]
        : null;
    final String? photoUrl = playerData?['photoUrl']?.toString();
    final String realName = playerData?['name']?.toString() ?? agent['name'] ?? 'وكيل معتمد';

    final String dialogCountries = (() {
      final f = agent['countries'];
      if (f is List && f.isNotEmpty) {
        return (f as List).map((c) => c.toString()).join(' · ');
      }
      return agent['country']?.toString() ?? '';
    })();

    await showDialog(
      context: context,
      barrierDismissible: true,
      builder: (BuildContext dialogContext) {
        return StatefulBuilder(
          builder: (context, setStateDialog) {
            return Directionality(
              textDirection: TextDirection.rtl,
              child: AlertDialog(
                backgroundColor: const Color(0xFF291B15),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                  side: const BorderSide(color: Color(0xFF3D2A20), width: 1.5),
                ),
                title: Row(
                  children: [
                    const Icon(Icons.sell_rounded, color: Color(0xFF00E676), size: 24),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'بيع كوينز للوكيل',
                        style: GoogleFonts.cairo(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
                content: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Agent info card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF35241C),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFF3D2A20)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              // Avatar
                              Container(
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: const Color(0xFFFF7A1F),
                                    width: 1.5,
                                  ),
                                  color: const Color(0xFF1F140F),
                                ),
                                child: ClipOval(
                                  child: (photoUrl != null && photoUrl.isNotEmpty)
                                      ? Image.network(
                                          photoUrl,
                                          fit: BoxFit.cover,
                                          errorBuilder: (_, __, ___) => const Icon(
                                            Icons.person_rounded,
                                            color: Color(0xFFFF7A1F),
                                            size: 20,
                                          ),
                                        )
                                      : const Icon(
                                          Icons.person_rounded,
                                          color: Color(0xFFFF7A1F),
                                          size: 20,
                                        ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              // Name and Verified Badge
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Flexible(
                                          child: Text(
                                            realName,
                                            style: GoogleFonts.cairo(
                                              fontSize: 13,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.white,
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        const SizedBox(width: 4),
                                        const Icon(
                                          Icons.verified_rounded,
                                          color: Color(0xFF1DA1F2),
                                          size: 15,
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 2),
                                    if (dialogCountries.isNotEmpty)
                                      Row(
                                        children: [
                                          const Icon(Icons.location_on_rounded,
                                              color: Color(0xFF8B909E), size: 10),
                                          const SizedBox(width: 3),
                                          Expanded(
                                            child: Text(
                                              dialogCountries,
                                              style: GoogleFonts.cairo(
                                                  fontSize: 9, color: const Color(0xFF8B909E)),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ],
                                      ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        const SizedBox(height: 8),
                        // Agent playerId badge
                        if (isChargingAgent && agentPlayerId != null && agentPlayerId.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFF00897B).withOpacity(0.15),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFF00897B).withOpacity(0.4)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.link_rounded, color: Color(0xFF00E676), size: 13),
                                const SizedBox(width: 5),
                                Text(
                                  'مرتبط بحساب #$agentPlayerId',
                                  style: GoogleFonts.cairo(
                                    fontSize: 10,
                                    color: const Color(0xFF00E676),
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          )
                        else if (isChargingAgent)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.redAccent.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.redAccent.withOpacity(0.3)),
                            ),
                            child: Text(
                              '⚠️ غير مرتبط بحساب تطبيق — تواصل مع الإدارة',
                              style: GoogleFonts.cairo(
                                fontSize: 10,
                                color: Colors.redAccent,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1F140F),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFFF7A1F).withOpacity(0.15)),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'رصيدك الأساسي (قابل للبيع):',
                              style: GoogleFonts.cairo(fontSize: 11, color: const Color(0xFF8B909E)),
                            ),
                            Text(
                              '${widget.primaryBalance.toLocaleString()} كوين 🪙',
                              style: GoogleFonts.cairo(fontSize: 12, color: Colors.white, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'سعر البيع:',
                              style: GoogleFonts.cairo(fontSize: 11, color: const Color(0xFF8B909E)),
                            ),
                            Text(
                              '1\$ = ${double.parse((_settings['coinSellRate'] ?? 20000).toString()).toLocaleString()} كوين',
                              style: GoogleFonts.cairo(
                                fontSize: 12,
                                color: const Color(0xFFFF7A1F),
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    'كمية الكوينز للبيع',
                    style: GoogleFonts.cairo(fontSize: 11, color: Colors.white70, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: const Color(0xFF35241C),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF3D2A20)),
                    ),
                    child: TextField(
                      controller: amountController,
                      keyboardType: TextInputType.number,
                      enabled: !isSelling,
                      style: GoogleFonts.cairo(color: Colors.white, fontSize: 14),
                      decoration: InputDecoration(
                        hintText: 'أدخل كمية الكوينز...',
                        hintStyle: GoogleFonts.cairo(color: const Color(0xFF6B7080), fontSize: 12),
                        border: InputBorder.none,
                        suffix: Text('🪙 كوين', style: GoogleFonts.cairo(fontSize: 11, color: const Color(0xFF8B909E))),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  // Confirmation checkbox
                  GestureDetector(
                    onTap: () => setStateDialog(() { _confirmed = !_confirmed; }),
                    child: Row(
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          width: 20,
                          height: 20,
                          decoration: BoxDecoration(
                            color: _confirmed ? const Color(0xFF00897B) : Colors.transparent,
                            borderRadius: BorderRadius.circular(5),
                            border: Border.all(
                              color: _confirmed ? const Color(0xFF00897B) : const Color(0xFF6B7080),
                              width: 1.5,
                            ),
                          ),
                          child: _confirmed
                              ? const Icon(Icons.check_rounded, color: Colors.white, size: 14)
                              : null,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'أؤكد أن الوكيل سيدفع قيمة الكوينز نقداً وأنني أوافق على الخصم الفوري',
                            style: GoogleFonts.cairo(
                              fontSize: 10,
                              color: _confirmed ? const Color(0xFF00E676) : Colors.orange.shade300,
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: isSelling ? null : () => Navigator.of(dialogContext).pop(),
                  child: Text('إلغاء', style: GoogleFonts.cairo(color: const Color(0xFF6B7080))),
                ),
                ElevatedButton(
                  onPressed: (isSelling || !_confirmed)
                      ? null
                      : () async {
                          final amountVal = double.tryParse(amountController.text.trim());
                          if (amountVal == null || amountVal <= 0) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                              content: Text('أدخل كمية صحيحة', style: GoogleFonts.cairo()),
                              backgroundColor: const Color(0xFFD32F2F),
                            ));
                            return;
                          }
                          if (amountVal > widget.primaryBalance) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                              content: Text(
                                'رصيد المكافآت لا يمكن بيعه — يمكن استخدامه في الألعاب فقط. رصيدك الأساسي القابل للبيع: ${widget.primaryBalance.toLocaleString()} كوين',
                                textAlign: TextAlign.right,
                                style: GoogleFonts.cairo(fontSize: 12),
                              ),
                              backgroundColor: const Color(0xFFD32F2F),
                              duration: const Duration(seconds: 4),
                            ));
                            return;
                          }
                          if (isChargingAgent && (agentPlayerId == null || agentPlayerId.isEmpty)) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                              content: Text('هذا الوكيل غير مرتبط بحساب تطبيق — تواصل مع الإدارة', style: GoogleFonts.cairo()),
                              backgroundColor: const Color(0xFFD32F2F),
                            ));
                            return;
                          }

                          setStateDialog(() { isSelling = true; });
                          try {
                            // Build request body based on agent type
                            final Map<String, dynamic> body = {
                              'playerId': widget.playerId,
                              'amount': amountVal,
                            };
                            if (isChargingAgent) {
                              body['agentEntryId'] = agent['id']; // charging agent entry
                            } else {
                              body['agentId'] = agent['playerId'] ?? agent['id']; // P2P player
                            }

                            final res = await http.post(
                              Uri.parse('${widget.serverUrl}/api/player-sell-to-agent'),
                              headers: {'Content-Type': 'application/json'},
                              body: jsonEncode(body),
                            ).timeout(const Duration(seconds: 15));

                            if (res.statusCode == 200) {
                              final data = jsonDecode(res.body);
                              if (data['success'] == true) {
                                Navigator.of(dialogContext).pop();
                                widget.onTransactionExecuted(-amountVal, 'sell');
                                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                                  content: Text(
                                    'تم بيع ${amountVal.toLocaleString()} كوين للوكيل ${data['agentName'] ?? ''} بنجاح 💰',
                                    textAlign: TextAlign.right,
                                    style: GoogleFonts.cairo(fontWeight: FontWeight.bold),
                                  ),
                                  backgroundColor: const Color(0xFF00897B),
                                ));
                              } else {
                                final err = data['error'] ?? 'فشلت عملية البيع';
                                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                                  content: Text(err, style: GoogleFonts.cairo()),
                                  backgroundColor: const Color(0xFFD32F2F),
                                ));
                                setStateDialog(() { isSelling = false; });
                              }
                            } else {
                              final err = jsonDecode(res.body)['error'] ?? 'فشلت عملية البيع';
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                                content: Text(err, style: GoogleFonts.cairo()),
                                backgroundColor: const Color(0xFFD32F2F),
                              ));
                              setStateDialog(() { isSelling = false; });
                            }
                          } catch (e) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                              content: Text('خطأ في الاتصال: $e', style: GoogleFonts.cairo()),
                              backgroundColor: const Color(0xFFD32F2F),
                            ));
                            setStateDialog(() { isSelling = false; });
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _confirmed ? const Color(0xFF00897B) : const Color(0xFF3D4A3D),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: isSelling
                      ? const SizedBox(
                          width: 16, height: 16,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : Text(
                          _confirmed ? 'بيع الآن ✓' : 'أكّد أولاً',
                          style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.bold),
                        ),
                ),
              ],
            ), // Closes AlertDialog
          ); // Closes Directionality
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    // Filter agents by selected country — supports both `countries` (array) and `country` (string)
    final filteredAgents = _agents.where((ag) {
      final countriesField = ag['countries'];
      if (countriesField is List && countriesField.isNotEmpty) {
        return countriesField.any((c) => c?.toString().trim() == _selectedCountry);
      }
      // Fallback: old string field
      return (ag['country'] ?? '').toString().trim() == _selectedCountry;
    }).toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          // Top Wallet Balance Card (Matching Screenshot 1 exactly!)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFF241914),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFFF7A1F).withOpacity(0.3), width: 1.5),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFFF7A1F).withOpacity(0.12),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Header Row: Icon + Title on Left, MASOUDI COINS badge on Right
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFF7A1F).withOpacity(0.18),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(
                            Icons.account_balance_wallet_rounded,
                            color: Color(0xFFFF7A1F),
                            size: 18,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'محفظة مسعودي',
                          style: GoogleFonts.cairo(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFF7A1F).withOpacity(0.15),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFFF7A1F).withOpacity(0.3)),
                      ),
                      child: Text(
                        'MASOUDI COINS',
                        style: GoogleFonts.cairo(
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFFFF7A1F),
                          letterSpacing: 1,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  'رصيدك الحالي',
                  style: GoogleFonts.cairo(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF8B909E),
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Text(
                      widget.balance.toLocaleString(),
                      style: GoogleFonts.cairo(
                        fontSize: 28,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Text('🪙', style: TextStyle(fontSize: 18)),
                    const SizedBox(width: 4),
                    Text(
                      'كوين',
                      style: GoogleFonts.cairo(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFFFF7A1F),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                // Sub-balance badge matching Screenshot 1: ⭐ $ الرصيد الأساسي: 5,000
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1F140F),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFFF7A1F).withOpacity(0.2)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.star_rounded, color: Color(0xFFFFD700), size: 14),
                      const SizedBox(width: 6),
                      Text(
                        '\$ الرصيد الأساسي: ${widget.primaryBalance.toLocaleString()}',
                        style: GoogleFonts.cairo(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFFFF7A1F),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Agent Dashboard UI (Only shown to authorized agents)
          if (widget.isAgent) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [
                    Color(0xFF291B15),
                    Color(0xFF35241C),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFFFF7A1F).withOpacity(0.35), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFFF7A1F).withOpacity(0.08),
                    blurRadius: 16,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.shield_rounded, color: Color(0xFFFF7A1F), size: 22),
                          const SizedBox(width: 8),
                          Text(
                            'لوحة تحكم الوكيل المعتمد (P2P)',
                            style: GoogleFonts.cairo(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFF7A1F).withOpacity(0.12),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFFF7A1F).withOpacity(0.3)),
                        ),
                        child: Text(
                          'نشط ✅',
                          style: GoogleFonts.cairo(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFFFF7A1F),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  
                  // Premium Agent Balance display
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1F140F),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFFF7A1F).withOpacity(0.15)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'رصيد كوينز التوزيع (الوكالة)',
                              style: GoogleFonts.cairo(
                                fontSize: 10,
                                color: const Color(0xFF8B909E),
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${widget.agentBalance.toLocaleString()} كوين 🪙',
                              style: GoogleFonts.cairo(
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                                color: const Color(0xFFFF7A1F),
                              ),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.redAccent.withOpacity(0.08),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.redAccent.withOpacity(0.2)),
                          ),
                          child: Text(
                            'غير مخصص للعب 🔒',
                            style: GoogleFonts.cairo(
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                              color: Colors.redAccent,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  Text(
                    'بصفتك وكيلاً معتمداً، يمكنك تحويل الكوينز مباشرة إلى حسابات اللاعبين وبيعها لهم بشكل آمن.',
                    style: GoogleFonts.cairo(
                      fontSize: 11,
                      color: const Color(0xFF8B909E),
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Large Action Button to Send Coins
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton.icon(
                      onPressed: _showAgentTransferDialog,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFFF7A1F),
                        foregroundColor: const Color(0xFF100906),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        elevation: 0,
                      ),
                      icon: const Icon(Icons.swap_horizontal_circle_rounded, size: 20),
                      label: Text(
                        'شحن عملات معدنية للاعب',
                        style: GoogleFonts.cairo(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],

          // Recharging Agents Section
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
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'شراء كوينز (الوكلاء المعتمدون)',
                      style: GoogleFonts.cairo(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const Icon(Icons.verified_user_rounded, color: Color(0xFF00E676), size: 18),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  'اختر دولتك وتواصل مع الوكيل المعتمد مباشرة لشحن رصيد حسابك بأمان عبر وسائل الدفع المحلية.',
                  style: GoogleFonts.cairo(
                    fontSize: 11,
                    color: const Color(0xFF8B909E),
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 16),

                // Countries horizontal selector
                if (_countries.isNotEmpty)
                  SizedBox(
                    height: 38,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: _countries.length,
                      itemBuilder: (context, index) {
                        final country = _countries[index];
                        final isSelected = country == _selectedCountry;
                        return GestureDetector(
                          onTap: () {
                            setState(() {
                              _selectedCountry = country;
                            });
                          },
                          child: Container(
                            margin: const EdgeInsets.only(left: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                            decoration: BoxDecoration(
                              color: isSelected ? const Color(0xFFFF7A1F) : const Color(0xFF35241C),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: isSelected ? const Color(0xFFFF7A1F) : const Color(0xFF3D2A20),
                              ),
                            ),
                            child: Center(
                              child: Text(
                                country,
                                style: GoogleFonts.cairo(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: isSelected ? const Color(0xFF100906) : Colors.white,
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                
                const SizedBox(height: 16),

                // Agents List
                if (_isLoadingAgents)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 24.0),
                      child: CircularProgressIndicator(color: Color(0xFFFF7A1F)),
                    ),
                  )
                else if (filteredAgents.isEmpty)
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 24.0),
                      child: Text(
                        _countries.isEmpty ? 'لا يوجد وكلاء متوفرون حالياً' : 'لا يوجد وكلاء متوفرون في هذه الدولة',
                        style: GoogleFonts.cairo(color: const Color(0xFF6B7080), fontSize: 12),
                      ),
                    ),
                  )
                else
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: filteredAgents.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final ag = Map<String, dynamic>.from(filteredAgents[index]);
                      final String? agPlayerId = ag['playerId']?.toString();
                      final Map<String, dynamic>? playerData = (agPlayerId != null && agPlayerId.isNotEmpty)
                          ? _playersMap[agPlayerId]
                          : null;
                      final String? photoUrl = playerData?['photoUrl']?.toString();
                      final String realName = playerData?['name']?.toString() ?? ag['name'] ?? 'وكيل معتمد';
                      // Compute countries display string
                      final agCountries = (() {
                        final f = ag['countries'];
                        if (f is List && f.isNotEmpty) {
                          return (f as List).map((c) => c.toString()).join(' · ');
                        }
                        return ag['country']?.toString() ?? '';
                      })();

                      return Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF35241C),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFF3D2A20)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // ── Agent header: avatar + name + verified badge ──
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                // Avatar
                                Container(
                                  width: 48,
                                  height: 48,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: const Color(0xFFFF7A1F),
                                      width: 2,
                                    ),
                                    color: const Color(0xFF1F140F),
                                  ),
                                  child: ClipOval(
                                    child: (photoUrl != null && photoUrl.isNotEmpty)
                                        ? Image.network(
                                            photoUrl,
                                            fit: BoxFit.cover,
                                            errorBuilder: (_, __, ___) => const Icon(
                                              Icons.person_rounded,
                                              color: Color(0xFFFF7A1F),
                                              size: 26,
                                            ),
                                          )
                                        : const Icon(
                                            Icons.person_rounded,
                                            color: Color(0xFFFF7A1F),
                                            size: 26,
                                          ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                // Name + verified badge + countries
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Flexible(
                                            child: Text(
                                              realName,
                                              style: GoogleFonts.cairo(
                                                fontSize: 13,
                                                fontWeight: FontWeight.bold,
                                                color: Colors.white,
                                              ),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                          const SizedBox(width: 5),
                                          // Blue verified badge
                                          const Icon(
                                            Icons.verified_rounded,
                                            color: Color(0xFF1DA1F2),
                                            size: 16,
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 3),
                                      Wrap(
                                        spacing: 6,
                                        runSpacing: 4,
                                        crossAxisAlignment: WrapCrossAlignment.center,
                                        children: [
                                          Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              const Icon(Icons.location_on_rounded,
                                                  color: Color(0xFF8B909E), size: 11),
                                              const SizedBox(width: 3),
                                              Text(
                                                agCountries,
                                                style: GoogleFonts.cairo(
                                                  fontSize: 10,
                                                  color: const Color(0xFF8B909E),
                                                ),
                                              ),
                                            ],
                                          ),
                                          if (agPlayerId != null && agPlayerId.isNotEmpty)
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                              decoration: BoxDecoration(
                                                color: const Color(0xFF00897B).withOpacity(0.15),
                                                borderRadius: BorderRadius.circular(6),
                                                border: Border.all(
                                                  color: const Color(0xFF00897B).withOpacity(0.4),
                                                ),
                                              ),
                                              child: Text(
                                                '#$agPlayerId',
                                                style: GoogleFonts.cairo(
                                                  fontSize: 9,
                                                  color: const Color(0xFF00E676),
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                // Rate badge
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFF7A1F).withOpacity(0.12),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    'شراء: 1\$ = ${double.parse((_settings['coinBuyRate'] ?? 10000).toString()).toLocaleString()} كوين',
                                    style: GoogleFonts.cairo(
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold,
                                      color: const Color(0xFFFF7A1F),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            // Divider
                            Container(
                              height: 1,
                              color: const Color(0xFF3D2A20),
                            ),
                            const SizedBox(height: 10),
                            // Payment methods
                            Row(
                              children: [
                                const Icon(Icons.payment_rounded,
                                    color: Color(0xFF8B909E), size: 13),
                                const SizedBox(width: 5),
                                Expanded(
                                  child: Text(
                                    ag['paymentMethods'] ?? '',
                                    style: GoogleFonts.cairo(
                                      fontSize: 11,
                                      color: const Color(0xFF8B909E),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            // Action buttons
                            Row(
                              children: [
                                Expanded(
                                  child: SizedBox(
                                    height: 38,
                                    child: ElevatedButton.icon(
                                      onPressed: () => _contactAgent(ag),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF25D366),
                                        foregroundColor: Colors.white,
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                        elevation: 0,
                                      ),
                                      icon: const Icon(Icons.chat_bubble_outline_rounded, size: 14),
                                      label: Text(
                                        'شحن الآن',
                                        style: GoogleFonts.cairo(
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: SizedBox(
                                    height: 38,
                                    child: ElevatedButton.icon(
                                      onPressed: () => _showSellCoinsToAgentDialog(ag),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF00897B),
                                        foregroundColor: Colors.white,
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                        elevation: 0,
                                      ),
                                      icon: const Icon(Icons.sell_rounded, size: 14),
                                      label: Text(
                                        'بيع كوينز',
                                        style: GoogleFonts.cairo(
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Transaction History
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
                  'سجل العمليات الأخيرة',
                  style: GoogleFonts.cairo(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 15),
                widget.transactions.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 20.0),
                          child: Text(
                            'لا توجد عمليات حالياً',
                            style: GoogleFonts.cairo(color: const Color(0xFF6B7080), fontSize: 12),
                          ),
                        ),
                      )
                    : ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: min(widget.transactions.length, 5),
                        separatorBuilder: (context, index) => const Divider(
                          color: Color(0xFF3D2A20),
                        ),
                        itemBuilder: (context, index) {
                          final tx = widget.transactions[index];
                          final isPlus = tx['amount'].toString().startsWith('+');
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 6.0),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      tx['type'] ?? '',
                                      style: GoogleFonts.cairo(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                      ),
                                    ),
                                    Text(
                                      tx['id'] ?? '',
                                      style: GoogleFonts.cairo(
                                        fontSize: 9,
                                        color: const Color(0xFF6B7080),
                                      ),
                                    ),
                                  ],
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      tx['amount'] ?? '',
                                      style: GoogleFonts.cairo(
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                        color: isPlus ? const Color(0xFF00E676) : const Color(0xFFD32F2F),
                                      ),
                                    ),
                                    Text(
                                      tx['date'] ?? '',
                                      style: GoogleFonts.cairo(
                                        fontSize: 9,
                                        color: const Color(0xFF6B7080),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }
}


