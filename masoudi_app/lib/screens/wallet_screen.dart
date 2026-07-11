import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class WalletScreen extends StatefulWidget {
  final double balance;
  final double primaryBalance;
  final double bonusBalance;
  final List<Map<String, dynamic>> transactions;
  final Function(double, String) onTransactionExecuted; // amount, type ('deposit' or 'withdraw')

  const WalletScreen({
    Key? key,
    required this.balance,
    required this.primaryBalance,
    required this.bonusBalance,
    required this.transactions,
    required this.onTransactionExecuted,
  }) : super(key: key);

  @override
  _WalletScreenState createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  final TextEditingController _depositController = TextEditingController();
  final TextEditingController _withdrawController = TextEditingController();

  @override
  void dispose() {
    _depositController.dispose();
    _withdrawController.dispose();
    super.dispose();
  }

  void _showSnackBar(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          msg,
          textAlign: TextAlign.right,
          style: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 13),
        ),
        backgroundColor: isError ? const Color(0xFFD32F2F) : const Color(0xFF388E3C),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _handleDeposit() {
    final val = double.tryParse(_depositController.text);
    if (val == null || val <= 0) {
      _showSnackBar('يرجى إدخال مبلغ صحيح للإيداع', isError: true);
      return;
    }
    widget.onTransactionExecuted(val, 'deposit');
    _depositController.clear();
    _showSnackBar('تم شحن بقيمة ${val.toLocaleString()} ر.س بنجاح');
  }

  void _handleWithdraw() {
    final val = double.tryParse(_withdrawController.text);
    if (val == null || val <= 0) {
      _showSnackBar('يرجى إدخال مبلغ صحيح للسحب', isError: true);
      return;
    }
    if (val > widget.primaryBalance) {
      _showSnackBar('الرصيد الأساسي غير كافٍ لإتمام عملية السحب!', isError: true);
      return;
    }
    widget.onTransactionExecuted(val, 'withdraw');
    _withdrawController.clear();
    _showSnackBar('تم سحب بقيمة ${val.toLocaleString()} ر.س فوراً لحسابك البنكي');
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          // Elegant Gold Gradient Card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFFFFDF00),
                  Color(0xFFD4AF37),
                  Color(0xFF996515),
                ],
              ),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFD4AF37).withOpacity(0.3),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'رتبة مسعودي 1',
                      style: GoogleFonts.cairo(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFF030508),
                      ),
                    ),
                    const Icon(
                      Icons.diamond_rounded,
                      color: Color(0xFF030508),
                      size: 24,
                    ),
                  ],
                ),
                const SizedBox(height: 25),
                Text(
                  'مجموع رصيد المحفظة',
                  style: GoogleFonts.cairo(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF030508).withOpacity(0.6),
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  '${widget.balance.toLocaleString()} ر.س',
                  style: GoogleFonts.cairo(
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF030508),
                  ),
                ),
                const SizedBox(height: 30),
                // Breakdown
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'الرصيد الأساسي',
                            style: GoogleFonts.cairo(
                              fontSize: 10,
                              color: const Color(0xFF030508).withOpacity(0.55),
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            '${widget.primaryBalance.toLocaleString()} ر.س',
                            style: GoogleFonts.cairo(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF030508),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      width: 1,
                      height: 30,
                      color: const Color(0xFF030508).withOpacity(0.15),
                    ),
                    const SizedBox(width: 15),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'رصيد المكافآت',
                            style: GoogleFonts.cairo(
                              fontSize: 10,
                              color: const Color(0xFF030508).withOpacity(0.55),
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            '${widget.bonusBalance.toLocaleString()} ر.س',
                            style: GoogleFonts.cairo(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF030508),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Forms Grid (Horizontal layout on large screens, vertical on phone)
          Column(
            children: [
              // Deposit Form
              _buildFormCard(
                title: 'عملية إيداع سريعة',
                controller: _depositController,
                presets: [1000, 5000, 10000],
                buttonLabel: 'إيداع الآن',
                buttonColor: Colors.green,
                onExecute: _handleDeposit,
              ),
              const SizedBox(height: 16),
              // Withdraw Form
              _buildFormCard(
                title: 'عملية سحب سريعة',
                controller: _withdrawController,
                presets: [1000, 5000, 10000],
                buttonLabel: 'سحب الآن',
                buttonColor: const Color(0xFFD4AF37),
                onExecute: _handleWithdraw,
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Transaction History
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFF0C121E).withOpacity(0.6),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFD4AF37).withOpacity(0.15)),
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
                            style: GoogleFonts.cairo(color: Colors.white30, fontSize: 12),
                          ),
                        ),
                      )
                    : ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: min(widget.transactions.length, 5),
                        separatorBuilder: (context, index) => Divider(
                          color: Colors.white.withOpacity(0.05),
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
                                        color: Colors.white38,
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
                                        color: isPlus ? Colors.green : const Color(0xFFD32F2F),
                                      ),
                                    ),
                                    Text(
                                      tx['date'] ?? '',
                                      style: GoogleFonts.cairo(
                                        fontSize: 9,
                                        color: Colors.white38,
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

  Widget _buildFormCard({
    required String title,
    required TextEditingController controller,
    required List<double> presets,
    required String buttonLabel,
    required Color buttonColor,
    required VoidCallback onExecute,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF0C121E).withOpacity(0.6),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFD4AF37).withOpacity(0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.cairo(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 15),
          // Presets
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: presets.map((amount) {
              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4.0),
                  child: InkWell(
                    onTap: () {
                      controller.text = amount.toInt().toString();
                    },
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0C121E).withOpacity(0.4),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: const Color(0xFFD4AF37).withOpacity(0.2),
                        ),
                      ),
                      child: Text(
                        '${amount.toLocaleString()} ر.س',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.cairo(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFFD4AF37),
                        ),
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 15),
          // Input
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.25),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withOpacity(0.05)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: controller,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    style: GoogleFonts.cairo(color: Colors.white, fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'أدخل المبلغ المخصص...',
                      hintStyle: GoogleFonts.cairo(color: Colors.white24, fontSize: 12),
                      border: InputBorder.none,
                    ),
                  ),
                ),
                Text(
                  'ر.س',
                  style: GoogleFonts.cairo(
                    color: const Color(0xFFD4AF37),
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 15),
          // Submit Button
          SizedBox(
            width: double.infinity,
            height: 44,
            child: ElevatedButton(
              onPressed: onExecute,
              style: ElevatedButton.styleFrom(
                backgroundColor: buttonColor,
                foregroundColor: buttonColor == Colors.green ? Colors.white : const Color(0xFF030508),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
              ),
              child: Text(
                buttonLabel,
                style: GoogleFonts.cairo(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// Extension to format double currencies cleanly
extension CurrencyFormatting on double {
  String toLocaleString() {
    final RegExp reg = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');
    // Split integral and decimal parts
    final parts = toStringAsFixed(2).split('.');
    final formattedInt = parts[0].replaceAllMapped(reg, (Match match) => '${match[1]},');
    // If decimal part is zero, return integral part only
    if (parts[1] == '00') {
      return formattedInt;
    }
    return '$formattedInt.${parts[1]}';
  }
}


