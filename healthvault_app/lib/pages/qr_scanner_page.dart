import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../utils/constants.dart';
import 'dart:convert';

class QRScannerPage extends StatefulWidget {
  final String title;
  const QRScannerPage({super.key, required this.title});

  @override
  State<QRScannerPage> createState() => _QRScannerPageState();
}

class _QRScannerPageState extends State<QRScannerPage> {
  final MobileScannerController controller = MobileScannerController(
    formats: const [BarcodeFormat.qrCode],
  );
  bool _found = false;

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_found) return;
    final List<Barcode> barcodes = capture.barcodes;
    for (final barcode in barcodes) {
      if (barcode.rawValue != null) {
        _found = true;
        controller.stop();
        final raw = barcode.rawValue!;
        try {
          if (raw.startsWith('HealthVault Emergency|')) {
            final parts = raw.split('|');
            Navigator.pop(context, {'healthId': parts[1]});
          } else {
            final data = jsonDecode(raw);
            if (data is Map && data.containsKey('healthId')) {
              Navigator.pop(context, data);
            } else {
              _showError('Invalid QR Code');
            }
          }
        } catch (_) {
          _showError('Invalid QR Code format');
        }
        break;
      }
    }
  }

  void _showError(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: AppColors.error),
    );
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() => _found = false);
        controller.start();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title, style: GoogleFonts.manrope(fontSize: 18, fontWeight: FontWeight.w700)),
        backgroundColor: Colors.transparent,
        iconTheme: const IconThemeData(color: Colors.white),
        titleTextStyle: GoogleFonts.manrope(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700),
      ),
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          MobileScanner(
            controller: controller,
            onDetect: _onDetect,
          ),
          Center(
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                border: Border.all(color: AppColors.secondary, width: 3),
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
          Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(20)),
                child: Text('Align QR code within frame', style: GoogleFonts.inter(color: Colors.white)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
