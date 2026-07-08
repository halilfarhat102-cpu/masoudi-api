import 'package:flutter/material';
import 'package:google_fonts/google_fonts.dart';

class ProfileScreen extends StatelessWidget {
  final VoidCallback onLogout;

  const ProfileScreen({
    Key? key,
    required this.onLogout,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          // Profile Hero Card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
            decoration: BoxDecoration(
              color: const Color(0xFF0C121E).withOpacity(0.6),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFFD4AF37).withOpacity(0.2)),
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
                Stack(
                  alignment: Alignment.bottomRight,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(3),
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          colors: [Color(0xFFFFDF00), Color(0xFFD4AF37)],
                        ),
                      ),
                      child: const CircleAvatar(
                        radius: 46,
                        backgroundColor: Color(0xFF131A26),
                        // Mock avatar representation or generic user icon
                        child: Icon(
                          Icons.person,
                          size: 50,
                          color: Color(0xFFD4AF37),
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: const BoxDecoration(
                        color: Color(0xFFD4AF37),
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        '1',
                        style: GoogleFonts.cairo(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF030508),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 15),
                Text(
                  'أحمد الحربي',
                  style: GoogleFonts.cairo(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFD4AF37).withOpacity(0.12),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFD4AF37).withOpacity(0.3)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.diamond_rounded, color: Color(0xFFD4AF37), size: 12),
                      const SizedBox(width: 4),
                      Text(
                        'عضو متميز - رتبة 1',
                        style: GoogleFonts.cairo(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFFD4AF37),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 25),

                // Progress to Rank 2
                Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.between,
                      children: [
                        Text(
                          'التقدم للمستوى الثاني',
                          style: GoogleFonts.cairo(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Colors.white70,
                          ),
                        ),
                        Text(
                          '70%',
                          style: GoogleFonts.cairo(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFFD4AF37),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Container(
                      width: double.infinity,
                      height: 6,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Stack(
                        children: [
                          FractionallySizedBox(
                            widthFactor: 0.7,
                            child: Container(
                              decoration: BoxDecoration(
                                color: const Color(0xFFD4AF37),
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'تبقى لك إيداع بقيمة 15,000 ر.س أو لعب بمبلغ 50,000 ر.س للترقية التلقائية.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.cairo(
                        fontSize: 10,
                        color: Colors.white38,
                      ),
                    ),
                  ],
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
              color: const Color(0xFF0C121E).withOpacity(0.6),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFD4AF37).withOpacity(0.15)),
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
                _buildDetailRow(Icons.email_outlined, 'البريد الإلكتروني', 'a.harbi@masoudi.com'),
                Divider(color: Colors.white.withOpacity(0.05)),
                _buildDetailRow(Icons.phone_android_rounded, 'رقم الجوال', '+966 50 **** 123'),
                Divider(color: Colors.white.withOpacity(0.05)),
                _buildDetailRow(Icons.calendar_month_outlined, 'تاريخ التسجيل', '12 مايو 2026'),
                Divider(color: Colors.white.withOpacity(0.05)),
                _buildDetailRow(
                  Icons.verified_user_outlined,
                  'توثيق الحساب',
                  'موثق بالكامل',
                  textColor: Colors.emerald,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Security & Support Options
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
                  'خيارات الأمان والتحكم',
                  style: GoogleFonts.cairo(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 15),
                _buildSettingButton(Icons.lock_outline, 'تغيير كلمة المرور'),
                Divider(color: Colors.white.withOpacity(0.05)),
                _buildSettingButton(Icons.account_balance_wallet_outlined, 'إدارة الحسابات البنكية'),
                Divider(color: Colors.white.withOpacity(0.05)),
                _buildSettingButton(Icons.support_agent, 'التواصل مع مدير الدعم المخصص'),
                Divider(color: Colors.white.withOpacity(0.05)),
                _buildSettingButton(
                  Icons.logout_rounded,
                  'تسجيل الخروج',
                  textColor: const Color(0xFFD32F2F),
                  onTap: onLogout,
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value, {Color textColor = Colors.white70}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.between,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: const Color(0xFFD4AF37)),
              const SizedBox(width: 8),
              Text(
                label,
                style: GoogleFonts.cairo(fontSize: 12, color: Colors.white54, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          Text(
            value,
            style: GoogleFonts.cairo(
              fontSize: 12,
              color: textColor,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
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
            Icon(icon, size: 18, color: textColor == Colors.white ? const Color(0xFFD4AF37) : textColor),
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
