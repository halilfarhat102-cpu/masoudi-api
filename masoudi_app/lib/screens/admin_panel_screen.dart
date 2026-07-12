import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:webview_flutter/webview_flutter.dart';

class AdminPanelScreen extends StatefulWidget {
  final String serverUrl;

  const AdminPanelScreen({
    Key? key,
    required this.serverUrl,
  }) : super(key: key);

  @override
  _AdminPanelScreenState createState() => _AdminPanelScreenState();
}

class _AdminPanelScreenState extends State<AdminPanelScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF100906))
      ..addJavaScriptChannel(
        'MasoudiApp',
        onMessageReceived: (JavaScriptMessage message) {
          _handleNativeMessage(message.message);
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (String url) {
            if (mounted) {
              setState(() {
                _isLoading = true;
              });
            }
          },
          onPageFinished: (String url) {
            if (mounted) {
              setState(() {
                _isLoading = false;
              });
            }
          },
          onWebResourceError: (WebResourceError error) {
            debugPrint("Admin WebView error: ${error.description}");
          },
        ),
      )
      ..loadRequest(Uri.parse('${widget.serverUrl}/admin.html'));
  }

  Future<void> _handleNativeMessage(String msg) async {
    final parts = msg.split('|');
    if (parts.length >= 3 && parts[0] == 'pickImage') {
      final targetInputId = parts[1];
      final statusId = parts[2];
      await _pickAndUploadImage(targetInputId, statusId);
    }
  }

  Future<void> _pickAndUploadImage(String targetInputId, String statusId) async {
    try {
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
      );
      if (image == null) return;

      // Set loading status in WebView
      await _controller.runJavaScript("""
        document.getElementById('$statusId').innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="color:var(--orange);"></i> جاري رفع الصورة...';
        document.getElementById('$statusId').style.color = 'var(--orange)';
      """);

      final bytes = await image.readAsBytes();
      final base64Data = base64Encode(bytes);
      final extension = image.name.split('.').last;

      final res = await http.post(
        Uri.parse('${widget.serverUrl}/api/upload'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'fileName': image.name,
          'fileData': 'data:image/$extension;base64,$base64Data',
        }),
      ).timeout(const Duration(seconds: 30));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && data['url'] != null) {
          final imageUrl = data['url'];
          await _controller.runJavaScript("""
            document.getElementById('$targetInputId').value = '$imageUrl';
            document.getElementById('$statusId').innerHTML = '<i class="fa-solid fa-circle-check" style="color:#00E676;"></i> تم الرفع بنجاح';
            document.getElementById('$statusId').style.color = '#00E676';
            showToast('تم رفع الصورة بنجاح ✅');
          """);
        } else {
          throw Exception(data['error'] ?? 'Server error');
        }
      } else {
        throw Exception('HTTP ${res.statusCode}');
      }
    } catch (e) {
      debugPrint("Native upload error: $e");
      await _controller.runJavaScript("""
        document.getElementById('$statusId').innerHTML = '<i class="fa-solid fa-circle-xmark" style="color:#ff5252;"></i> فشل الرفع: $e';
        document.getElementById('$statusId').style.color = '#ff5252';
        showToast('فشل رفع الصورة', 'error');
      """);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF100906),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E140F),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 18),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'لوحة التحكم الإدارية',
          style: GoogleFonts.cairo(
            color: Colors.white,
            fontSize: 15,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFFFF7A1F)),
            onPressed: () {
              _controller.reload();
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_isLoading)
            const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFFF7A1F)),
              ),
            ),
        ],
      ),
    );
  }
}
